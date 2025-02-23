const { Client } = require('pg');
const jwt = require('jsonwebtoken');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});
client.connect()
    .then(() => console.log("Database connected"))
    .catch(err => console.error("Database connection error:", err.stack));

const SECRET_KEY = process.env.JWT_SECRET;

const authenticateToken = (req) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) throw new Error("Token tidak tersedia");
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, SECRET_KEY);
};

module.exports = {
    verifyUser: async (req, res, next) => {
        try {
            const decoded = authenticateToken(req);
            const result = await client.query("SELECT * FROM users WHERE id = $1", [decoded.id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ message: "User Tidak ditemukan" });
            }
            
            const user = result.rows[0];
            req.idPengguna = user.id;
            req.role = user.role;
            console.log(`User ID: ${req.idPengguna}, Role: ${req.role}`);
            next(); 
        } catch (error) {
            return res.status(401).json({ message: "Token tidak valid atau telah kedaluwarsa" });
        }
    },

    isAdmin: (req, res, next) => {
        console.log(`Checking role for User ID: ${req.idPengguna}`); 
        if (req.role !== "admin") {
            return res.status(403).json({
                message: "Akses ditolak! Hanya Admin yang dapat masuk."
            });
        }
        next(); 
    },

    isUser: (req, res, next) => {
        console.log(`Checking role for User ID: ${req.idPengguna}`); 
        if (req.role !== "user") {
            return res.status(403).json({
                message: "Akses ditolak! Hanya User yang dapat masuk."
            });
        }
        next(); 
    }
};
