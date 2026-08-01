const sequelize = require("../config/db");
const User = require("./user.model");
const Batch = require("./batch.model");
const Item = require("./item.model");
const Purchase = require("./purchase.model");
const Sale = require("./sale.model");
const ActivityLog = require("./activityLog.model");
const IntegrationSetting = require("./integrationSetting.model");
const WebOrder = require("./webOrder.model");
const Customer = require("./customer.model");

// --- associations ---
Batch.hasMany(Purchase, { foreignKey: "batchId", as: "purchases", onDelete: "CASCADE" });
Purchase.belongsTo(Batch, { foreignKey: "batchId", as: "batch" });

Batch.hasMany(Sale, { foreignKey: "batchId", as: "sales", onDelete: "CASCADE" });
Sale.belongsTo(Batch, { foreignKey: "batchId", as: "batch" });

Item.hasMany(Purchase, { foreignKey: "itemId", as: "purchases" });
Purchase.belongsTo(Item, { foreignKey: "itemId", as: "item" });

User.hasMany(ActivityLog, { foreignKey: "userId", as: "logs", onDelete: "SET NULL" });
ActivityLog.belongsTo(User, { foreignKey: "userId", as: "user" });

Batch.hasMany(WebOrder, { foreignKey: "batchId", as: "webOrders" });
WebOrder.belongsTo(Batch, { foreignKey: "batchId", as: "batch" });

Customer.hasMany(Sale, { foreignKey: "customerId", as: "sales", onDelete: "SET NULL" });
Sale.belongsTo(Customer, { foreignKey: "customerId", as: "customerRecord" });

module.exports = { sequelize, User, Batch, Item, Purchase, Sale, ActivityLog, IntegrationSetting, WebOrder, Customer };
