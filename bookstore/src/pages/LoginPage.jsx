import { useState } from "react";
import Field from "../components/Field";
import { API } from "../utils/api";

function LoginPage({ onSignUp, onSuccess }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.message);

    localStorage.setItem("bs_token", data.token);
    localStorage.setItem("bs_user", JSON.stringify(data.user));
    onSuccess(data.user);
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>Login</h2>
        {error && <p className="field-error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <Field label="Email">
            <input
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              required
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              required
            />
          </Field>
          <button type="submit" className="btn-full">
            Login
          </button>
        </form>
        <p className="auth-footer">
          Don't have an account?{" "}
          <span className="link" onClick={onSignUp}>
            Sign Up
          </span>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
