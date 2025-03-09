const express = require("express");
const router = express.Router();
const {
  getAllPetugas,
  getPetugasById,
  addPetugas,
  updatePetugas,
  deletePetugas,
} = require("../controllers/admin.petugas.controller");

const {
  verifyUser,
  isAdmin,
  authenticateToken,
} = require("../middleware/auth.router");
const upload = require("../middleware/upload");

router.get(
  "/adminpetugas",
  authenticateToken,
  verifyUser,
  isAdmin,
  getAllPetugas,
);
router.get("/adminpetugas/detail/:id", getPetugasById);
router.post("/admin-petugas", upload.single("bukti"), addPetugas);
router.patch("/admin-petugas/:id", upload.single("bukti"), updatePetugas);
router.delete("/adminpetugas/:id", deletePetugas);

// admin approval
const { approvePetugasParkir } = require("../middleware/adminApproval");
router.post("/admin-petugas/:id", approvePetugasParkir);
module.exports = router;
