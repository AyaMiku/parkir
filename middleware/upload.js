const multer = require('multer');
const path = require('path');

// Simpan file di memori sebagai buffer
const storage = multer.memoryStorage();

// Filter file untuk hanya menerima gambar
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) && ['.jpeg', '.jpg', '.png', '.gif'].includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Format file tidak diizinkan! Hanya jpg, jpeg, png, dan gif.'), false);
    }
};

// Konfigurasi Multer
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Maksimal 5MB
    fileFilter: fileFilter
});

module.exports = upload;
