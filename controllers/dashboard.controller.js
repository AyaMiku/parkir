const cloudinary = require('cloudinary').v2;
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
     
});

module.exports = {
    getDashboard: async (req, res) => {
        try {
            const userCount = (await pool.query("SELECT COUNT(*) FROM users")).rows[0].count;
            const approvePetugasCount = (await pool.query("SELECT COUNT(*) FROM petugas_parkir WHERE status_post = 'Approve'" )).rows[0].count;
            const approveParkirCount = (await pool.query("SELECT COUNT(*) FROM parkir_liar WHERE status_post = 'Approve'" )).rows[0].count;
            
            const totalApprove = parseInt(approvePetugasCount) + parseInt(approveParkirCount);
            const laporanPetugasCount = (await pool.query("SELECT COUNT(*) FROM petugas_parkir" )).rows[0].count;
            const laporanParkirCount = (await pool.query("SELECT COUNT(*) FROM parkir_liar" )).rows[0].count;

            const dataPetugas = (await pool.query("SELECT latitude, longitude FROM petugas_parkir WHERE status_post = 'Approve'" )).rows;
            const dataParkir = (await pool.query("SELECT latitude, longitude FROM parkir_liar WHERE status_post = 'Approve'" )).rows;

            res.json({
                userCount,
                totalApprove,
                laporanPetugasCount,
                laporanParkirCount,
                formattedPetugasData: dataPetugas,
                formattedParkirData: dataParkir
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            res.status(500).json({ message: 'Internal server error', error });
        }
    }
};
