const { Op } = require("sequelize");
const { Customer } = require("../models");
const { logActivity } = require("../utils/activityLogger");

exports.list = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.q) {
      where[Op.or] = [
        { fullName: { [Op.like]: `%${req.query.q}%` } },
        { phone: { [Op.like]: `%${req.query.q}%` } },
      ];
    }
    const customers = await Customer.findAll({ where, order: [["fullName", "ASC"]] });
    res.json(customers);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { fullName, phone, address } = req.body;
    if (!fullName) return res.status(400).json({ message: "نام و نام خانوادگی مشتری الزامی است." });

    const customer = await Customer.create({
      fullName, phone: phone || null, address: address || null,
    });

    await logActivity({
      user: req.user, action: "CUSTOMER_CREATE", entityType: "customer", entityId: customer.id,
      description: `مشتری «${customer.fullName}» ایجاد شد.`,
    });

    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: "مشتری یافت نشد." });

    const { fullName, phone, address } = req.body;
    if (fullName !== undefined) customer.fullName = fullName;
    if (phone !== undefined) customer.phone = phone;
    if (address !== undefined) customer.address = address;
    await customer.save();

    await logActivity({
      user: req.user, action: "CUSTOMER_UPDATE", entityType: "customer", entityId: customer.id,
      description: `مشتری «${customer.fullName}» ویرایش شد.`,
    });

    res.json(customer);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: "مشتری یافت نشد." });

    await customer.destroy();

    await logActivity({
      user: req.user, action: "CUSTOMER_DELETE", entityType: "customer", entityId: customer.id,
      description: `مشتری «${customer.fullName}» حذف شد.`,
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
