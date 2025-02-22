const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});
client.connect()
    .then(() => console.log("Database connected"))
    .catch(err => console.error("Database connection error:", err.stack));

module.exports = {
    verifyUser: async (req, res, next) => {
        if (!req.session.idPengguna) {
            return res.status(401).json({ message: "Anda Belum Login" });
        }

        const result = await client.query("SELECT * FROM users WHERE id = $1", [req.session.idPengguna]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User Tidak ditemukan" });
        }
        const user = result.rows[0];

        req.idPengguna = user.id;
        req.role = user.role;

        console.log(`User ID: ${req.idPengguna}, Role: ${req.role}`);
        next(); 
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
