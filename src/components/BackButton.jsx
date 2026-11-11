import React from "react";
import { FiArrowLeft } from "react-icons/fi";

export default function BackButton({ onClick, label = "Back", title, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title || label}
      aria-label={title || label}
      className={`inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-surface border border-theme text-secondary text-sm font-medium normal-case tracking-normal hover:text-primary hover:border-primary/40 hover:bg-surface-2 active:scale-95 transition-all select-none ${className}`}
    >
      <FiArrowLeft className="text-base" />
      <span>{label}</span>
    </button>
  );
}
