const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Purchase = sequelize.define("Purchase", {
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
  itemId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: "item_id",
  },
  itemName: {
    // snapshot of the item name at invoice time
    type: DataTypes.STRING(150),
    allowNull: false,
    field: "item_name",
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  qty: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  unit: {
    type: DataTypes.STRING(30),
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
  paidAmount: {
    // مجموع خودکار از روش‌های پرداخت (payments) این فاکتور خرید — پرداختی به تامین‌کننده
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    field: "paid_amount",
  },
  supplier: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: "purchases",
});

module.exports = Purchase;
