import React, { useState } from 'react';
import { useFinGuard } from '../context/FinGuardContext';
import { 
  FileText, 
  DollarSign, 
  ShieldAlert, 
  UploadCloud, 
  Search, 
  Filter, 
  Eye, 
  ArrowUpRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import EmptyState from '../components/EmptyState';
import InvoiceDetailModal from '../components/InvoiceDetailModal';

const Dashboard = () => {
  const { invoices, alerts, setActivePage } = useFinGuard();
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');

  // Compute Summary Metrics
  const totalInvoicesCount = invoices.length;
  const totalValue = invoices.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
  const activeAlertsCount = alerts.filter(a => a.status === 'pending').length;

  // Filtered Invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inv.vendorName && inv.vendorName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inv.category && inv.category.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRisk = riskFilter === 'ALL' || inv.riskLevel === riskFilter;

    return matchesSearch && matchesRisk;
  });

  return (
    <div>
      {/* Top Welcome Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Financial Overview</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Real-time automated document extraction and tax risk summary
          </p>
        </div>

        <button onClick={() => setActivePage('upload')} className="btn btn-primary">
          <UploadCloud size={18} />
          <span>Upload New Document</span>
        </button>
      </div>

      {/* Top Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {/* Metric 1: Total Invoices */}
        <div className="card card-hover">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Invoices</span>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--emerald-400)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FileText size={18} />
            </div>
          </div>
          <div className="mono font-bold" style={{ fontSize: '1.8rem', color: 'var(--text-main)' }}>
            {totalInvoicesCount}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--emerald-400)', marginTop: '0.5rem' }}>
            <TrendingUp size={14} />
            <span>Audited & Stored in System</span>
          </div>
        </div>

        {/* Metric 2: Total Transactions */}
        <div className="card card-hover">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Value Processed</span>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              backgroundColor: 'rgba(14, 165, 233, 0.1)', color: '#38BDF8',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mono font-bold" style={{ fontSize: '1.8rem', color: 'var(--text-main)' }}>
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Cumulative document subtotal + GST
          </div>
        </div>

        {/* Metric 3: Active Compliance Alerts */}
        <div className="card card-hover" style={{ borderColor: activeAlertsCount > 0 ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Compliance Alerts</span>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="mono font-bold" style={{ fontSize: '1.8rem', color: activeAlertsCount > 0 ? '#F59E0B' : 'var(--text-main)' }}>
            {activeAlertsCount}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: activeAlertsCount > 0 ? '#FCD34D' : 'var(--text-muted)', marginTop: '0.5rem' }}>
            <span>{activeAlertsCount > 0 ? 'Requires action on Compliance tab' : 'No pending tax flags'}</span>
          </div>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>Recent Analysis</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Latest extracted invoices and line-item risk classifications
            </p>
          </div>

          {/* Search & Filter Controls */}
          {totalInvoicesCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search invoice or vendor..."
                  className="form-input"
                  style={{ paddingLeft: '2.2rem', padding: '0.45rem 0.75rem 0.45rem 2.2rem', fontSize: '0.82rem' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                <select
                  className="form-input"
                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem', width: 'auto' }}
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                >
                  <option value="ALL">All Risks</option>
                  <option value="LOW">Low Risk</option>
                  <option value="MEDIUM">Medium Risk</option>
                  <option value="HIGH">High Risk</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Empty State vs Table */}
        {totalInvoicesCount === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No invoices analyzed yet"
            message="No invoices analyzed yet. Upload your first document to get started."
            actionText="Upload New Document"
            onAction={() => setActivePage('upload')}
          />
        ) : filteredInvoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
            No invoices match your search query or risk filter.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice Number</th>
                  <th>Vendor</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Total Amount</th>
                  <th>Risk Level</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id || inv.invoiceNumber}>
                    <td className="mono font-bold" style={{ color: 'var(--emerald-400)' }}>
                      {inv.invoiceNumber}
                    </td>
                    <td style={{ fontWeight: 600 }}>{inv.vendorName}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{inv.date}</td>
                    <td>
                      <span style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)'
                      }}>
                        {inv.category}
                      </span>
                    </td>
                    <td className="mono font-bold" style={{ textAlign: 'right', fontSize: '0.95rem' }}>
                      ${typeof inv.totalAmount === 'number' ? inv.totalAmount.toFixed(2) : inv.totalAmount}
                    </td>
                    <td>
                      <RiskBadge riskLevel={inv.riskLevel} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => setSelectedInvoice(inv)} 
                        className="btn btn-sm btn-secondary"
                        title="View Full Extraction"
                      >
                        <Eye size={14} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
