import { useState } from "react";

function CheckoutForm({ cartTotal, onCheckOut, onClearCart }) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    address: "",
    card: "",
  });
  const [errors, setErrors] = useState({});
  const [orderSuccess, setOrderSuccess] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim())
      newErrors.fullName = "please enter your name";
    if (!formData.email.includes("@")) newErrors.email = "enter a valid email";
    if (!formData.address.trim())
      newErrors.address = "enter a shipping address";
    if (!formData.card.trim()) newErrors.card = "enter a valid card";
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setOrderSuccess(
      `Thank you , ${formData.fullName}! your order for ${cartTotal.toFixed(2)} has been placed`,
    );
    setFormData({ fullName: "", email: "", address: "", card: "" });
    setErrors({});
    onClearCart();
    onCheckOut();
  };
  return (
    <section id="checkoutPanel" className="panel">
      <h2>Checkout</h2>
      {orderSuccess ? (
        <div className="success-msg">{orderSuccess}</div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="fullName">Full Name *</label>

              <input
                type="text"
                id="fullName"
                name="fullName"
                placeholder="jane doe"
                value={formData.fullName}
                onChange={handleChange}
              />
              {errors.fullName && (
                <span className="error-msg">{errors.fullName}</span>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="email">Email:</label>
              <input
                type="email"
                name="email"
                id="email"
                placeholder="jane@gmail.com"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && (
                <span className="error-msg">{errors.email}</span>
              )}
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="address">Your Address:</label>
            <textarea
              id="address"
              name="address"
              placeholder="123, addis ababa"
              value={formData.address}
              onChange={handleChange}
            />
            {errors.address && (
              <span className="error-msg">{errors.address}</span>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="card">Your Card number</label>
            <input
              type="text"
              name="card"
              id="card"
              placeholder="1234 1524 2689"
              value={formData.card}
              onChange={handleChange}
            />
            {errors.card && <span className="error-msg">{errors.card}</span>}
          </div>
          <button type="submit" className="btn-primary">
            place order
          </button>
        </form>
      )}
    </section>
  );
}

export default CheckoutForm;
