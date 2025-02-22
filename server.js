const express = require('express');
const server = express();
const allRouter = require('./routes');
const session = require('express-session');
const cors = require('cors');
const dotenv = require('dotenv');
const cloudinary = require('cloudinary').v2;
const morgan = require('morgan');
const { none } = require('./middleware/upload');

dotenv.config();

const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

client.connect()
  .then(() => console.log("Database connected"))
  .catch(err => console.error("Database connection error:", err.stack));

// Konfigurasi Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});

// Middleware
server.use(morgan('tiny'));

server.use(express.json());
server.use(express.urlencoded({ extended: true }))


server.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

// Router
server.use(allRouter);

// Route untuk home
server.get('/', (req, res) => {
  res.send("<h1>Home</h1>");
});

const PORT = 3000;

// Jalankan server
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});