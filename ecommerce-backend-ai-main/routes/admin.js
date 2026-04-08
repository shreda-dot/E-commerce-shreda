import express from 'express';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
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

export default router;
