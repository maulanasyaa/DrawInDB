import React, { useEffect, useRef, useState } from "react";
import { FiCheck, FiCopy } from "react-icons/fi";
import { copyText } from "../utils/clipboard";
import { useToastStore } from "../store/toastStore";

/** Tombol ikon copy; berubah jadi centang ~1,5 detik setelah berhasil. */
export default function CopyButton({ text, title = "Copy markdown", className = "" }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleClick = async () => {
    const ok = await copyText(text);
    if (!ok) {
      useToastStore.getState().error("Copy failed");
      return;
    }

    useToastStore.getState().success("Copied to clipboard");
    setCopied(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleClick}
      title={title}
      aria-label={title}
      className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
        copied
          ? "text-success"
          : "text-muted hover:text-primary hover:bg-surface-2"
      } ${className}`}
    >
      {copied ? <FiCheck className="text-sm" /> : <FiCopy className="text-sm" />}
    </button>
  );
}
