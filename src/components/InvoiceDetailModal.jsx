import React from 'react';
import { X, FileText, CheckCircle2, ShieldCheck, DollarSign, Calendar, Tag } from 'lucide-react';
import RiskBadge from './RiskBadge';

const InvoiceDetailModal = ({ invoice, onClose }) => {
  if (!invoice) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid var(--border-emerald)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--emerald-400)'
            }}>
              <FileText size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="mono" style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                  {invoice.invoiceNumber}
                </span>
                <RiskBadge riskLevel={invoice.riskLevel} />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{invoice.vendorName}</p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Indicative Disclaimer Tag */}
        <div style={{ marginBottom: '1.25rem' }}>
          <span className="indicative-tag">
            <ShieldCheck size={14} />
            AI-generated, indicative only
          </span>
        </div>

        {/* Key Metrics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.5rem'
        }}>
          <div className="card" style={{ padding: '0.85rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Subtotal</span>
            <div className="mono font-bold" style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
              ₹{typeof invoice.subtotal === 'number' ? invoice.subtotal.toFixed(2) : invoice.subtotal}
            </div>
          </div>

          <div className="card" style={{ padding: '0.85rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GST / Tax</span>
            <div className="mono font-bold" style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
              ₹{typeof invoice.gstAmount === 'number' ? invoice.gstAmount.toFixed(2) : invoice.gstAmount}
            </div>
          </div>

          <div className="card" style={{ padding: '0.85rem', borderColor: 'var(--border-emerald)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--emerald-400)' }}>Total Amount</span>
            <div className="mono font-bold" style={{ fontSize: '1.15rem', color: 'var(--emerald-400)' }}>
              ₹{typeof invoice.totalAmount === 'number' ? invoice.totalAmount.toFixed(2) : invoice.totalAmount}
            </div>
          </div>

          <div className="card" style={{ padding: '0.85rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category</span>
            <div className="font-bold" style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {invoice.category}
            </div>
          </div>
        </div>

        {/* AI Analysis Summary */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            AI OCR Audit Summary
          </h4>
          <p style={{
            fontSize: '0.9rem',
            color: 'var(--text-main)',
            lineHeight: 1.5,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            {invoice.aiSummary}
          </p>
        </div>

        {/* Tax Verification */}
        {invoice.taxVerification && (
          <div style={{
            marginBottom: '1.5rem',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: invoice.riskLevel === 'HIGH' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            border: `1px solid ${invoice.riskLevel === 'HIGH' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.88rem',
            color: invoice.riskLevel === 'HIGH' ? '#FCA5A5' : 'var(--emerald-400)'
          }}>
            <CheckCircle2 size={16} />
            <span>{invoice.taxVerification}</span>
          </div>
        )}

        {/* Line Items Table */}
        {invoice.lineItems && invoice.lineItems.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Extracted Line Items
            </h4>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Rate</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.description}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>₹{item.rate?.toFixed(2)}</td>
                      <td className="mono font-bold" style={{ textAlign: 'right' }}>₹{item.total?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close View
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailModal;
