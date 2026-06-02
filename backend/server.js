require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const mongoose = require("mongoose");
const User     = require("./models/User");
const Book     = require("./models/Book");

const app = express();
app.use(cors());
app.use(express.json());

const SECRET      = process.env.JWT_SECRET || "dev_secret_change_me";
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Connected to database"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ── Seed + migrate ────────────────────────────────────────────────────────────
const initialBooks = [
  { title: "The Midnight Library",  author: "Matt Haig",           year: 2019, price: 12.99, category: "Fiction",   rating: 4.5, isbn: "9780525559474" },
  { title: "Atomic Habits",         author: "James Clear",          year: 2018, price: 14.99, category: "Self-Help", rating: 4.8, isbn: "9780735211292" },
  { title: "Project Hail Mary",     author: "Andy Weir",            year: 2021, price: 13.99, category: "Sci-Fi",    rating: 4.7, isbn: "9780593135204" },
  { title: "Sapiens",               author: "Yuval Noah Harari",    year: 2014, price: 11.99, category: "History",   rating: 4.6, isbn: "9780062316097" },
  { title: "The Silent Patient",    author: "Alex Michaelides",     year: 2019, price: 10.99, category: "Thriller",  rating: 4.4, isbn: "9781250301697" },
];

Book.countDocuments().then(async (count) => {
  if (count === 0) {
    await Book.insertMany(initialBooks);
    console.log("Seeded initial books");
  } else {
    // patch existing books that are missing fields
    for (const seed of initialBooks) {
      await Book.updateOne(
        { title: seed.title, $or: [{ price: { $exists: false } }, { isbn: { $in: [null, "", undefined] } }] },
        { $set: { isbn: seed.isbn, price: seed.price, category: seed.category, rating: seed.rating } }
      );
    }
  }
});

// ── Books ─────────────────────────────────────────────────────────────────────
app.get("/api/books", async (_req, res) => {
  const books = await Book.find().sort({ createdAt: 1 }).lean();
  res.json(books.map((b) => ({ ...b, id: b._id.toString() })));
});

app.post("/api/books", async (req, res) => {
  const { title, author, year, price, category, rating, isbn } = req.body;
  if (!title || !author || !year)
    return res.status(400).json({ message: "Title, author and year are required" });
  const book = new Book({ title, author, year: Number(year), price: Number(price) || 9.99, category: category || "General", rating: Number(rating) || 4.0, isbn: isbn || "" });
  await book.save();
  res.status(201).json({ ...book.toObject(), id: book._id.toString() });
});

app.put("/api/books/:id", async (req, res) => {
  try {
    const updated = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: "Book not found" });
    res.json({ ...updated, id: updated._id.toString() });
  } catch {
    res.status(400).json({ message: "Invalid book id" });
  }
});

app.delete("/api/books/:id", async (req, res) => {
  try {
    const deleted = await Book.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return res.status(404).json({ message: "Book not found" });
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
  if (await User.findOne({ email }))
    return res.status(400).json({ message: "Email already registered" });
  const hashed = await bcrypt.hash(password, 10);
  const user   = new User({ firstName, lastName, email, password: hashed });
  await user.save();
  const token = jwt.sign({ id: user._id, email: user.email }, SECRET, { expiresIn: "7d" });
  res.status(201).json({ token, user: { id: user._id, firstName, lastName, email } });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ message: "Invalid email or password" });
  const token = jwt.sign({ id: user._id, email: user.email }, SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email } });
});

app.listen(5000, () => console.log("Books API running on port 5000"));
