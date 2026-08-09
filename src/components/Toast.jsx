import React from 'react';
import { useToastStore } from '../store/toastStore';

const TYPE_COLORS = {
  success: 'border-green-500 bg-green-500/10 text-green-400',
  error: 'border-red-500 bg-red-500/10 text-red-400',
  info: 'border-blue-500 bg-blue-500/10 text-blue-400'
};

export default function ToastContainer() {
  const toasts = useToastStore(state => state.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div 
          key={toast.id}
          className={`px-4 py-3 rounded shadow-lg border backdrop-blur-md animate-slide-up ${TYPE_COLORS[toast.type] || TYPE_COLORS.info}`}
        >
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
