import { useState } from "react";
import Field from "../components/Field";
import { API } from "../utils/api";

function SignUpPage({ onBack, onSuccess, onLogin }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  function validate() {
    const e = {};
    if (form.firstName.trim().length < 2) e.firstName = "Required.";
    if (form.lastName.trim().length < 2) e.lastName = "Required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email.";
    if (form.password.length < 6) e.password = "At least 6 characters.";
    if (form.confirm !== form.password) e.confirm = "Passwords do not match.";
    return e;
  }
  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return setErrors({ email: data.message });
    localStorage.setItem("bs_token", data.token);
    localStorage.setItem("bs_user", JSON.stringify(data.user));
    onSuccess(data.user);
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-heading">
          <button className="back-btn" onClick={onBack}>
            ←
          </button>
          <h2>Sign Up</h2>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <Field label="First Name" error={errors.firstName}>
            <input
              placeholder="Enter your first name"
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
            />
          </Field>
          <Field label="Last Name" error={errors.lastName}>
            <input
              placeholder="Enter your last name"
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
            />
          </Field>
          <Field label="Email" error={errors.email}>
            <input
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
          <Field label="Password" error={errors.password}>
            <input
              type={showPw ? "text" : "password"}
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
            />
            <button
              type="button"
              className="show-pw"
              onClick={() => setShowPw((s) => !s)}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </Field>
          <Field label="Confirm Password" error={errors.confirm}>
            <input
              type="password"
              placeholder="Confirm password"
              value={form.confirm}
              onChange={(e) => set("confirm", e.target.value)}
            />
          </Field>
          <button type="submit" className="btn-full">
            Sign Up
          </button>
        </form>
        <p className="auth-footer">
          Already have an account?{" "}
          <span className="link" onClick={onLogin}>
            Login
          </span>
        </p>
      </div>
    </div>
  );
}

export default SignUpPage;
