const express = require("express");
const router = express.Router();

const {
  getDashboard,
  getOverview,
} = require("../controllers/dashboard.controller");

router.use("/dashboard", getDashboard);
router.use("/overview", getOverview);

module.exports = router;
