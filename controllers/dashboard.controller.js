const cloudinary = require("cloudinary").v2;
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = {
  getDashboard: async (req, res) => {
    try {
      const userCount = (await pool.query('SELECT COUNT(*) FROM "Users"'))
        .rows[0].count;
      const approvePetugasCount = (
        await pool.query(
          "SELECT COUNT(*) FROM petugas_parkirs WHERE status_post = 'Approve'",
        )
      ).rows[0].count;
      const approveParkirCount = (
        await pool.query(
          "SELECT COUNT(*) FROM parkir_liars WHERE status_post = 'Approve'",
        )
      ).rows[0].count;

      const totalApprove =
        parseInt(approvePetugasCount) + parseInt(approveParkirCount);
      const laporanPetugasCount = (
        await pool.query("SELECT COUNT(*) FROM petugas_parkirs")
      ).rows[0].count;
      const laporanParkirCount = (
        await pool.query("SELECT COUNT(*) FROM parkir_liars")
      ).rows[0].count;

      const dataPetugas = (
        await pool.query(
          "SELECT latitude, longitude FROM petugas_parkirs WHERE status_post = 'Approve'",
        )
      ).rows;
      const dataParkir = (
        await pool.query(
          "SELECT latitude, longitude FROM parkir_liars WHERE status_post = 'Approve'",
        )
      ).rows;

      res.json({
        userCount,
        totalApprove,
        laporanPetugasCount,
        laporanParkirCount,
        formattedPetugasData: dataPetugas,
        formattedParkirData: dataParkir,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ message: "Internal server error", error });
    }
  },

  getOverview: async (req, res) => {
    try {
      console.log("ID Pengguna dari req.user:", req.user?.id);

      const idPengguna = req.user?.id;
      if (!idPengguna) {
        return res.status(401).json({ message: "User tidak terautentikasi" });
      }

      const petugasResult = await pool.query(
        'SELECT COUNT(*) FROM petugas_parkirs WHERE "idPengguna" = $1',
        [idPengguna],
      );
      const jumlahPetugas = parseInt(petugasResult.rows[0].count, 10);

      const laporanResult = await pool.query(
        'SELECT COUNT(*) FROM parkir_liars WHERE "idPengguna" = $1 AND status = $2',
        [idPengguna, "Approve"],
      );
      const jumlahLaporan = parseInt(laporanResult.rows[0].count, 10);

      const laporanAcceptedResult = await pool.query(
        'SELECT COUNT(*) FROM parkir_liars WHERE "idPengguna" = $1 AND status = $2',
        [idPengguna, "Approve"],
      );
      const laporanAccepted = parseInt(laporanAcceptedResult.rows[0].count, 10);

      res.json({
        message: "Sukses mengambil daata overview",
        data: {
          jumlahLaporan,
          jumlahPetugas,
          laporanAccepted,
        },
      });
    } catch (error) {
      console.error("Error fetching overview data:", error);
      res.status(500).json({ message: "Gagal mengambil data overview" });
    }
  },
};
