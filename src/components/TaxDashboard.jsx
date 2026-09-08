import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  FileText,
  LoaderCircle,
  ReceiptIndianRupee,
  Sparkles,
  Download,
} from 'lucide-react';
import { fetchUserBankStatements, fetchUserInvoices, fetchUserLedgerEntries } from '../services/api';
import { useFinGuard } from '../context/FinGuardContext';

const getValue = (record, keys, fallback = '') => {
  for (const key of keys) {
    if (record?.[key] !== undefined && record[key] !== null && record[key] !== '') return record[key];
  }
  return fallback;
};

const numberValue = (value) => {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
};

const money = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
}).format(numberValue(value));

const downloadCSV = (filename, headers, rows) => {
  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

const dateLabel = (value) => {
  if (!value) return 'No date';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const invoiceData = (invoice) => ({
  date: getValue(invoice, ['date', 'invoice_date', 'created_at']),
  number: getValue(invoice, ['invoice_number', 'invoiceNumber'], 'Unnumbered'),
  vendor: getValue(invoice, ['vendor_name', 'vendorName'], 'Unknown vendor'),
  category: getValue(invoice, ['ledger_category', 'gl_ledger_category', 'category'], 'General Ledger'),
  taxable: numberValue(getValue(invoice, ['taxable_amount', 'taxableAmount', 'subtotal'])),
  gst: numberValue(getValue(invoice, ['gst_amount', 'gstAmount', 'calculated_gst_amount'])),
  tds: numberValue(getValue(invoice, ['tds_amount', 'tdsAmount'])),
  total: numberValue(getValue(invoice, ['total_amount', 'totalAmount', 'net_payable_amount', 'netPayable'])),
});

const statementData = (statement) => ({
  date: getValue(statement, ['date', 'transaction_date', 'created_at']),
  description: getValue(statement, ['description', 'narration', 'remarks'], 'Bank transaction'),
  category: getValue(statement, ['ledger_category', 'ledgerCategory', 'category'], 'Unclassified'),
  amount: numberValue(getValue(statement, ['amount', 'transaction_amount', 'debit', 'credit'])),
  type: String(getValue(statement, ['type', 'transaction_type', 'direction'], 'debit')).toLowerCase(),
});

const ledgerEntryData = (entry) => ({
  date: getValue(entry, ['entry_date', 'date', 'created_at']),
  particulars: getValue(entry, ['particulars', 'details', 'account'], 'Missing'),
  debit: getValue(entry, ['debit'], null),
  credit: getValue(entry, ['credit'], null),
  folio: getValue(entry, ['folio_reference', 'folio', 'reference'], 'Missing'),
  narrative: getValue(entry, ['narrative', 'description'], 'Missing'),
  balance: getValue(entry, ['running_balance', 'runningBalance', 'balance'], null),
});

const ledgerMoney = (value) => value === null || value === undefined || value === '' ? 'Missing' : money(value);

const Metric = ({ label, value, detail, icon: Icon, tone }) => (
  <article className={`dashboard-metric group relative overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5 hover:border-slate-700 ${tone}`}>
    <div className="dashboard-metric__glow" />
    <div className="relative flex items-start justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <p className="mt-3 text-2xl font-bold tracking-tight text-white">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{detail}</p>
      </div>
      <span className="dashboard-metric__icon flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/[0.04]">
        <Icon size={19} />
      </span>
    </div>
  </article>
);

const Tab = ({ active, icon: Icon, children, onClick }) => (
  <button type="button" onClick={onClick} className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition ${active ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-400/30' : 'text-slate-500 hover:bg-white/[0.03] hover:text-slate-200'}`}>
    <Icon size={16} />
    {children}
  </button>
);

export default function TaxDashboard({ onOpenUpload, userId = 'usr_101' }) {
  const { invoices: contextInvoices, ledgerEntries: contextLedgerEntries, activeDashboardTab, setActiveDashboardTab } = useFinGuard();
  const [activeTab, setActiveTab] = useState(activeDashboardTab || 'tax');
  const [invoices, setInvoices] = useState([]);
  const [bankStatements, setBankStatements] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeDashboardTab) {
      setActiveTab(activeDashboardTab);
    }
  }, [activeDashboardTab]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [invoiceRows, bankRows, ledgerRows] = await Promise.all([
        fetchUserInvoices(userId),
        fetchUserBankStatements(userId),
        fetchUserLedgerEntries(userId),
      ]);
      setInvoices(Array.isArray(invoiceRows) ? invoiceRows : []);
      setBankStatements(Array.isArray(bankRows) ? bankRows : []);
      setLedgerEntries(Array.isArray(ledgerRows) ? ledgerRows : []);
    } catch (loadError) {
      setError(loadError?.message || 'Could not load your accounting records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [userId]);

  const normalizedInvoices = useMemo(() => {
    const source = contextInvoices.length > 0 ? contextInvoices : invoices;
    return source.map(invoiceData);
  }, [invoices, contextInvoices]);
  const normalizedStatements = useMemo(() => bankStatements.map(statementData), [bankStatements]);
  const normalizedLedgerEntries = useMemo(() => {
    const contextEntries = Array.isArray(contextLedgerEntries) ? contextLedgerEntries : [];
    const fetchedEntries = Array.isArray(ledgerEntries) ? ledgerEntries : [];

    const combined = [...contextEntries];
    for (const item of fetchedEntries) {
      const itemDate = getValue(item, ['entry_date', 'date', 'created_at']);
      const itemPart = getValue(item, ['particulars', 'details', 'account']);
      const itemFolio = getValue(item, ['folio_reference', 'folio', 'reference']);
      const exists = combined.some(c => 
        getValue(c, ['entry_date', 'date', 'created_at']) === itemDate &&
        getValue(c, ['particulars', 'details', 'account']) === itemPart &&
        getValue(c, ['folio_reference', 'folio', 'reference']) === itemFolio
      );
      if (!exists) {
        combined.push(item);
      }
    }

    if (combined.length > 0) {
      return combined.map(ledgerEntryData);
    }

    const sourceInvoices = contextInvoices.length > 0 ? contextInvoices : invoices;
    const embedded = sourceInvoices.flatMap((inv) => {
      const rows = inv.ledgerRows || inv.ledgerEntries || [];
      return rows.map((r) => ({
        ...r,
        folio: r.folio || inv.invoiceNumber,
        date: r.date || inv.date,
      }));
    });

    if (embedded.length > 0) {
      return embedded.map(ledgerEntryData);
    }

    return sourceInvoices.map((invoice) => ({
      date: getValue(invoice, ['date', 'invoice_date', 'created_at']),
      particulars: getValue(invoice, ['vendor_name', 'vendorName'], 'Missing'),
      debit: null,
      credit: numberValue(getValue(invoice, ['total_amount', 'totalAmount', 'net_payable_amount', 'netPayable'])) || null,
      folio: getValue(invoice, ['invoice_number', 'invoiceNumber'], 'Missing'),
      narrative: getValue(invoice, ['ledger_category', 'gl_ledger_category', 'category'], 'Missing'),
      balance: null,
    }));
  }, [ledgerEntries, contextLedgerEntries, invoices, contextInvoices]);

  const totals = normalizedInvoices.reduce((result, invoice) => ({
    taxable: result.taxable + invoice.taxable,
    gst: result.gst + invoice.gst,
    tds: result.tds + invoice.tds,
  }), { taxable: 0, gst: 0, tds: 0 });

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (setActiveDashboardTab) {
      setActiveDashboardTab(tab);
    }
  };

  return (
    <main className="dashboard-shell min-h-full overflow-hidden rounded-[28px] border border-slate-800/80 p-5 text-slate-100 shadow-2xl shadow-slate-950/30 sm:p-8">
      <header className="dashboard-hero mb-8">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/15"><Sparkles size={13} /></span>
            FinScan AI <span className="text-slate-700">/</span> Accounting Control
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl">Tax & accounting ledger</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">A clear view of your tax position, document flow, and ledger-ready transactions.</p>
        </div>
      </header>

      <section className="dashboard-metrics mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total tax liability" value={money(totals.gst - totals.tds)} detail="GST payable after TDS" icon={ArrowUpRight} tone="metric-emerald" />
        <Metric label="GST claimable" value={money(totals.gst)} detail="Input tax credit identified" icon={ReceiptIndianRupee} tone="metric-indigo" />
        <Metric label="TDS deducted" value={money(totals.tds)} detail="Withholding tax recorded" icon={Banknote} tone="metric-amber" />
        <Metric label="Documents processed" value={normalizedInvoices.length + normalizedStatements.length} detail="Invoices and statements" icon={FileText} tone="metric-sky" />
      </section>

      <section className="dashboard-tabs rounded-2xl border border-slate-800/90 bg-slate-900/50 p-2 shadow-xl shadow-slate-950/20">
        <nav className="flex gap-1 overflow-x-auto" aria-label="Ledger views">
          <Tab active={activeTab === 'tax'} onClick={() => handleTabChange('tax')} icon={ReceiptIndianRupee}>Tax breakdown</Tab>
          <Tab active={activeTab === 'ledger'} onClick={() => handleTabChange('ledger')} icon={FileText}>Ledger entries</Tab>
          <Tab active={activeTab === 'bank'} onClick={() => handleTabChange('bank')} icon={ArrowDownLeft}>Bank reconciliation</Tab>
        </nav>
      </section>

      {error && <div className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}
      {loading ? (
        <div className="mt-5 flex min-h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 text-sm text-slate-400"><LoaderCircle size={19} className="mr-3 animate-spin text-indigo-400" /> Loading your records...</div>
      ) : activeTab === 'ledger' ? (
        <LedgerTable entries={normalizedLedgerEntries} />
      ) : activeTab === 'tax' ? (
        <TaxTable invoices={normalizedInvoices} totals={totals} />
      ) : (
        <BankTable statements={normalizedStatements} />
      )}
    </main>
  );
}

const TableShell = ({ title, subtitle, count, onDownload, children }) => (
  <section className="dashboard-table mt-5 overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-900/65">
    <div className="flex flex-col justify-between gap-2 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center">
      <div><h2 className="font-semibold text-white">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div>
      <div className="flex items-center gap-3">
        {onDownload && (
          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-slate-700 hover:text-emerald-300 transition-colors"
          >
            <Download size={14} />
            Download
          </button>
        )}
        <span className="w-fit rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1 text-xs font-semibold text-slate-400">{count} records</span>
      </div>
    </div>
    <div className="overflow-x-auto">{children}</div>
  </section>
);

const LedgerTable = ({ entries }) => {
  const handleDownload = () => {
    downloadCSV(
      'ledger_entries.csv',
      ['Date', 'Particulars / Details', 'Debit', 'Credit', 'Folio / Reference', 'Description / Narrative', 'Running Balance'],
      entries.map(e => [e.date, e.particulars, e.debit, e.credit, e.folio, e.narrative, e.balance])
    );
  };
  
  return (
    <TableShell title="Ledger journal entries" subtitle="Persisted double-entry records ready for accounting review" count={entries.length} onDownload={entries.length > 0 ? handleDownload : undefined}>
      {entries.length === 0 ? (
        <div className="p-12 text-center text-sm text-slate-500">No ledger entries found. Upload a processed document to create one.</div>
      ) : (
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              {['Date', 'Particulars / Details', 'Debit', 'Credit', 'Folio / Reference', 'Description / Narrative', 'Running Balance'].map((label) => (
                <th key={label} className="px-5 py-3 font-semibold">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {entries.map((entry, index) => (
              <tr key={`${entry.particulars}-${entry.folio}-${index}`} className="transition hover:bg-white/[0.025]">
              <td className="whitespace-nowrap px-5 py-4 text-slate-500">{dateLabel(entry.date)}</td>
              <td className="px-5 py-4 font-medium text-slate-200">{entry.particulars}</td>
              <td className="whitespace-nowrap px-5 py-4 font-mono text-cyan-300">{ledgerMoney(entry.debit)}</td>
              <td className="whitespace-nowrap px-5 py-4 font-mono text-amber-300">{ledgerMoney(entry.credit)}</td>
              <td className="whitespace-nowrap px-5 py-4 text-slate-400">{entry.folio}</td>
              <td className="min-w-56 px-5 py-4 text-slate-300">{entry.narrative}</td>
              <td className="whitespace-nowrap px-5 py-4 font-mono font-semibold text-white">{ledgerMoney(entry.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </TableShell>
  );
};

const TaxTable = ({ invoices, totals }) => {
  const handleDownload = () => {
    downloadCSV(
      'tax_position.csv',
      ['Document', 'Taxable value', 'GST claimable', 'TDS deducted', 'Net liability'],
      invoices.map(inv => [inv.number, inv.taxable, inv.gst, inv.tds, inv.gst - inv.tds])
    );
  };

  return (
  <TableShell title="Tax position" subtitle={`GST ${money(totals.gst)} / TDS ${money(totals.tds)} across processed invoices`} count={invoices.length} onDownload={invoices.length > 0 ? handleDownload : undefined}>
    <table className="w-full min-w-[700px] text-left text-sm">
      <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-500">
        <tr>
          {['Document', 'Taxable value', 'GST claimable', 'TDS deducted', 'Net liability'].map((label) => (
            <th key={label} className="px-5 py-3 font-semibold">{label}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800/80">
        {invoices.map((invoice, index) => (
          <tr key={invoice.number + index} className="hover:bg-white/[0.025]">
            <td className="px-5 py-4">
              <p className="font-mono font-semibold text-indigo-300">{invoice.number}</p>
              <p className="mt-1 text-xs text-slate-500">{invoice.vendor}</p>
            </td>
            <td className="px-5 py-4 font-mono text-slate-300">{money(invoice.taxable)}</td>
            <td className="px-5 py-4 font-mono text-emerald-300">{money(invoice.gst)}</td>
            <td className="px-5 py-4 font-mono text-amber-300">{money(invoice.tds)}</td>
            <td className="px-5 py-4 font-mono font-semibold text-white">{money(invoice.gst - invoice.tds)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </TableShell>
  );
};

const BankTable = ({ statements }) => {
  const handleDownload = () => {
    downloadCSV(
      'bank_reconciliation.csv',
      ['Date', 'Description', 'Suggested category', 'Direction', 'Amount'],
      statements.map(stmt => [stmt.date, stmt.description, stmt.category, stmt.type.includes('credit') ? 'Credit' : 'Debit', stmt.amount])
    );
  };

  return (
  <TableShell title="Bank reconciliation" subtitle="Statement activity mapped to your ledger categories" count={statements.length} onDownload={statements.length > 0 ? handleDownload : undefined}>
    {statements.length === 0 ? (
      <div className="p-12 text-center text-sm text-slate-500">No bank statement transactions found.</div>
    ) : (
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-500">
          <tr>
            {['Date', 'Description', 'Suggested category', 'Direction', 'Amount'].map((label) => (
              <th key={label} className="px-5 py-3 font-semibold">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80">
          {statements.map((statement, index) => {
            const credit = statement.type.includes('credit');
            return (
              <tr key={statement.description + index} className="hover:bg-white/[0.025]">
                <td className="px-5 py-4 text-slate-500">{dateLabel(statement.date)}</td>
                <td className="px-5 py-4 font-medium text-slate-200">{statement.description}</td>
                <td className="px-5 py-4 text-slate-400">{statement.category}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${credit ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'}`}>
                    {credit ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                    {credit ? 'Credit' : 'Debit'}
                  </span>
                </td>
                <td className="px-5 py-4 font-mono font-semibold text-white">{money(statement.amount)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    )}
  </TableShell>
  );
};
