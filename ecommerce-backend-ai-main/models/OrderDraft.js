import { DataTypes } from "sequelize";
import { sequelize } from "./index.js";

export const OrderDraft = sequelize.define("OrderDraft", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  payload: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  totalCostCents: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  expiresAt: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  createdAt: {
    type: DataTypes.DATE(3),
  },
  updatedAt: {
    type: DataTypes.DATE(3),
  },
});
