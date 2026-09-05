import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  FileText,
  LoaderCircle,
  ReceiptIndianRupee,
  RefreshCw,
  Sparkles,
  Tags,
  Upload,
} from 'lucide-react';
import { fetchUserBankStatements, fetchUserInvoices } from '../services/api';

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
  maximumFractionDigits: 0,
}).format(numberValue(value));

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

const Metric = ({ label, value, detail, icon: Icon, tone }) => (
  <article className="group relative overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5 hover:border-slate-700">
    <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full blur-3xl ${tone}`} />
    <div className="relative flex items-start justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <p className="mt-3 text-2xl font-bold tracking-tight text-white">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{detail}</p>
      </div>
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/[0.04] ${tone.replace('bg-', 'text-')}`}>
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

export default function TaxDashboard({ onOpenUpload }) {
  const [activeTab, setActiveTab] = useState('ledger');
  const [invoices, setInvoices] = useState([]);
  const [bankStatements, setBankStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [invoiceRows, bankRows] = await Promise.all([
        fetchUserInvoices('usr_101'),
        fetchUserBankStatements('usr_101'),
      ]);
      setInvoices(Array.isArray(invoiceRows) ? invoiceRows : []);
      setBankStatements(Array.isArray(bankRows) ? bankRows : []);
    } catch (loadError) {
      setError(loadError?.message || 'Could not load your accounting records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const normalizedInvoices = useMemo(() => invoices.map(invoiceData), [invoices]);
  const normalizedStatements = useMemo(() => bankStatements.map(statementData), [bankStatements]);
  const totals = normalizedInvoices.reduce((result, invoice) => ({
    taxable: result.taxable + invoice.taxable,
    gst: result.gst + invoice.gst,
    tds: result.tds + invoice.tds,
  }), { taxable: 0, gst: 0, tds: 0 });
  const hasRecords = invoices.length > 0 || bankStatements.length > 0;

  return (
    <main className="min-h-full overflow-hidden rounded-[28px] border border-slate-800/80 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.12),transparent_32%),#070b14] p-5 text-slate-100 shadow-2xl shadow-slate-950/30 sm:p-8">
      <header className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/15"><Sparkles size={13} /></span>
            FinScan AI <span className="text-slate-700">/</span> Accounting Control
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl">Tax & accounting ledger</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">A clear view of your tax position, document flow, and ledger-ready transactions.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={loadData} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh data
          </button>
          <button type="button" onClick={onOpenUpload} className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-400">
            <Upload size={16} /> Upload document
          </button>
        </div>
      </header>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total tax liability" value={money(totals.gst - totals.tds)} detail="GST payable after TDS" icon={ArrowUpRight} tone="bg-emerald-400" />
        <Metric label="GST claimable" value={money(totals.gst)} detail="Input tax credit identified" icon={ReceiptIndianRupee} tone="bg-indigo-400" />
        <Metric label="TDS deducted" value={money(totals.tds)} detail="Withholding tax recorded" icon={Banknote} tone="bg-amber-400" />
        <Metric label="Documents processed" value={invoices.length + bankStatements.length} detail="Invoices and statements" icon={FileText} tone="bg-sky-400" />
      </section>

      <section className="rounded-2xl border border-slate-800/90 bg-slate-900/50 p-2 shadow-xl shadow-slate-950/20">
        <nav className="flex gap-1 overflow-x-auto" aria-label="Ledger views">
          <Tab active={activeTab === 'ledger'} onClick={() => setActiveTab('ledger')} icon={FileText}>Ledger journal</Tab>
          <Tab active={activeTab === 'tax'} onClick={() => setActiveTab('tax')} icon={ReceiptIndianRupee}>Tax breakdown</Tab>
          <Tab active={activeTab === 'bank'} onClick={() => setActiveTab('bank')} icon={ArrowDownLeft}>Bank reconciliation</Tab>
        </nav>
      </section>

      {error && <div className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}
      {loading ? (
        <div className="mt-5 flex min-h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 text-sm text-slate-400"><LoaderCircle size={19} className="mr-3 animate-spin text-indigo-400" /> Loading your records...</div>
      ) : !hasRecords ? (
        <EmptyState onOpenUpload={onOpenUpload} />
      ) : activeTab === 'ledger' ? (
        <LedgerTable invoices={normalizedInvoices} />
      ) : activeTab === 'tax' ? (
        <TaxTable invoices={normalizedInvoices} totals={totals} />
      ) : (
        <BankTable statements={normalizedStatements} />
      )}
    </main>
  );
}

const EmptyState = ({ onOpenUpload }) => (
  <div className="mt-5 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 px-6 text-center">
    <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-400/10 text-indigo-300"><Upload size={24} /></span>
    <h2 className="mt-5 text-lg font-semibold text-white">Your ledger is ready for its first document</h2>
    <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Upload an invoice or bank statement and FinScan AI will extract the numbers, tax components, and ledger categories.</p>
    <button type="button" onClick={onOpenUpload} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/30 hover:bg-indigo-400"><Upload size={16} /> Upload your first document</button>
  </div>
);

const TableShell = ({ title, subtitle, count, children }) => (
  <section className="mt-5 overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-900/65">
    <div className="flex flex-col justify-between gap-2 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center">
      <div><h2 className="font-semibold text-white">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div>
      <span className="w-fit rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1 text-xs font-semibold text-slate-400">{count} records</span>
    </div>
    <div className="overflow-x-auto">{children}</div>
  </section>
);

const LedgerTable = ({ invoices }) => <TableShell title="Ledger journal entries" subtitle="Processed invoices ready for accounting review" count={invoices.length}><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-500"><tr>{['Date', 'Invoice', 'Vendor', 'GL category', 'Taxable', 'GST', 'TDS', 'Net payable'].map((label) => <th key={label} className="px-5 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-800/80">{invoices.map((invoice, index) => <tr key={invoice.number + index} className="transition hover:bg-white/[0.025]"><td className="whitespace-nowrap px-5 py-4 text-slate-500">{dateLabel(invoice.date)}</td><td className="whitespace-nowrap px-5 py-4 font-mono font-semibold text-indigo-300">{invoice.number}</td><td className="whitespace-nowrap px-5 py-4 font-medium text-slate-200">{invoice.vendor}</td><td className="px-5 py-4"><span className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs text-amber-300">{invoice.category}</span></td><td className="whitespace-nowrap px-5 py-4 font-mono text-slate-300">{money(invoice.taxable)}</td><td className="whitespace-nowrap px-5 py-4 font-mono text-emerald-300">{money(invoice.gst)}</td><td className="whitespace-nowrap px-5 py-4 font-mono text-amber-300">{money(invoice.tds)}</td><td className="whitespace-nowrap px-5 py-4 font-mono font-semibold text-white">{money(invoice.total || invoice.taxable + invoice.gst)}</td></tr>)}</tbody></table></TableShell>;

const TaxTable = ({ invoices, totals }) => <TableShell title="Tax position" subtitle={`GST ${money(totals.gst)} / TDS ${money(totals.tds)} across processed invoices`} count={invoices.length}><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-500"><tr>{['Document', 'Taxable value', 'GST claimable', 'TDS deducted', 'Net liability'].map((label) => <th key={label} className="px-5 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-800/80">{invoices.map((invoice, index) => <tr key={invoice.number + index} className="hover:bg-white/[0.025]"><td className="px-5 py-4"><p className="font-mono font-semibold text-indigo-300">{invoice.number}</p><p className="mt-1 text-xs text-slate-500">{invoice.vendor}</p></td><td className="px-5 py-4 font-mono text-slate-300">{money(invoice.taxable)}</td><td className="px-5 py-4 font-mono text-emerald-300">{money(invoice.gst)}</td><td className="px-5 py-4 font-mono text-amber-300">{money(invoice.tds)}</td><td className="px-5 py-4 font-mono font-semibold text-white">{money(invoice.gst - invoice.tds)}</td></tr>)}</tbody></table></TableShell>;

const BankTable = ({ statements }) => <TableShell title="Bank reconciliation" subtitle="Statement activity mapped to your ledger categories" count={statements.length}>{statements.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">No bank statement transactions found.</div> : <table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-500"><tr>{['Date', 'Description', 'Suggested category', 'Direction', 'Amount'].map((label) => <th key={label} className="px-5 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-800/80">{statements.map((statement, index) => { const credit = statement.type.includes('credit'); return <tr key={statement.description + index} className="hover:bg-white/[0.025]"><td className="px-5 py-4 text-slate-500">{dateLabel(statement.date)}</td><td className="px-5 py-4 font-medium text-slate-200">{statement.description}</td><td className="px-5 py-4 text-slate-400">{statement.category}</td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${credit ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'}`}>{credit ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}{credit ? 'Credit' : 'Debit'}</span></td><td className="px-5 py-4 font-mono font-semibold text-white">{money(statement.amount)}</td></tr>; })}</tbody></table>}</TableShell>;
