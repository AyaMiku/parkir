const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const upload = require("../middleware/upload");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = {
  getAllPetugas: async (req, res) => {
    try {
      console.log(`📢 Akses diterima oleh Admin ID: ${req.user?.id}`);

      const result = await pool.query(
        "SELECT id, lokasi, tanggaldanwaktu, latitude, longitude, identitas_petugas, hari, status, bukti FROM petugas_parkirs",
      );

      res.json({ message: "Sukses Mengambil Data Petugas", data: result.rows });
    } catch (error) {
      console.error("❌ Error fetching data:", error);
      res.status(500).json({ message: "Gagal mengambil data petugas" });
    }
  },

  getPetugasById: async (req, res) => {
    try {
      const postId = req.params.id;

      const result = await pool.query(
        "SELECT * FROM petugas_parkirs WHERE id = $1",
        [postId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Data tidak ditemukan" });
      }
      res.json({
        message: "Sukses Mengambil Data Petugas",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).json({ message: "Gagal mengambil data petugas" });
    }
  },

  addPetugas: async (req, res) => {
    try {
      const userId = authenticateToken(req);
      const {
        lokasi,
        tanggaldanwaktu,
        latitude,
        longitude,
        identitas_petugas,
        hari,
        status,
      } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: "Gambar tidak ditemukan." });
      }

      await pool.query(
        "INSERT INTO petugas_parkir (lokasi, tanggaldanwaktu, latitude, longitude, identitas_petugas, hari, status, bukti, idPengguna) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [
          lokasi,
          new Date(tanggaldanwaktu),
          parseFloat(latitude),
          parseFloat(longitude),
          identitas_petugas,
          hari,
          status,
          result.secure_url,
          userId,
        ],
      );

      res.status(201).json({
        message: "Berhasil Menambahkan Petugas",
        gambarUrl: result.secure_url,
      });
    } catch (error) {
      console.error("Terjadi kesalahan saat menambahkan petugas:", error);
      res
        .status(500)
        .json({ message: "Gagal Menambahkan Petugas", error: error.message });
    }
  },

  updatePetugas: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        lokasi,
        tanggaldanwaktu,
        latitude,
        longitude,
        identitas_petugas,
        hari,
        status_post,
        bukti,
      } = req.body;
      const userId = authenticateToken(req);

      const petugas = await pool.query(
        "SELECT * FROM petugas_parkirs WHERE id = $1 AND idPengguna = $2",
        [id, userId],
      );

      if (petugas.rows.length === 0) {
        return res.status(404).json({ message: "Petugas tidak ditemukan" });
      }

      if (
        status_post &&
        !["Approve", "Reject", "Pending"].includes(status_post)
      ) {
        return res.status(400).json({ message: "Status_post tidak valid" });
      }

      const fields = [];
      const values = [];
      let paramIndex = 1;

      if (lokasi) {
        fields.push(`lokasi = $${paramIndex++}`);
        values.push(lokasi);
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
      if (identitas_petugas) {
        fields.push(`identitas_petugas = $${paramIndex++}`);
        values.push(identitas_petugas);
      }
      if (hari) {
        fields.push(`hari = $${paramIndex++}`);
        values.push(hari);
      }
      if (status_post) {
        fields.push(`status_post = $${paramIndex++}`);
        values.push(status_post);
      } // Ganti ke status_post
      if (bukti) {
        fields.push(`bukti = $${paramIndex++}`);
        values.push(bukti);
      } // Base64 Image

      if (fields.length === 0) {
        return res
          .status(400)
          .json({ message: "Tidak ada data yang diperbarui" });
      }

      values.push(id);
      const query = `UPDATE petugas_parkirs SET ${fields.join(", ")} WHERE id = $${paramIndex}`;
      await client.query(query, values);

      res.status(200).json({ message: "Data Petugas berhasil diperbarui" });
    } catch (error) {
      console.error("Error updating petugas:", error);
      res.status(500).json({
        message: "Gagal memperbarui data petugas",
        error: error.message,
      });
    }
  },

  deletePetugas: async (req, res) => {
    const { id } = req.params;
    try {
      const petugas = await pool.query(
        "SELECT bukti FROM petugas_parkirs WHERE id = $1",
        [id],
      );
      if (petugas.rows.length === 0) {
        return res
          .status(404)
          .json({ message: "Data Petugas tidak ditemukan" });
      }
      const bukti = petugas.rows[0].bukti;

      await pool.query("DELETE FROM petugas_parkirs WHERE id = $1", [id]);

      res.status(200).json({ message: "Data Petugas berhasil dihapus" });
    } catch (error) {
      console.error("Error deleting petugas:", error);
      res
        .status(500)
        .json({ message: "Terjadi kesalahan saat menghapus data petugas" });
    }
  },
};
