const cloudinary = require('cloudinary').v2;
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false }
});

module.exports = {
    getAllPetugas: async (req, res) => {
        try {
            const result = await pool.query("SELECT lokasi, tanggaldanwaktu, latitude, longitude, identitas_petugas, hari, status, bukti, status_post FROM petugas_parkir");
            res.json({ message: "Sukses Mengambil Data Petugas", data: result.rows });
        } catch (error) {
            console.error("Error fetching data:", error);
            res.status(500).json({ message: "Gagal mengambil data petugas" });
        }
    },

    getPetugasById: async (req, res) => {
        try {
            const result = await pool.query(
                "SELECT p.lokasi, p.tanggaldanwaktu, p.latitude, p.longitude, p.identitas_petugas, p.hari, p.status, p.bukti, u.nama, u.username, u.email FROM petugas_parkir p LEFT JOIN users u ON p.idPengguna = u.id WHERE p.id = $1",
                [req.params.id]
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
        const { lokasi, tanggaldanwaktu, latitude, longitude, identitas_petugas, hari, status } = req.body;
        const userId = req.session.userId;

        if (!req.file) {
            return res.status(400).json({ message: "Gambar tidak ditemukan." });
        }

        try {
            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    { folder: 'petugas_parkir', resource_type: 'auto' },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                ).end(req.file.buffer);
            });

            await pool.query(
                "INSERT INTO petugas_parkir (lokasi, tanggaldanwaktu, latitude, longitude, identitas_petugas, hari, status, bukti, idPengguna) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
                [lokasi, new Date(tanggaldanwaktu), parseFloat(latitude), parseFloat(longitude), identitas_petugas, hari, status, result.secure_url, userId]
            );

            res.status(201).json({ message: "Berhasil Menambahkan Petugas", gambarUrl: result.secure_url });
        } catch (error) {
            console.error("Terjadi kesalahan saat menambahkan petugas:", error);
            res.status(500).json({ message: "Gagal Menambahkan Petugas", error: error.message });
        }
    },

    updatePetugas: async (req, res) => {
        const { lokasi, tanggaldanwaktu, latitude, longitude, identitas_petugas, hari, status } = req.body;
        const id = req.params.id;
        let bukti;

        try {
            const petugas = await pool.query("SELECT bukti FROM petugas_parkir WHERE id = $1", [id]);
            if (petugas.rows.length === 0) {
                return res.status(404).json({ message: "Petugas tidak ditemukan" });
            }
            bukti = petugas.rows[0].bukti;

            if (req.file) {
                if (bukti) {
                    const publicId = bukti.split('/').slice(-2).join('/').split('.')[0];
                    await cloudinary.uploader.destroy(publicId);
                }
                const uploadResult = await new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream(
                        { folder: 'petugas_parkir', resource_type: 'auto' },
                        (error, result) => {
                            if (error) return reject(error);
                            resolve(result.secure_url);
                        }
                    ).end(req.file.buffer);
                });
                bukti = uploadResult;
            }

            await pool.query(
                "UPDATE petugas_parkir SET lokasi = $1, tanggaldanwaktu = $2, latitude = $3, longitude = $4, identitas_petugas = $5, hari = $6, status = $7, bukti = $8 WHERE id = $9",
                [lokasi, new Date(tanggaldanwaktu), parseFloat(latitude), parseFloat(longitude), identitas_petugas, hari, status, bukti, id]
            );

            res.status(200).json({ message: "Petugas Berhasil Diupdate" });
        } catch (error) {
            console.error("Error updating petugas:", error);
            res.status(400).json({ message: error.message });
        }
    },

    deletePetugas: async (req, res) => {
        const { id } = req.params;
        try {
            const petugas = await pool.query("SELECT bukti FROM petugas_parkir WHERE id = $1", [id]);
            if (petugas.rows.length === 0) {
                return res.status(404).json({ message: "Data Petugas tidak ditemukan" });
            }
            const bukti = petugas.rows[0].bukti;

            await pool.query("DELETE FROM petugas_parkir WHERE id = $1", [id]);
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
