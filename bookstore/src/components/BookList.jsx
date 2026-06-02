// React import not required with the new JSX transform
import BookCard from "./BookCard";

function BookList({ books, cart, onAddToCart }) {
  return (
    <div className="book-grid">
      {books.map((book) => {
        const cartItem = cart.find((i) => i.book.id === book.id);
        return (
          <BookCard
            key={book.id}
            book={book}
            cartItem={cartItem}
            onAddToCart={onAddToCart}
          />
        );
      })}
    </div>
  );
}

export default BookList;
