import React from "react";
import { createPortal } from "react-dom";

export default function AboutDialog({ onClose }) {
  // eslint-disable-next-line no-undef
  const version = __APP_VERSION__;

  return createPortal(
    <div
      className="fixed inset-0 bg-base/80 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-theme rounded-2xl w-full max-w-sm p-12 shadow-2xl animate-pop-in flex flex-col items-center text-center relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="orb orb-mint w-[300px] h-[300px] top-[-150px] mix-blend-multiply" />

        <div className="w-16 h-16 bg-accent text-canvas flex items-center justify-center text-3xl font-bold rounded-2xl mb-6 shadow-xl z-10">
          D
        </div>
        <h2 className="font-display section-title text-primary tracking-tight z-10 mb-2">
          DrawInDB
        </h2>
        <p className="text-secondary text-sm mb-8 z-10 font-medium">
          Version {version}
        </p>

        <p className="text-muted text-sm mb-10 z-10 font-light leading-relaxed">
          Premium, offline-first visual database modeling.
          <br />
          <br />
          Built with Electron, React & React Flow
        </p>

        <div className="flex w-full justify-between items-center z-10">
          <a
            href="#"
            className="text-secondary hover:text-primary transition-colors text-sm font-medium border-b border-transparent hover:border-primary"
          >
            GitHub
          </a>
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
