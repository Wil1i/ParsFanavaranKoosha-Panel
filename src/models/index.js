const sequelize = require("../config/db");
const User = require("./user.model");
const Batch = require("./batch.model");
const Item = require("./item.model");
const Purchase = require("./purchase.model");
const Sale = require("./sale.model");

// --- associations ---
Batch.hasMany(Purchase, { foreignKey: "batchId", as: "purchases", onDelete: "CASCADE" });
Purchase.belongsTo(Batch, { foreignKey: "batchId", as: "batch" });

Batch.hasMany(Sale, { foreignKey: "batchId", as: "sales", onDelete: "CASCADE" });
Sale.belongsTo(Batch, { foreignKey: "batchId", as: "batch" });

Item.hasMany(Purchase, { foreignKey: "itemId", as: "purchases" });
Purchase.belongsTo(Item, { foreignKey: "itemId", as: "item" });

module.exports = { sequelize, User, Batch, Item, Purchase, Sale };
