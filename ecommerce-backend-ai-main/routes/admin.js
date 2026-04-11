import express from 'express';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { ShippingConfig } from '../models/ShippingConfig.js';
import { requireAdmin } from '../middleware/auth.js';
import { internalError } from '../utils/http.js';

import { sequelize } from '../models/index.js';

const router = express.Router();

router.post('/repair-db', requireAdmin, async (req, res) => {
  try {
    await sequelize.sync({ alter: true });
    res.json({ message: 'Database schema repaired and synced.' });
  } catch (error) {
    return internalError(res, error);
  }
});

router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const totalProducts = await Product.count();
    const totalOrders = await Order.count();
    const totalUsers = await User.count();
    
    const orders = await Order.findAll();
    const totalRevenueCents = orders.reduce((sum, order) => sum + order.totalCostCents, 0);

    // Get recent orders (last 5)
    const recentOrders = await Order.unscoped().findAll({
      limit: 5,
      order: [['orderTimeMs', 'DESC']]
    });

    res.json({
      stats: {
        totalProducts,
        totalOrders,
        totalUsers,
        totalRevenueCents
      },
      recentOrders
    });
  } catch (error) {
    return internalError(res, error);
  }
});

router.get('/shipping-configs', requireAdmin, async (_req, res) => {
  try {
    const rows = await ShippingConfig.findAll({
      order: [['zoneKey', 'ASC'], ['method', 'ASC']],
    });
    return res.json(rows);
  } catch (error) {
    return internalError(res, error);
  }
});

router.put('/shipping-configs/:id', requireAdmin, async (req, res) => {
  try {
    const row = await ShippingConfig.findByPk(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Shipping config not found', code: 'SHIPPING_CONFIG_NOT_FOUND' });
    }
    const usdFeeCents = Number(req.body?.usdFeeCents);
    const ngnFee = Number(req.body?.ngnFee);
    if (!Number.isFinite(usdFeeCents) || usdFeeCents < 0 || !Number.isFinite(ngnFee) || ngnFee < 0) {
      return res.status(400).json({ error: 'Invalid shipping fee values', code: 'INVALID_SHIPPING_FEE' });
    }
    row.usdFeeCents = Math.round(usdFeeCents);
    row.ngnFee = Math.round(ngnFee);
    await row.save();
    return res.json(row);
  } catch (error) {
    return internalError(res, error);
  }
});

export default router;
