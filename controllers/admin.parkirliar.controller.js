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
        "SELECT jenis_kendaraan, tanggaldanwaktu, latitude, longitude, lokasi, deskripsi_masalah, hari, bukti FROM parkir_liars",
      );

      res.json({ message: "Sukses Mengambil Data Laporan", data: result.rows });
    } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).json({ message: "Gagal mengambil data laporan" });
    }
  },

  getLaporanById: async (req, res) => {
    try {
      const result = await client.query(
        "SELECT p.jenis_kendaraan, p.tanggaldanwaktu, p.latitude, p.longitude, p.lokasi, p.deskripsi_masalah, p.hari, p.bukti, u.nama, u.username, u.email FROM parkir_liar p LEFT JOIN users u ON p.idUser = u.id WHERE p.id = $1",
        [req.params.id],
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

      await client.query(
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
        message: "Berhasil Menambahkan Laporan",
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
      status,
      deskripsi_masalah,
      hari,
    } = req.body;
    const id = req.params.id;
    let bukti;

    try {
      const laporan = await client.query(
        "SELECT bukti FROM parkir_liar WHERE id = $1",
        [id],
      );
      if (laporan.rows.length === 0) {
        return res.status(404).json({ message: "Laporan tidak ditemukan" });
      }
      bukti = laporan.rows[0].bukti;

      if (req.file) {
        if (bukti) {
          const publicId = bukti.split("/").slice(-2).join("/").split(".")[0];
          await cloudinary.uploader.destroy(publicId);
        }
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              { folder: "parkir_liar", resource_type: "auto" },
              (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
              },
            )
            .end(req.file.buffer);
        });
        bukti = uploadResult;
      }

      await client.query(
        "UPDATE parkir_liar SET jenis_kendaraan = $1, tanggaldanwaktu = $2, latitude = $3, longitude = $4, lokasi = $5, status = $6, deskripsi_masalah = $7, hari = $8, bukti = $9 WHERE id = $10",
        [
          jenis_kendaraan,
          new Date(tanggaldanwaktu),
          parseFloat(latitude),
          parseFloat(longitude),
          lokasi,
          status,
          deskripsi_masalah,
          hari,
          bukti,
          id,
        ],
      );

      res.status(200).json({ message: "Laporan Berhasil Diupdate" });
    } catch (error) {
      console.error("Error updating laporan:", error);
      res.status(400).json({ message: error.message });
    }
  },

  deleteParkir: async (req, res) => {
    const { id } = req.params;
    try {
      const laporan = await client.query(
        "SELECT bukti FROM parkir_liar WHERE id = $1",
        [id],
      );
      if (laporan.rows.length === 0) {
        return res.status(404).json({ message: "Data Parkir tidak ditemukan" });
      }
      const bukti = laporan.rows[0].bukti;

      await client.query("DELETE FROM parkir_liar WHERE id = $1", [id]);
      if (bukti) {
        const publicId = bukti.split("/").slice(-2).join("/").split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      }
      res.status(200).json({ message: "Data Parkir berhasil dihapus" });
    } catch (error) {
      console.error("Error deleting parkir:", error);
      res
        .status(500)
        .json({ message: "Terjadi kesalahan saat menghapus data parkir" });
    }
  },
};
