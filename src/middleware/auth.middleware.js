const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "توکن احراز هویت ارسال نشده است." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, username, fullName, isAdmin, canAccessBatches, canAccessWarehouse, isWarehouseManager }
    next();
  } catch (err) {
    return res.status(401).json({ message: "توکن نامعتبر یا منقضی شده است." });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: "فقط مدیر سیستم به این بخش دسترسی دارد." });
  }
  next();
}

/**
 * Requires the authenticated user to have access to a specific panel section.
 * Admins always pass. For "warehouse", either the basic view/decrement access
 * (canAccessWarehouse) or full warehouse-manager access lets the request through.
 * @param {"batches"|"warehouse"} section
 */
function requireAccess(section) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "احراز هویت لازم است." });
    }
    if (req.user.isAdmin) return next();

    const allowed =
      section === "batches"
        ? req.user.canAccessBatches
        : (req.user.canAccessWarehouse || req.user.isWarehouseManager);

    if (!allowed) {
      return res.status(403).json({ message: "شما به این بخش دسترسی ندارید." });
    }
    next();
  };
}

/**
 * Full warehouse permissions: adding/editing/deleting items and increasing stock.
 * Basic canAccessWarehouse users do NOT pass this (they can only view and decrement).
 */
function requireWarehouseManager(req, res, next) {
  if (!req.user || !(req.user.isAdmin || req.user.isWarehouseManager)) {
    return res.status(403).json({ message: "فقط مدیر انبار یا مدیر سیستم به این عملیات دسترسی دارد." });
  }
  next();
}

module.exports = { authenticate, requireAdmin, requireAccess, requireWarehouseManager };
