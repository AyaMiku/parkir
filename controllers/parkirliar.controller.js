const cloudinary = require('cloudinary').v2;
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false }
});

module.exports = {
    getAllLaporan: async (req, res) => {
        try {
            const idPengguna = req.session.idPengguna;
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
            const { jenis_kendaraan, tanggaldanwaktu, latitude, longitude, lokasi, status, deskripsi_masalah, hari } = req.body;
            const idPengguna = req.session.idPengguna;
            
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

    updateLaporan: async (req, res) => {
        try {
            const laporan = (await pool.query("SELECT * FROM parkir_liar WHERE id = $1", [req.params.id])).rows[0];
            if (!laporan) return res.status(404).json({ message: "Laporan Anda Tidak Ditemukan" });
            
            const { jenis_kendaraan, tanggaldanwaktu, latitude, longitude, lokasi, status, deskripsi_masalah, hari } = req.body;
            let bukti = laporan.bukti;

            if (req.file) {
                if (bukti) {
                    const publicId = bukti.split('/').slice(-2).join('/').split('.')[0];
                    await cloudinary.uploader.destroy(publicId);
                }
                
                const result = await new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream(
                        { folder: 'parkir_liar', resource_type: 'auto' }, 
                        (error, result) => {
                            if (error) return reject(error);
                            resolve(result.secure_url);
                        }
                    ).end(req.file.buffer);
                });
                bukti = result;
            }
            
            await pool.query(
                "UPDATE parkir_liar SET jenis_kendaraan = $1, tanggaldanwaktu = $2, latitude = $3, longitude = $4, lokasi = $5, status = $6, deskripsi_masalah = $7, hari = $8, bukti = $9 WHERE id = $10", 
                [jenis_kendaraan, tanggaldanwaktu, latitude, longitude, lokasi, status, deskripsi_masalah, hari, bukti, laporan.id]
            );
            
            res.status(200).json({ message: "Laporan Berhasil Diupdate" });
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
};
