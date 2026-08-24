const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

/**
 * هر فاکتور فروش می‌تواند چند روش پرداخت مختلف داشته باشد
 * (مثلاً بخشی نقد، بخشی کارت‌به‌کارت)، هرکدام با شماره پیگیری مخصوص خودش.
 */
const Payment = sequelize.define("Payment", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  saleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: "sale_id",
  },
  method: {
    // نقدی | کارت به کارت | انتقال بانکی (شبا) | چک | سایر
    type: DataTypes.STRING(40),
    allowNull: false,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  trackingNumber: {
    // شماره پیگیری رسید همین روش پرداخت
    type: DataTypes.STRING(100),
    allowNull: true,
    field: "tracking_number",
  },
}, {
  tableName: "payments",
});

module.exports = Payment;
