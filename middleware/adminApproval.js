const { Client } = require('pg');
const cloudinary = require('cloudinary').v2;

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
    approvePetugasParkir: async (req, res, next) => {
        const { id } = req.params;
        const { action } = req.body;

        const result = await client.query("SELECT * FROM petugas_parkir WHERE id = $1", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Data Petugas Tidak Ditemukan" });
        }
        const data = result.rows[0];

        if (action === 'Approve') {
            await client.query("UPDATE petugas_parkir SET status_post = 'Approve' WHERE id = $1", [id]);
            return res.status(200).json({ message: "Data Petugas Parkir di Setujui", status_post: "Approve" });
        } else if (action === 'Reject') {
            if (data.bukti) {
                const publicId = data.bukti.split('/').slice(-2).join('/').split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            }
            await client.query("DELETE FROM petugas_parkir WHERE id = $1", [id]);
            return res.status(200).json({ message: "Data Petugas Parkir di Tolak" });
        } else {
            return res.status(400).json({ message: 'Action harus berupa "Approve" atau "Reject"' });
        }
    },

    approveParkirLiar: async (req, res, next) => {
        const { id } = req.params;
        const { action } = req.body;

        const result = await client.query("SELECT * FROM parkir_liar WHERE id = $1", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Data Parkir Tidak di Temukan" });
        }
        const dataParkir = result.rows[0];

        if (action === 'Approve') {
            await client.query("UPDATE parkir_liar SET status_post = 'Approve' WHERE id = $1", [id]);
            return res.status(200).json({ message: "Data Parkir Telah di Setujui", status_post: "Approve" });
        } else if (action === 'Reject') {
            if (dataParkir.bukti) {
                const publicId = dataParkir.bukti.split('/').slice(-2).join('/').split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            }
            await client.query("DELETE FROM parkir_liar WHERE id = $1", [id]);
            return res.status(200).json({ message: "Data Parkir di Tolak" });
        } else {
            return res.status(400).json({ message: 'Action harus berupa "Approve" atau "Reject"' });
        }
    }
};
