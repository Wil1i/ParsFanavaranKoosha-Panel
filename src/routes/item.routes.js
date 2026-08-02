const router = require("express").Router();
const ctrl = require("../controllers/item.controller");
const { authenticate, requireAccess, requireWarehouseManager } = require("../middleware/auth.middleware");

router.use(authenticate, requireAccess("warehouse"));

router.get("/", ctrl.list);
router.post("/", requireWarehouseManager, ctrl.create);
router.put("/:id", requireWarehouseManager, ctrl.update);
router.delete("/:id", requireWarehouseManager, ctrl.remove);
// افزایش موجودی فقط برای مدیر انبار/ادمین؛ کاهش موجودی برای هر کاربر دارای دسترسی پایه انبار هم مجاز است
// (بررسی دقیق بر اساس علامت delta داخل خودِ کنترلر انجام می‌شود)
router.patch("/:id/stock", ctrl.adjustStock);

module.exports = router;
