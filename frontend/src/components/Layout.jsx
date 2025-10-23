import React from "react";

export default function Layout({ children, toggleTheme, theme }) {
  return (
    <div
      className={`min-h-screen w-full transition-colors ${
        theme === "dark" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"
      }`}
    >
      <header className="flex justify-between items-center px-8 py-4 border-b border-gray-700">
        <h1 className="text-2xl font-semibold">ComfyQueue</h1>
        <button
          onClick={toggleTheme}
          className="border px-3 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800"
        >
          Toggle Theme
        </button>
      </header>
      <main className="p-8 w-full max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
