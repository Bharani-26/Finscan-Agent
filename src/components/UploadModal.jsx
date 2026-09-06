import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { insertLedgerEntries, uploadAndProcessDocument } from '../services/api';

const ACCEPTED_FILE_TYPES = 'application/pdf';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const PROCESSING_STAGES = [
  'Uploading document securely',
  'Gemini AI is parsing taxes',
  'Categorizing ledger entries',
  'Preparing your summary',
];

const getResponseValue = (response, keys, fallback = 'Not available') => {
  const unwrappedResponse = Array.isArray(response) ? response[0] : response;
  const sources = [
    unwrappedResponse,
    unwrappedResponse?.data,
    unwrappedResponse?.result,
    unwrappedResponse?.output,
    unwrappedResponse?.json,
    unwrappedResponse?.data?.data,
  ];

  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;

    for (const key of keys) {
      if (source[key] !== undefined && source[key] !== null && source[key] !== '') {
        return source[key];
      }
    }
  }

  return fallback;
};

const getResponseText = (response) => {
  const unwrappedResponse = Array.isArray(response) ? response[0] : response;
  if (typeof unwrappedResponse === 'string') return unwrappedResponse;
  const text = getResponseValue(unwrappedResponse, ['rawText', 'output', 'text', 'response', 'content'], '');
  return typeof text === 'string' ? text : '';
};

const getTextField = (text, labels) => {
  const match = String(text).match(new RegExp(`(?:${labels.join('|')})\\s*:?\\s*([^\\n|]+)`, 'i'));
  return match && typeof match[1] === 'string' ? match[1].trim().replace(/^\*+|\*+$/g, '') : 'Not available';
};

const getTextAmount = (text, labels) => {
  const value = getTextField(text, labels).replace(/[^\d.-]/g, '');
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 'Not available';
};

const getLedgerRows = (response) => {
  const unwrappedResponse = Array.isArray(response) ? response[0] : response;
  const responseText = getResponseText(unwrappedResponse);
  if (responseText) return parseLedgerText(responseText);
  const sources = [
    unwrappedResponse,
    unwrappedResponse?.data,
    unwrappedResponse?.result,
    unwrappedResponse?.output,
    unwrappedResponse?.json,
  ];
  const ledger = sources.find((source) => Array.isArray(source?.ledger_entry) || Array.isArray(source?.ledgerEntry) || Array.isArray(source?.ledger));
  return ledger?.ledger_entry || ledger?.ledgerEntry || ledger?.ledger || [];
};

const parseLedgerText = (text) => {
  const lines = String(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const tableLines = lines.filter((line) => line.includes('|'));
  if (tableLines.length < 2) return [];

  const splitRow = (line) => line.replace(/^\|\s*|\s*\|$/g, '').split('|').map((cell) => cell.trim());
  const headers = splitRow(tableLines[0]).map((header) => header.toLowerCase().replace(/[^a-z]+/g, ''));
  const separator = /^:?-{3,}:?$/;
  const rows = tableLines.slice(1).filter((line) => !splitRow(line).every((cell) => separator.test(cell)));

  return rows.map((line) => {
    const cells = splitRow(line);
    return headers.reduce((entry, header, index) => {
      const value = cells[index] || 'Missing';
      if (header.includes('date')) entry.date = value;
      else if (header.includes('particular') || header.includes('detail') || header.includes('account')) entry.particulars = value;
      else if (header.includes('debit')) entry.debit = value;
      else if (header.includes('credit')) entry.credit = value;
      else if (header.includes('folio') || header.includes('reference')) entry.folio = value;
      else if (header.includes('description') || header.includes('narrative')) entry.description = value;
      else if (header.includes('balance')) entry.running_balance = value;
      return entry;
    }, {});
  });
};

const getLedgerValue = (row, keys, fallback = 'Missing') => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
  }
  return fallback;
};

const getComplianceFlags = (response) => {
  const unwrappedResponse = Array.isArray(response) ? response[0] : response;
  const flags = getResponseValue(unwrappedResponse, ['compliance_flags', 'complianceFlags'], {});
  return typeof flags === 'object' && flags !== null ? flags : {};
};

const getSummary = (response) => {
  const responseText = getResponseText(response);
  return ({
  rawText: responseText,
  documentType: getResponseValue(response, ['document_type', 'documentType', 'type']),
  ledgerCategory: getResponseValue(response, [
    'gl_ledger_category',
    'glLedgerCategory',
    'ledger_category',
    'ledgerCategory',
  ]),
  gstAmount: getResponseValue(response, [
    'calculated_gst_amount',
    'calculatedGstAmount',
    'gst_amount',
    'gstAmount',
  ], getTextAmount(responseText, ['GST', 'GST Amount'])),
  tdsAmount: getResponseValue(response, ['tds_amount', 'tdsAmount'], getTextAmount(responseText, ['TDS', 'TDS Amount'])),
  totalAmount: getResponseValue(response, ['total_amount', 'totalAmount'], getTextAmount(responseText, ['Invoice Amount', 'Total Amount', 'Net Payable Amount'])),
  invoiceNumber: getResponseValue(response, ['invoice_number', 'invoiceNumber'], getTextField(responseText, ['Invoice Number'])),
  vendor: getResponseValue(response, ['vendor_customer', 'vendor', 'vendor_name', 'vendorName'], getTextField(responseText, ['Vendor Name', 'Vendor', 'Customer'])),
  date: getResponseValue(response, ['invoice_date', 'invoiceDate', 'date'], getTextField(responseText, ['Date'])),
  subtotal: getResponseValue(response, ['subtotal', 'taxable_amount', 'taxableAmount'], getTextAmount(responseText, ['Taxable Value', 'Subtotal'])),
  paymentStatus: getResponseValue(response, ['payment_status', 'paymentStatus']),
  totalDebit: getResponseValue(response, ['total_debit', 'totalDebit'], getTextAmount(responseText, ['Total Debit'])),
  totalCredit: getResponseValue(response, ['total_credit', 'totalCredit'], getTextAmount(responseText, ['Total Credit'])),
  balanceCheck: getResponseValue(response, ['balance_check', 'balanceCheck'], getTextField(responseText, ['Balance Check'])),
  bankTransactionFound: getResponseValue(response, ['bank_transaction_found', 'bankTransactionFound']),
  matchingStatus: getResponseValue(response, ['matching_status', 'matchingStatus']),
  difference: getResponseValue(response, ['difference', 'reconciliation_difference']),
  finalStatus: getResponseValue(response, ['final_status', 'finalStatus', 'status']),
  ledgerRows: getLedgerRows(response),
  complianceFlags: getComplianceFlags(response),
  });
};

const numericAmount = (value) => {
  const amount = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(amount) ? amount : 0;
};

const combineSummaries = (summaries) => {
  const totalDebit = summaries.reduce((total, item) => total + numericAmount(item.totalDebit), 0);
  const totalCredit = summaries.reduce((total, item) => total + numericAmount(item.totalCredit), 0);
  const hasTotals = summaries.some((item) => item.totalDebit !== 'Not available' || item.totalCredit !== 'Not available');

  return {
    rawText: summaries.map((item, index) => `Document ${index + 1}\n${item.rawText}`).filter(Boolean).join('\n\n'),
    documentType: `${summaries.length} documents`,
    ledgerCategory: 'Combined ledger',
    gstAmount: 'Not available', tdsAmount: 'Not available', totalAmount: 'Not available',
    invoiceNumber: `${summaries.length} documents`, vendor: 'Multiple documents', date: 'Multiple dates',
    subtotal: 'Not available', paymentStatus: 'Not available',
    totalDebit: hasTotals ? totalDebit.toFixed(2) : 'Not available',
    totalCredit: hasTotals ? totalCredit.toFixed(2) : 'Not available',
    balanceCheck: hasTotals ? (Math.abs(totalDebit - totalCredit) < 0.01 ? 'PASS' : 'MISMATCH') : 'Not available',
    bankTransactionFound: 'Not available', matchingStatus: 'Not available', difference: 'Not available',
    finalStatus: summaries.some((item) => item.finalStatus === 'MISMATCH') ? 'MISMATCH' : 'APPROVED',
    ledgerRows: summaries.flatMap((item) => item.ledgerRows),
    complianceFlags: Object.assign({}, ...summaries.map((item) => item.complianceFlags)),
  };
};

const formatAmount = (value) => {
  if (typeof value === 'number') return value.toFixed(2);
  return value;
};

const UploadModal = ({ onClose, onUploadSuccess, userId: authenticatedUserId }) => {
  const fileInputRef = useRef(null);
  const [userId, setUserId] = useState(authenticatedUserId || 'usr_101');
  const [documentType, setDocumentType] = useState('invoice');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStage, setActiveStage] = useState(-1);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authenticatedUserId) setUserId(authenticatedUserId);
  }, [authenticatedUserId]);

  useEffect(() => {
    if (!isProcessing) return undefined;

    setActiveStage(0);
    const stageTimer = window.setInterval(() => {
      setActiveStage((stage) => Math.min(stage + 1, PROCESSING_STAGES.length - 1));
    }, 1800);

    return () => window.clearInterval(stageTimer);
  }, [isProcessing]);

  const validateFile = (file) => {
    if (!file) return 'Choose a PDF file to continue.';
    const validExtension = /\.pdf$/i.test(file.name);
    if (file.type !== 'application/pdf' && !validExtension) {
      return 'Only PDF files are supported.';
    }
    if (file.size === 0) return 'This file is empty.';
    if (file.size > MAX_FILE_SIZE) return 'Files must be smaller than 10 MB.';
    return '';
  };

  const selectFiles = (files) => {
    const nextFiles = Array.from(files || []);
    const validationError = nextFiles.length === 0
      ? 'Choose at least one PDF file to continue.'
      : nextFiles.map(validateFile).find(Boolean);
    setError(validationError || '');
    setSummary(null);
    if (!validationError) setSelectedFiles(nextFiles);
    else setSelectedFiles([]);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    selectFiles(event.dataTransfer.files);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = selectedFiles.length === 0
      ? 'Choose at least one PDF file to continue.'
      : selectedFiles.map(validateFile).find(Boolean);

    if (typeof userId !== 'string' || !userId.trim()) {
      setError('Enter a user ID before uploading.');
      return;
    }
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSummary(null);
    setIsProcessing(true);

    try {
      const processedSummaries = [];
      for (const file of selectedFiles) {
        const response = await uploadAndProcessDocument(file, userId.trim(), documentType);
        const responseSummary = getSummary(response);
        await insertLedgerEntries(responseSummary.ledgerRows, {
          userId: userId.trim(), documentType,
          date: responseSummary.date, invoiceNumber: responseSummary.invoiceNumber, vendor: responseSummary.vendor,
        });
        processedSummaries.push(responseSummary);
      }
      setSummary(combineSummaries(processedSummaries));
      setActiveStage(PROCESSING_STAGES.length - 1);
      onUploadSuccess?.(response);
    } catch (uploadError) {
      setError(uploadError?.message || 'The document could not be processed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearFile = () => {
    setSelectedFiles([]);
    setSummary(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      onMouseDown={(event) => event.target === event.currentTarget && !isProcessing && onClose?.()}
    >
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700/60 bg-slate-900/90 p-6 text-slate-100 shadow-2xl shadow-emerald-950/40 backdrop-blur-xl sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-emerald-400">
              <Sparkles size={18} aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">AI document intake</span>
            </div>
            <h2 id="upload-modal-title" className="text-2xl font-bold tracking-tight">Upload for analysis</h2>
            <p className="mt-1 text-sm text-slate-400">Invoices and bank statements are parsed into your FinScan ledger.</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Close upload modal"
            onClick={onClose}
            disabled={isProcessing}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="mb-5 block">
            <span className="mb-2 block text-sm font-medium text-slate-300">User ID</span>
            <input
              type="text"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder="usr_101"
              disabled={isProcessing}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 disabled:opacity-60"
            />
          </label>

          <label className="mb-5 block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Document type</span>
            <select
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
              disabled={isProcessing}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 disabled:opacity-60"
            >
              <option value="debit_invoice">Debit Invoice</option>
              <option value="credit_invoice">Credit Invoice</option>
              <option value="bank_statement">Bank Statement</option>
            </select>
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            multiple
            className="sr-only"
            onChange={(event) => selectFiles(event.target.files)}
            disabled={isProcessing}
          />

          {selectedFiles.length === 0 ? (
            <button
              type="button"
              className={`flex min-h-48 w-full flex-col items-center justify-center rounded-2xl border border-dashed px-6 text-center transition ${isDragging ? 'border-emerald-400 bg-emerald-400/10' : 'border-slate-600 bg-slate-950/40 hover:border-emerald-500 hover:bg-emerald-500/5'}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              disabled={isProcessing}
            >
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400">
                <UploadCloud size={24} aria-hidden="true" />
              </span>
              <span className="font-semibold text-slate-100">Drop your document here</span>
              <span className="mt-1 text-sm text-slate-400">or click to browse a PDF file</span>
              <span className="mt-3 text-xs text-slate-500">Maximum file size: 10 MB</span>
            </button>
          ) : (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-4">
              <div className="flex items-start gap-4">
                <FileText className="mt-1 shrink-0 text-emerald-400" size={28} aria-hidden="true" />
                <div className="min-w-0 flex-1 space-y-2">
                  {selectedFiles.map((file) => (
                    <div key={`${file.name}-${file.lastModified}`} className="flex items-center justify-between gap-3">
                      <p className="truncate font-semibold text-slate-100">{file.name}</p>
                      <p className="shrink-0 text-sm text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-40"
                  aria-label="Remove selected file"
                  onClick={clearFile}
                  disabled={isProcessing}
                >
                  <X size={18} />
                </button>
              </div>
              <p className="mt-3 flex items-center gap-2 text-xs text-emerald-300">
                <FileText size={14} />
                {selectedFiles.length} PDF document{selectedFiles.length === 1 ? '' : 's'} ready for analysis
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200" role="alert">
              <AlertCircle className="mt-0.5 shrink-0" size={16} />
              <span>{error}</span>
            </div>
          )}

          {isProcessing && (
            <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/50 p-4" aria-live="polite">
              <div className="mb-4 flex items-center gap-3">
                <LoaderCircle className="animate-spin text-emerald-400" size={20} />
                <div>
                  <p className="font-semibold text-slate-100">Processing with Gemini AI</p>
                  <p className="text-xs text-slate-400">n8n is extracting taxes and ledger categories</p>
                </div>
              </div>
              <div className="space-y-3">
                {PROCESSING_STAGES.map((stage, index) => {
                  const complete = index < activeStage;
                  const current = index === activeStage;
                  return (
                    <div key={stage} className={`flex items-center gap-3 text-sm ${complete || current ? 'text-slate-200' : 'text-slate-600'}`}>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${complete ? 'border-emerald-400 bg-emerald-400 text-slate-950' : current ? 'border-emerald-400 text-emerald-400' : 'border-slate-700'}`}>
                        {complete ? <Check size={13} /> : current ? <LoaderCircle className="animate-spin" size={12} /> : null}
                      </span>
                      {stage}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {summary && !isProcessing && (
            <div className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-5">
              <div className="mb-4 flex items-center gap-2 text-emerald-300">
                <CheckCircle2 size={19} />
                <h3 className="font-semibold">Analysis complete</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Invoice Number', summary.invoiceNumber],
                  ['Vendor / Customer', summary.vendor],
                  ['Invoice Date', summary.date],
                  ['Subtotal', formatAmount(summary.subtotal)],
                  ['Document Type', summary.documentType],
                  ['GL Ledger Category', summary.ledgerCategory],
                  ['Calculated GST Amount', formatAmount(summary.gstAmount)],
                  ['TDS Amount', formatAmount(summary.tdsAmount)],
                  ['Total Amount', formatAmount(summary.totalAmount)],
                  ['Payment Status', summary.paymentStatus],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-700 bg-slate-950/50 p-3 last:sm:col-span-2">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-1 font-semibold text-slate-100">{value}</p>
                  </div>
                ))}
              </div>

              {summary.rawText && (
                <div className="mt-5 overflow-x-auto rounded-xl border border-slate-700 bg-slate-950/50">
                  <div className="border-b border-slate-700 px-4 py-3">
                    <h4 className="text-sm font-semibold text-slate-100">Processor output</h4>
                    <p className="mt-1 text-xs text-slate-500">Text table returned by n8n</p>
                  </div>
                  <pre className="min-w-max whitespace-pre-wrap p-4 font-mono text-xs leading-6 text-slate-300">{summary.rawText}</pre>
                </div>
              )}

              {summary.ledgerRows.length > 0 && (
                <div className="mt-5 overflow-x-auto rounded-xl border border-slate-700 bg-slate-950/50">
                  <div className="border-b border-slate-700 px-4 py-3">
                    <h4 className="text-sm font-semibold text-slate-100">Ledger Entry</h4>
                    <p className="mt-1 text-xs text-slate-500">Double-entry posting returned by n8n</p>
                  </div>
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Particulars / Details</th>
                        <th className="px-4 py-3 text-right">Debit</th>
                        <th className="px-4 py-3 text-right">Credit</th>
                        <th className="px-4 py-3">Folio / Reference</th>
                        <th className="px-4 py-3">Description / Narrative</th>
                        <th className="px-4 py-3 text-right">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {summary.ledgerRows.map((row, index) => (
                        <tr key={`${getLedgerValue(row, ['account', 'Account'])}-${index}`}>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-400">{getLedgerValue(row, ['date', 'Date'], summary.date)}</td>
                          <td className="px-4 py-3 text-slate-200">{getLedgerValue(row, ['particulars', 'Particulars', 'details', 'Details', 'account', 'Account'])}</td>
                          <td className="px-4 py-3 text-right font-mono text-cyan-300">{formatAmount(row.debit ?? row.Debit ?? 'Missing')}</td>
                          <td className="px-4 py-3 text-right font-mono text-amber-300">{formatAmount(row.credit ?? row.Credit ?? 'Missing')}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-400">{getLedgerValue(row, ['folio', 'Folio', 'reference', 'Reference', 'ref', 'Ref'])}</td>
                          <td className="min-w-48 px-4 py-3 text-slate-300">{getLedgerValue(row, ['description', 'Description', 'narrative', 'Narrative'])}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-slate-200">{formatAmount(getLedgerValue(row, ['running_balance', 'runningBalance', 'balance', 'Balance']))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {(summary.totalDebit !== 'Not available' || summary.totalCredit !== 'Not available' || summary.balanceCheck !== 'Not available') && (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <ResultStat label="Total Debit" value={formatAmount(summary.totalDebit)} />
                  <ResultStat label="Total Credit" value={formatAmount(summary.totalCredit)} />
                  <ResultStat label="Balance Check" value={summary.balanceCheck} success={String(summary.balanceCheck).toUpperCase() === 'PASS'} />
                </div>
              )}

              {(summary.bankTransactionFound !== 'Not available' || summary.matchingStatus !== 'Not available') && (
                <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
                  <h4 className="text-sm font-semibold text-slate-100">Bank Reconciliation</h4>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    <span className="text-slate-400">Transaction found: <strong className="text-slate-200">{summary.bankTransactionFound}</strong></span>
                    <span className="text-slate-400">Match: <strong className="text-slate-200">{summary.matchingStatus}</strong></span>
                    <span className="text-slate-400">Difference: <strong className="text-slate-200">{formatAmount(summary.difference)}</strong></span>
                  </div>
                </div>
              )}

              {Object.keys(summary.complianceFlags).length > 0 && (
                <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
                  <h4 className="text-sm font-semibold text-amber-200">Compliance Flags</h4>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    {Object.entries(summary.complianceFlags).map(([label, value]) => (
                      <p key={label} className="text-slate-300"><span className="text-slate-500">{label}:</span> {String(value)}</p>
                    ))}
                  </div>
                </div>
              )}

              {summary.finalStatus !== 'Not available' && (
                <div className="mt-4 rounded-xl border border-indigo-400/30 bg-indigo-400/10 px-4 py-3 text-sm text-indigo-200">
                  Final Status: <strong>{summary.finalStatus}</strong>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onClose}
              disabled={isProcessing}
            >
              {summary ? 'Done' : 'Cancel'}
            </button>
            {!summary && (
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isProcessing || selectedFiles.length === 0}
              >
                {isProcessing ? <LoaderCircle className="animate-spin" size={17} /> : <UploadCloud size={17} />}
                {isProcessing ? `Processing ${selectedFiles.length} document${selectedFiles.length === 1 ? '' : 's'}...` : `Upload ${selectedFiles.length} document${selectedFiles.length === 1 ? '' : 's'}`}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

const ResultStat = ({ label, value, success = false }) => (
  <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
    <p className="text-xs text-slate-500">{label}</p>
    <p className={`mt-1 font-semibold ${success ? 'text-emerald-300' : 'text-slate-100'}`}>{value}</p>
  </div>
);

export default UploadModal;
