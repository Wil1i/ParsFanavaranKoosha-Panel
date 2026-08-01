const { Op } = require("sequelize");
const { WebOrder, Batch } = require("../models");

exports.list = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));

    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.q) {
      where[Op.or] = [
        { customerName: { [Op.like]: `%${req.query.q}%` } },
        { orderNumber: { [Op.like]: `%${req.query.q}%` } },
      ];
    }

    const { count, rows } = await WebOrder.findAndCountAll({
      where,
      order: [["orderDate", "DESC"]],
      limit,
      offset: (page - 1) * limit,
      include: [{ model: Batch, as: "batch", attributes: ["id", "name"] }],
    });

    const totalRevenue = await WebOrder.sum("total", { where }) || 0;

    res.json({ total: count, page, limit, totalRevenue, orders: rows });
  } catch (err) {
    next(err);
  }
};

exports.assignBatch = async (req, res, next) => {
  try {
    const order = await WebOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: "سفارش یافت نشد." });
    order.batchId = req.body.batchId || null;
    await order.save();
    res.json(order);
  } catch (err) {
    next(err);
  }
};
