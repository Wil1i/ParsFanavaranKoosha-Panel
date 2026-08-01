const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

/**
 * سفارش‌های همگام‌سازی‌شده از فروشگاه اینترنتی (وردپرس/ووکامرس).
 * batchId فعلاً اختیاری است؛ اتصال هر سفارش به یک کشت مشخص، قدم بعدی این قابلیت خواهد بود.
 */
const WebOrder = sequelize.define("WebOrder", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  provider: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: "woocommerce",
  },
  externalOrderId: {
    // شناسه سفارش در ووکامرس
    type: DataTypes.STRING(50),
    allowNull: false,
    field: "external_order_id",
  },
  orderNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: "order_number",
  },
  customerName: {
    type: DataTypes.STRING(200),
    allowNull: true,
    field: "customer_name",
  },
  customerEmail: {
    type: DataTypes.STRING(200),
    allowNull: true,
    field: "customer_email",
  },
  total: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  currency: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  status: {
    // pending | processing | on-hold | completed | cancelled | refunded | failed ...
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  orderDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: "order_date",
  },
  batchId: {
    // اختیاری: اتصال این سفارش به یک کشت مشخص (قابلیت آینده)
    type: DataTypes.UUID,
    allowNull: true,
    field: "batch_id",
  },
  itemsSummary: {
    // خلاصه‌ی خوانا از اقلام سفارش، مثلاً "کمپوست ۱۰ کیلویی × ۲"
    type: DataTypes.TEXT,
    allowNull: true,
    field: "items_summary",
  },
  rawPayload: {
    // کل پاسخ JSON ووکامرس برای این سفارش، برای مراجعه در آینده
    type: DataTypes.TEXT,
    allowNull: true,
    field: "raw_payload",
  },
}, {
  tableName: "web_orders",
  indexes: [
    { unique: true, fields: ["provider", "external_order_id"] },
  ],
});

module.exports = WebOrder;
