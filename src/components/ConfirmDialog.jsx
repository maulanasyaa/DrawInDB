import React from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmDialog({ title, message, confirmLabel, confirmVariant = 'danger', onConfirm, onCancel }) {
  const btnColor = confirmVariant === 'danger' 
    ? 'bg-danger text-white hover:bg-danger-hover'
    : 'btn-primary';

  const modalRoot = document.body;

  return createPortal(
    <div className="fixed inset-0 bg-base/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-md animate-fade-in">
      <div className="bg-surface border border-theme rounded-2xl w-full max-w-md p-10 shadow-2xl animate-pop-in flex flex-col gap-6 text-center items-center">
        <h2 className="font-display subsection-title text-primary">{title}</h2>
        <p className="text-secondary font-light leading-relaxed">{message}</p>
        
        <div className="flex w-full gap-4 mt-4">
          <button 
            onClick={onCancel}
            className="flex-1 btn-secondary"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className={`flex-1 rounded-full py-2 px-6 font-medium transition-all hover-lift ${btnColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    modalRoot
  );
}
