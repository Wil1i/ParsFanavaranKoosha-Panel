const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { logActivity } = require("../utils/activityLogger");

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      isAdmin: user.isAdmin,
      canAccessBatches: user.canAccessBatches,
      canAccessWarehouse: user.canAccessWarehouse,
      isWarehouseManager: user.isWarehouseManager,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "نام کاربری و کلمه عبور الزامی است." });
    }

    const user = await User.scope("withPassword").findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: "نام کاربری یا کلمه عبور اشتباه است." });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ message: "نام کاربری یا کلمه عبور اشتباه است." });
    }

    const token = signToken(user);
    const { password: _pw, ...safeUser } = user.toJSON();
    await logActivity({
      user: safeUser,
      action: "LOGIN",
      entityType: "auth",
      entityId: user.id,
      description: `کاربر «${user.fullName}» (${user.username}) وارد سیستم شد.`,
    });
    res.json({ token, user: safeUser });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "کاربر یافت نشد." });
    res.json(user);
  } catch (err) {
    next(err);
  }
};
