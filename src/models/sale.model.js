const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Sale = sequelize.define("Sale", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  batchId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: "batch_id",
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  qty: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  unitPrice: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: "unit_price",
  },
  total: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  customer: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: "sales",
});

module.exports = Sale;
