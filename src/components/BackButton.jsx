import React from "react";
import { FiArrowLeft } from "react-icons/fi";

export default function BackButton({ onClick, label = "Back", title, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title || label}
      aria-label={title || label}
      className={`inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-surface border border-theme text-secondary text-sm font-medium normal-case tracking-normal cursor-pointer hover:text-primary hover:border-primary/40 hover:bg-surface-2 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-all duration-150 select-none ${className}`}
    >
      <FiArrowLeft className="text-base" />
      <span>{label}</span>
    </button>
  );
}
