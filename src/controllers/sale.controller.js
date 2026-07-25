const { Sale, Batch } = require("../models");

exports.list = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.batchId) where.batchId = req.query.batchId;
    const sales = await Sale.findAll({ where, order: [["date", "DESC"]] });
    res.json(sales);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { batchId, date, qty, unitPrice, customer, note } = req.body;
    if (!batchId || !date || !qty || !unitPrice) {
      return res.status(400).json({ message: "کشت، تاریخ، مقدار و قیمت واحد الزامی است." });
    }

    const batch = await Batch.findByPk(batchId);
    if (!batch) return res.status(404).json({ message: "کشت یافت نشد." });

    // soft check: warn (but don't block) if selling more than what's currently sellable
    const soldQty = (await Sale.sum("qty", { where: { batchId } })) || 0;
    const remaining = Number(batch.productionQty) - soldQty;
    const warning = Number(qty) > remaining
      ? `مقدار فروش از باقیمانده قابل فروش (${remaining}) بیشتر است.`
      : undefined;

    const sale = await Sale.create({
      batchId, date, qty, unitPrice,
      total: Number(qty) * Number(unitPrice),
      customer: customer || null,
      note: note || null,
    });

    res.status(201).json({ ...sale.toJSON(), warning });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const sale = await Sale.findByPk(req.params.id);
    if (!sale) return res.status(404).json({ message: "فاکتور فروش یافت نشد." });

    const { date, qty, unitPrice, customer, note } = req.body;
    if (date !== undefined) sale.date = date;
    if (qty !== undefined) sale.qty = qty;
    if (unitPrice !== undefined) sale.unitPrice = unitPrice;
    if (customer !== undefined) sale.customer = customer;
    if (note !== undefined) sale.note = note;
    sale.total = Number(sale.qty) * Number(sale.unitPrice);
    await sale.save();

    res.json(sale);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const sale = await Sale.findByPk(req.params.id);
    if (!sale) return res.status(404).json({ message: "فاکتور فروش یافت نشد." });
    await sale.destroy();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
