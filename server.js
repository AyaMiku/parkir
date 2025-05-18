const express = require("express");
const server = express();
const allRouter = require("./routes");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const { Client } = require("pg");

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

client
  .connect()
  .then(() => console.log("Database connected"))
  .catch((err) => console.error("Database connection error:", err.stack));

server.use(
  cors({
    origin: "http://localhost:5173",
    method: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
  }),
);
server.use(express.json({ limit: "50mb" }));
server.use(express.urlencoded({ limit: "50mb", extended: true }));

// Router
server.use(allRouter);

// Route untuk home
server.get("/", (req, res) => {
  res.send("<h1>Home</h1>");
});

const PORT = 3000;

// Jalankan server
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
