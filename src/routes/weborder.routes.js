const router = require("express").Router();
const ctrl = require("../controllers/weborder.controller");
const { authenticate, requireAdmin } = require("../middleware/auth.middleware");

// فعلاً فقط ادمین؛ در آینده می‌توان به canAccessBatches هم باز کرد.
router.use(authenticate, requireAdmin);

router.get("/", ctrl.list);
router.patch("/:id/assign-batch", ctrl.assignBatch);

module.exports = router;
