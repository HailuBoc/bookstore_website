const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    title:    { type: String, required: true },
    author:   { type: String, required: true },
    year:     { type: Number, required: true },
    price:    { type: Number, default: 9.99 },
    category: { type: String, default: "General" },
    rating:   { type: Number, default: 4.0 },
    isbn:     { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Book", bookSchema);
