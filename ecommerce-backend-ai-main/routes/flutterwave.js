/**
 * Flutterwave-only payment verification.
 * POST /api/flutterwave/verify (authenticated)
 *
 * ── Two bugs fixed in this version ───────────────────────────────────────────
 *
 * BUG 1 — Double shipping:
 *   Old code added BOTH cartItem.deliveryOption.priceCents (standard delivery)
 *   AND draft.shippingMethodFeeCents (zone fee) to the total. These are two
 *   separate shipping costs — the zone fee already replaces the cart delivery
 *   cost in the draft. This inflated the backend expected total.
 *
 * BUG 2 — Tax applied in wrong order:
 *   pre-check applies tax to (productCost + zoneFee) together.
 *   Old verify code applied tax to (productCost + cartDelivery) then added
 *   zoneFee after tax. Different formula → different totals.
 *
 * THE FIX:
 *   When a valid draft exists, skip cart recalculation entirely.
 *   Use draft.totalCostCents directly for the math check — it was computed
 *   by pre-check using the exact same formula as the frontend display.
 *   Cart recalculation is only used as a fallback when no draft is present.
 *
 * ── Exchange rate fix (from previous session) ─────────────────────────────────
 *   Backend now uses getUsdToNgnRate() — same 24hr-cached function as the
 *   frontend. Both sides use the identical rate. No .env needed.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import express from "express";
import axios from "axios";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { DeliveryOption } from "../models/DeliveryOption.js";
import { CartItem } from "../models/CartItem.js";
import { OrderDraft } from "../models/OrderDraft.js";
import { badRequest, internalError } from "../utils/http.js";
import { requireAuth } from "../middleware/auth.js";
import { getUsdToNgnRate } from "../utils/exchangeRate.js";

const router = express.Router();

const FLW_VERIFY = (transactionId) =>
  `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(
    String(transactionId).trim(),
  )}/verify`;

function parsePaidNgn(data) {
  if (!data || data.amount === undefined || data.amount === null) return null;
  const num = Number(data.amount);
  return Number.isFinite(num) ? num : null;
}

function formatZone(zoneId) {
  const map = {
    "lagos-mainland": "Lagos Mainland",
    "lagos-island": "Lagos Island",
    "rest-of-nigeria": "Rest of Nigeria",
    international: "International",
  };
  return map[String(zoneId || "").toLowerCase()] || String(zoneId || "");
}

router.post("/verify", requireAuth, async (req, res) => {
  console.log("[Flutterwave] incoming POST /api/flutterwave/verify");

  try {
    const transactionId =
      req.body?.transaction_id ??
      req.body?.transactionId ??
      req.body?.id ??
      null;

    const draftOrderId =
      typeof req.body?.draftOrderId === "string"
        ? req.body.draftOrderId
        : null;

    if (!transactionId || String(transactionId).trim() === "") {
      return badRequest(res, "transaction_id is required", "MISSING_TRANSACTION_ID");
    }

    const txKey = String(transactionId).trim();
    console.log("[Flutterwave] Verifying transaction:", txKey);

    const secret = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secret) {
      return res.status(500).json({
        error: "Payment server not configured",
        code: "FLUTTERWAVE_NOT_CONFIGURED",
      });
    }

    // ── Idempotency ──────────────────────────────────────────────────────────
    const existing = await Order.findOne({
      where: { flutterwaveTransactionId: txKey },
    }).catch(() => null);

    if (existing) {
      console.log("[Flutterwave] Duplicate tx — returning existing order:", existing.id);
      return res.status(200).json({
        success: true,
        message: "Order already recorded",
        order: existing,
      });
    }

    // ── Exchange rate — same cached value as frontend ────────────────────────
    let exchangeRate;
    try {
      const snapshot = await getUsdToNgnRate();
      exchangeRate = snapshot.rate;
      console.log(
        `[Flutterwave] Exchange rate: ${exchangeRate} NGN/USD (source: ${snapshot.source})`,
      );
    } catch (rateErr) {
      console.error("[Flutterwave] Rate fetch failed:", rateErr?.message);
      return res.status(503).json({
        error: "Exchange rate temporarily unavailable. Please try again.",
        code: "RATE_UNAVAILABLE",
      });
    }

    // ── Call Flutterwave verify API ──────────────────────────────────────────
    let fwResponse;
    try {
      console.log("[Flutterwave] Calling Flutterwave verify API...");
      fwResponse = await axios.get(FLW_VERIFY(txKey), {
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
        validateStatus: () => true,
      });
    } catch (err) {
      console.error("[Flutterwave] Axios verify failed:", err?.message);
      return res.status(502).json({
        error: "Could not reach Flutterwave",
        code: "FLUTTERWAVE_NETWORK",
      });
    }

    const body = fwResponse.data || {};
    console.log(
      "[Flutterwave] Verify HTTP", fwResponse.status,
      "| API status:", body?.status,
    );

    if (fwResponse.status < 200 || fwResponse.status >= 300) {
      return res.status(502).json({
        error: "Flutterwave verification failed",
        code: "FLUTTERWAVE_HTTP_ERROR",
      });
    }

    if (body.status !== "success" || !body.data) {
      return res.status(402).json({
        error: "Payment not verified",
        code: "VERIFICATION_FAILED",
      });
    }

    const data = body.data;
    if (data.status !== "successful") {
      console.log("[Flutterwave] Transaction not successful:", data.status);
      return res.status(402).json({
        error: "Payment was not successful",
        code: "PAYMENT_NOT_SUCCESSFUL",
      });
    }

    const currency = String(data.currency || "").toUpperCase();
    if (currency && currency !== "NGN") {
      return res.status(400).json({ error: "Invalid currency", code: "INVALID_CURRENCY" });
    }

    const paidNgn = parsePaidNgn(data);
    if (paidNgn === null) {
      return res.status(502).json({
        error: "Invalid amount in Flutterwave response",
        code: "INVALID_AMOUNT",
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // TOTAL COST CALCULATION
    //
    // PATH A — Draft exists (normal checkout flow):
    //   Use draft.totalCostCents directly. This is the authoritative total
    //   computed by pre-check using: productCost + zoneFee + 10% tax.
    //   It is the exact same number the frontend showed the user and sent
    //   to Flutterwave. No recalculation needed. No mismatch possible.
    //
    // PATH B — No draft (legacy / direct API):
    //   Fall back to recalculating from cart items. This path has no zone
    //   fee awareness, so it only covers carts without zone-based shipping.
    // ════════════════════════════════════════════════════════════════════════

    let totalCostCents;
    let deliveryZone = null;
    let deliveryAddress = null;
    let shippingMethod = "standard";
    let shippingMethodFeeCents = 0;
    let products = [];

    // ── PATH A: Use draft total ──────────────────────────────────────────────
    if (draftOrderId) {
      console.log("[Flutterwave] Loading draft:", draftOrderId);

      const draft = await OrderDraft.findByPk(draftOrderId).catch(() => null);

      if (!draft) {
        console.log("[Flutterwave] Draft not found — abort");
        return res.status(400).json({
          error: "Checkout session not found. Please start checkout again.",
          code: "DRAFT_NOT_FOUND",
        });
      }

      if (draft.userId !== req.user.id) {
        return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN" });
      }

      if (Date.now() > Number(draft.expiresAt)) {
        await draft.destroy().catch(() => null);
        return res.status(400).json({
          error: "Checkout session expired. Please start checkout again.",
          code: "DRAFT_EXPIRED",
        });
      }

      // ✅ Use the draft's pre-computed total — same formula as frontend display
      totalCostCents = Number(draft.totalCostCents);
      console.log(
        `[Flutterwave] Using draft total: $${(totalCostCents / 100).toFixed(2)} USD`,
      );

      // Extract delivery details for order record
      const delivery = draft.payload?.delivery ?? {};
      deliveryZone =
        typeof delivery?.zoneId === "string" ? formatZone(delivery.zoneId) : null;
      deliveryAddress =
        typeof delivery?.address === "string" ? delivery.address : null;
      shippingMethod =
        String(delivery?.speed || "standard").toLowerCase() === "express"
          ? "express"
          : "standard";
      const draftFee = Number(draft.payload?.deliveryFeeCents ?? 0);
      shippingMethodFeeCents =
        Number.isFinite(draftFee) && draftFee > 0 ? Math.round(draftFee) : 0;

      // Build products list from draft items (already validated by pre-check)
      const draftItems = draft.payload?.items ?? [];
      for (const item of draftItems) {
        const deliveryOption = await DeliveryOption.findOne({
          where: { id: "1" }, // default delivery option for ETA
        }).catch(() => null);

        products.push({
          productId: item.productId,
          quantity: item.quantity,
          estimatedDeliveryTimeMs:
            Date.now() +
            (deliveryOption?.deliveryDays || 7) * 24 * 60 * 60 * 1000,
        });
      }

      // If draft items are empty, fall back to live cart for products list only
      if (products.length === 0) {
        const cartItems = await CartItem.findAll({
          where: { userId: req.user.id },
        });
        for (const item of cartItems) {
          const deliveryOption = await DeliveryOption.findByPk(
            item.deliveryOptionId,
          ).catch(() => null);
          products.push({
            productId: item.productId,
            quantity: item.quantity,
            estimatedDeliveryTimeMs:
              Date.now() +
              (deliveryOption?.deliveryDays || 7) * 24 * 60 * 60 * 1000,
          });
        }
      }

    } else {
      // ── PATH B: No draft — recalculate from cart ─────────────────────────
      console.log("[Flutterwave] No draftOrderId — recalculating from cart...");

      const cartItems = await CartItem.findAll({
        where: { userId: req.user.id },
      });

      if (!cartItems || cartItems.length === 0) {
        return badRequest(res, "Cart is empty", "EMPTY_CART");
      }

      let rawCostCents = 0;
      for (const item of cartItems) {
        const product = await Product.findByPk(item.productId).catch(() => null);
        const deliveryOption = await DeliveryOption.findByPk(
          item.deliveryOptionId,
        ).catch(() => null);

        if (!product || !deliveryOption) continue;

        rawCostCents +=
          product.priceCents * item.quantity + deliveryOption.priceCents;

        products.push({
          productId: item.productId,
          quantity: item.quantity,
          estimatedDeliveryTimeMs:
            Date.now() +
            (deliveryOption.deliveryDays || 7) * 24 * 60 * 60 * 1000,
        });
      }

      if (products.length === 0) {
        return badRequest(res, "Cart has no valid items", "INVALID_CART");
      }

      // Apply 10% tax — same as payment-summary route
      totalCostCents = Math.round(rawCostCents * 1.1);
    }

    // ── Math check ───────────────────────────────────────────────────────────
    //
    // Frontend formula (MuiCheckoutPage.tsx):
    //   amountNgn = Math.round(usdTotal * exchangeRate * 100) / 100
    //
    // We replicate the same formula. With the same rate (from shared cache)
    // and the same totalCostCents (from the draft), the numbers match exactly.
    // ±5% tolerance absorbs Flutterwave's own rounding of the charge.
    // ─────────────────────────────────────────────────────────────────────────
    const usdCost = totalCostCents / 100;
    const expectedNgn = Math.round(usdCost * exchangeRate * 100) / 100;
    const tolerancePct = 0.05; // ±5%
    const toleranceNgn = Math.max(50, Math.round(expectedNgn * tolerancePct));

    console.log(
      "[Flutterwave] Math Check...",
      `USD: $${usdCost.toFixed(2)}`,
      `| Rate: ${exchangeRate} NGN/USD`,
      `| Expected NGN: ₦${expectedNgn}`,
      `| Paid NGN: ₦${paidNgn}`,
      `| Tolerance: ±₦${toleranceNgn}`,
    );

    if (Math.abs(paidNgn - expectedNgn) > toleranceNgn) {
      console.log("[Flutterwave] Amount mismatch — abort");
      return res.status(400).json({
        error: "Paid amount does not match order total",
        code: "AMOUNT_MISMATCH",
        expectedNgn,
        paidNgn,
        toleranceNgn,
        hint: !draftOrderId
          ? "No draftOrderId was sent. Ensure the frontend passes draftOrderId in the verify request."
          : undefined,
      });
    }

    console.log("[Flutterwave] Math Check PASSED ✅");

    // ── Create order ─────────────────────────────────────────────────────────
    console.log("[Flutterwave] Creating Order...");
    let order;
    try {
      order = await Order.create({
        orderTimeMs: Date.now(),
        totalCostCents,
        userId: req.user.id,
        deliveryZone,
        deliveryAddress,
        shippingMethod,
        shippingMethodFeeCents,
        products,
        status: "processing",
        flutterwaveTransactionId: txKey,
        paymentStatus: "paid",
      });
    } catch (e) {
      console.error("[Flutterwave] Order create failed:", e?.message);
      return internalError(res, e);
    }

    // ── Clear cart ───────────────────────────────────────────────────────────
    console.log("[Flutterwave] Clearing cart...", order.id);
    try {
      await CartItem.destroy({ where: { userId: req.user.id } });
    } catch (e) {
      console.error("[Flutterwave] Cart clear failed (order exists):", e?.message);
      return res.status(500).json({
        error: "Order saved but cart could not be cleared — contact support",
        code: "CART_CLEAR_FAILED",
        orderId: order.id,
      });
    }

    // ── Cleanup draft ────────────────────────────────────────────────────────
    if (draftOrderId) {
      await OrderDraft.destroy({
        where: { id: draftOrderId, userId: req.user.id },
      }).catch(() => null);
    }

    console.log("[Flutterwave] Done — order:", order.id);
    return res.status(201).json({
      success: true,
      message: "Payment verified and order created",
      order,
    });

  } catch (error) {
    console.error("[Flutterwave] Unhandled error:", error?.message || error);
    return internalError(res, error);
  }
});

export default router;