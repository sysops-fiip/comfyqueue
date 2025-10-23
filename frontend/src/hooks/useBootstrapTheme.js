import { useEffect, useState } from "react";

export default function useBootstrapTheme() {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");

  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute("data-bs-theme", theme); // "light" | "dark"
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return { theme, setTheme, toggleTheme };
}
