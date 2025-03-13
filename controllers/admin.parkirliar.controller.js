const { Pool } = require("pg");
const cloudinary = require("cloudinary").v2;
const jwt = require("jsonwebtoken");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = {
  getAllLaporan: async (req, res) => {
    try {
      console.log(`Akses diterima oleh Admin ID: ${req.user?.id}`);

      const result = await pool.query(
        "SELECT id, jenis_kendaraan, tanggaldanwaktu, latitude, longitude, lokasi, deskripsi_masalah, hari, bukti FROM parkir_liars",
      );

      res.json({ message: "Sukses Mengambil Data Laporan", data: result.rows });
    } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).json({ message: "Gagal mengambil data laporan" });
    }
  },

  getLaporanById: async (req, res) => {
    try {
      const postId = req.params.id;

      const result = await pool.query(
        "SELECT * FROM parkir_liars WHERE id = $1",
        [postId],
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Data tidak ditemukan" });
      }
      res.json({
        message: "Sukses Mengambil Data Laporan",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).json({ message: "Gagal mengambil data laporan" });
    }
  },

  addLaporan: async (req, res) => {
    const {
      jenis_kendaraan,
      tanggaldanwaktu,
      latitude,
      longitude,
      lokasi,
      status,
      deskripsi_masalah,
      hari,
    } = req.body;
    try {
      const userId = authenticateToken(req);

      if (!req.file) {
        return res.status(400).json({ message: "Gambar tidak ditemukan." });
      }

      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: "parkir_liar", resource_type: "auto" },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            },
          )
          .end(req.file.buffer);
      });

      await pool.query(
        "INSERT INTO parkir_liar (jenis_kendaraan, tanggaldanwaktu, latitude, longitude, lokasi, status, deskripsi_masalah, hari, bukti, idUser) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        [
          jenis_kendaraan,
          new Date(tanggaldanwaktu),
          parseFloat(latitude),
          parseFloat(longitude),
          lokasi,
          status,
          deskripsi_masalah,
          hari,
          result.secure_url,
          userId,
        ],
      );

      res.status(201).json({
        message: "Berhasil Menambahkan Laporan Baru",
        gambarUrl: result.secure_url,
      });
    } catch (error) {
      console.error("Terjadi kesalahan saat menambahkan laporan:", error);
      res
        .status(500)
        .json({ message: "Gagal Menambahkan Laporan", error: error.message });
    }
  },

  updateLaporan: async (req, res) => {
    const {
      jenis_kendaraan,
      tanggaldanwaktu,
      latitude,
      longitude,
      lokasi,
      status_post, // Ganti dari 'status' ke 'status_post'
      deskripsi_masalah,
      hari,
      bukti,
    } = req.body;
    const { id } = req.params;

    try {
      // Cek apakah laporan ada
      const laporan = await pool.query(
        "SELECT * FROM parkir_liars WHERE id = $1",
        [id],
      );
      if (laporan.rows.length === 0) {
        return res.status(404).json({ message: "Laporan tidak ditemukan" });
      }

      // Validasi status_post (jika diberikan)
      if (
        status_post &&
        !["Approve", "Reject", "Pending"].includes(status_post)
      ) {
        return res.status(400).json({ message: "Status_post tidak valid" });
      }

      // Query Update Dinamis
      const fields = [];
      const values = [];
      let paramIndex = 1;

      if (jenis_kendaraan) {
        fields.push(`jenis_kendaraan = $${paramIndex++}`);
        values.push(jenis_kendaraan);
      }
      if (tanggaldanwaktu) {
        fields.push(`tanggaldanwaktu = $${paramIndex++}`);
        values.push(new Date(tanggaldanwaktu));
      }
      if (latitude) {
        fields.push(`latitude = $${paramIndex++}`);
        values.push(parseFloat(latitude));
      }
      if (longitude) {
        fields.push(`longitude = $${paramIndex++}`);
        values.push(parseFloat(longitude));
      }
      if (lokasi) {
        fields.push(`lokasi = $${paramIndex++}`);
        values.push(lokasi);
      }
      if (status_post) {
        fields.push(`status_post = $${paramIndex++}`);
        values.push(status_post);
      } // Update status_post
      if (deskripsi_masalah) {
        fields.push(`deskripsi_masalah = $${paramIndex++}`);
        values.push(deskripsi_masalah);
      }
      if (hari) {
        fields.push(`hari = $${paramIndex++}`);
        values.push(hari);
      }
      if (bukti) {
        fields.push(`bukti = $${paramIndex++}`);
        values.push(bukti);
      } // Base64 image

      if (fields.length === 0) {
        return res
          .status(400)
          .json({ message: "Tidak ada data yang diperbarui" });
      }

      values.push(id);
      const query = `UPDATE parkir_liars SET ${fields.join(", ")} WHERE id = $${paramIndex}`;
      await client.query(query, values);

      res.status(200).json({ message: "Laporan Berhasil Diupdate" });
    } catch (error) {
      console.error("Error updating laporan:", error);
      res.status(500).json({ message: "Terjadi kesalahan server" });
    }
  },

  deleteParkir: async (req, res) => {
    const { id } = req.params;
    try {
      const laporan = await pool.query(
        "SELECT bukti FROM parkir_liars WHERE id = $1",
        [id],
      );
      if (laporan.rows.length === 0) {
        return res.status(404).json({ message: "Data Parkir tidak ditemukan" });
      }
      const bukti = laporan.rows[0].bukti;

      await pool.query("DELETE FROM parkir_liars WHERE id = $1", [id]);

      res.status(200).json({ message: "Data Parkir berhasil dihapus" });
    } catch (error) {
      console.error("Error deleting parkir:", error);
      res
        .status(500)
        .json({ message: "Terjadi kesalahan saat menghapus data parkir" });
    }
  },
};
