import React from "react";
import { createPortal } from "react-dom";
import logo from "../assets/drawindb-logo.png";

const AUTHOR_NAME = "Maulana Syarip Abdurahman";
const AUTHOR_URL = "https://github.com/maulanasyaa";
const SAWERIA_URL = "https://saweria.co/maulanasa";

function openExternal(url) {
  if (window.api?.openExternal) {
    window.api.openExternal(url);
  } else {
    window.open(url, "_blank");
  }
}

export default function AboutDialog({ onClose }) {
  // eslint-disable-next-line no-undef
  const version = __APP_VERSION__;

  return createPortal(
    <div
      className="fixed inset-0 bg-base/80 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-theme rounded-2xl w-full max-w-sm shadow-2xl animate-pop-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col items-center pt-10 pb-6 px-6 border-b border-theme">
          <img
          src={logo}
          alt="DrawInDB logo"
          className="w-16 h-16 rounded-2xl mb-4 shadow-xl"
        />
          <h2 className="font-display section-title text-primary tracking-tight">DrawInDB</h2>
          <p className="text-secondary text-sm mt-1 font-medium">Versi {version}</p>
        </div>

        {/* Body — kredit */}
        <div className="px-6 py-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted text-sm">Dibuat oleh</span>
            <span className="text-sm font-medium text-primary">{AUTHOR_NAME}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted text-sm">GitHub</span>
            <button
              onClick={() => openExternal(AUTHOR_URL)}
              className="text-sm font-medium text-accent hover:underline"
            >
              @maulanasyaa
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          <button
            onClick={() => openExternal(SAWERIA_URL)}
            className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-sm text-white font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <span>☕</span>
            <span>Traktir Kopi di Saweria</span>
          </button>
          <button onClick={onClose} className="btn-primary w-full">
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
