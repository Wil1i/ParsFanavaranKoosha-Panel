const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

/**
 * هر فاکتور فروش یا خرید می‌تواند چند روش پرداخت مختلف داشته باشد
 * (مثلاً بخشی نقد، بخشی کارت‌به‌کارت، بخشی چک)، هرکدام با شماره پیگیری مخصوص خودش.
 * saleId یعنی این پرداخت «دریافتی» است (از مشتری)، purchaseId یعنی «پرداختی» است (به تامین‌کننده).
 */
const Payment = sequelize.define("Payment", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  saleId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: "sale_id",
  },
  purchaseId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: "purchase_id",
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
    // شماره پیگیری رسید همین روش پرداخت؛ برای روش «چک» همان شماره صیادی است
    type: DataTypes.STRING(100),
    allowNull: true,
    field: "tracking_number",
  },
  dueDate: {
    // فقط برای روش پرداخت «چک»: تاریخ سررسید
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: "due_date",
  },
}, {
  tableName: "payments",
});

module.exports = Payment;
