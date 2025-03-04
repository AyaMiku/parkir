const cloudinary = require('cloudinary').v2;
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const streamifier = require('streamifier')
const fs = require("fs");
const path = require("path");
const { authenticateToken } = require('../middleware/auth.router');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});


module.exports = {
    getAllLaporan: async (req, res) => {
        try {
            console.log("ID Pengguna dari req.user:", req.user?.id);

            const idPengguna = req.user?.id;
            if (!idPengguna) {
                return res.status(401).json({
                    message: "User tidak terautentikasi"
                })
            }

            const laporan = (await pool.query(
                'SELECT * FROM parkir_liars WHERE "idPengguna" = $1', [idPengguna]
            )).rows;
            
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

            const post = (await pool.query(
                "SELECT * FROM parkir_liars WHERE id = $1", [postId]
            )).rows[0];
            
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
            console.log("✅ ID Pengguna dari req.user:", req.user?.id);
    
            const idPengguna = req.user.id;
            if (!idPengguna) {
                return res.status(401).json({ message: "User tidak terautentikasi" });
            }
    
            const { jenis_kendaraan, tanggaldanwaktu, latitude, longitude, status, deskripsi_masalah, hari, bukti } = req.body;
            const lokasi = String(req.body.lokasi).trim();
            const status_post = "Pending";
    
            console.log("Lokasi sebelum insert:", lokasi);
    
            if (!bukti || !bukti.startsWith("data:image")) {
                return res.status(400).json({ message: "Gambar tidak ditemukan atau format tidak valid." });
            }
    
            console.log("📌 Data sebelum insert:", {
                idPengguna,
                jenis_kendaraan,
                lokasi,
                deskripsi_masalah
            });
    
            const query = `
                INSERT INTO parkir_liars ("idPengguna", jenis_kendaraan, tanggaldanwaktu, latitude, longitude, lokasi, status, deskripsi_masalah, hari, bukti, status_post, "createdAt", "updatedAt") 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending', NOW(), NOW())
                RETURNING *;
            `;
            
            const values = [idPengguna, jenis_kendaraan, tanggaldanwaktu, latitude, longitude, lokasi, status, deskripsi_masalah, hari, bukti];
    
            const { rows } = await pool.query(query, values);
            const laporanBaru = rows[0];
    
            res.status(201).json({
                message: "Berhasil Menambahkan Laporan",
                laporan: laporanBaru
            });
    
        } catch (error) {
            console.error("❌ Terjadi kesalahan saat menambahkan laporan:", error);
            res.status(500).json({ message: "Gagal Menambahkan Laporan", error: error.message });
        }
    },       

    updateLaporan: async (req, res) => {
        const { jenis_kendaraan, tanggaldanwaktu, latitude, longitude, lokasi, status, deskripsi_masalah, hari } = req.body;
        const id = req.params.id;
        let bukti;

        try {
            const laporan = await client.query("SELECT bukti FROM parkir_liars WHERE id = $1", [id]);
            if (laporan.rows.length === 0) {
                return res.status(404).json({ message: "Laporan tidak ditemukan" });
            }
            bukti = laporan.rows[0].bukti;

            if (req.file) {
                if (bukti) {
                    const publicId = bukti.split('/').slice(-2).join('/').split('.')[0];
                    await cloudinary.uploader.destroy(publicId);
                }
                const uploadResult = await new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream(
                        { folder: 'parkir_liar', resource_type: 'auto' },
                        (error, result) => {
                            if (error) return reject(error);
                            resolve(result.secure_url);
                        }
                    ).end(req.file.buffer);
                });
                bukti = uploadResult;
            }

            await client.query(
                "UPDATE parkir_liars SET jenis_kendaraan = $1, tanggaldanwaktu = $2, latitude = $3, longitude = $4, lokasi = $5, status = $6, deskripsi_masalah = $7, hari = $8, bukti = $9 WHERE id = $10",
                [jenis_kendaraan, new Date(tanggaldanwaktu), parseFloat(latitude), parseFloat(longitude), lokasi, status, deskripsi_masalah, hari, bukti, id]
            );

            res.status(200).json({ message: "Laporan Berhasil Diupdate" });
        } catch (error) {
            console.error("Error updating laporan:", error);
            res.status(400).json({ message: error.message });
        }
    },

    checkParkirStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const data = (await pool.query("SELECT * FROM parkir_liars WHERE id = $1", [id])).rows[0];
            
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
            const laporan = await pool.query("SELECT bukti FROM parkir_liars WHERE id = $1", [id]);
            
            if (laporan.rows.length === 0) {
                return res.status(404).json({ message: "Data laporan tidak ditemukan" });
            }

            const bukti = laporan.rows[0].bukti;
            await pool.query("DELETE FROM parkir_liars WHERE id = $1", [id]);
            
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
