require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed"));
  },
});

const SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: DATABASE_URL,
});

// ── Create tables ──────────────────────────────────────────────────────────────
async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS books (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      author VARCHAR(255) NOT NULL,
      year INTEGER NOT NULL,
      price DECIMAL(10, 2) DEFAULT 9.99,
      category VARCHAR(255) DEFAULT 'General',
      rating DECIMAL(2, 1) DEFAULT 4.0,
      image_url VARCHAR(500) DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Ensure `image_url` exists on any pre-existing table (safe migration)
  await pool.query(`
    ALTER TABLE books
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) DEFAULT ''
  `);
}

// ── Seed books ────────────────────────────────────────────────────────────────
const initialBooks = [
  {
    title: "The Midnight Library",
    author: "Matt Haig",
    year: 2019,
    price: 12.99,
    category: "Fiction",
    rating: 4.5,
    image_url: "",
  },
  {
    title: "Atomic Habits",
    author: "James Clear",
    year: 2018,
    price: 14.99,
    category: "Self-Help",
    rating: 4.8,
    image_url: "",
  },
  {
    title: "Project Hail Mary",
    author: "Andy Weir",
    year: 2021,
    price: 13.99,
    category: "Sci-Fi",
    rating: 4.7,
    image_url: "",
  },
  {
    title: "Sapiens",
    author: "Yuval Noah Harari",
    year: 2014,
    price: 11.99,
    category: "History",
    rating: 4.6,
    image_url: "",
  },
  {
    title: "The Silent Patient",
    author: "Alex Michaelides",
    year: 2019,
    price: 10.99,
    category: "Thriller",
    rating: 4.4,
    image_url: "",
  },
];

async function seedBooks() {
  const countResult = await pool.query("SELECT COUNT(*) FROM books");
  const count = parseInt(countResult.rows[0].count);

  if (count === 0) {
    for (const book of initialBooks) {
      await pool.query(
        "INSERT INTO books (title, author, year, price, category, rating, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [
          book.title,
          book.author,
          book.year,
          book.price,
          book.category,
          book.rating,
          book.image_url,
        ],
      );
    }
    console.log("Seeded initial books");
  }
}

// ── Initialize database ─────────────────────────────────────────────────────────
pool
  .connect()
  .then(async () => {
    console.log("Connected to PostgreSQL database");
    await createTables();
    await seedBooks();
    app.listen(5000, () => console.log("Books API running on port 5000"));
  })
  .catch((err) => console.error("PostgreSQL connection error:", err));

// ── Books ─────────────────────────────────────────────────────────────────────
app.get("/api/books", async (_req, res) => {
  const result = await pool.query(
    "SELECT * FROM books ORDER BY created_at ASC",
  );
  res.json(result.rows.map((b) => ({ ...b, id: b.id.toString() })));
});

app.post("/api/books", upload.single("image"), async (req, res) => {
  const { title, author, year, price, category, rating } = req.body;
  if (!title || !author || !year)
    return res
      .status(400)
      .json({ message: "Title, author and year are required" });

  const imageUrl = req.file ? `/uploads/${req.file.filename}` : "";

  const result = await pool.query(
    "INSERT INTO books (title, author, year, price, category, rating, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
    [
      title,
      author,
      Number(year),
      Number(price) || 9.99,
      category || "General",
      Number(rating) || 4.0,
      imageUrl,
    ],
  );
  res.status(201).json({ ...result.rows[0], id: result.rows[0].id.toString() });
});

app.put("/api/books/:id", upload.single("image"), async (req, res) => {
  const { title, author, year, price, category, rating } = req.body;
  try {
    const imageUrl = req.file
      ? `/uploads/${req.file.filename}`
      : req.body.existing_image_url || "";

    const result = await pool.query(
      "UPDATE books SET title = $1, author = $2, year = $3, price = $4, category = $5, rating = $6, image_url = $7 WHERE id = $8 RETURNING *",
      [
        title,
        author,
        Number(year),
        Number(price),
        category,
        Number(rating),
        imageUrl,
        req.params.id,
      ],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Book not found" });
    res.json({ ...result.rows[0], id: result.rows[0].id.toString() });
  } catch {
    res.status(400).json({ message: "Invalid book id" });
  }
});

app.delete("/api/books/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM books WHERE id = $1 RETURNING *",
      [req.params.id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Book not found" });
    res.json({ message: "Deleted" });
  } catch {
    res.status(400).json({ message: "Invalid book id" });
  }
});

// ── Auth ──────────────────────────────────────────────────────────────────────
app.post("/api/auth/register", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  if (!firstName || !lastName || !email || !password)
    return res.status(400).json({ message: "All fields are required" });

  const existingUser = await pool.query(
    "SELECT * FROM users WHERE email = $1",
    [email],
  );
  if (existingUser.rows.length > 0)
    return res.status(400).json({ message: "Email already registered" });

  const hashed = await bcrypt.hash(password, 10);
  const result = await pool.query(
    "INSERT INTO users (first_name, last_name, email, password) VALUES ($1, $2, $3, $4) RETURNING *",
    [firstName, lastName, email, hashed],
  );

  const token = jwt.sign(
    { id: result.rows[0].id, email: result.rows[0].email },
    SECRET,
    {
      expiresIn: "7d",
    },
  );
  res
    .status(201)
    .json({
      token,
      user: { id: result.rows[0].id, firstName, lastName, email },
    });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);

  if (
    result.rows.length === 0 ||
    !(await bcrypt.compare(password, result.rows[0].password))
  )
    return res.status(401).json({ message: "Invalid email or password" });

  const user = result.rows[0];
  const token = jwt.sign({ id: user.id, email: user.email }, SECRET, {
    expiresIn: "7d",
  });
  res.json({
    token,
    user: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email,
    },
  });
});
