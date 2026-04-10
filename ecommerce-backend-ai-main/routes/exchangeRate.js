import express from "express";
import { getUsdToNgnRate } from "../utils/exchangeRate.js";

const router = express.Router();

router.get("/usd-ngn", async (_req, res) => {
  try {
    const snapshot = await getUsdToNgnRate();
    return res.json(snapshot);
  } catch {
    return res.status(500).json({
      error: "Unable to load exchange rate",
      code: "RATE_UNAVAILABLE",
    });
  }
});

export default router;

