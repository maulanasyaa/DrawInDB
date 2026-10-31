import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmVariant = "danger",
  requiredText,
  inputPlaceholder = "Type the name to confirm",
  onConfirm,
  onCancel,
}) {
  const [text, setText] = useState("");
  const needsText = requiredText != null;
  const blocked = needsText && text.trim() !== requiredText;

  const btnColor =
    confirmVariant === "danger"
      ? "bg-danger text-white hover:bg-danger-hover"
      : "btn-primary";

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const modalRoot = document.body;

  return createPortal(
    <div className="fixed inset-0 bg-base/80 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="bg-surface border border-theme rounded-2xl w-full max-w-md p-10 shadow-2xl animate-pop-in flex flex-col gap-6 text-center items-center"
      >
        <h2 id="confirm-dialog-title" className="font-display subsection-title text-primary">{title}</h2>
        <p className="text-secondary font-light leading-relaxed">{message}</p>

        {needsText && (
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !blocked) onConfirm();
            }}
            placeholder={inputPlaceholder}
            aria-label={inputPlaceholder}
            className="w-full bg-base border border-theme rounded-lg px-4 py-3 text-primary text-center focus:outline-none focus:border-focus transition-all"
          />
        )}

        <div className="flex w-full gap-4 mt-4">
          <button type="button" onClick={onCancel} className="flex-1 btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={blocked}
            className={`flex-1 rounded-full py-2 px-6 font-medium transition-all hover-lift disabled:opacity-50 disabled:cursor-not-allowed ${btnColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    modalRoot,
  );
}
