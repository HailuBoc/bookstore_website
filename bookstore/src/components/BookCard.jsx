// React import not required with the new JSX transform

const stars = (rating) => {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? "½" : "";
  return "★".repeat(full) + half;
};

function BookCard({ book, cartItem, onAddToCart }) {
  return (
    <div className="book-card">
      <img
        src={book.cover}
        alt={book.title}
        onError={(e) =>
          (e.target.src = "https://placehold.co/180x200?text=No+Cover")
        }
      />
      <div className="info">
        <h4>{book.title}</h4>
        <p className="author">by {book.author}</p>
        <span className="badge">{book.category}</span>
        <p className="stars">
          {stars(book.rating)} {book.rating}
        </p>
        <p className="price">${book.price.toFixed(2)}</p>
        <button className="add-cart-btn" onClick={() => onAddToCart(book.id)}>
          🛒 {cartItem ? `(${cartItem.qty})` : "Add"}
        </button>
      </div>
    </div>
  );
}

export default BookCard;
