import express from 'express';
import { CartItem } from '../models/CartItem.js';
import { Product } from '../models/Product.js';
import { DeliveryOption } from '../models/DeliveryOption.js';
import { badRequest, internalError, notFound, parsePositiveInt } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const expand = req.query.expand;
    let cartItems = await CartItem.findAll({ where: { userId: req.user.id } });

    if (expand === 'product') {
      const productIds = [...new Set(cartItems.map((item) => item.productId))];
      const products = await Product.findAll({ where: { id: productIds } });
      const productsById = new Map(products.map((product) => [product.id, product]));

      cartItems = cartItems.map((item) => ({
        ...item.toJSON(),
        product: productsById.get(item.productId) || null
      }));
    }

    res.json(cartItems);
  } catch (error) {
    return internalError(res, error);
  }
});

router.post('/', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const normalizedQuantity = Number(quantity);

    if (!productId || typeof productId !== 'string') {
      return badRequest(res, 'A valid productId is required', 'INVALID_PRODUCT_ID');
    }

    const product = await Product.findByPk(productId);
    if (!product) {
      return badRequest(res, 'Product not found', 'PRODUCT_NOT_FOUND');
    }

    if (!Number.isInteger(normalizedQuantity) || normalizedQuantity < 1 || normalizedQuantity > 10) {
      return badRequest(res, 'Quantity must be an integer between 1 and 10', 'INVALID_QUANTITY');
    }

    let cartItem = await CartItem.findOne({ where: { userId: req.user.id, productId } });
    if (cartItem) {
      cartItem.quantity = Math.min(cartItem.quantity + normalizedQuantity, 10);
      await cartItem.save();
    } else {
      cartItem = await CartItem.create({
        userId: req.user.id,
        productId,
        quantity: normalizedQuantity,
        deliveryOptionId: '1',
      });
    }

    res.status(201).json(cartItem);
  } catch (error) {
    return internalError(res, error);
  }
});

router.put('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, deliveryOptionId } = req.body;

    const cartItem = await CartItem.findOne({ where: { userId: req.user.id, productId } });
    if (!cartItem) {
      return notFound(res, 'Cart item not found', 'CART_ITEM_NOT_FOUND');
    }

    if (quantity !== undefined) {
      const normalizedQuantity = parsePositiveInt(quantity);
      if (!normalizedQuantity || normalizedQuantity > 10) {
        return badRequest(res, 'Quantity must be an integer between 1 and 10', 'INVALID_QUANTITY');
      }
      cartItem.quantity = normalizedQuantity;
    }

    if (deliveryOptionId !== undefined) {
      const deliveryOption = await DeliveryOption.findByPk(String(deliveryOptionId));
      if (!deliveryOption) {
        return badRequest(res, 'Invalid delivery option', 'INVALID_DELIVERY_OPTION');
      }
      cartItem.deliveryOptionId = String(deliveryOptionId);
    }

    await cartItem.save();
    res.json(cartItem);
  } catch (error) {
    return internalError(res, error);
  }
});

router.delete('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const cartItem = await CartItem.findOne({ where: { userId: req.user.id, productId } });
    if (!cartItem) {
      return notFound(res, 'Cart item not found', 'CART_ITEM_NOT_FOUND');
    }

    await cartItem.destroy();
    res.status(204).send();
  } catch (error) {
    return internalError(res, error);
  }
});

router.post('/merge', async (req, res) => {
  try {
    const guestItems = Array.isArray(req.body?.items) ? req.body.items : [];
    if (guestItems.length === 0) {
      return res.json({ merged: 0 });
    }

    let merged = 0;
    for (const item of guestItems) {
      const productId = typeof item?.productId === 'string' ? item.productId : '';
      const quantity = Number(item?.quantity);
      if (!productId || !Number.isInteger(quantity) || quantity < 1) {
        continue;
      }

      const product = await Product.findByPk(productId);
      if (!product) continue;
      const clampedQty = Math.min(quantity, 10);

      const existing = await CartItem.findOne({ where: { userId: req.user.id, productId } });
      if (existing) {
        existing.quantity = Math.min(existing.quantity + clampedQty, 10);
        await existing.save();
      } else {
        await CartItem.create({
          userId: req.user.id,
          productId,
          quantity: clampedQty,
          deliveryOptionId: '1',
        });
      }
      merged += 1;
    }

    return res.json({ merged });
  } catch (error) {
    return internalError(res, error);
  }
});

export default router;
