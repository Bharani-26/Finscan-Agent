import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const DisclaimerBanner = () => {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('finscan_disclaimer_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('finscan_disclaimer_dismissed', 'true');
  };

  if (isDismissed) return null;

  return (
    <div className="disclaimer-banner" role="alert">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center' }}>
        <AlertTriangle className="disclaimer-icon" size={16} />
        <span>
          Indicative results only — consult a qualified professional before filing or making financial decisions
        </span>
      </div>
      <button
        onClick={handleDismiss}
        title="Dismiss banner for current session"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#FCD34D',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.1rem 0.3rem',
          borderRadius: '4px',
          opacity: 0.8,
          transition: 'opacity 0.2s ease',
          marginLeft: '0.5rem'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default DisclaimerBanner;
