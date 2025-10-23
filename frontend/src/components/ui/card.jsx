import React from "react";
import clsx from "clsx";

export function Card({ className, children }) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-sm transition hover:shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children }) {
  return <div className="mb-4">{children}</div>;
}

export function CardTitle({ children }) {
  return <h2 className="text-xl font-semibold mb-2">{children}</h2>;
}

export function CardContent({ children }) {
  return <div className="space-y-3">{children}</div>;
}


