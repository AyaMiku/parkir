const express = require('express');
const allRouter = require('./routes');
const cors = require('cors');
const dotenv = require('dotenv');
const cloudinary = require('cloudinary').v2;

// Route untuk home
app.get('/', (req, res) => {
  res.send("<h1>Home</h1>");
});

app.use(allRouter);

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ message: 'Database connected', time: result.rows[0].now });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database connection failed', error: error.message });
  }
});