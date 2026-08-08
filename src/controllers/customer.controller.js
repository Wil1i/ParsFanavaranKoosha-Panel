const { Op } = require("sequelize");
const { Customer, Sale, Purchase, Batch, sequelize } = require("../models");
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

/**
 * همه‌ی فاکتورهای فروش و خرید مرتبط با این مشتری.
 * فاکتورهای فروش از طریق customerId (اتصال رسمی) پیدا می‌شوند.
 * فاکتورهای خرید اتصال رسمی به مشتری ندارند (فیلد «تامین‌کننده» فقط متنی است)؛
 * اگر همین شخص به‌عنوان تامین‌کننده هم در فاکتورهای خرید ثبت شده باشد (تطبیق نام)، اینجا نشان داده می‌شود.
 */
exports.invoices = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: "مشتری یافت نشد." });

    const sales = await Sale.findAll({
      where: { customerId: customer.id },
      order: [["date", "DESC"]],
      include: [{ model: Batch, as: "batch", attributes: ["id", "name"] }],
    });

    const purchases = await Purchase.findAll({
      where: sequelize.where(
        sequelize.fn("LOWER", sequelize.col("supplier")),
        customer.fullName.trim().toLowerCase()
      ),
      order: [["date", "DESC"]],
      include: [{ model: Batch, as: "batch", attributes: ["id", "name"] }],
    });

    res.json({ customer, sales, purchases });
  } catch (err) {
    next(err);
  }
};
