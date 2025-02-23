const cloudinary = require('cloudinary').v2;
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const authenticateToken = (req) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) throw new Error("Token tidak tersedia");
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId;
};

module.exports = {
    getAllLaporan: async (req, res) => {
        try {
            const idPengguna = authenticateToken(req);
            const laporan = (await pool.query("SELECT * FROM parkir_liar WHERE idPengguna = $1", [idPengguna])).rows;
            
            if (laporan.length === 0) {
                return res.status(404).json({ message: "Tidak ada data laporan ditemukan" });
            }

            res.json({ message: "Sukses Mengambil Data Parkir", data: laporan });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Gagal mengambil data Parkir", error: error.message });
        }
    },

    getParkirById: async (req, res) => {
        try {
            const postId = req.params.id;
            const post = (await pool.query("SELECT * FROM parkir_liar WHERE id = $1", [postId])).rows[0];
            
            if (!post) {
                return res.status(404).json({ message: "Postingan tidak ditemukan." });
            }
            
            res.json({ message: "Sukses Mengambil Data Postingan", data: post });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Gagal mengambil data postingan", error: error.message });
        }
    },

    addLaporan: async (req, res) => {
        try {
            const idPengguna = authenticateToken(req);
            const { jenis_kendaraan, tanggaldanwaktu, latitude, longitude, lokasi, status, deskripsi_masalah, hari } = req.body;
            
            if (!req.file) {
                return res.status(400).json({ message: "Gambar tidak ditemukan." });
            }

            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    { folder: 'parkir_liar', resource_type: 'auto' }, 
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                ).end(req.file.buffer);
            });
            
            await pool.query(
                "INSERT INTO parkir_liar (idPengguna, jenis_kendaraan, tanggaldanwaktu, latitude, longitude, lokasi, status, deskripsi_masalah, hari, bukti, status_post) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending')", 
                [idPengguna, jenis_kendaraan, tanggaldanwaktu, latitude, longitude, lokasi, status, deskripsi_masalah, hari, result.secure_url]
            );
            
            res.status(201).json({ message: "Berhasil Menambahkan Laporan", gambarUrl: result.secure_url });
        } catch (error) {
            console.error("Terjadi kesalahan saat menambahkan laporan:", error);
            res.status(500).json({ message: "Gagal Menambahkan Laporan", error: error.message });
        }
    },

    checkParkirStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const data = (await pool.query("SELECT * FROM parkir_liar WHERE id = $1", [id])).rows[0];
            
            if (!data) {
                return res.status(404).json({ message: "Data Parkir Tidak di Temukan" });
            }
            
            res.status(200).json({
                jenis_kendaraan: data.jenis_kendaraan,
                tanggaldanwaktu: data.tanggaldanwaktu,
                latitude: data.latitude,
                longitude: data.longitude,
                lokasi: data.lokasi,
                status: data.status,
                hari: data.hari,
                bukti: data.bukti,
                status_post: data.status_post,
                message: data.status_post === 'Pending' ? 'Menunggu persetujuan admin.' : `Status: ${data.status_post}`
            });
        } catch (error) {
            res.status(500).json({ message: "Gagal mengambil status parkir", error: error.message });
        }
    },

    deleteLaporan: async (req, res) => {
        try {
            const { id } = req.params;
            const laporan = await pool.query("SELECT bukti FROM parkir_liar WHERE id = $1", [id]);
            
            if (laporan.rows.length === 0) {
                return res.status(404).json({ message: "Data laporan tidak ditemukan" });
            }

            const bukti = laporan.rows[0].bukti;
            await pool.query("DELETE FROM parkir_liar WHERE id = $1", [id]);
            
            if (bukti) {
                const publicId = bukti.split('/').slice(-2).join('/').split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            }
            
            res.status(200).json({ message: "Data laporan berhasil dihapus" });
        } catch (error) {
            console.error("Error deleting laporan:", error);
            res.status(500).json({ message: "Terjadi kesalahan saat menghapus data laporan" });
        }
    }
};
