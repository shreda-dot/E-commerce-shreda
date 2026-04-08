import express from 'express';
import { DeliveryOption } from '../models/DeliveryOption.js';
import { internalError } from '../utils/http.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const expand = req.query.expand;
    const deliveryOptions = await DeliveryOption.findAll();
    let response = deliveryOptions;

    if (expand === 'estimatedDeliveryTime') {
      response = deliveryOptions.map((option) => {
        const deliveryTimeMs = Date.now() + option.deliveryDays * 24 * 60 * 60 * 1000;
        return {
          ...option.toJSON(),
          estimatedDeliveryTimeMs: deliveryTimeMs
        };
      });
    }

    res.json(response);
  } catch (error) {
    return internalError(res, error);
  }
});

export default router;
