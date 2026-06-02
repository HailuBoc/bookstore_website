function CartPanel({ cart, onChangeQty, onRemoveItem }) {
  const total = cart.reduce((sum, item) => sum + item.book.price * item.qty, 0);

  return (
    <section className="pabel">
      <h2>shopping cart</h2>
      <div id="cartItems">
        {cart.length === 0 ? (
          <p>cart is empty</p>
        ) : (
          cart.map((item) => (
            <div key={item.book.id} className="data-item">
              <div>
                <h4>{item.book.title}</h4>
                <p>
                  ${item.book.price.toFixed(2)} * {item.qty}
                </p>
              </div>
              <div className="qty-controls">
                <button
                  className="qty-btn"
                  onClick={() => onChangeQty(item.book.id, -1)}
                >
                  -
                </button>
                <span>{item.qty}</span>
                <button
                  className="qty-btn"
                  onClick={() => onChangeQty(item.book.id, 1)}
                >
                  +
                </button>
                <button
                  className="remove-btn"
                  onClick={() => onRemoveItem(item.book.id)}
                >
                  Trash
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      {cart.length > 0 && (
        <div className="cart-total-bar">
          <p className="total">Total: ${total.toFixed(2)}</p>
          <button id="clearCartBtn" onClick={() => onChangeQty(null, null)}>
            Clear Button
          </button>
        </div>
      )}
    </section>
  );
}

export default CartPanel;
