const router = require("express").Router();
const ctrl = require("../controllers/item.controller");
const { authenticate, requireAccess } = require("../middleware/auth.middleware");

router.use(authenticate, requireAccess("warehouse"));

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
router.patch("/:id/stock", ctrl.adjustStock);

module.exports = router;
