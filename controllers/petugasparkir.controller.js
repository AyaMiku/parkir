const { Pool } = require("pg");
const cloudinary = require("cloudinary").v2;
const jwt = require("jsonwebtoken");
const { authenticateToken } = require("../middleware/auth.router");
const axios = require("axios");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = {
  getAllPetugas: async (req, res) => {
    try {
      console.log("ID Pengguna dari req.user:", req.user?.id);

      const idPengguna = req.user?.id;
      if (!idPengguna) {
        return res.status(401).json({ message: "User tidak terautentikasi" });
      }

      const result = await pool.query(
        'SELECT * FROM petugas_parkirs WHERE "idPengguna" = $1',
        [idPengguna],
      );

      if (result.length === 0) {
        return res
          .status(404)
          .json({ message: "Tidak ada data petugas ditemukan" });
      }

      res.json({ message: "Sukses Mengambil Data Petugas", data: result });
    } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).json({ message: "Gagal mengambil data petugas" });
    }
  },

  getPetugasById: async (req, res) => {
    try {
      const postId = req.params.id;

      const post = (
        await pool.query("SELECT * FROM petugas_parkirs WHERE id = $1", [
          postId,
        ])
      ).rows[0];

      if (!post) {
        return res.status(404).json({ message: "Postingan tidak ditemukan." });
      }

      res.json({ message: "Sukses Mengambil Data Postingan", data: post });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Gagal mengambil data postingan",
        error: error.message,
      });
    }
  },

  addPetugas: async (req, res) => {
    try {
      console.log("✅ ID Pengguna dari req.user:", req.user?.id);

      const idPengguna = req.user.id;
      if (!idPengguna) {
        return res.status(401).json({ message: "User tidak terautentikasi" });
      }

      const {
        nama,
        lokasi,
        tanggaldanwaktu,
        latitude,
        longitude,
        identitas_petugas,
        hari,
        bukti,
      } = req.body;

      const status_post = "Pending";

      console.log("📌 Data sebelum validasi ML:", {
        identitas_petugas,
        tanggaldanwaktu,
      });

      const mlResponse = await axios.post(
        "https://lapor-parkir-ml.onrender.com/Petugas_parkir",
        {
          Identitas_Petugas: identitas_petugas,
          Lokasi: lokasi,
        },
      );

      console.log("📢 Response dari ML:", mlResponse.data);

      const status = mlResponse.data["Status Pelaporan"]?.[0];
      const akurasi = mlResponse.data["Akurasi Prediksi"]?.[0];

      if (!status || !["Liar", "Tidak Liar"].includes(status)) {
        return res.status(400).json({
          message: "Status dari API ML tidak valid atau tidak diterima",
        });
      }

      if (typeof akurasi !== "number" && typeof akurasi !== "string") {
        return res.status(400).json({
          message: "Nilai akurasi dari ML tidak valid",
        });
      }

      const akurasiStr =
        typeof akurasi === "number" ? akurasi.toFixed(4) : akurasi.toString();

      console.log("📌 Prediksi ML:", status);
      console.log("📌 Akurasi ML:", akurasi);

      if (!bukti || !bukti.startsWith("data:image")) {
        return res
          .status(400)
          .json({ message: "Gambar tidak ditemukan atau format tidak valid." });
      }

      console.log("📌 Data sebelum insert:", {
        idPengguna,
        nama,
        lokasi,
        latitude,
        longitude,
        hari,
        identitas_petugas,
        status,
        akurasi,
      });

      const query = `
        INSERT INTO petugas_parkirs
        ("idPengguna", nama, lokasi, tanggaldanwaktu, latitude, longitude, identitas_petugas, hari, status, akurasi, bukti, status_post, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING *;
      `;

      const values = [
        idPengguna,
        nama,
        lokasi,
        tanggaldanwaktu,
        latitude,
        longitude,
        identitas_petugas,
        hari,
        status,
        akurasiStr,
        bukti,
        status_post,
      ];

      const { rows } = await pool.query(query, values);
      const petugasBaru = rows[0];

      res.status(201).json({
        message: "Berhasil Menambahkan Petugas",
        petugas: petugasBaru,
      });
    } catch (error) {
      console.error("❌ Terjadi kesalahan saat menambahkan petugas:", error);
      res.status(500).json({
        message: "Gagal Menambahkan Petugas",
        error: error.message,
      });
    }
  },

  updatePetugas: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        nama,
        lokasi,
        tanggaldanwaktu,
        latitude,
        longitude,
        identitas_petugas,
        hari,
      } = req.body;
      const userId = authenticateToken(req);

      // Cek apakah petugas ada dan milik pengguna yang sesuai
      const petugas = await client.query(
        'SELECT * FROM petugas_parkirs WHERE id = $1 AND "idPengguna" = $2',
        [id, userId],
      );

      if (petugas.rows.length === 0) {
        return res
          .status(404)
          .json({ message: "Petugas tidak ditemukan atau bukan milik Anda" });
      }

      let fotoBukti = petugas.rows[0].bukti;

      // Kirim data ke API ML untuk prediksi status dan akurasi
      console.log("🔄 Mengirim data ke API ML untuk validasi...");
      const mlResponse = await axios.post(
        "https://lapor-parkir-ml.onrender.com/Petugas_parkir",
        {
          Identitas_Petugas: identitas_petugas,
          Lokasi: lokasi,
        },
      );

      console.log("📢 Response dari ML:", mlResponse.data);

      const status = mlResponse.data["Status Pelaporan"]?.[0];
      const akurasi = mlResponse.data["Akurasi"]?.[0];

      if (!status || !["Liar", "Tidak Liar"].includes(status)) {
        return res.status(400).json({
          message: "Status dari API ML tidak valid atau tidak diterima",
        });
      }

      if (typeof akurasi !== "number" && typeof akurasi !== "string") {
        return res.status(400).json({
          message: "Nilai akurasi dari ML tidak valid",
        });
      }

      const akurasiStr =
        typeof akurasi === "number" ? akurasi.toFixed(4) : akurasi.toString();

      console.log("📌 Status ML setelah update:", status);
      console.log("📌 Akurasi ML setelah update:", akurasi);

      if (req.file) {
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              { folder: "petugas_parkir", resource_type: "auto" },
              (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
              },
            )
            .end(req.file.buffer);
        });

        // Hapus gambar lama di Cloudinary
        if (fotoBukti) {
          const publicId = fotoBukti
            .split("/")
            .slice(-2)
            .join("/")
            .split(".")[0];
          await cloudinary.uploader.destroy(publicId);
        }

        fotoBukti = uploadResult;
      }

      // Update data petugas di database, termasuk kolom akurasi
      await client.query(
        `UPDATE petugas_parkirs
         SET nama = $1,
             lokasi = $2,
             tanggaldanwaktu = $3,
             latitude = $4,
             longitude = $5,
             identitas_petugas = $6,
             hari = $7,
             status = $8,
             akurasi = $9,
             bukti = $10
         WHERE id = $11`,
        [
          nama,
          lokasi,
          new Date(tanggaldanwaktu),
          parseFloat(latitude),
          parseFloat(longitude),
          identitas_petugas,
          hari,
          status,
          akurasiStr,
          fotoBukti,
          id,
        ],
      );

      res.status(200).json({
        message: "Data Petugas berhasil diperbarui",
        bukti: fotoBukti,
      });
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
      const petugas = await client.query(
        "SELECT bukti FROM petugas_parkir WHERE id = $1",
        [id],
      );
      if (petugas.rows.length === 0) {
        return res
          .status(404)
          .json({ message: "Data Petugas tidak ditemukan" });
      }
      const bukti = petugas.rows[0].bukti;

      await client.query("DELETE FROM petugas_parkirs WHERE id = $1", [id]);
      if (bukti) {
        const publicId = bukti.split("/").slice(-2).join("/").split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      }
      res.status(200).json({ message: "Data Petugas berhasil dihapus" });
    } catch (error) {
      console.error("Error deleting petugas:", error);
      res
        .status(500)
        .json({ message: "Terjadi kesalahan saat menghapus data petugas" });
    }
  },
};
