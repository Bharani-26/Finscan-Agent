import React, { useState, useRef } from 'react';
import { useFinGuard } from '../context/FinGuardContext';
import { uploadAndProcessDocument } from '../services/api';
import { analyzeManualEntry } from '../services/mockApi';
import { 
  UploadCloud, 
  FileCheck, 
  X, 
  AlertCircle, 
  Sparkles, 
  ShieldCheck, 
  PlusCircle, 
  FileText,
  FileCode,
  Zap,
  Edit3
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import RiskBadge from '../components/RiskBadge';
import ManualEntryForm from '../components/ManualEntryForm';

const responseValue = (response, keys, fallback = 'Missing') => {
  const unwrapped = Array.isArray(response) ? response[0] : response;
  const sources = [unwrapped, unwrapped?.data, unwrapped?.result, unwrapped?.output, unwrapped?.json];
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const key of keys) {
      if (source[key] !== undefined && source[key] !== null && source[key] !== '') return source[key];
    }
  }
  return fallback;
};

const responseText = (response) => {
  const unwrapped = Array.isArray(response) ? response[0] : response;
  if (typeof unwrapped === 'string') return unwrapped;
  const value = responseValue(unwrapped, ['rawText', 'output', 'text', 'response', 'content'], '');
  return typeof value === 'string' ? value : '';
};

const amountValue = (value) => {
  const amount = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(amount) ? amount : 0;
};

const textAmount = (text, label) => {
  const match = String(text || '').match(new RegExp(`${label}\\s*:?\\s*[₹$]?\\s*([\\d,]+(?:\\.\\d+)?)`, 'i'));
  return match ? amountValue(match[1]) : 0;
};

const parseLedgerTable = (text) => {
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter((line) => line.includes('|'));
  if (lines.length < 2) return [];
  const split = (line) => line.replace(/^\|\s*|\s*\|$/g, '').split('|').map((cell) => cell.trim());
  const headers = split(lines[0]).map((header) => header.toLowerCase().replace(/[^a-z]+/g, ''));
  return lines.slice(1).filter((line) => !split(line).every((cell) => /^:?-{3,}:?$/.test(cell))).map((line) => {
    const cells = split(line);
    return headers.reduce((row, header, index) => {
      const value = cells[index] || 'Missing';
      if (header.includes('date')) row.date = value;
      else if (header.includes('particular') || header.includes('detail') || header.includes('account')) row.particulars = value;
      else if (header.includes('debit')) row.debit = value;
      else if (header.includes('credit')) row.credit = value;
      else if (header.includes('folio') || header.includes('reference')) row.folio = value;
      else if (header.includes('description') || header.includes('narrative')) row.narrative = value;
      else if (header.includes('balance')) row.balance = value;
      return row;
    }, {});
  });
};

const normalizeBatchResult = (response, file) => {
  const text = responseText(response);
  const ledgerRows = parseLedgerTable(text);
  const firstLedgerRow = ledgerRows[0] || {};
  const firstDebit = amountValue(firstLedgerRow.debit);
  const firstCredit = amountValue(firstLedgerRow.credit);
  const transactionTypeFallback = firstDebit > 0 ? 'Payment' : firstCredit > 0 ? 'Receipt' : 'Unknown';
  return ({
  ...(Array.isArray(response) ? response[0] : response),
  fileName: file.name,
  rawText: text,
  invoiceNumber: responseValue(response, ['invoice_number', 'invoiceNumber'], textValue(text, 'Invoice Number')),
  vendorName: responseValue(response, ['vendor_customer', 'vendor', 'vendor_name', 'vendorName'], textValue(text, 'Vendor Name|Vendor|Customer')),
  date: responseValue(response, ['date', 'invoice_date', 'invoiceDate'], textValue(text, 'Date') !== 'Missing' ? textValue(text, 'Date') : firstLedgerRow.date),
  subtotal: amountValue(responseValue(response, ['subtotal', 'taxable_amount', 'taxableAmount'], textAmount(text, 'Taxable Value|Subtotal'))),
  gstAmount: amountValue(responseValue(response, ['calculated_gst_amount', 'gst_amount', 'gstAmount'], textAmount(text, 'GST|GST Amount'))),
  totalAmount: amountValue(responseValue(response, ['total_amount', 'totalAmount', 'net_payable_amount', 'netPayable'], textAmount(text, 'Invoice Amount|Total Amount|Net Payable Amount'))),
  entryId: responseValue(response, ['entry_id', 'entryId'], textValue(text, 'Entry ID')),
  transactionType: responseValue(response, ['transaction_type', 'transactionType'], textValue(text, 'Transaction Type') !== 'Missing' ? textValue(text, 'Transaction Type') : transactionTypeFallback),
  description: responseValue(response, ['description', 'narrative'], textValue(text, 'Description/Narration|Description|Narration') !== 'Missing' ? textValue(text, 'Description/Narration|Description|Narration') : firstLedgerRow.narrative),
  invoiceDate: responseValue(response, ['invoice_date', 'invoiceDate'], textValue(text, 'Invoice Date')),
  partyGstin: responseValue(response, ['party_gstin', 'partyGstin', 'gstin'], textValue(text, 'Party GSTIN|GSTIN')),
  accountName: responseValue(response, ['account_name', 'accountName', 'ledger_name'], textValue(text, 'Account/Ledger Name|Account') !== 'Missing' ? textValue(text, 'Account/Ledger Name|Account') : firstLedgerRow.particulars),
  taxableAmount: amountValue(responseValue(response, ['taxable_amount', 'taxableAmount'], textAmount(text, 'Taxable Amount|Taxable Value'))),
  debitAmount: responseValue(response, ['debit_amount', 'debitAmount'], textAmount(text, 'Debit Amount') || firstLedgerRow.debit),
  creditAmount: responseValue(response, ['credit_amount', 'creditAmount'], textAmount(text, 'Credit Amount') || firstLedgerRow.credit),
  gstRate: responseValue(response, ['gst_rate', 'gstRate'], textValue(text, 'GST Rate')),
  cgst: responseValue(response, ['cgst'], textAmount(text, 'CGST')),
  sgst: responseValue(response, ['sgst'], textAmount(text, 'SGST')),
  igst: responseValue(response, ['igst'], textAmount(text, 'IGST')),
  tdsSection: responseValue(response, ['tds_section', 'tdsSection'], textValue(text, 'TDS Section')),
  tdsRate: responseValue(response, ['tds_rate', 'tdsRate'], textValue(text, 'TDS Rate')),
  tdsAmount: responseValue(response, ['tds_amount', 'tdsAmount'], textAmount(text, 'TDS Amount|TDS')),
  netPayable: responseValue(response, ['net_payable_amount', 'netPayable'], textAmount(text, 'Net Payable Amount|Net Payable')),
  bankReference: responseValue(response, ['bank_reference', 'bankReference', 'reference'], textValue(text, 'Bank Reference|Reference') !== 'Missing' ? textValue(text, 'Bank Reference|Reference') : firstLedgerRow.folio),
  paymentDate: responseValue(response, ['payment_date', 'paymentDate'], textValue(text, 'Payment Date') !== 'Missing' ? textValue(text, 'Payment Date') : firstLedgerRow.date),
  debitAccount: responseValue(response, ['debit_account', 'debitAccount'], textValue(text, 'Debit Account') !== 'Missing' ? textValue(text, 'Debit Account') : firstDebit > 0 ? 'Bank Account' : 'Missing'),
  creditAccount: responseValue(response, ['credit_account', 'creditAccount'], textValue(text, 'Credit Account') !== 'Missing' ? textValue(text, 'Credit Account') : firstCredit > 0 ? 'Bank Account' : 'Missing'),
  reconciliationStatus: responseValue(response, ['reconciliation_status', 'reconciliationStatus'], textValue(text, 'Reconciliation Status')),
  complianceStatus: responseValue(response, ['compliance_status', 'complianceStatus'], textValue(text, 'Compliance Status')),
  sourceDocument: responseValue(response, ['source_document', 'sourceDocument'], textValue(text, 'Source Document|Source Documentation') !== 'Missing' ? textValue(text, 'Source Document|Source Documentation') : 'Bank Statement'),
  aiSummary: text || 'No analysis text returned by the processor.',
  ledgerRows,
  });
};

const textValue = (text, label) => {
  const labels = label.split('|').map((item) => item.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const labelPattern = labels.join('|');
  const normalized = String(text || '').replace(/\\n/g, '\n').replace(/\*+/g, '');
  const match = normalized.match(new RegExp(`(?:^|\\n|\\|)\\s*(?:${labelPattern})\\s*:?\\s*(?:[-–]\\s*)?([^\\n|]+)`, 'i'));
  return match && typeof match[1] === 'string' && match[1].trim() ? match[1].trim() : 'Missing';
};

const Upload = () => {
  const { addInvoice, setActivePage } = useFinGuard();

  // Mode Tab: 'upload' | 'manual'
  const [activeTab, setActiveTab] = useState('upload');

  // File Picker State
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [documentType, setDocumentType] = useState('debit_invoice');
  const [validationError, setValidationError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Results panel state machine: 'idle' | 'loading' | 'success' | 'failure'
  const [panelState, setPanelState] = useState('idle');
  const [statusText, setStatusText] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [backendError, setBackendError] = useState(null);

  const fileInputRef = useRef(null);

  // Immediate State Reset Rule
  const resetAnalysisState = () => {
    setAnalysisResult(null);
    setBackendError(null);
    setPanelState('idle');
    setStatusText('');
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    resetAnalysisState();
    setSelectedFiles([]);
    setValidationError(null);
  };

  const handleDocumentTypeChange = (type) => {
    setDocumentType(type);
    setSelectedFiles([]);
    setValidationError(null);
    resetAnalysisState();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Client-Side Validation Function for Files
  const validateFile = (file) => {
    if (!file) {
      return 'Please upload a valid invoice or bill before analyzing';
    }

    const validTypes = ['application/pdf'];
    const fileName = file.name || '';
    const fileType = file.type || '';
    const hasValidExt = /\.pdf$/i.test(fileName);

    if (!validTypes.includes(fileType.toLowerCase()) && !hasValidExt) {
      return 'Only PDF files are supported.';
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size === 0 || file.size > MAX_SIZE) {
      return 'File is empty or too large (max 10MB).';
    }

    return null;
  };

  // Handle File Selection
  const handleFileSelect = (files) => {
    resetAnalysisState();
    const nextFiles = Array.from(files || []).slice(0, 1);

    if (nextFiles.length === 0) {
      setSelectedFiles([]);
      setValidationError(null);
      return;
    }

    const err = nextFiles.map(validateFile).find(Boolean);
    if (err) {
      setSelectedFiles([]);
      setValidationError(err);
    } else {
      setSelectedFiles(nextFiles);
      setValidationError(null);
    }
  };

  // Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  // Clear Selected File
  const handleClearFile = () => {
    setSelectedFiles([]);
    setValidationError(null);
    resetAnalysisState();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle Analyze Document Submission (File Flow)
  const handleAnalyzeClick = async () => {
    if (selectedFiles.length === 0) {
      setValidationError('Choose at least one PDF file before analyzing.');
      return;
    }

    const err = selectedFiles.map(validateFile).find(Boolean);
    if (err) {
      setValidationError(err);
      return;
    }

    setPanelState('loading');
    setStatusText('Extracting data...');

    try {
      const results = [];
      for (const [index, file] of selectedFiles.entries()) {
        setStatusText(`Analyzing document ${index + 1} of ${selectedFiles.length}...`);
        const response = await uploadAndProcessDocument(file, 'usr_101', documentType);
        results.push(normalizeBatchResult(response, file));
      }

      if (results.length > 0) {
        setAnalysisResult({ ...results[0], batchCount: results.length, batchResults: results, documentType });
        setBackendError(null);
        setPanelState('success');
      }
    } catch (error) {
      setAnalysisResult(null);
      setBackendError(error?.message || 'Failed to process document due to a server error.');
      setPanelState('failure');
    }
  };

  // Handle Manual Entry Submission Flow
  const handleManualEntrySubmit = async (formData) => {
    resetAnalysisState();
    setPanelState('loading');
    setStatusText('Validating manual entries...');

    try {
      const response = await analyzeManualEntry(formData, (progress) => {
        setStatusText(progress);
      });

      if (response && response.success && response.data) {
        setAnalysisResult(response.data);
        setBackendError(null);
        setPanelState('success');
      } else {
        setAnalysisResult(null);
        setBackendError(response?.error || 'Manual validation failed. Check required fields.');
        setPanelState('failure');
      }
    } catch (error) {
      setAnalysisResult(null);
      setBackendError('An error occurred processing manual entry submission.');
      setPanelState('failure');
    }
  };

  // Save to Dashboard
  const handleSaveToDashboard = () => {
    if (analysisResult) {
      addInvoice(analysisResult);
      setActivePage('dashboard');
    }
  };

  // Quick Preset Helper for User Testing
  const loadTestPreset = (type) => {
    if (type === 'valid') {
      const mockFile = new File(
        ['%PDF-1.4 Mock Invoice Content for Apex Cloud Hosting Subtotal: ₹1450.00 GST: ₹145.00'], 
        'Tax_Invoice_Apex_Cloud.pdf', 
        { type: 'application/pdf' }
      );
      handleFileSelect([mockFile]);
    } else if (type === 'corrupt') {
      const mockFile = new File(
        ['corrupted header bytes'], 
        'corrupt_scan.pdf', 
        { type: 'application/pdf' }
      );
      handleFileSelect([mockFile]);
    } else if (type === 'invalid_type') {
      const mockFile = new File(
        ['Plain text file'], 
        'notes.txt', 
        { type: 'text/plain' }
      );
      handleFileSelect([mockFile]);
    }
  };

  const isAnalyzeDisabled = selectedFiles.length === 0 || Boolean(validationError) || panelState === 'loading';

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Upload & Document Analysis</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Extract totals, vendor details, tax information, and compliance checks from valid bills or manual entries.
          </p>
        </div>

        {/* Tab Toggle: Upload Document vs Enter Manually */}
        <div style={{
          display: 'flex',
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-md)',
          padding: '0.25rem'
        }}>
          <button
            onClick={() => handleTabSwitch('upload')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: activeTab === 'upload' ? 'var(--emerald-500)' : 'transparent',
              color: activeTab === 'upload' ? '#ffffff' : 'var(--text-muted)'
            }}
          >
            <UploadCloud size={16} />
            <span>Upload Document</span>
          </button>

          <button
            onClick={() => handleTabSwitch('manual')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: activeTab === 'manual' ? 'var(--emerald-500)' : 'transparent',
              color: activeTab === 'manual' ? '#ffffff' : 'var(--text-muted)'
            }}
          >
            <Edit3 size={16} />
            <span>Enter Manually</span>
          </button>
        </div>
      </div>

      {/* Grid: Upload Picker/Manual Form (Left) & Results Panel (Right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(340px, 1fr) minmax(360px, 1.2fr)',
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        
        {/* Left Column: Tab 1 (File Upload) OR Tab 2 (Manual Entry) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {activeTab === 'upload' ? (
            <>
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
                  1. Select Financial Document
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                  {[
                    ['debit_invoice', 'Upload Debit Invoice'],
                    ['credit_invoice', 'Upload Credit Invoice'],
                    ['bank_statement', 'Upload Bank Statement'],
                  ].map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleDocumentTypeChange(mode)}
                      className="btn btn-sm btn-secondary"
                      style={{
                        flex: 1,
                        borderColor: documentType === mode ? 'var(--border-emerald)' : undefined,
                        backgroundColor: documentType === mode ? 'rgba(16, 185, 129, 0.12)' : undefined,
                        color: documentType === mode ? 'var(--emerald-400)' : undefined,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Drag & Drop Area */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  style={{
                    border: `2px dashed ${isDragOver ? 'var(--emerald-500)' : selectedFiles.length > 0 ? 'var(--border-emerald)' : 'var(--border-medium)'}`,
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: isDragOver ? 'var(--emerald-glow)' : selectedFiles.length > 0 ? 'rgba(16, 185, 129, 0.04)' : 'rgba(15, 23, 42, 0.5)',
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileSelect(e.target.files);
                      }
                    }}
                  />

                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    backgroundColor: selectedFiles.length > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    color: selectedFiles.length > 0 ? 'var(--emerald-400)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem auto'
                  }}>
                    {selectedFiles.length > 0 ? <FileCheck size={28} /> : <UploadCloud size={28} />}
                  </div>

                  {selectedFiles.length > 0 ? (
                    <div>
                      {selectedFiles.map((file) => <p key={`${file.name}-${file.lastModified}`} style={{ fontWeight: 600, color: 'var(--emerald-400)', fontSize: '0.9rem', wordBreak: 'break-all' }}>{file.name}</p>)}
                      <p className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {selectedFiles.length} PDF document{selectedFiles.length === 1 ? '' : 's'} ready to analyze
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                        Drag & drop invoice here, or <span className="text-emerald">browse</span>
                      </p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                        One PDF file (Max 10MB)
                      </p>
                    </div>
                  )}
                </div>

                {/* Inline Validation Error */}
                {validationError && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: '#FCA5A5',
                    fontSize: '0.84rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{validationError}</span>
                  </div>
                )}

                {/* Actions Bar */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button
                    onClick={handleAnalyzeClick}
                    disabled={isAnalyzeDisabled}
                    className="btn btn-primary"
                    style={{
                      flex: 1,
                      padding: '0.8rem',
                      opacity: isAnalyzeDisabled ? 0.45 : 1,
                      cursor: isAnalyzeDisabled ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Sparkles size={18} />
                    <span>{panelState === 'loading' ? 'Analyzing...' : 'Analyze Document'}</span>
                  </button>

                  {selectedFiles.length > 0 && (
                    <button
                      onClick={handleClearFile}
                      className="btn btn-secondary"
                      title="Clear file"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Test Presets */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <h4 style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <Zap size={14} className="text-emerald" />
                  Quick Test Files
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    onClick={() => loadTestPreset('valid')}
                    className="btn btn-sm btn-secondary"
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <FileText size={14} className="text-emerald" />
                    <span>Valid Tax Invoice (PDF)</span>
                  </button>

                  <button
                    onClick={() => loadTestPreset('corrupt')}
                    className="btn btn-sm btn-secondary"
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <AlertCircle size={14} style={{ color: '#EF4444' }} />
                    <span>Corrupted File (Triggers Failure Error)</span>
                  </button>

                  <button
                    onClick={() => loadTestPreset('invalid_type')}
                    className="btn btn-sm btn-secondary"
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <FileCode size={14} style={{ color: '#F59E0B' }} />
                    <span>Unsupported File Type (.txt)</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Tab 2: Manual Entry Form */
            <ManualEntryForm
              onSubmit={handleManualEntrySubmit}
              loading={panelState === 'loading'}
            />
          )}

        </div>

        {/* Right Column: Results Panel (Strict Mutually Exclusive States) */}
        <div className="card" style={{ minHeight: '440px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            2. Extraction & Analysis Results
          </h3>

          {/* STATE 1: IDLE */}
          {panelState === 'idle' && (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2.5rem',
              textAlign: 'center',
              color: 'var(--text-muted)'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                color: 'var(--text-dim)'
              }}>
                <FileText size={28} />
              </div>
              <p style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                No document analyzed yet
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Upload a file or complete manual entry to begin.
              </p>
            </div>
          )}

          {/* STATE 2: LOADING */}
          {panelState === 'loading' && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LoadingSpinner statusText={statusText} />
            </div>
          )}

          {/* STATE 3: FAILURE */}
          {panelState === 'failure' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <ErrorMessage
                message={backendError}
                onRetry={selectedFiles.length > 0 ? handleAnalyzeClick : null}
              />
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: '1rem' }}>
                Strict No-Fake-Data Guard: No placeholder data rendered on failed analysis.
              </p>
            </div>
          )}

          {/* STATE 4: SUCCESS */}
          {panelState === 'success' && analysisResult && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.25s ease' }}>
              {/* Indicative Banner */}
              <div style={{
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '0.6rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#93C5FD', fontSize: '0.82rem', fontWeight: 600 }}>
                  <ShieldCheck size={16} />
                  <span>AI-generated, indicative only</span>
                </div>
                <RiskBadge riskLevel={analysisResult.riskLevel} />
              </div>
              <p style={{ marginBottom: '1.25rem', color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.4 }}>
                Indicative results only — consult a qualified professional before filing or making financial decisions
              </p>

              <div style={{ marginBottom: '1.25rem', padding: '1rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.55)' }}>
                <h4 style={{ margin: '0 0 0.85rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>Ledger Entry Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.65rem 1rem' }}>
                  {[
                    ['Entry ID', analysisResult.entryId],
                    ['Date', analysisResult.date],
                    ['Transaction Type', analysisResult.transactionType],
                    ['Description / Narration', analysisResult.description],
                    ['Invoice Number', analysisResult.invoiceNumber],
                    ['Invoice Date', analysisResult.invoiceDate],
                    ['Party / Vendor Name', analysisResult.vendorName],
                    ['Party GSTIN', analysisResult.partyGstin],
                    ['Account / Ledger Name', analysisResult.accountName],
                    ['Debit Amount', analysisResult.debitAmount || analysisResult.subtotal],
                    ['Credit Amount', analysisResult.creditAmount || analysisResult.totalAmount],
                    ['Taxable Amount', analysisResult.taxableAmount],
                    ['GST Rate', analysisResult.gstRate],
                    ['CGST', analysisResult.cgst],
                    ['SGST', analysisResult.sgst],
                    ['IGST', analysisResult.igst],
                    ['TDS Section', analysisResult.tdsSection],
                    ['TDS Rate', analysisResult.tdsRate],
                    ['TDS Amount', analysisResult.tdsAmount],
                    ['Net Payable', analysisResult.netPayable],
                    ['Bank Reference', analysisResult.bankReference],
                    ['Payment Date', analysisResult.paymentDate],
                    ['Debit Account', analysisResult.debitAccount],
                    ['Credit Account', analysisResult.creditAccount],
                    ['Reconciliation Status', analysisResult.reconciliationStatus],
                    ['Compliance Status', analysisResult.complianceStatus],
                    ['Source Document', analysisResult.sourceDocument],
                  ].map(([label, value]) => (
                    <div key={label} style={{ minWidth: 0 }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{label}</span>
                      <div className="mono" style={{ color: 'var(--text-main)', fontSize: '0.8rem', overflowWrap: 'anywhere' }}>{value || 'Missing'}</div>
                    </div>
                  ))}
                </div>
              </div>

              {false && analysisResult.batchCount > 1 && (
                <div style={{ marginBottom: '1.25rem', padding: '1rem', border: '1px solid var(--border-emerald)', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.08)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Combined amount for {analysisResult.batchCount} documents</span>
                  <div className="mono font-bold" style={{ fontSize: '1.5rem', color: 'var(--emerald-400)', marginTop: '0.25rem' }}>
                    ₹{analysisResult.batchResults.reduce((total, item) => total + amountValue(item.totalAmount), 0).toFixed(2)}
                  </div>
                  <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.4rem' }}>
                    {analysisResult.batchResults.map((item) => (
                      <div key={item.fileName} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.fileName}</span>
                        <span className="mono">₹{amountValue(item.totalAmount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {false && <>
              {/* Extracted Fields */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Invoice Number</span>
                  <p className="mono font-bold" style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                    {analysisResult.invoiceNumber}
                  </p>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Vendor Name</span>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {analysisResult.vendorName}
                  </p>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Subtotal</span>
                  <p className="mono font-bold" style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                    ₹{analysisResult.subtotal?.toFixed(2)}
                  </p>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>GST / Tax Amount</span>
                  <p className="mono font-bold" style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                    ₹{analysisResult.gstAmount?.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Total Extracted */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.02) 100%)',
                border: '1px solid var(--border-emerald)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem'
              }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Total Amount Extracted</span>
                  <div className="mono font-bold" style={{ fontSize: '1.4rem', color: 'var(--emerald-400)' }}>
                    ₹{analysisResult.totalAmount?.toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {analysisResult.category}
                  </div>
                </div>
              </div>

              {/* AI Summary */}
              <div style={{ marginBottom: '1.5rem', flex: 1 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                  AI Summary & Compliance Audit
                </span>
                <p style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-main)',
                  lineHeight: 1.5,
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  {analysisResult.aiSummary}
                </p>
              </div>
              </>}

              {analysisResult.ledgerRows?.length > 0 && (
                <div style={{ marginBottom: '1.5rem', overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Ledger Entries</span>
                  </div>
                  <table className="table" style={{ minWidth: '760px' }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Particulars / Details</th>
                        <th style={{ textAlign: 'right' }}>Debit (₹)</th>
                        <th style={{ textAlign: 'right' }}>Credit (₹)</th>
                        <th>Folio / Reference</th>
                        <th>Description / Narrative</th>
                        <th style={{ textAlign: 'right' }}>Running Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResult.ledgerRows.map((row, index) => (
                        <tr key={`${row.particulars || 'entry'}-${index}`}>
                          <td>{row.date || 'Missing'}</td>
                          <td>{row.particulars || 'Missing'}</td>
                          <td className="mono" style={{ textAlign: 'right' }}>{row.debit || 'Missing'}</td>
                          <td className="mono" style={{ textAlign: 'right' }}>{row.credit || 'Missing'}</td>
                          <td>{row.folio || 'Missing'}</td>
                          <td>{row.narrative || 'Missing'}</td>
                          <td className="mono" style={{ textAlign: 'right' }}>{row.balance || 'Missing'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Save CTA */}
              <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                <button onClick={handleSaveToDashboard} className="btn btn-primary" style={{ width: '100%' }}>
                  <PlusCircle size={18} />
                  <span>Save to Dashboard</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default Upload;
