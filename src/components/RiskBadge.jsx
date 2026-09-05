import React from 'react';
import { ShieldCheck, ShieldAlert, AlertOctagon } from 'lucide-react';

const RiskBadge = ({ riskLevel }) => {
  const normalizedRisk = (riskLevel || 'LOW').toUpperCase();

  let badgeClass = 'badge-low';
  let dotClass = 'status-dot-low';
  let Icon = ShieldCheck;

  if (normalizedRisk === 'HIGH') {
    badgeClass = 'badge-high';
    dotClass = 'status-dot-high';
    Icon = AlertOctagon;
  } else if (normalizedRisk === 'MEDIUM') {
    badgeClass = 'badge-medium';
    dotClass = 'status-dot-medium';
    Icon = ShieldAlert;
  }

  return (
    <span className={`badge ${badgeClass}`}>
      <span className={`status-dot ${dotClass}`}></span>
      <Icon size={12} />
      {normalizedRisk}
    </span>
  );
};

export default RiskBadge;
