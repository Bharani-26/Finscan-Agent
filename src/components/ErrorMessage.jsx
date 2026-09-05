import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

const ErrorMessage = ({ message, onRetry }) => {
  return (
    <div style={{
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: 'var(--radius-md)',
      padding: '1.25rem 1.5rem',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '1rem',
      color: '#FCA5A5',
      margin: '1rem 0'
    }}>
      <AlertCircle size={24} style={{ color: '#EF4444', flexShrink: 0, marginTop: '2px' }} />
      
      <div style={{ flex: 1 }}>
        <h4 style={{ color: '#F87171', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
          Analysis Failed
        </h4>
        <p style={{ fontSize: '0.88rem', color: '#FECACA', lineHeight: 1.4 }}>
          {message || 'An unexpected error occurred during processing.'}
        </p>
      </div>

      {onRetry && (
        <button 
          onClick={onRetry} 
          className="btn btn-sm btn-secondary" 
          style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#FCA5A5' }}
        >
          <RefreshCw size={14} />
          Retry
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
