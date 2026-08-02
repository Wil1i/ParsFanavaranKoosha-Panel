const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Item = sequelize.define("Item", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
  },
  unit: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: "کیلوگرم",
  },
  stock: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  location: {
    // محل نگهداری کالا در انبار (مثلاً سالن ۱ - قفسه ۳)
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  lowStockThreshold: {
    // اگر موجودی به این عدد یا کمتر برسد، کالا «رو به اتمام» محسوب و در داشبورد نشان داده می‌شود
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 10,
    field: "low_stock_threshold",
  },
}, {
  tableName: "items",
});

module.exports = Item;
