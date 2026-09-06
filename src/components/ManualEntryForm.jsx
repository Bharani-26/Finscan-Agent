import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Building2, 
  Calendar, 
  Tag, 
  DollarSign, 
  Calculator, 
  Sparkles, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

const ManualEntryForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    vendorName: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Software & Cloud',
    subtotal: '',
    gstAmount: '',
    totalAmount: '',
    notes: ''
  });

  const [validationError, setValidationError] = useState('');
  const [autoCalculateGst, setAutoCalculateGst] = useState(true);

  const handleSubtotalChange = (val) => {
    setFormData(prev => {
      const sub = parseFloat(val) || 0;
      if (autoCalculateGst && sub > 0) {
        const gst = Math.round(sub * 0.1 * 100) / 100;
        const tot = Math.round((sub + gst) * 100) / 100;
        return {
          ...prev,
          subtotal: val,
          gstAmount: gst.toString(),
          totalAmount: tot.toString()
        };
      }
      return { ...prev, subtotal: val };
    });
  };

  const handleGstChange = (val) => {
    setAutoCalculateGst(false);
    setFormData(prev => {
      const sub = parseFloat(prev.subtotal) || 0;
      const gst = parseFloat(val) || 0;
      const tot = Math.round((sub + gst) * 100) / 100;
      return {
        ...prev,
        gstAmount: val,
        totalAmount: tot.toString()
      };
    });
  };

  const checkValidity = () => {
    if (!formData.invoiceNumber.trim()) return 'Invoice Number is required.';
    if (!formData.vendorName.trim()) return 'Vendor Name is required.';
    if (!formData.date) return 'Invoice Date is required.';
    
    const sub = parseFloat(formData.subtotal);
    if (isNaN(sub) || sub <= 0) return 'Subtotal must be a positive number greater than 0.';

    const gst = parseFloat(formData.gstAmount);
    if (isNaN(gst) || gst < 0) return 'GST Amount must be a valid non-negative number.';

    const tot = parseFloat(formData.totalAmount);
    if (isNaN(tot) || tot <= 0) return 'Total Amount must be a positive number greater than 0.';

    return null;
  };

  const currentError = checkValidity();
  const isValid = currentError === null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) {
      setValidationError(currentError);
      return;
    }
    setValidationError('');
    onSubmit(formData);
  };

  return (
    <div className="card" style={{ padding: '1.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
        <div className="flex items-center justify-center" style={{ 
          width: '38px', 
          height: '38px', 
          borderRadius: '10px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 78, 59, 0.2) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          color: '#34D399'
        }}>
          <FileSpreadsheet size={18} />
        </div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
          Manual Financial Entry Form
        </h3>
      </div>

      {validationError && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#FCA5A5',
          padding: '0.85rem 1rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.84rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backdropFilter: 'blur(8px)'
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{validationError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Invoice Number *</label>
              <div style={{ position: 'relative' }}>
                <FileText size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  className="form-input mono"
                  style={{ paddingLeft: '2.3rem', padding: '0.65rem 0.9rem 0.65rem 2.3rem', fontSize: '0.88rem' }}
                  placeholder="e.g. INV-2026-9041"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Vendor Name *</label>
              <div style={{ position: 'relative' }}>
                <Building2 size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.3rem', padding: '0.65rem 0.9rem 0.65rem 2.3rem', fontSize: '0.88rem' }}
                  placeholder="e.g. Apex Cloud Systems"
                  value={formData.vendorName}
                  onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Invoice Date *</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="date"
                  className="form-input"
                  style={{ paddingLeft: '2.3rem', padding: '0.65rem 0.9rem 0.65rem 2.3rem', fontSize: '0.88rem' }}
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Category</label>
              <div style={{ position: 'relative' }}>
                <Tag size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <select
                  className="form-input"
                  style={{ paddingLeft: '2.3rem', padding: '0.65rem 0.9rem 0.65rem 2.3rem', fontSize: '0.88rem' }}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="Software & Cloud">Software & Cloud</option>
                  <option value="Office Equipment">Office Equipment</option>
                  <option value="Professional Services">Professional Services</option>
                  <option value="Consulting & Legal">Consulting & Legal</option>
                  <option value="Utilities & Rent">Utilities & Rent</option>
                  <option value="Marketing & Ads">Marketing & Ads</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1.1fr', 
            gap: '0.75rem',
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(15, 23, 42, 0.4)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Subtotal (₹) *</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="number"
                  step="0.01"
                  className="form-input mono"
                  style={{ paddingLeft: '2.1rem', padding: '0.6rem 0.8rem 0.6rem 2.1rem', fontSize: '0.88rem' }}
                  placeholder="0.00"
                  value={formData.subtotal}
                  onChange={(e) => handleSubtotalChange(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">GST / Tax (₹) *</label>
              <div style={{ position: 'relative' }}>
                <Calculator size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="number"
                  step="0.01"
                  className="form-input mono"
                  style={{ paddingLeft: '2.1rem', padding: '0.6rem 0.8rem 0.6rem 2.1rem', fontSize: '0.88rem' }}
                  placeholder="0.00"
                  value={formData.gstAmount}
                  onChange={(e) => handleGstChange(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ color: 'var(--emerald-400)' }}>Total Amount (₹) *</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--emerald-400)', pointerEvents: 'none' }} />
                <input
                  type="number"
                  step="0.01"
                  className="form-input mono"
                  style={{ paddingLeft: '2.1rem', padding: '0.6rem 0.8rem 0.6rem 2.1rem', fontSize: '0.88rem', borderColor: 'var(--border-emerald)', color: 'var(--emerald-400)', background: 'rgba(16, 185, 129, 0.05)' }}
                  placeholder="0.00"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Audit Notes (Optional)</label>
            <input
              type="text"
              className="form-input"
              style={{ padding: '0.65rem 0.9rem', fontSize: '0.85rem' }}
              placeholder="e.g. Approved under IT infrastructure Q3 budget"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={!isValid || loading}
            className="btn btn-primary"
            style={{
              marginTop: '0.5rem',
              padding: '0.85rem',
              opacity: !isValid || loading ? 0.5 : 1,
              cursor: !isValid || loading ? 'not-allowed' : 'pointer'
            }}
          >
            <Sparkles size={18} />
            <span>{loading ? 'Running Compliance Rules...' : 'Submit for Analysis'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ManualEntryForm;
