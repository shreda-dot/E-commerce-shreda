import express from 'express';
import { sequelize } from '../models/index.js';
import { Product } from '../models/Product.js';
import { DeliveryOption } from '../models/DeliveryOption.js';
import { CartItem } from '../models/CartItem.js';
import { Order } from '../models/Order.js';
import { defaultProducts } from '../defaultData/defaultProducts.js';
import { defaultDeliveryOptions } from '../defaultData/defaultDeliveryOptions.js';
import { defaultCart } from '../defaultData/defaultCart.js';
import { defaultOrders } from '../defaultData/defaultOrders.js';
import { internalError } from '../utils/http.js';
import { User } from '../models/User.js';
import { hashPassword, isValidPasswordPolicy } from '../utils/auth.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/', requireAdmin, async (req, res) => {
  try {
    await sequelize.sync({ force: true });

    const timestamp = Date.now();

    const productsWithTimestamps = defaultProducts.map((product, index) => ({
      ...product,
      createdAt: new Date(timestamp + index),
      updatedAt: new Date(timestamp + index)
    }));

    const deliveryOptionsWithTimestamps = defaultDeliveryOptions.map((option, index) => ({
      ...option,
      createdAt: new Date(timestamp + index),
      updatedAt: new Date(timestamp + index)
    }));

    const cartItemsWithTimestamps = defaultCart.map((item, index) => ({
      ...item,
      createdAt: new Date(timestamp + index),
      updatedAt: new Date(timestamp + index)
    }));

    const ordersWithTimestamps = defaultOrders.map((order, index) => ({
      ...order,
      createdAt: new Date(timestamp + index),
      updatedAt: new Date(timestamp + index)
    }));

    await Product.bulkCreate(productsWithTimestamps);
    await DeliveryOption.bulkCreate(deliveryOptionsWithTimestamps);
    await CartItem.bulkCreate(cartItemsWithTimestamps);
    await Order.bulkCreate(ordersWithTimestamps);

    const adminEmail = (process.env.ADMIN_EMAIL || 'ezinwaugochukw@gmail.com').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
    if (!isValidPasswordPolicy(adminPassword)) {
      throw new Error('ADMIN_PASSWORD does not meet standard password policy');
    }
    const passwordHash = await hashPassword(adminPassword);
    await User.create({
      name: 'Admin',
      email: adminEmail,
      passwordHash,
      role: 'admin',
      status: 'active',
      isVerified: true
    });

    res.status(204).send();
  } catch (error) {
    return internalError(res, error);
  }
});

export default router;
