require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

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
      isbn VARCHAR(255) DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
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
    isbn: "9780525559474",
  },
  {
    title: "Atomic Habits",
    author: "James Clear",
    year: 2018,
    price: 14.99,
    category: "Self-Help",
    rating: 4.8,
    isbn: "9780735211292",
  },
  {
    title: "Project Hail Mary",
    author: "Andy Weir",
    year: 2021,
    price: 13.99,
    category: "Sci-Fi",
    rating: 4.7,
    isbn: "9780593135204",
  },
  {
    title: "Sapiens",
    author: "Yuval Noah Harari",
    year: 2014,
    price: 11.99,
    category: "History",
    rating: 4.6,
    isbn: "9780062316097",
  },
  {
    title: "The Silent Patient",
    author: "Alex Michaelides",
    year: 2019,
    price: 10.99,
    category: "Thriller",
    rating: 4.4,
    isbn: "9781250301697",
  },
];

async function seedBooks() {
  const countResult = await pool.query("SELECT COUNT(*) FROM books");
  const count = parseInt(countResult.rows[0].count);
  
  if (count === 0) {
    for (const book of initialBooks) {
      await pool.query(
        "INSERT INTO books (title, author, year, price, category, rating, isbn) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [book.title, book.author, book.year, book.price, book.category, book.rating, book.isbn]
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
  const result = await pool.query("SELECT * FROM books ORDER BY created_at ASC");
  res.json(result.rows.map((b) => ({ ...b, id: b.id.toString() })));
});

app.post("/api/books", async (req, res) => {
  const { title, author, year, price, category, rating, isbn } = req.body;
  if (!title || !author || !year)
    return res.status(400).json({ message: "Title, author and year are required" });
  
  const result = await pool.query(
    "INSERT INTO books (title, author, year, price, category, rating, isbn) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
    [title, author, Number(year), Number(price) || 9.99, category || "General", Number(rating) || 4.0, isbn || ""]
  );
  res.status(201).json({ ...result.rows[0], id: result.rows[0].id.toString() });
});

app.put("/api/books/:id", async (req, res) => {
  const { title, author, year, price, category, rating, isbn } = req.body;
  try {
    const result = await pool.query(
      "UPDATE books SET title = $1, author = $2, year = $3, price = $4, category = $5, rating = $6, isbn = $7 WHERE id = $8 RETURNING *",
      [title, author, Number(year), Number(price), category, Number(rating), isbn, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Book not found" });
    res.json({ ...result.rows[0], id: result.rows[0].id.toString() });
  } catch {
    res.status(400).json({ message: "Invalid book id" });
  }
});

app.delete("/api/books/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM books WHERE id = $1 RETURNING *", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Book not found" });
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
  
  const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  if (existingUser.rows.length > 0)
    return res.status(400).json({ message: "Email already registered" });
  
  const hashed = await bcrypt.hash(password, 10);
  const result = await pool.query(
    "INSERT INTO users (first_name, last_name, email, password) VALUES ($1, $2, $3, $4) RETURNING *",
    [firstName, lastName, email, hashed]
  );
  
  const token = jwt.sign({ id: result.rows[0].id, email: result.rows[0].email }, SECRET, {
    expiresIn: "7d",
  });
  res.status(201).json({ token, user: { id: result.rows[0].id, firstName, lastName, email } });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  
  if (result.rows.length === 0 || !(await bcrypt.compare(password, result.rows[0].password)))
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
