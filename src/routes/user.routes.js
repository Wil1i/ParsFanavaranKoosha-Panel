const router = require("express").Router();
const ctrl = require("../controllers/user.controller");
const { authenticate, requireAdmin } = require("../middleware/auth.middleware");

router.use(authenticate, requireAdmin);

router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
