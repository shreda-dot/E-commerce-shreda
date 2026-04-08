import express from "express";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { DeliveryOption } from "../models/DeliveryOption.js";
import { CartItem } from "../models/CartItem.js";
import { badRequest, internalError, notFound } from "../utils/http.js";
import { getAuthUser, requireAuth, requireAdmin } from "../middleware/auth.js";
import { createPayPalOrder, capturePayPalOrder } from "../utils/paypal.js";

const router = express.Router();

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

router.post("/", async (req, res) => {
  try {
    const authUser = await getAuthUser(req);
    const cartItems = await CartItem.findAll();

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

    const order = await Order.create({
      orderTimeMs: Date.now(),
      totalCostCents,
      userId: authUser?.id || null,
      products,
    });

    await CartItem.destroy({ where: {} });
    res.status(201).json(order);
  } catch (error) {
    return internalError(res, error);
  }
});

// ── PayPal: create order ────────────────────────────────────────────────────
// Called by the frontend when the user clicks the PayPal button.
// Calculates the cart total and registers an order with PayPal.
// Returns { paypalOrderId } — the ID is passed to the PayPal JS SDK popup.
router.post("/paypal/create", requireAuth, async (req, res) => {
  try {
    const cartItems = await CartItem.findAll();

    if (cartItems.length === 0) {
      return badRequest(res, "Cart is empty", "EMPTY_CART");
    }

    let totalCostCents = 0;
    for (const item of cartItems) {
      const product = await Product.findByPk(item.productId);
      const deliveryOption = await DeliveryOption.findByPk(item.deliveryOptionId);
      if (!product || !deliveryOption) continue;
      totalCostCents += product.priceCents * item.quantity + deliveryOption.priceCents;
    }
    // Apply 10% tax — must match paymentSummary and POST /api/orders logic
    totalCostCents = Math.round(totalCostCents * 1.1);

    const paypalOrder = await createPayPalOrder(totalCostCents);

    if (!paypalOrder.id) {
      return internalError(res, new Error("PayPal did not return an order ID"));
    }

    res.json({ paypalOrderId: paypalOrder.id });
  } catch (error) {
    return internalError(res, error);
  }
});

// ── PayPal: capture payment & create internal order ─────────────────────────
// Called by the frontend after the user approves the payment in the PayPal popup.
// Verifies the payment with PayPal, then creates the internal order with
// status "paid" and clears the cart.  Only succeeds if PayPal confirms funds.
router.post("/capture", requireAuth, async (req, res) => {
  try {
    const { paypalOrderId } = req.body;

    if (!paypalOrderId) {
      return badRequest(res, "paypalOrderId is required", "MISSING_PAYPAL_ORDER_ID");
    }

    // Ask PayPal to capture the funds — this is the authoritative check
    const captureData = await capturePayPalOrder(paypalOrderId);

    if (captureData.status !== "COMPLETED") {
      return res.status(402).json({
        error: "Payment was not completed by PayPal",
        code: "PAYMENT_NOT_COMPLETED",
        paypalStatus: captureData.status,
      });
    }

    // Payment confirmed — build the internal order
    const cartItems = await CartItem.findAll();

    if (cartItems.length === 0) {
      return badRequest(res, "Cart is empty", "EMPTY_CART");
    }

    let totalCostCents = 0;
    const products = await Promise.all(
      cartItems.map(async (item) => {
        const product = await Product.findByPk(item.productId);
        if (!product) throw new Error(`Product not found: ${item.productId}`);
        const deliveryOption = await DeliveryOption.findByPk(item.deliveryOptionId);
        if (!deliveryOption) throw new Error(`Invalid delivery option: ${item.deliveryOptionId}`);

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

    const order = await Order.create({
      orderTimeMs: Date.now(),
      totalCostCents,
      userId: req.user.id,
      products,
      status: "paid",
      paypalOrderId,
    });

    // Clear cart only after the order is saved
    await CartItem.destroy({ where: {} });

    res.status(201).json(order);
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
