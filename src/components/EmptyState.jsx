import React from 'react';

export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center animate-fade-in w-full">
      {icon && (
        <div className="text-5xl text-muted mb-6 opacity-60">
          {icon}
        </div>
      )}
      <h3 className="font-display subsection-title text-primary mb-3">{title}</h3>
      {description && (
        <p className="text-base text-secondary mb-8 max-w-md font-light leading-relaxed">{description}</p>
      )}
      {action && (
        <button 
          onClick={action.onClick}
          className="btn-primary hover-lift"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
