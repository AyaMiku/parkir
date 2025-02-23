const cloudinary = require('cloudinary').v2;
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,  
});

module.exports = {
    Register: async (req, res) => {
        const { nama, email, jenis_kelamin, username, password, role } = req.body;

        if (!password) {
            return res.status(400).json({ message: "Password tidak boleh kosong" });
        }

        const existingUser = await pool.query("SELECT * FROM users WHERE email = $1 OR username = $2", [email, username]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: "Email atau Username sudah terdaftar" });
        }

        try {
            const salt = await bcrypt.genSalt();
            const hashPassword = await bcrypt.hash(password, salt);

            if (!req.file) {
                return res.status(400).json({ message: "Foto Profil tidak ditemukan" });
            }

            const uploadResult = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    { folder: 'foto_profil', resource_type: 'auto' },
                    (error, result) => error ? reject(error) : resolve(result)
                ).end(req.file.buffer);
            });

            await pool.query("INSERT INTO users (nama, email, jenis_kelamin, username, password, foto_profil, role) VALUES ($1, $2, $3, $4, $5, $6, $7)", 
                [nama, email, jenis_kelamin, username, hashPassword, uploadResult.secure_url, role]);

            res.status(201).json({ message: "Berhasil Register", gambarUrl: uploadResult.secure_url });
        } catch (error) {
            console.error("Terjadi kesalahan saat register:", error);
            res.status(500).json({ message: "Gagal Menambahkan User", error: error.message });
        }
    },

    Login: async (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email dan password harus diisi." });
        }
        try {
            const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
            if (user.rows.length === 0) {
                return res.status(404).json({ message: "Email Anda belum terdaftar" });
            }
            
            const match = await bcrypt.compare(password, user.rows[0].password);
            if (!match) {
                return res.status(400).json({ message: "Password anda tidak sesuai" });
            }
            
            const { id, nama, jenis_kelamin, username, role, foto_profil } = user.rows[0];
            req.session.userId = id;
            res.status(200).json({ id, nama, email, jenis_kelamin, username, role, foto_profil });
        } catch (error) {
            console.error("Error during login:", error);
            res.status(500).json({ message: "Terjadi kesalahan saat login" });
        }
    },

    isME: async (req, res) => {
        if (!req.session.userId) {
            return res.status(401).json({ message: "Anda Belum Login" });
        }

        const user = await pool.query("SELECT nama, email, jenis_kelamin, username, foto_profil, role FROM users WHERE id = $1", [req.session.userId]);
        if (user.rows.length === 0) {
            return res.status(404).json({ message: "User Tidak ditemukan" });
        }
        res.status(200).json(user.rows[0]);
    },

    Logout: async (req, res) => {
        req.session.destroy(err => {
            if (err) return res.status(400).json({ message: "Tidak Berhasil Logout" });
            res.status(200).json({ message: "Anda Berhasil Logout" });
        });
    }
};
