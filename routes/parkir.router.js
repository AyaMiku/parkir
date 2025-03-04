const express = require('express')
const router = express.Router()

const {
    getAllLaporan,
    getParkirById,
    addLaporan,
    updateLaporan,
    checkParkirStatus
} = require ("../controllers/parkirliar.controller")

const {verifyUser, isUser, authenticateToken} = require('../middleware/auth.router')
const upload = require('../middleware/upload')

router.get("/parkir/:idPengguna", verifyUser, isUser, authenticateToken, getAllLaporan)
router.get("/parkir/detail/:id", verifyUser, isUser,  getParkirById)
router.post("/parkir",  verifyUser, isUser, authenticateToken,  upload.single('bukti'), addLaporan);
router.patch("/parkir/:id", verifyUser, isUser, upload.single('bukti'), updateLaporan )
router.get("/parkir/status/:id", verifyUser, isUser,  checkParkirStatus)


module.exports = router