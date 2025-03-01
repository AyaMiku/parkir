require('dotenv').config(); // Pastikan `.env` dimuat
const { Client } = require('pg');
const jwt = require('jsonwebtoken');

// ✅ Ambil JWT_SECRET dari environment
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("❌ ERROR: JWT_SECRET tidak ditemukan dalam environment variables!");
    process.exit(1); // Hentikan aplikasi jika tidak ada JWT_SECRET
}

// ✅ Konfigurasi database PostgreSQL
const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

(async () => {
    try {
        await client.connect();
        console.log("✅ Database connected successfully");
    } catch (err) {
        console.error("❌ Database connection error:", err.stack);
        process.exit(1); // Hentikan aplikasi jika gagal koneksi
    }
})();

// ✅ Middleware autentikasi token
const authenticateToken = (req) => {
    try {
        const authHeader = req.headers['authorization'];
        console.log("🔍 Auth Header:", authHeader);

        if (!authHeader) throw new Error("Token tidak tersedia");

        const token = authHeader.split(' ')[1];
        console.log("🔑 Extracted Token:", token);

        if (!token) throw new Error("Token tidak valid");

        // ✅ Gunakan JWT_SECRET yang benar
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log("✅ Decoded Token:", decoded);

        return decoded;
    } catch (error) {
        console.error("❌ JWT Error:", error.message);
        throw new Error("Token tidak valid atau telah kedaluwarsa");
    }
};

// ✅ Middleware verifikasi pengguna
const verifyUser = async (req, res, next) => {
    try {
        console.log("=== [Middleware] Verifying User ===");
        console.log("📢 Header Authorization:", req.headers.authorization);

        const decoded = authenticateToken(req);
        console.log("✅ Decoded Token:", decoded);

        // 🔹 Pastikan ID valid
        if (!decoded || !decoded.id) {
            console.error("❌ Token tidak memiliki ID pengguna!");
            return res.status(401).json({ message: "Token tidak valid" });
        }

        // 🔹 Cek apakah user ada di database
        const result = await client.query('SELECT * FROM "Users" WHERE id = $1', [decoded.id]);

        if (result.rows.length === 0) {
            console.error(`❌ User dengan ID ${decoded.id} tidak ditemukan.`);
            return res.status(404).json({ message: "User Tidak ditemukan" });
        }

        // ✅ User valid, simpan ke `req`
        const user = result.rows[0];
        req.user = {
            id: user.id,
            role: user.role
        }
        console.log(`✅ User Authenticated: ID = ${req.idPengguna}, Role = ${req.role}`);

        next();
    } catch (error) {
        console.error("❌ JWT Verification Error:", error.message);
        return res.status(401).json({ message: "Token tidak valid atau telah kedaluwarsa" });
    }
};

// ✅ Middleware cek role admin
const isAdmin = (req, res, next) => {
    console.log(`🔍 Checking role for User ID: ${req.idPengguna}`);
    if (req.role !== "admin") {
        return res.status(403).json({ message: "Akses ditolak! Hanya Admin yang dapat masuk." });
    }
    next();
};

// ✅ Middleware cek role user
const isUser = (req, res, next) => {
    console.log(`🔍 Checking role for User ID: ${req.idPengguna}`);

    if (!req.idPengguna || !req.role) {
        console.error("❌ ID pengguna atau role tidak ditemukan dalam request!");
        return res.status(401).json({ message: "Autentikasi gagal. Silakan login kembali." });
    }

    if (req.role !== "user") {
        console.error(`❌ Akses ditolak! Role: ${req.role}`);
        return res.status(403).json({ message: "Akses ditolak! Hanya User yang dapat masuk." });
    }

    console.log("✅ Akses diizinkan!");
    next();
};

// 🔥 Export middleware
module.exports = { verifyUser, isAdmin, isUser };
