const { Batch, Item, Purchase, Sale, User, Payment } = require("../models");
const { batchMeta } = require("../utils/batchMeta");

exports.summary = async (req, res, next) => {
  try {
    const out = { generatedAt: new Date().toISOString() };

    if (req.user.isAdmin || req.user.canAccessBatches) {
      const batches = await Batch.findAll({ order: [["startDate", "ASC"]] });
      const purchases = await Purchase.findAll({ order: [["date", "DESC"]] });
      const sales = await Sale.findAll({ order: [["date", "DESC"]] });

      const nameById = {};
      batches.forEach((b) => { nameById[b.id] = b.name; });

      const purchaseCostByBatch = {};
      purchases.forEach((p) => {
        purchaseCostByBatch[p.batchId] = (purchaseCostByBatch[p.batchId] || 0) + Number(p.total);
      });
      const soldQtyByBatch = {};
      const revenueByBatch = {};
      sales.forEach((s) => {
        soldQtyByBatch[s.batchId] = (soldQtyByBatch[s.batchId] || 0) + Number(s.qty);
        revenueByBatch[s.batchId] = (revenueByBatch[s.batchId] || 0) + Number(s.total);
      });

      let totalProduction = 0, totalSold = 0, totalRemaining = 0;
      let totalPurchaseCost = 0, totalRevenue = 0, readyCount = 0, activeCount = 0;

      const batchRows = batches.map((b) => {
        const meta = batchMeta(b);
        const soldQty = soldQtyByBatch[b.id] || 0;
        const revenue = revenueByBatch[b.id] || 0;
        const purchaseCost = purchaseCostByBatch[b.id] || 0;
        const remaining = Number(b.productionQty) - soldQty;

        totalProduction += Number(b.productionQty);
        totalSold += soldQty;
        totalRemaining += remaining;
        totalPurchaseCost += purchaseCost;
        totalRevenue += revenue;
        if (meta.isReady) readyCount += 1; else activeCount += 1;

        return {
          id: b.id, name: b.name, unit: b.unit, startDate: b.startDate, readyDays: b.readyDays,
          ...meta, productionQty: b.productionQty, soldQty, revenue, purchaseCost,
          remaining, profit: revenue - purchaseCost,
        };
      });

      const upcoming = batchRows
        .filter((b) => !b.isReady)
        .sort((a, c) => a.daysRemaining - c.daysRemaining)
        .slice(0, 5);

      const recentPurchases = purchases.slice(0, 6).map((p) => ({
        ...p.toJSON(), batchName: nameById[p.batchId] || "—",
      }));
      const recentSales = sales.slice(0, 6).map((s) => ({
        ...s.toJSON(), batchName: nameById[s.batchId] || "—",
      }));

      out.batches = {
        totalBatches: batches.length,
        readyCount,
        activeCount,
        totalProduction,
        totalSold,
        totalRemaining,
        totalPurchaseCost,
        totalRevenue,
        totalProfit: totalRevenue - totalPurchaseCost,
        upcoming,
        recentPurchases,
        recentSales,
      };

      // چک‌هایی که سررسیدشان نزدیک است (یا از قبل گذشته و هنوز در پنل ثبت مانده)
      const cheques = await Payment.findAll({
        where: { method: "چک" },
        include: [
          { model: Sale, as: "sale", include: [{ model: Batch, as: "batch", attributes: ["id", "name"] }] },
          { model: Purchase, as: "purchase", include: [{ model: Batch, as: "batch", attributes: ["id", "name"] }] },
        ],
      });

      const today = new Date().toISOString().slice(0, 10);
      const horizon = new Date();
      horizon.setDate(horizon.getDate() + 14);
      const horizonStr = horizon.toISOString().slice(0, 10);

      const upcomingCheques = cheques
        .filter((p) => p.dueDate && (p.saleId || p.purchaseId) && p.dueDate <= horizonStr)
        .map((p) => {
          const direction = p.saleId ? "received" : "paid";
          const source = p.saleId ? p.sale : p.purchase;
          const batch = source && source.batch ? source.batch : null;
          return {
            id: p.id,
            direction,
            amount: p.amount,
            sayadNumber: p.trackingNumber,
            dueDate: p.dueDate,
            isOverdue: p.dueDate < today,
            batchName: batch ? batch.name : null,
            counterparty: direction === "received" ? (source ? source.customer : null) : (source ? source.supplier : null),
          };
        })
        .sort((a, c) => (a.dueDate < c.dueDate ? -1 : a.dueDate > c.dueDate ? 1 : 0))
        .slice(0, 8);

      out.upcomingCheques = upcomingCheques;
    }

    if (req.user.isAdmin || req.user.canAccessWarehouse || req.user.isWarehouseManager) {
      const items = await Item.findAll({ order: [["name", "ASC"]] });
      const lowStock = items.filter((it) => Number(it.stock) > 0 && Number(it.stock) <= Number(it.lowStockThreshold));
      const outOfStock = items.filter((it) => Number(it.stock) <= 0);

      out.warehouse = {
        totalItems: items.length,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
        lowStockItems: lowStock.slice(0, 8),
        outOfStockItems: outOfStock.slice(0, 8),
      };
    }

    if (req.user.isAdmin) {
      const users = await User.findAll();
      out.users = {
        totalUsers: users.length,
        adminCount: users.filter((u) => u.isAdmin).length,
        batchesAccessCount: users.filter((u) => u.canAccessBatches).length,
        warehouseAccessCount: users.filter((u) => u.canAccessWarehouse).length,
        warehouseManagerCount: users.filter((u) => u.isWarehouseManager).length,
      };
    }

    res.json(out);
  } catch (err) {
    next(err);
  }
};
