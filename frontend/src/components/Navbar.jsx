import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Navbar({ theme, toggleTheme, role }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("theme");
    navigate("/login");
  };

  return (
    <nav className="navbar navbar-expand-lg border-bottom bg-body sticky-top">
      <div className="container-xl">
        <Link className="navbar-brand fw-semibold" to="/">
          ComfyQueue
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNav"
          aria-controls="mainNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="mainNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className={`nav-link ${pathname === "/" ? "active" : ""}`} to="/">
                Dashboard
              </Link>
            </li>

            {role === "admin" && (
              <li className="nav-item">
                <Link className={`nav-link ${pathname === "/admin" ? "active" : ""}`} to="/admin">
                  Admin Panel
                </Link>
              </li>
            )}

            <li className="nav-item">
              <Link className={`nav-link ${pathname === "/settings" ? "active" : ""}`} to="/settings">
                Settings
              </Link>
            </li>
          </ul>

          <div className="d-flex gap-2">
            <button
              onClick={toggleTheme}
              className="btn btn-outline-secondary"
              type="button"
            >
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
            <button onClick={handleLogout} className="btn btn-danger" type="button">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
