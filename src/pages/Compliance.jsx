import React, { useState } from 'react';
import { useFinGuard } from '../context/FinGuardContext';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Filter, 
  Search, 
  Eye, 
  AlertOctagon, 
  Clock, 
  CheckSquare 
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import EmptyState from '../components/EmptyState';
import AlertDetailModal from '../components/AlertDetailModal';

const Compliance = () => {
  const { alerts, markAlertAsReviewed } = useFinGuard();
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter Alerts
  const filteredAlerts = alerts.filter((alert) => {
    const matchesRisk = riskFilter === 'ALL' || alert.riskLevel === riskFilter;
    const matchesStatus = statusFilter === 'ALL' || alert.status === statusFilter;
    const matchesSearch = 
      (alert.issue && alert.issue.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (alert.explanation && alert.explanation.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (alert.id && alert.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (alert.invoiceRef && alert.invoiceRef.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesRisk && matchesStatus && matchesSearch;
  });

  const pendingCount = alerts.filter(a => a.status === 'pending').length;
  const reviewedCount = alerts.filter(a => a.status === 'reviewed').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Compliance & Risk Audit</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Automated tax compliance checks, GST verification, and ABN validation alerts
          </p>
        </div>

        {/* Quick Count Badges */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.4rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#FCD34D',
            fontSize: '0.85rem',
            fontWeight: 600
          }}>
            <Clock size={16} />
            <span>{pendingCount} Pending Review</span>
          </div>

          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.4rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--emerald-400)',
            fontSize: '0.85rem',
            fontWeight: 600
          }}>
            <CheckCircle2 size={16} />
            <span>{reviewedCount} Reviewed</span>
          </div>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="card" style={{ padding: '1.5rem' }}>
        
        {/* Controls Bar: Filters & Search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          {/* Search Input */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search compliance issues..."
              className="form-input"
              style={{ paddingLeft: '2.4rem', padding: '0.5rem 0.75rem 0.5rem 2.4rem', fontSize: '0.85rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filters Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Risk Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Risk Level:</span>
              <select
                className="form-input"
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem', width: 'auto' }}
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
              >
                <option value="ALL">All Risk Levels</option>
                <option value="HIGH">High Risk</option>
                <option value="MEDIUM">Medium Risk</option>
                <option value="LOW">Low Risk</option>
              </select>
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Status:</span>
              <select
                className="form-input"
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem', width: 'auto' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Empty State vs Alerts Table */}
        {alerts.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="No compliance alerts yet"
            message="No compliance alerts yet. Documents requiring regulatory audit will appear here."
          />
        ) : filteredAlerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No compliance alerts match the selected risk or status filter.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Alert Ref</th>
                  <th>Issue Summary</th>
                  <th>Risk Rating</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert) => {
                  const isReviewed = alert.status === 'reviewed';
                  return (
                    <tr 
                      key={alert.id}
                      style={{
                        backgroundColor: isReviewed ? 'transparent' : 'rgba(245, 158, 11, 0.02)'
                      }}
                    >
                      <td className="mono font-bold" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {alert.id}
                      </td>

                      <td style={{ maxWidth: '340px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                          {alert.issue}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {alert.explanation}
                        </div>
                      </td>

                      <td>
                        <RiskBadge riskLevel={alert.riskLevel} />
                      </td>

                      <td>
                        <span className={`badge ${isReviewed ? 'badge-low' : 'badge-medium'}`}>
                          {isReviewed ? 'REVIEWED' : 'PENDING'}
                        </span>
                      </td>

                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {alert.date}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <button 
                            onClick={() => setSelectedAlert(alert)}
                            className="btn btn-sm btn-secondary"
                            title="View Full Compliance Rationale"
                          >
                            <Eye size={14} />
                            <span>Details</span>
                          </button>

                          {!isReviewed && (
                            <button
                              onClick={() => markAlertAsReviewed(alert.id)}
                              className="btn btn-sm btn-outline-emerald"
                              title="Mark as Reviewed"
                            >
                              <CheckCircle2 size={14} />
                              <span>Review</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onMarkReviewed={markAlertAsReviewed}
        />
      )}
    </div>
  );
};

export default Compliance;
