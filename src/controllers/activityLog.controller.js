const { Op } = require("sequelize");
const { ActivityLog } = require("../models");

exports.list = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));

    const where = {};
    if (req.query.userId) where.userId = req.query.userId;
    if (req.query.action) where.action = req.query.action;
    if (req.query.entityType) where.entityType = req.query.entityType;
    if (req.query.q) where.description = { [Op.like]: `%${req.query.q}%` };
    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) where.createdAt[Op.gte] = new Date(req.query.from + "T00:00:00");
      if (req.query.to) where.createdAt[Op.lte] = new Date(req.query.to + "T23:59:59");
    }

    const { count, rows } = await ActivityLog.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset: (page - 1) * limit,
    });

    res.json({ total: count, page, limit, logs: rows });
  } catch (err) {
    next(err);
  }
};
