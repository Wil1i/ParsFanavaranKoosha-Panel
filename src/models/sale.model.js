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
  unit: {
    // واحد این فاکتور فروش (کیلوگرم/تن/کیسه/عدد/...)؛ در صورت خالی بودن، واحد پیش‌فرض کشت استفاده می‌شود
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  total: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  customer: {
    // نام مشتری به‌صورت اسنپ‌شات (حتی اگر بعداً مشتری حذف/ویرایش شود، در فاکتور ثابت می‌ماند)
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  customerId: {
    // اتصال اختیاری به رکورد مشتری در بخش «مشتریان»
    type: DataTypes.UUID,
    allowNull: true,
    field: "customer_id",
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: "sales",
});

module.exports = Sale;
