import React from "react";
import Navbar from "../components/Navbar";
import useBootstrapTheme from "../hooks/useBootstrapTheme";

export default function MainLayout({ children }) {
  const { theme, toggleTheme } = useBootstrapTheme();
  const role = localStorage.getItem("role");

  return (
    <div className="d-flex flex-column min-vh-100 bg-body text-body">
      <Navbar theme={theme} toggleTheme={toggleTheme} role={role} />

      {/* ✅ container-fluid ensures full browser width */}
      <main className="flex-grow-1 container-fluid py-4 px-5">
        {children}
      </main>
    </div>
  );
}
