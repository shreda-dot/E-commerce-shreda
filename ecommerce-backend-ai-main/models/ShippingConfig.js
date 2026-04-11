import { DataTypes } from "sequelize";
import { sequelize } from "./index.js";

export const ShippingConfig = sequelize.define(
  "ShippingConfig",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    zoneKey: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    method: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "standard",
      validate: {
        isIn: {
          args: [["standard", "express"]],
          msg: "Method must be standard or express",
        },
      },
      set(value) {
        const normalized = String(value || "").toLowerCase();
        this.setDataValue("method", normalized === "express" ? "express" : "standard");
      },
    },
    usdFeeCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    ngnFee: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdAt: {
      type: DataTypes.DATE(3),
    },
    updatedAt: {
      type: DataTypes.DATE(3),
    },
  },
  {
    indexes: [
      {
        // unique: true,
        fields: ["zoneKey", "method"],
        name: "shipping_config_zone_method_unique",
      },
    ],
  },
);
