const router = require("express").Router();
const ctrl = require("../controllers/cheque.controller");
const { authenticate, requireAccess } = require("../middleware/auth.middleware");

// چک‌ها با فاکتورهای خرید/فروش مرتبط‌اند، پس همان دسترسی «کشت‌ها» را می‌طلبند
router.use(authenticate, requireAccess("batches"));

router.get("/", ctrl.list); // ?status=overdue|upcoming  &direction=received|paid

module.exports = router;
