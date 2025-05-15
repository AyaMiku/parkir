require("dotenv").config();
const cloudinary = require("cloudinary").v2;
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// ✅ Pastikan JWT_SECRET tersedia
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error(
    "❌ ERROR: JWT_SECRET tidak ditemukan! Pastikan .env sudah dikonfigurasi.",
  );
  process.exit(1);
}

// ✅ Konfigurasi koneksi PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ✅ Middleware untuk menangani Register
module.exports = {
  Register: async (req, res) => {
    try {
      const { nama, email, jenis_kelamin, username, password } = req.body;

      console.log("📝 Data yang diterima untuk registrasi:");
      console.log({ nama, email, jenis_kelamin, username, password });

      if (!nama || !email || !username || !password) {
        console.error("❌ Ada field yang kosong");
        return res.status(400).json({ message: "Semua field harus diisi" });
      }

      if (password.length < 6) {
        console.error("❌ Password terlalu pendek");
        return res
          .status(400)
          .json({ message: "Password harus minimal 6 karakter" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.error("❌ Format email tidak valid");
        return res.status(400).json({ message: "Format email tidak valid" });
      }

      const usernameRegex = /^(?=.*[a-zA-Z])[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(username)) {
        console.error("❌ Username tidak valid");
        return res.status(400).json({
          message:
            "Username harus mengandung huruf, boleh ditambah angka atau underscore.",
        });
      }

      const validGender = ["Pria", "Wanita"];
      if (!validGender.includes(jenis_kelamin)) {
        console.error("❌ Jenis kelamin tidak valid:", jenis_kelamin);
        return res.status(400).json({ message: "Jenis kelamin tidak valid" });
      }

      // 🔹 Cek apakah email atau username sudah terdaftar
      console.log("🔍 Mengecek apakah email atau username sudah digunakan...");
      const existingUser = await pool.query(
        'SELECT * FROM "Users" WHERE email = $1 OR username = $2',
        [email, username],
      );
      if (existingUser.rows.length > 0) {
        console.error("❌ Email atau Username sudah terdaftar");
        return res
          .status(400)
          .json({ message: "Email atau Username sudah terdaftar" });
      }

      // 🔹 Hash password
      console.log("🔐 Hashing password...");
      const salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(password, salt);
      console.log("✅ Password berhasil di-hash");

      // 🔹 Upload foto profil (jika ada)
      let fotoProfilUrl = "";
      if (req.file) {
        try {
          console.log("📸 Mengupload foto profil...");
          const uploadResult = await cloudinary.uploader.upload(req.file.path, {
            folder: "foto_profil",
            resource_type: "auto",
          });
          fotoProfilUrl = uploadResult.secure_url;
          console.log("✅ Foto profil berhasil diupload:", fotoProfilUrl);
        } catch (uploadError) {
          console.error("❌ Gagal mengupload foto profil:", uploadError);
        }
      }

      const userRole = "user";

      console.log("📝 Menyimpan user ke database...");
      const newUser = await pool.query(
        `INSERT INTO "Users" (nama, email, jenis_kelamin, username, password, foto_profil, role, "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id, nama, email, username, foto_profil, role, "createdAt", "updatedAt"`,
        [
          nama,
          email,
          jenis_kelamin,
          username,
          hashPassword,
          fotoProfilUrl,
          userRole,
        ],
      );

      console.log(`✅ Registrasi berhasil untuk user: ${username}`);

      res
        .status(201)
        .json({ message: "Berhasil register", user: newUser.rows[0] });
    } catch (error) {
      console.error("❌ Error saat register:", error);
      res
        .status(500)
        .json({ message: "Gagal Menambahkan User", error: error.message });
    }
  },

  // ✅ Middleware untuk Login
  Login: async (req, res) => {
    try {
      const { email, password } = req.body;

      console.log("📝 Data yang diterima untuk login:");
      console.log({ email, password });

      if (!email || !password) {
        console.error("❌ Email atau password tidak boleh kosong");
        return res
          .status(400)
          .json({ message: "Email dan password harus diisi." });
      }

      console.log("🔍 Mencari user di database...");
      const user = await pool.query(`SELECT * FROM "Users" WHERE email = $1`, [
        email,
      ]);

      if (user.rows.length === 0) {
        console.error("❌ User tidak ditemukan:", email);
        return res.status(404).json({ message: "Email Anda belum terdaftar" });
      }

      const userData = user.rows[0];
      console.log("✅ User ditemukan:", {
        id: userData.id,
        email: userData.email,
        role: userData.role,
      });

      // 🔹 Cek password
      console.log("🔑 Memverifikasi password...");
      const match = await bcrypt.compare(password, userData.password);
      if (!match) {
        console.error("❌ Password salah untuk user:", email);
        return res.status(400).json({ message: "Password anda tidak sesuai" });
      }

      console.log("✅ Password cocok, membuat token...");

      // 🔹 Buat token
      const { id, nama, jenis_kelamin, username, role, foto_profil } = userData;
      const token = jwt.sign({ id, email, role }, JWT_SECRET, {
        expiresIn: "1h",
      });

      console.log("🔑 Token berhasil dibuat:", token);

      res.status(200).json({
        id,
        nama,
        email,
        jenis_kelamin,
        username,
        role,
        foto_profil,
        token,
      });
    } catch (error) {
      console.error("❌ Error saat login:", error);
      res.status(500).json({ message: "Terjadi kesalahan saat login" });
    }
  },

  // ✅ Middleware untuk mendapatkan data diri user (isME)
  isME: async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res
          .status(401)
          .json({ message: "Token tidak valid atau telah kedaluwarsa" });
      }

      const user = await pool.query(
        `SELECT nama, email, jenis_kelamin, username, foto_profil, role FROM "Users" WHERE id = $1`,
        [req.user.id],
      );

      if (user.rows.length === 0) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }

      res.status(200).json(user.rows[0]);
    } catch (error) {
      console.error("❌ Error saat mengambil data user:", error);
      return res
        .status(500)
        .json({ message: "Terjadi kesalahan saat mengambil data user" });
    }
  },

  // ✅ Logout hanya mengirim pesan sukses
  Logout: (req, res) => {
    res.status(200).json({ message: "Anda Berhasil Logout" });
  },
};
