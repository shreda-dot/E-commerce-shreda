/**
 * Flutterwave-only payment verification.
 * POST /api/flutterwave/verify — no auth middleware (req.user not used) to avoid connection issues during integration.
 * Order: verify with Flutterwave API (axios) → math check → create Order → clear Cart.
 */
import express from "express";
import axios from "axios";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { DeliveryOption } from "../models/DeliveryOption.js";
import { CartItem } from "../models/CartItem.js";
import { badRequest, internalError } from "../utils/http.js";

const router = express.Router();

const FLW_VERIFY = (transactionId) =>
  `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(String(transactionId).trim())}/verify`;

function getExchangeRate() {
  const raw = process.env.USD_NGN_EXCHANGE_RATE;
  const n = raw !== undefined && raw !== "" ? Number(raw) : 1500;
  return Number.isFinite(n) && n > 0 ? n : 1500;
}

function parsePaidNgn(data) {
  if (!data || data.amount === undefined || data.amount === null) return null;
  const num = Number(data.amount);
  return Number.isFinite(num) ? num : null;
}

router.post("/verify", async (req, res) => {
  console.log("[Flutterwave] Verifying ID... incoming POST /api/flutterwave/verify");

  try {
    const transactionId =
      req.body?.transaction_id ??
      req.body?.transactionId ??
      req.body?.id ??
      null;

    if (
      transactionId === undefined ||
      transactionId === null ||
      String(transactionId).trim() === ""
    ) {
      console.log("[Flutterwave] Missing transaction_id in body — abort");
      return badRequest(
        res,
        "transaction_id is required",
        "MISSING_TRANSACTION_ID",
      );
    }

    const txKey = String(transactionId).trim();
    console.log("[Flutterwave] Verifying ID...", txKey);

    const secret = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secret) {
      console.log("[Flutterwave] FLUTTERWAVE_SECRET_KEY missing — abort");
      return res.status(500).json({
        error: "Payment server not configured",
        code: "FLUTTERWAVE_NOT_CONFIGURED",
      });
    }

    const exchangeRate = getExchangeRate();
    console.log("[Flutterwave] Math Check... using USD_NGN rate:", exchangeRate);

    const existing = await Order.findOne({
      where: { flutterwaveTransactionId: txKey },
    }).catch((e) => {
      console.log("[Flutterwave] Idempotency lookup error (non-fatal):", e?.message);
      return null;
    });

    if (existing) {
      console.log("[Flutterwave] Duplicate tx — returning existing order:", existing.id);
      return res.status(200).json({
        success: true,
        message: "Order already recorded",
        order: existing,
      });
    }

    let fwResponse;
    try {
      console.log("[Flutterwave] Calling Flutterwave verify API (axios)...");
      fwResponse = await axios.get(FLW_VERIFY(txKey), {
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
        validateStatus: () => true,
      });
    } catch (err) {
      console.error("[Flutterwave] Axios verify failed:", err?.message || err);
      return res.status(502).json({
        error: "Could not reach Flutterwave",
        code: "FLUTTERWAVE_NETWORK",
      });
    }

    const body = fwResponse.data || {};
    console.log(
      "[Flutterwave] Verify HTTP",
      fwResponse.status,
      "API status:",
      body?.status,
    );

    if (fwResponse.status < 200 || fwResponse.status >= 300) {
      console.log("[Flutterwave] Bad HTTP from Flutterwave");
      return res.status(502).json({
        error: "Flutterwave verification failed",
        code: "FLUTTERWAVE_HTTP_ERROR",
      });
    }

    if (body.status !== "success" || !body.data) {
      console.log("[Flutterwave] Response not success or missing data");
      return res.status(402).json({
        error: "Payment not verified",
        code: "VERIFICATION_FAILED",
      });
    }

    const data = body.data;
    if (data.status !== "successful") {
      console.log("[Flutterwave] Transaction status not successful:", data.status);
      return res.status(402).json({
        error: "Payment was not successful",
        code: "PAYMENT_NOT_SUCCESSFUL",
      });
    }

    const currency = String(data.currency || "").toUpperCase();
    if (currency && currency !== "NGN") {
      console.log("[Flutterwave] Expected NGN, got:", currency);
      return res.status(400).json({
        error: "Invalid currency",
        code: "INVALID_CURRENCY",
      });
    }

    const paidNgn = parsePaidNgn(data);
    if (paidNgn === null) {
      console.log("[Flutterwave] Could not parse paid amount");
      return res.status(502).json({
        error: "Invalid amount in response",
        code: "INVALID_AMOUNT",
      });
    }

    console.log("[Flutterwave] Loading cart for Math Check...");
    let cartItems;
    try {
      cartItems = await CartItem.findAll();
    } catch (e) {
      console.error("[Flutterwave] Cart load error:", e?.message);
      return internalError(res, e);
    }

    if (!cartItems || cartItems.length === 0) {
      console.log("[Flutterwave] Cart empty — abort");
      return badRequest(res, "Cart is empty", "EMPTY_CART");
    }

    let totalCostCents = 0;
    const products = [];

    for (const item of cartItems) {
      let product;
      let deliveryOption;
      try {
        product = await Product.findByPk(item.productId);
        deliveryOption = await DeliveryOption.findByPk(item.deliveryOptionId);
      } catch (e) {
        console.error("[Flutterwave] Product/delivery load error:", e?.message);
        return internalError(res, e);
      }

      if (!product || !deliveryOption) {
        console.log("[Flutterwave] Skipping line — missing product or delivery");
        continue;
      }

      const productCost = product.priceCents * item.quantity;
      const shippingCost = deliveryOption.priceCents;
      totalCostCents += productCost + shippingCost;

      products.push({
        productId: item.productId,
        quantity: item.quantity,
        estimatedDeliveryTimeMs:
          Date.now() + (deliveryOption.deliveryDays || 7) * 24 * 60 * 60 * 1000,
      });
    }

    if (products.length === 0) {
      console.log("[Flutterwave] No valid cart lines — abort");
      return badRequest(res, "Cart has no valid items", "INVALID_CART");
    }

    totalCostCents = Math.round(totalCostCents * 1.1);
    const usdAmount = totalCostCents / 100;
    const expectedNgn = usdAmount * exchangeRate;
    const tolerance = Math.max(2, Math.round(expectedNgn * 0.005));

    console.log("[Flutterwave] Math Check... USD cents:", totalCostCents, "expected NGN:", expectedNgn, "paid:", paidNgn, "±", tolerance);

    if (Math.abs(paidNgn - expectedNgn) > tolerance) {
      console.log("[Flutterwave] Amount mismatch — abort");
      return res.status(400).json({
        error: "Paid amount does not match order total",
        code: "AMOUNT_MISMATCH",
        expectedNgn: Math.round(expectedNgn * 100) / 100,
        paidNgn,
      });
    }

    console.log("[Flutterwave] Creating Order...");
    let order;
    try {
      order = await Order.create({
        orderTimeMs: Date.now(),
        totalCostCents,
        userId: null,
        products,
        status: "paid",
        flutterwaveTransactionId: txKey,
      });
    } catch (e) {
      console.error("[Flutterwave] Order create failed:", e?.message);
      return internalError(res, e);
    }

    console.log("[Flutterwave] Clearing Cart...", order.id);
    try {
      await CartItem.destroy({ where: {} });
    } catch (e) {
      console.error("[Flutterwave] Cart clear failed (order exists):", e?.message);
      return res.status(500).json({
        error: "Order saved but cart could not be cleared — contact support",
        code: "CART_CLEAR_FAILED",
        orderId: order.id,
      });
    }

    console.log("[Flutterwave] Done — order:", order.id);
    return res.status(201).json({
      success: true,
      message: "Payment verified and order created",
      order,
    });
  } catch (error) {
    console.error("[Flutterwave] Unhandled error in /verify:", error?.message || error);
    return internalError(res, error);
  }
});

export default router;
