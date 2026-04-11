import express from 'express';
import { CartItem } from '../models/CartItem.js';
import { Product } from '../models/Product.js';
import { DeliveryOption } from '../models/DeliveryOption.js';
import { OrderDraft } from '../models/OrderDraft.js';
import { internalError } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const draftOrderId = typeof req.query?.draftOrderId === 'string' ? req.query.draftOrderId : '';
    if (draftOrderId) {
      const draft = await OrderDraft.findByPk(draftOrderId);
      if (draft && draft.userId === req.user.id && Date.now() <= Number(draft.expiresAt)) {
        const totals = draft.payload?.totals || {};
        return res.json({
          totalItems: Number(totals.totalItems || 0),
          productCostCents: Number(totals.productCostCents || 0),
          shippingCostCents: Number(totals.shippingCostCents || 0),
          totalCostBeforeTaxCents: Number(totals.totalCostBeforeTaxCents || 0),
          taxCents: Number(totals.taxCents || 0),
          totalCostCents: Number(totals.totalCostCents || 0),
        });
      }
    }

    const cartItems = await CartItem.findAll({ where: { userId: req.user.id } });
    let totalItems = 0;
    let productCostCents = 0;
    let shippingCostCents = 0;

    for (const item of cartItems) {
      const product = await Product.findByPk(item.productId);
      const deliveryOption = await DeliveryOption.findByPk(item.deliveryOptionId);

      if (!product || !deliveryOption) {
        continue;
      }

      totalItems += item.quantity;
      productCostCents += product.priceCents * item.quantity;
      shippingCostCents += deliveryOption.priceCents;
    }

    const totalCostBeforeTaxCents = productCostCents + shippingCostCents;
    const taxCents = Math.round(totalCostBeforeTaxCents * 0.1);
    const totalCostCents = totalCostBeforeTaxCents + taxCents;

    res.json({
      totalItems,
      productCostCents,
      shippingCostCents,
      totalCostBeforeTaxCents,
      taxCents,
      totalCostCents
    });
  } catch (error) {
    return internalError(res, error);
  }
});

export default router;
