const { User } = require("../models");
const { logActivity } = require("../utils/activityLogger");

exports.list = async (req, res, next) => {
  try {
    const users = await User.findAll({ order: [["createdAt", "DESC"]] });
    res.json(users);
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "کاربر یافت نشد." });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { fullName, username, password, role, canAccessBatches, canAccessWarehouse, isAdmin } = req.body;
    if (!fullName || !username || !password) {
      return res.status(400).json({ message: "نام و نام خانوادگی، نام کاربری و کلمه عبور الزامی است." });
    }
    const user = await User.create({
      fullName,
      username,
      password,
      role: role || null,
      canAccessBatches: !!canAccessBatches,
      canAccessWarehouse: !!canAccessWarehouse,
      isAdmin: !!isAdmin,
    });
    const { password: _pw, ...safeUser } = user.toJSON();

    await logActivity({
      user: req.user, action: "USER_CREATE", entityType: "user", entityId: user.id,
      description: `کاربر «${user.fullName}» (${user.username}) ایجاد شد.`,
    });

    res.status(201).json(safeUser);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "کاربر یافت نشد." });

    const { fullName, username, password, role, canAccessBatches, canAccessWarehouse, isAdmin } = req.body;

    if (fullName !== undefined) user.fullName = fullName;
    if (username !== undefined) user.username = username;
    if (role !== undefined) user.role = role;
    if (canAccessBatches !== undefined) user.canAccessBatches = !!canAccessBatches;
    if (canAccessWarehouse !== undefined) user.canAccessWarehouse = !!canAccessWarehouse;
    if (isAdmin !== undefined) user.isAdmin = !!isAdmin;
    const passwordChanged = !!password;
    if (password) user.password = password; // hashed by the beforeUpdate hook

    await user.save();
    const { password: _pw, ...safeUser } = user.toJSON();

    await logActivity({
      user: req.user, action: "USER_UPDATE", entityType: "user", entityId: user.id,
      description: `کاربر «${user.fullName}» (${user.username}) ویرایش شد${passwordChanged ? " (کلمه عبور نیز تغییر کرد)" : ""}.`,
    });

    res.json(safeUser);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "کاربر یافت نشد." });

    if (user.id === req.user.id) {
      return res.status(400).json({ message: "نمی‌توانید حساب کاربری خودتان را حذف کنید." });
    }

    await user.destroy();
    await logActivity({
      user: req.user, action: "USER_DELETE", entityType: "user", entityId: user.id,
      description: `کاربر «${user.fullName}» (${user.username}) حذف شد.`,
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
