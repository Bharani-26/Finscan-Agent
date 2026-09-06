import React from 'react';
import { X, CheckCircle2, ShieldAlert, FileText, Calendar, Lightbulb, ExternalLink } from 'lucide-react';
import RiskBadge from './RiskBadge';

const AlertDetailModal = ({ alert, onClose, onMarkReviewed }) => {
  if (!alert) return null;

  const isReviewed = alert.status === 'reviewed';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F59E0B'
            }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{alert.id}</span>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-main)', marginTop: '0.1rem' }}>{alert.issue}</h3>
            </div>
          </div>

          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Risk & Status Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Risk Rating:</span>
            <RiskBadge riskLevel={alert.riskLevel} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Status:</span>
            <span className={`badge ${isReviewed ? 'badge-low' : 'badge-medium'}`}>
              {isReviewed ? 'REVIEWED' : 'PENDING REVIEW'}
            </span>
          </div>

          {alert.date && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              <Calendar size={14} />
              <span>{alert.date}</span>
            </div>
          )}
        </div>

        {/* Reference Invoice */}
        {alert.invoiceRef && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem' }}>
              <FileText size={16} className="text-emerald" />
              <span style={{ color: 'var(--text-muted)' }}>Associated Invoice:</span>
              <strong className="mono" style={{ color: 'var(--text-main)' }}>{alert.invoiceRef}</strong>
            </div>
          </div>
        )}

        {/* Detailed Explanation */}
        <div style={{ marginBottom: '1.25rem' }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Detailed Compliance Analysis
          </h4>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: 1.6, backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            {alert.explanation}
          </p>
        </div>

        {/* Action Recommendation */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h4 style={{ fontSize: '0.9rem', color: '#FCD34D', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Lightbulb size={16} />
            Recommended Compliance Action
          </h4>
          <div style={{
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            color: '#FDE68A',
            fontSize: '0.9rem',
            lineHeight: 1.5
          }}>
            {alert.recommendation}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
          
          {!isReviewed && (
            <button 
              onClick={() => {
                onMarkReviewed(alert.id);
                onClose();
              }} 
              className="btn btn-primary"
            >
              <CheckCircle2 size={16} />
              Mark as Reviewed
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertDetailModal;
