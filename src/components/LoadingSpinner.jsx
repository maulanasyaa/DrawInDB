import React from 'react';

export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 animate-fade-in gap-3 text-secondary h-full w-full">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}
