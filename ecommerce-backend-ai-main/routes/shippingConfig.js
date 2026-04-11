import express from "express";
import { ShippingConfig } from "../models/ShippingConfig.js";
import { internalError } from "../utils/http.js";

const router = express.Router();

router.get("/quote", async (req, res) => {
  try {
    const zoneKey = String(req.query.zoneKey || "").toLowerCase();
    const method = String(req.query.method || "standard").toLowerCase() === "express" ? "express" : "standard";
    if (!zoneKey) {
      return res.status(400).json({ error: "zoneKey is required", code: "ZONE_REQUIRED" });
    }

    const row = await ShippingConfig.findOne({ where: { zoneKey, method } });
    if (!row) {
      return res.status(404).json({ error: "Shipping config not found", code: "SHIPPING_CONFIG_NOT_FOUND" });
    }

    return res.json({
      zoneKey: row.zoneKey,
      method: row.method,
      usdFeeCents: row.usdFeeCents,
      ngnFee: row.ngnFee,
    });
  } catch (error) {
    return internalError(res, error);
  }
});

export default router;
