import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

const LoadingSpinner = ({ statusText = "Processing file..." }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 2rem',
      gap: '1.25rem',
      textAlign: 'center'
    }}>
      <div style={{ position: 'relative', width: '56px', height: '56px' }}>
        <Loader2 
          size={56} 
          style={{ 
            color: 'var(--emerald-500)', 
            animation: 'spin 1.2s linear infinite' 
          }} 
        />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'var(--emerald-400)'
        }}>
          <Sparkles size={20} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <p style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-main)' }}>
          {statusText}
        </p>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          FinGuard AI neural pipeline is parsing document structure and compliance rules
        </p>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
