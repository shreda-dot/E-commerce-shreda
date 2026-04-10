import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { sequelize } from "./models/index.js";
import productRoutes from "./routes/products.js";
import deliveryOptionRoutes from "./routes/deliveryOptions.js";
import cartItemRoutes from "./routes/cartItems.js";
import orderRoutes from "./routes/orders.js";
import flutterwaveRoutes from "./routes/flutterwave.js";
import resetRoutes from "./routes/reset.js";
import paymentSummaryRoutes from "./routes/paymentSummary.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import healthRoutes from "./routes/health.js";
import userRoutes from "./routes/users.js";
import exchangeRateRoutes from "./routes/exchangeRate.js";
import { Product } from "./models/Product.js";
import { DeliveryOption } from "./models/DeliveryOption.js";
import { Order } from "./models/Order.js";
import { defaultProducts } from "./defaultData/defaultProducts.js";
import { defaultDeliveryOptions } from "./defaultData/defaultDeliveryOptions.js";
import { defaultOrders } from "./defaultData/defaultOrders.js";
import fs from "fs";
import { User } from "./models/User.js";
import { hashPassword, isValidPasswordPolicy } from "./utils/auth.js";

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS configuration.
//
// Single-service deployment (recommended): frontend and API are on the same
// Render domain, so browser requests are same-origin — CORS headers are never
// sent and credentials/cookies work automatically. No env var required.
//
// Two-service deployment: set FRONTEND_URL=https://your-frontend.onrender.com
// in Render's environment variables. The handler below will then restrict
// cross-origin requests to that exact origin.
//
// Local development: FRONTEND_URL is unset, so origin:true allows the Vite
// dev-server (localhost:5173) to reach the backend (localhost:3000).
const allowedOrigin = process.env.FRONTEND_URL;
app.use(
  cors({
    origin: allowedOrigin
      ? (origin, cb) => {
          // Allow server-to-server calls (no Origin header) and the specified frontend
          if (!origin || origin === allowedOrigin) return cb(null, true);
          cb(new Error(`CORS: origin ${origin} not allowed`));
        }
      : true,
    credentials: true,
  }),
);
app.use(express.json());

// Serve images from the images folder
app.use("/images", express.static(path.join(__dirname, "images")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Use routes
app.use("/api/products", productRoutes);
app.use("/api/delivery-options", deliveryOptionRoutes);
app.use("/api/cart-items", cartItemRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/flutterwave", flutterwaveRoutes);
app.use("/api/reset", resetRoutes);
app.use("/api/payment-summary", paymentSummaryRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/users", userRoutes);
app.use("/api/exchange-rate", exchangeRateRoutes);

app.use("/api/*", (req, res) => {
  return res
    .status(404)
    .json({ error: "API route not found", code: "API_NOT_FOUND" });
});

// Serve the compiled React app's static assets (JS, CSS, images …)
// The frontend Vite build outputs directly into this folder.
const DIST = path.join(__dirname, "dist");
app.use(express.static(DIST));

// Wildcard catch-all: send index.html for every non-API, non-file route so
// that React Router can handle navigation on the client side (e.g. /cart,
// /account, /checkout won't 404 on a hard refresh).
app.get("*", (req, res) => {
  const indexPath = path.join(DIST, "index.html");
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  // dist/index.html missing → the frontend hasn't been built yet
  res.status(503).send(
    "Frontend not built. Run: cd ecommerce-project-main && npm run build"
  );
});

// Error handling middleware
/* eslint-disable no-unused-vars */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});
/* eslint-enable no-unused-vars */

// Sync database and load default data if none exist
// SQLite doesn't support ALTER TABLE with active FK constraints, so we
// temporarily disable them during sync to prevent SequelizeDatabaseError.
if (sequelize.getDialect() === 'sqlite') {
  await sequelize.query('PRAGMA foreign_keys = OFF;');
}
await sequelize.sync({ alter: true });
if (sequelize.getDialect() === 'sqlite') {
  await sequelize.query('PRAGMA foreign_keys = ON;');
}

const productCount = await Product.count();
if (productCount === 0) {
  const timestamp = Date.now();

  const productsWithTimestamps = defaultProducts.map((product, index) => ({
    ...product,
    createdAt: new Date(timestamp + index),
    updatedAt: new Date(timestamp + index),
  }));

  const deliveryOptionsWithTimestamps = defaultDeliveryOptions.map(
    (option, index) => ({
      ...option,
      createdAt: new Date(timestamp + index),
      updatedAt: new Date(timestamp + index),
    }),
  );

  const ordersWithTimestamps = defaultOrders.map((order, index) => ({
    ...order,
    createdAt: new Date(timestamp + index),
    updatedAt: new Date(timestamp + index),
  }));

  await Product.bulkCreate(productsWithTimestamps);
  await DeliveryOption.bulkCreate(deliveryOptionsWithTimestamps);
  await Order.bulkCreate(ordersWithTimestamps);

  console.log("Default data added to the database.");
}

const userCount = await User.count();
if (userCount === 0) {
  const adminEmail = (
    process.env.ADMIN_EMAIL || "ezinwaugochukw@gmail.com"
  ).toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@12345";
  if (!isValidPasswordPolicy(adminPassword)) {
    throw new Error("ADMIN_PASSWORD does not meet standard password policy");
  }

  const passwordHash = await hashPassword(adminPassword);
  await User.create({
    name: "Admin",
    email: adminEmail,
    passwordHash,
    role: "admin",
    status: "active",
    isVerified: true,
  });

  console.log(`Default admin created: ${adminEmail}`);
}

// Ensure configured admin account is always verified and admin-role.
const configuredAdminEmail = (
  process.env.ADMIN_EMAIL || "ezinwaugochukw@gmail.com"
).toLowerCase();
const existingAdmin = await User.findOne({
  where: { email: configuredAdminEmail },
});
if (existingAdmin) {
  let changed = false;
  if (existingAdmin.role !== "admin") {
    existingAdmin.role = "admin";
    changed = true;
  }
  if (!existingAdmin.isVerified) {
    existingAdmin.isVerified = true;
    changed = true;
  }
  if (existingAdmin.status !== "active") {
    existingAdmin.status = "active";
    changed = true;
  }
  if (!existingAdmin.name) {
    existingAdmin.name = "Admin";
    changed = true;
  }
  if (changed) {
    existingAdmin.verificationCode = null;
    existingAdmin.verificationCodeExpiresAt = null;
    await existingAdmin.save();
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
