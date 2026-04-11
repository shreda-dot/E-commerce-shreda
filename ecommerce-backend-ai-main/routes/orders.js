import express from "express";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { DeliveryOption } from "../models/DeliveryOption.js";
import { CartItem } from "../models/CartItem.js";
import { OrderDraft } from "../models/OrderDraft.js";
import { ShippingConfig } from "../models/ShippingConfig.js";
import { badRequest, internalError, notFound } from "../utils/http.js";
import { getAuthUser, requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();
const DRAFT_TTL_MS = 30 * 60 * 1000;

router.get("/", async (req, res) => {
  try {
    const expand = req.query.expand;
    const mine = req.query.mine === "true";
    let where = undefined;
    if (mine) {
      const authUser = await getAuthUser(req);
      if (!authUser) {
        return res
          .status(401)
          .json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      }
      where = { userId: authUser.id };
    } else {
      // Global order access requires admin role
      const authUser = await getAuthUser(req);
      if (!authUser || authUser.role !== "admin") {
        return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN" });
      }
    }

    let orders = await Order.unscoped().findAll({
      where,
      order: [["orderTimeMs", "DESC"]],
    });

    if (expand === "products") {
      const productIds = [
        ...new Set(
          orders.flatMap((order) =>
            order.products.map((product) => product.productId),
          ),
        ),
      ];
      const products = await Product.findAll({ where: { id: productIds } });
      const productsById = new Map(
        products.map((product) => [product.id, product]),
      );

      orders = orders.map((order) => {
        const hydratedProducts = order.products.map((product) => ({
          ...product,
          product: productsById.get(product.productId) || null,
        }));

        return {
          ...order.toJSON(),
          products: hydratedProducts,
        };
      });
    }

    res.json(orders);
  } catch (error) {
    return internalError(res, error);
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const cartItems = await CartItem.findAll({ where: { userId: req.user.id } });

    if (cartItems.length === 0) {
      return badRequest(res, "Cart is empty", "EMPTY_CART");
    }

    let totalCostCents = 0;
    const products = await Promise.all(
      cartItems.map(async (item) => {
        const product = await Product.findByPk(item.productId);
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }
        const deliveryOption = await DeliveryOption.findByPk(
          item.deliveryOptionId,
        );
        if (!deliveryOption) {
          throw new Error(`Invalid delivery option: ${item.deliveryOptionId}`);
        }

        const productCost = product.priceCents * item.quantity;
        const shippingCost = deliveryOption.priceCents;
        totalCostCents += productCost + shippingCost;
        const estimatedDeliveryTimeMs =
          Date.now() + deliveryOption.deliveryDays * 24 * 60 * 60 * 1000;
        return {
          productId: item.productId,
          quantity: item.quantity,
          estimatedDeliveryTimeMs,
        };
      }),
    );

    totalCostCents = Math.round(totalCostCents * 1.1);
    const shippingMethod = String(req.body?.shippingMethod || "standard").toLowerCase() === "express" ? "express" : "standard";
    const shippingMethodFeeCents = Number.isFinite(Number(req.body?.shippingMethodFeeCents))
      ? Math.max(0, Math.round(Number(req.body.shippingMethodFeeCents)))
      : 0;
    totalCostCents += shippingMethodFeeCents;

    const order = await Order.create({
      orderTimeMs: Date.now(),
      totalCostCents,
      userId: req.user.id,
      deliveryZone: typeof req.body?.deliveryZone === "string" ? req.body.deliveryZone : null,
      deliveryAddress: typeof req.body?.deliveryAddress === "string" ? req.body.deliveryAddress : null,
      shippingMethod,
      shippingMethodFeeCents,
      products,
      paymentStatus: "unpaid",
    });

    await CartItem.destroy({ where: { userId: req.user.id } });
    res.status(201).json(order);
  } catch (error) {
    return internalError(res, error);
  }
});

router.post("/pre-check", requireAuth, async (req, res) => {
  try {
    const body = req.body ?? {};
    const delivery = body.delivery ?? null;
    const deliveryZoneKey = String(delivery?.zoneId || "").toLowerCase();
    const shippingMethod = String(delivery?.speed || "standard").toLowerCase() === "express" ? "express" : "standard";
    if (!deliveryZoneKey) {
      return badRequest(res, "Delivery zone is required", "DELIVERY_ZONE_REQUIRED");
    }

    const cartItems = await CartItem.findAll({ where: { userId: req.user.id } });
    if (cartItems.length === 0) {
      return badRequest(res, "Cart is empty", "EMPTY_CART");
    }

    const shippingCfg = await ShippingConfig.findOne({
      where: { zoneKey: deliveryZoneKey, method: shippingMethod },
    });
    if (!shippingCfg) {
      return badRequest(res, "Shipping config not found for selected zone/method", "SHIPPING_CONFIG_NOT_FOUND");
    }

    let productCostCents = 0;
    let totalItems = 0;
    const items = [];
    for (const item of cartItems) {
      const product = await Product.findByPk(item.productId);
      if (!product) continue;
      totalItems += item.quantity;
      productCostCents += product.priceCents * item.quantity;
      items.push({ productId: item.productId, quantity: item.quantity });
    }
    if (items.length === 0) {
      return badRequest(res, "Cart has no valid items", "INVALID_CART");
    }

    const shippingCostCents = Number(shippingCfg.usdFeeCents || 0);
    const totalCostBeforeTaxCents = productCostCents + shippingCostCents;
    const taxCents = Math.round(totalCostBeforeTaxCents * 0.1);
    const totalCostCents = totalCostBeforeTaxCents + taxCents;

    const expiresAt = Date.now() + DRAFT_TTL_MS;
    const draft = await OrderDraft.create({
      userId: req.user.id,
      totalCostCents,
      expiresAt,
      payload: {
        items,
        delivery,
        deliveryFeeCents: shippingCostCents,
        deliveryFeeNgn: Number(shippingCfg.ngnFee || 0),
        totals: {
          totalItems,
          productCostCents,
          shippingCostCents,
          totalCostBeforeTaxCents,
          taxCents,
          totalCostCents,
          shippingLabel: `Shipping (${deliveryZoneKey} - ${shippingMethod})`,
        },
      },
    });

    return res.status(201).json({
      draftOrderId: draft.id,
      expiresAt,
      summary: draft.payload?.totals,
    });
  } catch (error) {
    return internalError(res, error);
  }
});

router.get("/pre-check/:draftOrderId", requireAuth, async (req, res) => {
  try {
    const draft = await OrderDraft.findByPk(req.params.draftOrderId);
    if (!draft || draft.userId !== req.user.id) {
      return notFound(res, "Draft order not found", "DRAFT_NOT_FOUND");
    }
    if (Date.now() > Number(draft.expiresAt)) {
      await draft.destroy();
      return badRequest(res, "Draft order expired", "DRAFT_EXPIRED");
    }
    return res.json({
      draftOrderId: draft.id,
      totalCostCents: draft.totalCostCents,
      payload: draft.payload,
      expiresAt: draft.expiresAt,
    });
  } catch (error) {
    return internalError(res, error);
  }
});

router.get("/mine", requireAuth, async (req, res) => {
  try {
    const orders = await Order.unscoped().findAll({
      where: { userId: req.user.id },
      order: [["orderTimeMs", "DESC"]],
    });
    return res.json(orders);
  } catch (error) {
    return internalError(res, error);
  }
});

router.get("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const expand = req.query.expand;

    let order = await Order.findByPk(orderId);
    if (!order) {
      return notFound(res, "Order not found", "ORDER_NOT_FOUND");
    }

    const authUser = await getAuthUser(req);
    const isOwner = Boolean(authUser && order.userId === authUser.id);
    const isAdmin = authUser?.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN" });
    }

    if (expand === "products") {
      const productIds = [
        ...new Set(order.products.map((product) => product.productId)),
      ];
      const products = await Product.findAll({ where: { id: productIds } });
      const productsById = new Map(
        products.map((product) => [product.id, product]),
      );

      const hydratedProducts = order.products.map((product) => ({
        ...product,
        product: productsById.get(product.productId) || null,
      }));
      order = {
        ...order.toJSON(),
        products: hydratedProducts,
      };
    }

    res.json(order);
  } catch (error) {
    return internalError(res, error);
  }
});

router.patch("/:orderId/status", requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!allowed.includes(status)) {
      return badRequest(res, "Invalid status", "INVALID_STATUS");
    }

    const order = await Order.findByPk(req.params.orderId);
    if (!order) {
      return notFound(res, "Order not found", "ORDER_NOT_FOUND");
    }

    order.status = status;
    await order.save();
    return res.json(order);
  } catch (error) {
    return internalError(res, error);
  }
});

router.delete("/:orderId", requireAdmin, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.orderId);
    if (!order) {
      return notFound(res, "Order not found", "ORDER_NOT_FOUND");
    }
    await order.destroy();
    return res.status(204).send();
  } catch (error) {
    return internalError(res, error);
  }
});

export default router;
