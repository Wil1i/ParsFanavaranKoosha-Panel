const { ValidationError, UniqueConstraintError } = require("sequelize");

function notFound(req, res) {
  res.status(404).json({ message: "مسیر مورد نظر یافت نشد." });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err instanceof UniqueConstraintError) {
    return res.status(409).json({ message: "این مقدار قبلاً ثبت شده است (تکراری).", fields: err.fields });
  }
  if (err instanceof ValidationError) {
    return res.status(400).json({ message: "اطلاعات ارسالی معتبر نیست.", errors: err.errors.map(e => e.message) });
  }

  const status = err.status || 500;
  res.status(status).json({ message: err.message || "خطای داخلی سرور." });
}

module.exports = { notFound, errorHandler };
