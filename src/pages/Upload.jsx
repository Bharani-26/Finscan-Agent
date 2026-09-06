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
  const sources = [response, response?.data, response?.result, response?.output, response?.json];
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const key of keys) {
      if (source[key] !== undefined && source[key] !== null && source[key] !== '') return source[key];
    }
  }
  return fallback;
};

const amountValue = (value) => {
  const amount = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(amount) ? amount : 0;
};

const textAmount = (text, label) => {
  const match = String(text || '').match(new RegExp(`${label}\\s*:?\\s*[₹$]?\\s*([\\d,]+(?:\\.\\d+)?)`, 'i'));
  return match ? amountValue(match[1]) : 0;
};

const normalizeBatchResult = (response, file) => ({
  ...response,
  fileName: file.name,
  invoiceNumber: responseValue(response, ['invoice_number', 'invoiceNumber']),
  vendorName: responseValue(response, ['vendor_customer', 'vendor', 'vendor_name', 'vendorName']),
  subtotal: amountValue(responseValue(response, ['subtotal', 'taxable_amount', 'taxableAmount'], textAmount(response?.rawText, 'Taxable Value'))),
  gstAmount: amountValue(responseValue(response, ['calculated_gst_amount', 'gst_amount', 'gstAmount'], textAmount(response?.rawText, 'GST'))),
  totalAmount: amountValue(responseValue(response, ['total_amount', 'totalAmount', 'net_payable_amount', 'netPayable'], textAmount(response?.rawText, 'Invoice Amount|Total Amount|Net Payable Amount'))),
});

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
    const nextFiles = Array.from(files || []);

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
      setBackendError('Failed to process document due to a server error.');
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
        ['%PDF-1.4 Mock Invoice Content for Apex Cloud Hosting Subtotal: $1450.00 GST: $145.00'], 
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

                <select
                  value={documentType}
                  onChange={(event) => setDocumentType(event.target.value)}
                  disabled={panelState === 'loading'}
                  className="form-input"
                  style={{ marginBottom: '1rem' }}
                >
                  <option value="debit_invoice">Debit Invoice</option>
                  <option value="credit_invoice">Credit Invoice</option>
                  <option value="bank_statement">Bank Statement</option>
                </select>

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
                    multiple
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
                        Supports multiple PDF files (Max 10MB each)
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

              {analysisResult.batchCount > 1 && (
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
                    ${analysisResult.subtotal?.toFixed(2)}
                  </p>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>GST / Tax Amount</span>
                  <p className="mono font-bold" style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                    ${analysisResult.gstAmount?.toFixed(2)}
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
                    ${analysisResult.totalAmount?.toFixed(2)}
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
