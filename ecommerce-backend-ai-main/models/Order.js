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
    products: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "pending",
      allowNull: false,
    },
    paypalOrderId: {
      type: DataTypes.STRING,
      allowNull: true,
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
  },
);
