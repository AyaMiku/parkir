const express = require("express");
const router = express.Router();

const {
  getAllLaporan,
  addLaporan,
  updateLaporan,
  getLaporanById,
  deleteParkir,
} = require("../controllers/admin.parkirliar.controller");

const {
  verifyUser,
  isAdmin,
  authenticateToken,
} = require("../middleware/auth.router");
const upload = require("../middleware/upload");

router.get(
  "/adminparkir",
  authenticateToken,
  verifyUser,
  isAdmin,
  getAllLaporan,
);
router.get("/adminparkir/detail/:id", getLaporanById);
router.post("/admin-parkir", upload.single("bukti"), addLaporan);
router.patch("/admin-parkir/:id", upload.single("bukti"), updateLaporan);
router.delete("/adminparkir/:id", upload.single("bukti"), deleteParkir);

// admin approval
const { approveParkirLiar } = require("../middleware/adminApproval");
router.post("/admin-parkir/:id", approveParkirLiar);

module.exports = router;
