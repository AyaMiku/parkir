const express = require('express')
const router = express.Router()



const {
    getAllPetugas,
    getPetugasById,
    addPetugas,
    updatePetugas,

} = require ("../controllers/petugasparkir.controller")

const {verifyUser, isUser, authenticateToken} = require('../middleware/auth.router')
const upload = require('../middleware/upload')
//const {checkPetugasParkirStatus} = require('../controllers/petugasparkir.controller')

router.get("/petugas/:idPengguna", verifyUser, isUser,  getAllPetugas)
router.get("/petugas/detail/:id", verifyUser, isUser, getPetugasById)
router.post("/petugas/", verifyUser, isUser, authenticateToken,  upload.single('bukti'), addPetugas)
router.patch("/petugas/:id",  verifyUser, isUser,  upload.single('bukti'), updatePetugas)

module.exports = router