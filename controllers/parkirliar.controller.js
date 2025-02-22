const cloudinary = require('cloudinary').v2
const model = require('../models')
const {User} = model
const {parkir_liar} = model

module.exports ={

    getAllLaporan :async (req, res) => {
        try {
            const idPenggunaParam = req.params.idPengguna; 
            const idPenggunaSession = req.session.idPengguna; 
      
            console.log('ID Pengguna dari Session:', idPenggunaSession); 
            console.log('ID Pengguna dari Parameter:', idPenggunaParam); 
        
            if (String(idPenggunaSession) !== String(idPenggunaParam)) {
                return res.status(401).json({ message: "Anda tidak memiliki izin untuk mengakses data ini." });
            }
            const petugas = await parkir_liar.findAll({
                where: { idPengguna: idPenggunaSession }, 
                attributes: [
                    "id",
                    "idPengguna",
                    "jenis_kendaraan",
                    "latitude",
                    "longitude",
                    "lokasi",
                    "status",
                    "deskripsi_masalah",
                    "hari",
                    "bukti",
                ]
            });
    
    
            if (petugas.length === 0) {
                return res.status(404).json({ message: "Tidak ada data laporan ditemukan" });
            }
    
            res.json({
                message: "Sukses Mengambil Data Parkir",
                data: petugas
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Gagal mengambil data Parkir", error: error.message });
        }
    },

    getParkirById: async (req, res) => {
        try {
            const postId = req.params.id; 
    
            if (!postId) {
                return res.status(400).json({ message: "ID postingan tidak disediakan." });
            }
    
            const post = await parkir_liar.findOne({ where: { id: postId } }); // Ambil data postingan berdasarkan ID
    
            if (!post) {
                return res.status(404).json({ message: "Postingan tidak ditemukan." });
            }
    
            res.json({
                message: "Sukses Mengambil Data Postingan",
                data: post
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Gagal mengambil data postingan", error: error.message });
        }
    },



    addLaporan: async (req, res) => {
        const { jenis_kendaraan, tanggaldanwaktu, latitude, longitude, lokasi, status, deskripsi_masalah, hari } = req.body;
        console.log("Received body:", req.body);
        console.log("Received file:", req.file);
        try {
            const idPengguna = req.session.idPengguna;
    
            // Periksa apakah file gambar ada
            if (!req.file) {
                return res.status(400).json({ message: "Gambar tidak ditemukan." });
            }
    
            
            console.log("Uploading to Cloudinary...");
            
            const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'parkir_liar', resource_type: 'auto' }, 
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );

            
            uploadStream.end(req.file.buffer); 
        });
    
            console.log("Upload successful:", result); 
            await parkir_liar.create({
                jenis_kendaraan: jenis_kendaraan,
                tanggaldanwaktu: new Date(tanggaldanwaktu),
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                lokasi: lokasi,
                status: status,
                deskripsi_masalah: deskripsi_masalah,
                hari: hari,
                bukti: result.secure_url,
                idPengguna: idPengguna,
                status_post: 'Pending'
            });
    
            res.status(201).json({
                message: "Berhasil Menambahkan Laporan",
                gambarUrl: result.secure_url 
            });
    
        } catch (error) {
            console.error("Terjadi kesalahan saat menambahkan laporan:", error); 
            res.status(500).json({
                message: "Gagal Menambahkan Laporan",
                error: error.message 
            });
        }
    },

    checkParkirStatus: async (req, res) => {
        const {id} = req.params
        const data = await parkir_liar.findByPk(id)

        if (!data) {
            return res.status(404).json({
                message: "Data Parkir Tidak di Temukan"
            })
        }
        res.status(200).json({
                jenis_kendaraan: data.jenis_kendaraan,
                tanggaldanwaktu: data.tanggaldanwaktu,
                latitude: data.latitude,
                longitude: data.longitude,
                lokasi: data.lokasi,
                status: data.status,
                hari: data.hari,
                bukti: data.bukti,
                status_post: data.status_post,
                message: data.status_post === 'Pending' ? 'Menunggu persetujuan admin.' : `Status: ${data.status_post}`

        })

    },


    updateLaporan: async (req, res) =>{
        const laporan = await parkir_liar.findOne({
            where: {
                id: req.params.id
            }
        })
        if(!laporan) return res.status(404).json({
            message: "Laporan Anda Tidak Ditemukan"
        })

        const { jenis_kendaraan, tanggaldanwaktu, latitude, longitude, lokasi,status, deskripsi_masalah, hari, } = req.body;
        let bukti = laporan.bukti; 

    try {
        
        if (req.file) {
            console.log("Menerima file baru untuk diupload:", req.file);

            if (bukti) {
                const publicId = bukti.split('/').slice(-2).join('/').split('.')[0];
                console.log("Deleting old image with publicId:", publicId);
                
 
                await cloudinary.uploader.destroy(publicId);
            }

            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    { folder: 'parkir_liar', resource_type: 'auto' },
                    (error, result) => {
                        if (error) {
                            console.error("Error saat upload:", error);
                            return reject(error);
                        }
                        console.log("Upload result:", result);
                        resolve(result.secure_url);
                    }
                ).end(req.file.buffer);
            });
            bukti = result; 
        }



            await parkir_liar.update({
            jenis_kendaraan: jenis_kendaraan,
            tanggaldanwaktu: new Date(tanggaldanwaktu), 
            latitude: parseFloat(latitude), 
            longitude: parseFloat(longitude), 
            lokasi: lokasi,
            status: status,
            deskripsi_masalah: deskripsi_masalah, 
            hari: hari,
            bukti: bukti
            },{
                where:{
                    id: laporan.id
                }
            })
            res.status(200).json({
                message: "Laporan Berhasil Diupdate"
            })
        } catch (error) {
            res.status(400).json({
                message: error.message
            })
            
        }

        
    },

    
}