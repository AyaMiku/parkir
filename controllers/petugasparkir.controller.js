const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth.router');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.connect()
    .then(() => console.log("Database connected"))
    .catch(err => console.error("Database connection error:", err.stack));

module.exports = {
    getAllPetugas: async (req, res) => {
        try {
            const result = await pool.query(
                "SELECT lokasi, tanggaldanwaktu, latitude, longitude, identitas_petugas, hari, status, bukti FROM petugas_parkirs"
            );
            res.json({ message: "Sukses Mengambil Data Petugas", data: result.rows });
        } catch (error) {
            console.error("Error fetching data:", error);
            res.status(500).json({ message: "Gagal mengambil data petugas" });
        }
    },

    getPetugasById: async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) {
                return res.status(400).json({ message: "ID tidak valid" })
            }

            const result = await pool.query(
                "SELECT lokasi, tanggaldanwaktu, latitude, longitude, identitas_petugas, hari, status, bukti, idPengguna FROM petugas_parkirs WHERE id = $1",
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ message: "Data tidak ditemukan" });
            }

            res.json({ message: "Sukses Mengambil Data Petugas", data: result.rows[0] });
        } catch (error) {
            console.error("Error fetching data:", error);
            res.status(500).json({ message: "Gagal mengambil data petugas" });
        }
    },

    addPetugas: async (req, res) => {
        try {
            console.log("✅ ID Pengguna dari req.user:", req.user?.id);
    
            const idPengguna = req.user.id;
            if (!idPengguna) {
                return res.status(401).json({ message: "User tidak terautentikasi" });
            }
    
            const { lokasi, tanggaldanwaktu, latitude, longitude, identitas_petugas, hari, status, bukti } = req.body;
            
            const status_post = "Pending";

            if (!bukti || !bukti.startsWith("data:image")) {
                return res.status(400).json({ message: "Gambar tidak ditemukan atau format tidak valid." });
            }
    
            console.log("📌 Data sebelum insert:", {
                idPengguna,
                lokasi,
                latitude,
                longitude,
                hari,
                identitas_petugas
            });
    
            const query = `
                INSERT INTO petugas_parkirs ("idPengguna", lokasi, tanggaldanwaktu, latitude, longitude, identitas_petugas, hari, status, bukti, status_post "createdAt", "updatedAt") 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
                RETURNING *;
            `;
    
            const values = [idPengguna, lokasi, tanggaldanwaktu, latitude, longitude, identitas_petugas, hari, status, bukti];
    
            const { rows } = await pool.query(query, values);
            const petugasBaru = rows[0];
    
            res.status(201).json({
                message: "Berhasil Menambahkan Petugas",
                petugas: petugasBaru
            });
    
        } catch (error) {
            console.error("❌ Terjadi kesalahan saat menambahkan petugas:", error);
            res.status(500).json({ message: "Gagal Menambahkan Petugas", error: error.message });
        }
    },
    

    updatePetugas: async (req, res) => {
        try {
            const { id } = req.params;
            const { lokasi, tanggaldanwaktu, latitude, longitude, identitas_petugas, hari, status } = req.body;
            const userId = authenticateToken(req);

            // Cek apakah petugas ada dan milik pengguna yang sesuai
            const petugas = await client.query("SELECT * FROM petugas_parkirs WHERE id = $1 AND idPengguna = $2", [id, userId]);

            if (petugas.rows.length === 0) {
                return res.status(404).json({ message: "Petugas tidak ditemukan atau bukan milik Anda" });
            }

            let fotoBukti = petugas.rows[0].bukti;

            // Jika ada gambar baru, upload ke Cloudinary
            if (req.file) {
                const uploadResult = await new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream(
                        { folder: 'petugas_parkir', resource_type: 'auto' },
                        (error, result) => {
                            if (error) return reject(error);
                            resolve(result.secure_url);
                        }
                    ).end(req.file.buffer);
                });

                // Hapus gambar lama di Cloudinary
                if (fotoBukti) {
                    const publicId = fotoBukti.split('/').slice(-2).join('/').split('.')[0];
                    await cloudinary.uploader.destroy(publicId);
                }

                fotoBukti = uploadResult;
            }

            // Update data petugas di database
            await client.query(
                "UPDATE petugas_parkir SET lokasi = $1, tanggaldanwaktu = $2, latitude = $3, longitude = $4, identitas_petugas = $5, hari = $6, status = $7, bukti = $8 WHERE id = $9",
                [lokasi, new Date(tanggaldanwaktu), parseFloat(latitude), parseFloat(longitude), identitas_petugas, hari, status, fotoBukti, id]
            );

            res.status(200).json({ message: "Data Petugas berhasil diperbarui", bukti: fotoBukti });
        } catch (error) {
            console.error("Error updating petugas:", error);
            res.status(500).json({ message: "Gagal memperbarui data petugas", error: error.message });
        }
    },


    deletePetugas: async (req, res) => {
        const { id } = req.params;
        try {
            const petugas = await client.query("SELECT bukti FROM petugas_parkir WHERE id = $1", [id]);
            if (petugas.rows.length === 0) {
                return res.status(404).json({ message: "Data Petugas tidak ditemukan" });
            }
            const bukti = petugas.rows[0].bukti;

            await client.query("DELETE FROM petugas_parkirs WHERE id = $1", [id]);
            if (bukti) {
                const publicId = bukti.split('/').slice(-2).join('/').split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            }
            res.status(200).json({ message: "Data Petugas berhasil dihapus" });
        } catch (error) {
            console.error("Error deleting petugas:", error);
            res.status(500).json({ message: "Terjadi kesalahan saat menghapus data petugas" });
        }
    }
};
