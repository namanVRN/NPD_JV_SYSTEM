import React, { useState } from "react";
import { toast } from "react-toastify";
import api from "../api.js";

export default function LoginPage({ onLogin }) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId || !password) {
      toast.error("Please enter User ID and Password");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", { userId, password });
      localStorage.setItem("jv_user", JSON.stringify(res.data.user));
      toast.success(`Welcome, ${res.data.user.userName}!`);
      onLogin(res.data.user);
    } catch (err) {
      toast.error(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">
            <i className="bi bi-buildings"></i>
          </div>
          <h1>
            <span className="gradient-text">JV</span> Lead Management
          </h1>
          <p>Sign in to your account</p>
        </div>

        <div>
          <div className="form-group">
            <label>User ID</label>
            <div className="input-wrapper">
              <i className="bi bi-person input-icon"></i>
              <input
                type="text"
                className="form-control form-control-icon"
                placeholder="Enter your User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)}
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-wrapper">
              <i className="bi bi-lock input-icon"></i>
              <input
                type={showPassword ? "text" : "password"}
                className="form-control form-control-icon"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
              </button>
            </div>
          </div>

          <button
            className="btn btn-primary login-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
                Signing in...
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right"></i>
                Sign In
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}