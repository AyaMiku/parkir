const { Client } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
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
    getAllUser: async (req, res) => {
        try {
            const users = await client.query("SELECT id, nama, jenis_kelamin, username, email, role FROM users");
            res.json({
                message: "Success get data",
                data: users.rows
            });
        } catch (error) {
            res.status(500).json({ message: "Error retrieving users", error: error.message });
        }
    },

    getUserByID: async (req, res) => {
        try {
            const user = await client.query("SELECT id, nama, email, jenis_kelamin, username, foto_profil FROM users WHERE id = $1", [req.params.id]);
            if (user.rows.length === 0) {
                return res.status(404).json({ message: "User not found" });
            }
            res.json({
                message: "Success retrieving user",
                data: user.rows[0]
            });
        } catch (error) {
            res.status(500).json({ message: "Error retrieving user", error: error.message });
        }
    },

    updateUser: async (req, res) => {
        try {
            const { nama, email, jenis_kelamin, username, password, role } = req.body;
            let hashPassword;

            const userResult = await client.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
            if (userResult.rows.length === 0) {
                return res.status(404).json({ message: "User Not Found" });
            }
            const user = userResult.rows[0];
            
            if (password && password !== "") {
                const salt = await bcrypt.genSalt();
                hashPassword = await bcrypt.hash(password, salt);
            } else {
                hashPassword = user.password;
            }

            let foto_profil = user.foto_profil;
            if (req.file) {
                if (foto_profil) {
                    const publicId = foto_profil.split('/').slice(-2).join('/').split('.')[0];
                    await cloudinary.uploader.destroy(publicId);
                }

                const result = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream({
                        folder: 'foto_profil',
                        resource_type: 'auto',
                    }, (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    });
                    uploadStream.end(req.file.buffer);
                });
                foto_profil = result.secure_url;
            }

            await client.query(
                "UPDATE users SET nama = $1, email = $2, jenis_kelamin = $3, username = $4, password = $5, foto_profil = $6, role = $7 WHERE id = $8",
                [nama, email, jenis_kelamin, username, hashPassword, foto_profil, role, req.params.id]
            );

            res.json({ message: "User updated successfully", foto_profil: foto_profil });
        } catch (error) {
            res.status(500).json({ message: "Failed to update user", error: error.message });
        }
    },

    deleteUser: async (req, res) => {
        try {
            const userResult = await client.query("SELECT foto_profil FROM users WHERE id = $1", [req.params.id]);
            if (userResult.rows.length === 0) {
                return res.status(404).json({ message: "User Not Found" });
            }
            const user = userResult.rows[0];

            if (user.foto_profil) {
                const publicId = user.foto_profil.split('/').slice(-2).join('/').split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            }

            await client.query("DELETE FROM users WHERE id = $1", [req.params.id]);

            res.json({ message: "User deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: "Failed to delete user", error: error.message });
        }
    }
};
