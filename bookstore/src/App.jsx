import { useState, useEffect } from "react";
import "./App.css";
import { API, authFetch } from "./utils/api";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";

// ── Helpers ───────────────────────────────────────────────────────────────────
const stars = (r) => "★".repeat(Math.floor(r)) + (r % 1 >= 0.5 ? "½" : "");
const price = (val) => Number(val) || 0; // safe price — never NaN

// Open Library cover by ISBN — falls back to a plain placeholder
function coverUrl(book) {
  if (book.isbn) return `https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg`;
  return `https://placehold.co/195x200/ede8e0/8a6a50?text=${encodeURIComponent(book.title.slice(0, 14))}`;
}

// ── BookCard ──────────────────────────────────────────────────────────────────
function BookCard({ book, cartItem, onAddToCart, onEdit, onDelete }) {
  return (
    <div className="book-card">
      <img
        src={coverUrl(book)}
        alt={book.title}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = `https://placehold.co/195x200/ede8e0/8a6a50?text=${encodeURIComponent(book.title.slice(0, 14))}`;
        }}
      />
      <div className="card-body">
        <h4>{book.title}</h4>
        <p className="author">by {book.author} · {book.year}</p>
        <span className="badge">{book.category}</span>
        <p className="stars">{stars(book.rating)} {book.rating}</p>
        <p className="price">${price(book.price).toFixed(2)}</p>
      </div>
      <div className="card-footer">
        <button
          className={`btn-cart${cartItem ? " in-cart" : ""}`}
          onClick={() => onAddToCart(book)}
        >
          🛒 {cartItem ? `In Cart (${cartItem.qty})` : "Add to Cart"}
        </button>
        <div className="card-ops">
          <button className="icon-btn" onClick={() => onEdit(book)} title="Edit">✏️</button>
          <button className="icon-btn delete" onClick={() => onDelete(book.id)} title="Delete">🗑️</button>
        </div>
      </div>
    </div>
  );
}

// ── CartPanel ─────────────────────────────────────────────────────────────────
function CartPanel({ cart, onChangeQty, onRemove, onClear }) {
  const total = cart.reduce((s, i) => s + price(i.book.price) * i.qty, 0);
  return (
    <section id="cart" className="panel">
      <div className="panel-header">
        <div>
          <h2>🛒 Shopping Cart</h2>
          <p>{cart.length === 0 ? "Your cart is empty" : `${cart.length} item(s)`}</p>
        </div>
      </div>
      {cart.length === 0 ? (
        <p className="empty-cart">Add some books to get started.</p>
      ) : (
        <>
          {cart.map((item) => {
            const p = price(item.book.price);
            return (
              <div key={item.book.id} className="cart-item">
                <div className="cart-item-info">
                  <h4>{item.book.title}</h4>
                  <p>${p.toFixed(2)} × {item.qty} = ${(p * item.qty).toFixed(2)}</p>
                </div>
                <div className="qty-controls">
                  <button className="qty-btn" onClick={() => onChangeQty(item.book.id, -1)}>−</button>
                  <span>{item.qty}</span>
                  <button className="qty-btn" onClick={() => onChangeQty(item.book.id, 1)}>+</button>
                  <button className="btn-remove" onClick={() => onRemove(item.book.id)} title="Remove">✕</button>
                </div>
              </div>
            );
          })}
          <div className="cart-total-bar">
            <span className="cart-total">Total: ${total.toFixed(2)}</span>
            <button className="btn-clear" onClick={onClear}>Clear Cart</button>
          </div>
        </>
      )}
    </section>
  );
}

// ── CheckoutForm ──────────────────────────────────────────────────────────────
function CheckoutSection({ cartTotal, onClear }) {
  const [form, setForm]       = useState({ fullName: "", email: "", address: "", card: "" });
  const [errors, setErrors]   = useState({});
  const [success, setSuccess] = useState("");

  function validate() {
    const e = {};
    if (!form.fullName.trim())    e.fullName = "Name is required.";
    if (!form.email.includes("@")) e.email   = "Enter a valid email.";
    if (!form.address.trim())     e.address  = "Address is required.";
    if (!/^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/.test(form.card.replace(/\s/g, "")))
      e.card = "Enter a valid 16-digit card number.";
    return e;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);
    setSuccess(`Thank you, ${form.fullName}! Your order of $${cartTotal.toFixed(2)} has been placed.`);
    setForm({ fullName: "", email: "", address: "", card: "" });
    setErrors({});
    onClear();
  }

  if (success) return (
    <section id="checkout" className="panel">
      <h2>Checkout</h2>
      <div className="success-msg">{success}</div>
      <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => setSuccess("")}>
        Place Another Order
      </button>
    </section>
  );

  return (
    <section id="checkout" className="panel">
      <div className="panel-header">
        <div>
          <h2>Checkout</h2>
          <p>Complete your order — Total: <strong>${cartTotal.toFixed(2)}</strong></p>
        </div>
      </div>
      <form onSubmit={handleSubmit} noValidate>
        <div className="checkout-grid">
          <div className="form-group">
            <label>Full Name *</label>
            <input placeholder="Jane Doe" value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            {errors.fullName && <span className="field-error">{errors.fullName}</span>}
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input type="email" placeholder="jane@example.com" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>
        </div>
        <div className="form-group">
          <label>Shipping Address *</label>
          <textarea placeholder="123 Main St, Addis Ababa" value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })} />
          {errors.address && <span className="field-error">{errors.address}</span>}
        </div>
        <div className="form-group">
          <label>Card Number *</label>
          <input placeholder="1234 5678 9012 3456" value={form.card}
            onChange={(e) => setForm({ ...form, card: e.target.value })} />
          {errors.card && <span className="field-error">{errors.card}</span>}
        </div>
        <button type="submit" className="btn-primary">Place Order</button>
      </form>
    </section>
  );
}

// ── BooksPage ─────────────────────────────────────────────────────────────────
function BooksPage({ user, onLogout, onSignUp, onLogin }) {
  const [books,    setBooks]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState("all");
  const [cart,     setCart]     = useState(() => {
    try { return JSON.parse(localStorage.getItem("bs_cart")) || []; } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [editBook, setEditBook] = useState(null);
  const [form,     setForm]     = useState({ title: "", author: "", year: "", price: "", category: "", rating: "", isbn: "" });

  // persist cart
  useEffect(() => { localStorage.setItem("bs_cart", JSON.stringify(cart)); }, [cart]);

  useEffect(() => { loadBooks(); }, []);

  async function loadBooks() {
    setLoading(true);
    const res  = await fetch(`${API}/books`);
    const data = await res.json();
    setBooks(data);
    // sync cart book snapshots with fresh prices from the server
    setCart((prev) => prev.map((item) => {
      const fresh = data.find((b) => b.id === item.book.id);
      return fresh ? { ...item, book: fresh } : item;
    }));
    setLoading(false);
  }

  // ── Cart helpers ────────────────────────────────────────
  function addToCart(book) {
    // normalize price at add-time so the cart snapshot always has a number
    const bookWithPrice = { ...book, price: Number(book.price) || 0 };
    setCart((prev) => {
      const existing = prev.find((i) => i.book.id === bookWithPrice.id);
      if (existing) return prev.map((i) => i.book.id === bookWithPrice.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { book: bookWithPrice, qty: 1 }];
    });
  }

  function changeQty(id, delta) {
    setCart((prev) =>
      prev.map((i) => i.book.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
    );
  }

  function removeFromCart(id) { setCart((prev) => prev.filter((i) => i.book.id !== id)); }
  function clearCart()        { setCart([]); }

  // ── Book CRUD ───────────────────────────────────────────
  async function saveBook(e) {
    e.preventDefault();
    const url    = editBook ? `${API}/books/${editBook.id}` : `${API}/books`;
    const method = editBook ? "PUT" : "POST";
    const res    = await authFetch(url, { method, body: JSON.stringify(form) });
    const data   = await res.json();
    if (!res.ok) return alert(data.message);
    if (editBook) setBooks((prev) => prev.map((b) => b.id === data.id ? data : b));
    else          setBooks((prev) => [...prev, data]);
    closeForm();
  }

  async function deleteBook(id) {
    if (!window.confirm("Delete this book?")) return;
    await authFetch(`${API}/books/${id}`, { method: "DELETE" });
    setBooks((prev) => prev.filter((b) => b.id !== id));
    setCart((prev) => prev.filter((i) => i.book.id !== id));
  }

  function startEdit(book) {
    setEditBook(book);
    setForm({ title: book.title, author: book.author, year: book.year, price: book.price, category: book.category, rating: book.rating, isbn: book.isbn || "" });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditBook(null);
    setForm({ title: "", author: "", year: "", price: "", category: "", rating: "", isbn: "" });
  }

  // ── Filtering ───────────────────────────────────────────
  const categories = ["all", ...new Set(books.map((b) => b.category).filter(Boolean))];
  const filtered   = books.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch   = b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
    const matchCategory = category === "all" || b.category === category;
    return matchSearch && matchCategory;
  });

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + price(i.book.price) * i.qty, 0);

  return (
    <>
      {/* ── Persist Banner ── */}
      <div className="persist-banner">💾 Cart is saved automatically.</div>

      {/* ── Header ── */}
      <header>
        <div className="header-inner">
          <h1>📚 BookStore</h1>
          <nav>
            <a href="#books">Books</a>
            <a href="#cart">Cart</a>
            <a href="#checkout">Checkout</a>
            {user ? (
              <>
                <span className="nav-user">👤 {user.firstName} {user.lastName}</span>
                <button className="btn-nav btn-nav-danger" onClick={onLogout}>Logout</button>
              </>
            ) : (
              <>
                <button className="btn-nav btn-nav-secondary" onClick={onLogin}>Login</button>
                <button className="btn-nav btn-nav-primary" onClick={onSignUp}>Sign Up</button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="page-wrapper">

        {/* Browse Books */}
        <section id="books" className="panel">
          <div className="panel-header">
            <div>
              <h2>Browse Books</h2>
              <p>Search the book collection and add to your cart.</p>
            </div>
            <div className="stats-row">
              <span>🛒 Cart: <strong>{cartCount}</strong></span>
              <button className="btn-nav btn-nav-primary" onClick={() => { setShowForm(true); setEditBook(null); }}>
                ➕ Add Book
              </button>
            </div>
          </div>

          <div className="search-row">
            <input
              placeholder="Search by title or author..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>
              ))}
            </select>
          </div>

          <p className="result-count">{filtered.length} book{filtered.length !== 1 ? "s" : ""} found</p>

          {loading ? (
            <p className="status">⏳ Loading books...</p>
          ) : (
            <div className="book-grid">
              {filtered.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  cartItem={cart.find((i) => i.book.id === book.id)}
                  onAddToCart={addToCart}
                  onEdit={startEdit}
                  onDelete={deleteBook}
                />
              ))}
            </div>
          )}
        </section>

        {/* Cart */}
        <CartPanel
          cart={cart}
          onChangeQty={changeQty}
          onRemove={removeFromCart}
          onClear={clearCart}
        />

        {/* Checkout */}
        <CheckoutSection cartTotal={cartTotal} onClear={clearCart} />

      </main>

      <footer>
        <p>© 2025 BookStore. All rights reserved.</p>
      </footer>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editBook ? "Edit Book" : "Add New Book"}</h2>
            <form onSubmit={saveBook}>
              <div className="form-group">
                <label>Title *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Book title" required />
              </div>
              <div className="form-group">
                <label>Author *</label>
                <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Author name" required />
              </div>
              <div className="checkout-grid">
                <div className="form-group">
                  <label>Year *</label>
                  <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="2023" required />
                </div>
                <div className="form-group">
                  <label>Price ($)</label>
                  <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="9.99" />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Fiction" />
                </div>
                <div className="form-group">
                  <label>Rating (0–5)</label>
                  <input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} placeholder="4.5" />
                </div>
              </div>
              <div className="form-group">
                <label>ISBN (for cover image)</label>
                <input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} placeholder="e.g. 9780525559474" />
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn-primary">{editBook ? "Save Changes" : "Add Book"}</button>
                <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
function App() {
  const [page, setPage] = useState("books");
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("bs_user")); } catch { return null; }
  });

  function handleAuthSuccess(userData) {
    setUser(userData);
    setPage("books");
  }

  function handleLogout() {
    setUser(null);
    localStorage.removeItem("bs_token");
    localStorage.removeItem("bs_user");
    setPage("books");
  }

  if (page === "signup")
    return <SignUpPage onBack={() => setPage("books")} onSuccess={handleAuthSuccess} onLogin={() => setPage("login")} />;
  if (page === "login")
    return <LoginPage onSignUp={() => setPage("signup")} onSuccess={handleAuthSuccess} />;

  return <BooksPage user={user} onLogout={handleLogout} onSignUp={() => setPage("signup")} onLogin={() => setPage("login")} />;
}

export default App;
