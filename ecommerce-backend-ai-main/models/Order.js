import { DataTypes } from "sequelize";
import { sequelize } from "./index.js";

export const Order = sequelize.define(
  "Order",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderTimeMs: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    totalCostCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    deliveryZone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    deliveryAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    shippingMethod: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "standard",
      validate: {
        isIn: {
          args: [["standard", "express"]],
          msg: "Shipping method must be standard or express",
        },
      },
      set(value) {
        const normalized = String(value || "").toLowerCase();
        this.setDataValue("shippingMethod", normalized === "express" ? "express" : "standard");
      },
    },
    shippingMethodFeeCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    products: {
      type: DataTypes.JSON,
      allowNull: false,
    },

    // ── FIX: status column ────────────────────────────────────────────────────
    // allowNull: false  → DB-level constraint, rejects NULL inserts/updates
    // defaultValue      → Sequelize sets 'pending' if status is omitted on create
    // validate.isIn     → Application-level guard, rejects unknown values before
    //                     they ever reach the DB (covers null, undefined, typos)
    // set()             → Last-resort safety: if something passes null through
    //                     JS (e.g. a raw Object.assign), coerce to 'pending'
    // ─────────────────────────────────────────────────────────────────────────
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "pending",
      validate: {
        isIn: {
          args: [["pending", "processing", "shipped", "delivered", "cancelled"]],
          msg: "Status must be one of: pending, processing, shipped, delivered, cancelled",
        },
        notNull: {
          msg: "Status cannot be null",
        },
      },
      // Setter coerces null/undefined → 'pending' at the JS layer
      set(value) {
        const allowed = ["pending", "processing", "shipped", "delivered", "cancelled"];
        this.setDataValue("status", allowed.includes(value) ? value : "pending");
      },
    },

    paypalOrderId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    flutterwaveTransactionId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    paymentStatus: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "unpaid",
      validate: {
        isIn: {
          args: [["unpaid", "paid", "failed"]],
          msg: "Payment status must be one of: unpaid, paid, failed",
        },
      },
      set(value) {
        const allowed = ["unpaid", "paid", "failed"];
        this.setDataValue("paymentStatus", allowed.includes(value) ? value : "unpaid");
      },
    },
    createdAt: {
      type: DataTypes.DATE(3),
    },
    updatedAt: {
      type: DataTypes.DATE(3),
    },
  },
  {
    defaultScope: {
      order: [["createdAt", "ASC"]],
    },

    // ── Model-level hook: sanitize status on every save ───────────────────────
    // This catches bulk operations and any path that bypasses the setter above
    hooks: {
      beforeSave: (order) => {
        const allowed = ["pending", "processing", "shipped", "delivered", "cancelled"];
        if (!order.status || !allowed.includes(order.status)) {
          order.status = "pending";
        }
      },
      beforeBulkCreate: (orders) => {
        const allowed = ["pending", "processing", "shipped", "delivered", "cancelled"];
        orders.forEach((order) => {
          if (!order.status || !allowed.includes(order.status)) {
            order.status = "pending";
          }
        });
      },
      beforeBulkUpdate: (options) => {
        if (options.attributes && options.attributes.status !== undefined) {
          const allowed = ["pending", "processing", "shipped", "delivered", "cancelled"];
          if (!allowed.includes(options.attributes.status)) {
            options.attributes.status = "pending";
          }
        }
      },
    },
  },
);