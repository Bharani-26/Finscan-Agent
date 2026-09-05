import React from 'react';
import { FileSearch, PlusCircle } from 'lucide-react';

const EmptyState = ({ 
  icon: Icon = FileSearch, 
  title = "No data found", 
  message = "Upload your first document to get started.", 
  actionText, 
  onAction 
}) => {
  return (
    <div className="card" style={{
      padding: '3.5rem 2rem',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      borderStyle: 'dashed',
      borderColor: 'var(--border-medium)'
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--emerald-400)',
        marginBottom: '1.25rem'
      }}>
        <Icon size={32} />
      </div>

      <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
        {title}
      </h3>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '420px', marginBottom: actionText ? '1.5rem' : '0' }}>
        {message}
      </p>

      {actionText && onAction && (
        <button onClick={onAction} className="btn btn-primary">
          <PlusCircle size={18} />
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
