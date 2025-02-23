const { Client } = require('pg');
const cloudinary = require('cloudinary').v2;
const jwt = require('jsonwebtoken');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});
client.connect()
    .then(() => console.log("Database connected"))
    .catch(err => console.error("Database connection error:", err.stack));

const authenticateToken = (req) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) throw new Error("Token tidak tersedia");
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId;
};

module.exports = {
    getAllPetugas: async (req, res) => {
        try {
            const result = await client.query("SELECT lokasi, tanggaldanwaktu, latitude, longitude, identitas_petugas, hari, status, bukti FROM petugas_parkir");
            res.json({ message: "Sukses Mengambil Data Petugas", data: result.rows });
        } catch (error) {
            console.error("Error fetching data:", error);
            res.status(500).json({ message: "Gagal mengambil data petugas" });
        }
    },

    getPetugasById: async (req, res) => {
        try {
            const result = await client.query(
                "SELECT * FROM petugas_parkir WHERE id = $1",
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
        try {
            const userId = authenticateToken(req);
            const { lokasi, tanggaldanwaktu, latitude, longitude, identitas_petugas, hari, status } = req.body;
            
            if (!req.file) {
                return res.status(400).json({ message: "Gambar tidak ditemukan." });
            }

            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    { folder: 'petugas_parkir', resource_type: 'auto' },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                ).end(req.file.buffer);
            });

            await client.query(
                "INSERT INTO petugas_parkir (lokasi, tanggaldanwaktu, latitude, longitude, identitas_petugas, hari, status, bukti, idPengguna) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
                [lokasi, new Date(tanggaldanwaktu), parseFloat(latitude), parseFloat(longitude), identitas_petugas, hari, status, result.secure_url, userId]
            );

            res.status(201).json({ message: "Berhasil Menambahkan Petugas", gambarUrl: result.secure_url });
        } catch (error) {
            console.error("Terjadi kesalahan saat menambahkan petugas:", error);
            res.status(500).json({ message: "Gagal Menambahkan Petugas", error: error.message });
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

            await client.query("DELETE FROM petugas_parkir WHERE id = $1", [id]);
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
