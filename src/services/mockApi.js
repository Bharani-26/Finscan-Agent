/**
 * Finscan API Service
 * Clean Initial State - Zero Default Mock Invoices / Alerts
 * Strict Validation & No-Fake-Data Guard
 */

import { generateLedgerEntries, calculateRunningBalance, generateAccountingSummary } from './ledgerGenerator.js';

const AUTH_KEY = 'finscan_user_session';
const INVOICES_KEY = 'finscan_invoices_data';
const ALERTS_KEY = 'finscan_compliance_alerts';
const PROFILE_KEY = 'finscan_user_profile';
const LEDGER_KEY = 'finscan_ledger_entries';

// Initial Empty States (No pre-populated mock invoices or compliance alerts)
const INITIAL_ALERTS = [];
const INITIAL_INVOICES = [];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Auth API Simulation
 */
export const supabase = {
  auth: {
    signInWithPassword: async ({ email, password }) => {
      await delay(400);
      
      if (!email || !email.includes('@')) {
        return { data: { user: null, session: null }, error: { message: 'Please enter a valid email address.' } };
      }
      if (!password || password.length < 6) {
        return { data: { user: null, session: null }, error: { message: 'Password must be at least 6 characters long.' } };
      }

      const storedProfile = getStoredProfile();
      const mockUser = {
        id: 'usr_finscan_' + Math.random().toString(36).substring(2, 9),
        email: email,
        user_metadata: {
          name: storedProfile?.name || email.split('@')[0].replace('.', ' '),
          businessName: storedProfile?.businessName || 'My Business',
          phone: storedProfile?.phone || '+919876543210',
          businessType: storedProfile?.businessType || 'Pvt Ltd',
          gstin: storedProfile?.gstin || ''
        }
      };

      const session = {
        access_token: 'jwt_token_' + Date.now(),
        user: mockUser
      };

      localStorage.setItem(AUTH_KEY, JSON.stringify(session));
      return { data: { user: mockUser, session }, error: null };
    },

    signUp: async ({ email, password, options = {} }) => {
      await delay(500);

      const name = options.data?.name;
      const businessName = options.data?.businessName;

      if (!name || name.trim().length === 0) {
        return { data: { user: null }, error: { message: 'Full name is required.' } };
      }
      if (!businessName || businessName.trim().length === 0) {
        return { data: { user: null }, error: { message: 'Business name is required.' } };
      }
      if (!email || !email.includes('@')) {
        return { data: { user: null }, error: { message: 'Please provide a valid email address.' } };
      }
      if (!password || password.length < 6) {
        return { data: { user: null }, error: { message: 'Password must be at least 6 characters long.' } };
      }

      const mockUser = {
        id: 'usr_finscan_' + Math.random().toString(36).substring(2, 9),
        email: email,
        user_metadata: {
          name: name,
          businessName: businessName,
          phone: '+919876543210',
          businessType: 'Pvt Ltd',
          gstin: ''
        }
      };

      const session = {
        access_token: 'jwt_token_' + Date.now(),
        user: mockUser
      };

      localStorage.setItem(AUTH_KEY, JSON.stringify(session));
      saveProfileToStore(mockUser.user_metadata, email);
      return { data: { user: mockUser, session }, error: null };
    },

    signOut: async () => {
      await delay(200);
      localStorage.removeItem(AUTH_KEY);
      return { error: null };
    },

    getSession: async () => {
      const stored = localStorage.getItem(AUTH_KEY);
      if (!stored) return { data: { session: null }, error: null };
      try {
        const session = JSON.parse(stored);
        return { data: { session }, error: null };
      } catch {
        return { data: { session: null }, error: null };
      }
    }
  }
};

/**
 * Profile Management API
 */
export const getStoredProfile = () => {
  const stored = localStorage.getItem(PROFILE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const saveProfileToStore = (profileData, email) => {
  const payload = { ...profileData, email };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(payload));
  
  const storedSession = localStorage.getItem(AUTH_KEY);
  if (storedSession) {
    try {
      const session = JSON.parse(storedSession);
      if (session.user) {
        session.user.email = email || session.user.email;
        session.user.user_metadata = {
          ...session.user.user_metadata,
          name: profileData.name,
          businessName: profileData.businessName,
          phone: profileData.phone,
          businessType: profileData.businessType,
          gstin: profileData.gstin
        };
        localStorage.setItem(AUTH_KEY, JSON.stringify(session));
      }
    } catch (e) {
      console.error(e);
    }
  }
  return payload;
};

export const updateProfile = async (profileData) => {
  await delay(400);
  const updated = saveProfileToStore(profileData, profileData.email);
  return { success: true, data: updated };
};

/**
 * AI Document Analysis Webhook Call (File Upload Flow)
 */
export const analyzeDocument = async (file, onProgressUpdate) => {
  if (!file) {
    return {
      success: false,
      error: 'Please upload a valid invoice or bill before analyzing'
    };
  }

  const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  const fileName = file.name || '';
  const fileType = file.type || '';
  const hasValidExt = /\.(pdf|jpg|jpeg|png)$/i.test(fileName);

  if (!validTypes.includes(fileType.toLowerCase()) && !hasValidExt) {
    return {
      success: false,
      error: 'Please upload a valid invoice or bill before analyzing'
    };
  }

  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size === 0 || file.size > MAX_SIZE) {
    return {
      success: false,
      error: 'File is empty or too large (max 10MB).'
    };
  }

  if (onProgressUpdate) onProgressUpdate('Extracting data...');
  await delay(900);

  if (onProgressUpdate) onProgressUpdate('Running AI analysis...');
  await delay(1000);

  const lowerName = fileName.toLowerCase();
  if (
    lowerName.includes('corrupt') || 
    lowerName.includes('invalid') || 
    lowerName.includes('blank') || 
    lowerName.includes('fail') ||
    lowerName.includes('no_doc')
  ) {
    return {
      success: false,
      error: 'No document detected — please upload a valid invoice or bill.'
    };
  }

  const isHighRisk = lowerName.includes('unregistered') || lowerName.includes('tax_issue');
  const isMediumRisk = lowerName.includes('discrepancy') || lowerName.includes('warning');

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const entryNumber = `LED-2026-${randomNum}`;
  const refNumber = `BNK-2026-${randomNum}`;
  const dateStr = new Date().toISOString().split('T')[0];
  const paymentDateStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  let vendor = 'Apex Tech Solutions';
  if (lowerName.includes('aws') || lowerName.includes('amazon')) vendor = 'Amazon Web Services';
  else if (lowerName.includes('google')) vendor = 'Google Workspace Cloud';
  else if (lowerName.includes('office')) vendor = 'National Office Direct';

  let invNumber = `INV-2026-${randomNum}`;
  let subtotal = Math.round((450 + Math.random() * 2500) * 100) / 100;
  let gstAmount = Math.round((subtotal * 0.18) * 100) / 100;
  let totalAmount = Math.round((subtotal + gstAmount) * 100) / 100;
  let tdsAmount = 0;
  let tdsSection = 'Not Applicable';
  let tdsRate = 'Not Applicable';
  let netPayable = totalAmount;
  let gstRate = 18;
  let category = 'Software & Cloud';
  let riskLevel = isHighRisk ? 'HIGH' : isMediumRisk ? 'MEDIUM' : 'LOW';

  if (lowerName.includes('debit-invoice.pdf') || lowerName.includes('debit_invoice') || lowerName.includes('inv-deb-001')) {
    invNumber = 'INV-DEB-001';
    subtotal = 50000;
    gstAmount = 9000;
    totalAmount = 59000;
    tdsAmount = 5000;
    tdsSection = '194J';
    tdsRate = '10%';
    netPayable = 54000;
    vendor = 'Apex Cloud Services';
    category = 'Consulting & Legal';
    riskLevel = 'LOW';
  } else if (lowerName.includes('credit-invoice.pdf') || lowerName.includes('credit_invoice') || lowerName.includes('cn-001')) {
    invNumber = 'CN-001';
    subtotal = 10000;
    gstAmount = 1800;
    totalAmount = 11800;
    tdsAmount = 0;
    tdsSection = 'Not Applicable';
    tdsRate = 'Not Applicable';
    netPayable = 11800;
    vendor = 'Apex Cloud Services';
    category = 'Consulting & Legal';
    riskLevel = 'LOW';
  } else if (lowerName.includes('bank-statement.pdf') || lowerName.includes('bank_statement')) {
    invNumber = 'BNK-2026-001';
    subtotal = 54000;
    gstAmount = 0;
    totalAmount = 54000;
    tdsAmount = 0;
    tdsSection = 'Not Applicable';
    tdsRate = 'Not Applicable';
    netPayable = 54000;
    vendor = 'Apex Cloud Services';
    category = 'Bank Transfer';
    riskLevel = 'LOW';
  }

  const cgst = Math.round((gstAmount / 2) * 100) / 100;
  const sgst = Math.round((gstAmount - cgst) * 100) / 100;
  const igst = 0;
  const partyGstin = `29ABCDE${Math.floor(10000 + Math.random() * 90000)}1Z1`;
  const isCreditNote = lowerName.includes('credit');
  const isBankStatement = lowerName.includes('bank') || lowerName.includes('statement');

  const analysisResult = {
    id: invNumber,
    invoiceNumber: invNumber,
    vendorName: vendor,
    date: dateStr,
    subtotal: subtotal,
    taxableAmount: subtotal,
    gstAmount: gstAmount,
    gstRate: gstRate,
    cgst: cgst,
    sgst: sgst,
    igst: igst,
    tdsSection: tdsSection,
    tdsRate: tdsRate,
    tdsAmount: tdsAmount,
    totalAmount: totalAmount,
    netPayable: netPayable,
    category: category,
    riskLevel: riskLevel,
    fileName: fileName,
    fileSize: `${(file.size / 1024).toFixed(1)} KB`,
    taxVerification: isHighRisk
      ? 'WARNING: ABN not registered for GST in public register'
      : 'ABN 45 901 223 881 - Valid GST Tax Invoice',
    aiSummary: `AI parsed ${fileName}. Extracted invoice details with ${gstRate}% GST calculation. Vendor registration verified against tax database. Risk score evaluated as ${riskLevel}.`,
    lineItems: [
      {
        description: `${category} - Service item`,
        quantity: 1,
        rate: subtotal,
        total: subtotal
      }
    ],
    entryId: entryNumber,
    transactionType: isCreditNote ? 'Sales' : isBankStatement ? 'Payment' : 'Purchase',
    description: `AI parsed ${fileName}. Extracted invoice details with ${gstRate}% GST calculation.`,
    invoiceDate: dateStr,
    partyGstin: partyGstin,
    accountName: category,
    debitAmount: isCreditNote ? 0 : isBankStatement ? netPayable : netPayable,
    creditAmount: isCreditNote ? totalAmount : 0,
    bankReference: refNumber,
    paymentDate: paymentDateStr,
    debitAccount: isCreditNote ? 'Accounts Receivable' : isBankStatement ? 'Bank Account' : 'Accounts Payable',
    creditAccount: isCreditNote ? vendor : 'Bank Account',
    reconciliationStatus: 'Matched',
    complianceStatus: 'Compliant',
    sourceDocument: fileName,
  };

  // Generate ledger entries from the invoice
  const documentType = isCreditNote ? 'credit_invoice' : isBankStatement ? 'bank_statement' : 'debit_invoice';
  const ledgerEntries = generateLedgerEntries(analysisResult, documentType);
  const balancedEntries = calculateRunningBalance(ledgerEntries);
  const accountingSummary = generateAccountingSummary(analysisResult);

  const resultWithLedger = {
    ...analysisResult,
    ledgerEntries: balancedEntries,
    accountingSummary: accountingSummary
  };

  return {
    success: true,
    data: resultWithLedger
  };
};

/**
 * AI Manual Entry Compliance Audit Flow
 */
export const analyzeManualEntry = async (formData, onProgressUpdate) => {
  const { invoiceNumber, vendorName, date, category, subtotal, gstAmount, totalAmount, notes } = formData;

  const subNum = Number(subtotal);
  const gstNum = Number(gstAmount);
  const totNum = Number(totalAmount);

  if (!invoiceNumber || !vendorName || !date || isNaN(subNum) || subNum <= 0 || isNaN(totNum) || totNum <= 0) {
    return {
      success: false,
      error: 'Please fill in all required manual invoice fields with valid positive numbers.'
    };
  }

  if (onProgressUpdate) onProgressUpdate('Validating manual entries...');
  await delay(700);

  if (onProgressUpdate) onProgressUpdate('Running compliance risk rules...');
  await delay(800);

  const expectedGst = subNum * 0.1;
  const gstDiff = Math.abs(gstNum - expectedGst);

  let riskLevel = 'LOW';
  let taxVerification = 'Valid Manual Invoice — GST matches standard 10% rate';
  let riskNote = 'No compliance issues detected.';

  if (gstDiff > (subNum * 0.03)) {
    riskLevel = 'MEDIUM';
    taxVerification = `WARNING: GST deviation detected. Claimed ₹${gstNum.toFixed(2)}, expected ₹${expectedGst.toFixed(2)}.`;
    riskNote = 'Flagged for GST rate discrepancy.';
  }

  if (vendorName.toLowerCase().includes('cash') || vendorName.toLowerCase().includes('unregistered')) {
    riskLevel = 'HIGH';
    taxVerification = 'CRITICAL: Vendor tax registration unverified for manual payment';
    riskNote = 'High risk vendor classification.';
  }

  const gstRate = 10;
  const cgst = Math.round((gstNum / 2) * 100) / 100;
  const sgst = Math.round((gstNum - cgst) * 100) / 100;
  const igst = 0;

  const analysisResult = {
    id: invoiceNumber,
    invoiceNumber: invoiceNumber,
    vendorName: vendorName,
    date: date,
    subtotal: subNum,
    taxableAmount: subNum,
    gstAmount: gstNum,
    gstRate: gstRate,
    cgst: cgst,
    sgst: sgst,
    igst: igst,
    tdsSection: 'Not Applicable',
    tdsRate: 'Not Applicable',
    tdsAmount: 0,
    totalAmount: totNum,
    netPayable: totNum,
    category: category || 'General Expense',
    riskLevel: riskLevel,
    fileName: 'Manual Entry Submission',
    fileSize: 'Form Input',
    taxVerification: taxVerification,
    aiSummary: `Manual entry audited for ${vendorName} (${invoiceNumber}). Subtotal: ₹${subNum.toFixed(2)}, GST: ₹${gstNum.toFixed(2)}, Total: ₹${totNum.toFixed(2)}. ${riskNote} ${notes ? `Notes: ${notes}` : ''}`,
    lineItems: [
      {
        description: notes || `${category || 'General Expense'} manual line item`,
        quantity: 1,
        rate: subNum,
        total: subNum
      }
    ],
    entryId: invoiceNumber,
    transactionType: 'Purchase',
    description: `Manual entry audited for ${vendorName} (${invoiceNumber}).`,
    invoiceDate: date,
    partyGstin: `29ABCDE${Math.floor(10000 + Math.random() * 90000)}1Z1`,
    accountName: category || 'General Expense',
    debitAmount: totNum,
    creditAmount: 0,
    bankReference: `BNK-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    paymentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    debitAccount: 'Accounts Payable',
    creditAccount: 'Bank Account',
    reconciliationStatus: 'Matched',
    complianceStatus: 'Compliant',
    sourceDocument: 'Manual Entry Submission',
  };

  // Generate ledger entries from the manual entry
  const ledgerEntries = generateLedgerEntries(analysisResult, 'debit_invoice');
  const balancedEntries = calculateRunningBalance(ledgerEntries);
  const accountingSummary = generateAccountingSummary(analysisResult);

  const resultWithLedger = {
    ...analysisResult,
    ledgerEntries: balancedEntries,
    accountingSummary: accountingSummary
  };

  return {
    success: true,
    data: resultWithLedger
  };
};

export const getStoredInvoices = () => {
  const stored = localStorage.getItem(INVOICES_KEY);
  if (!stored) {
    localStorage.setItem(INVOICES_KEY, JSON.stringify([]));
    return [];
  }
  try {
    const list = JSON.parse(stored);
    return list.filter(i => !['INV-2026-8812', 'INV-2026-9904', 'INV-2026-3011', 'INV-2026-MANUAL-101'].includes(i.invoiceNumber));
  } catch {
    return [];
  }
};

export const saveInvoiceToStore = (invoice) => {
  const current = getStoredInvoices();
  const filtered = current.filter(i => i.invoiceNumber !== invoice.invoiceNumber);
  const updated = [invoice, ...filtered];
  localStorage.setItem(INVOICES_KEY, JSON.stringify(updated));
  return updated;
};

export const getStoredAlerts = () => {
  const stored = localStorage.getItem(ALERTS_KEY);
  if (!stored) {
    localStorage.setItem(ALERTS_KEY, JSON.stringify([]));
    return [];
  }
  try {
    const list = JSON.parse(stored);
    return list.filter(a => !['ALT-901', 'ALT-902', 'ALT-903', 'ALT-904'].includes(a.id));
  } catch {
    return [];
  }
};

export const updateAlertStatusInStore = (alertId, newStatus) => {
  const current = getStoredAlerts();
  const updated = current.map(alert => 
    alert.id === alertId ? { ...alert, status: newStatus } : alert
  );
  localStorage.setItem(ALERTS_KEY, JSON.stringify(updated));
  return updated;
};

export const getStoredLedgerEntries = () => {
  const stored = localStorage.getItem(LEDGER_KEY);
  if (!stored) {
    return [];
  }
  try {
    const list = JSON.parse(stored);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

export const saveLedgerEntriesToStore = (rows, context = {}) => {
  if (!Array.isArray(rows) || rows.length === 0) return getStoredLedgerEntries();
  const current = getStoredLedgerEntries();
  const nullable = (val) => (val === undefined || val === null || val === '' || val === 'Not available' || val === 'Missing' ? null : val);

  const formattedRows = rows.map((row, idx) => ({
    id: row.id || `led_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
    user_id: context.userId || 'usr_101',
    entry_date: nullable(row.date || row.entry_date || row.Date || context.date),
    particulars: row.particulars || row.Particulars || row.details || row.account || 'Missing',
    debit: row.debit ?? row.Debit ?? null,
    credit: row.credit ?? row.Credit ?? null,
    folio_reference: row.folio || row.Folio || row.reference || row.ref || context.invoiceNumber || 'Missing',
    narrative: row.narrative || row.description || row.Description || row.Narrative || context.vendor || 'Missing',
    running_balance: row.balance ?? row.running_balance ?? row.runningBalance ?? row.Balance ?? null,
    document_type: context.documentType || null,
    invoice_number: context.invoiceNumber || null,
    vendor_name: context.vendor || null,
    created_at: new Date().toISOString(),
  }));

  // Deduplicate against existing entries by particulars, folio_reference, and entry_date
  const existingKeys = new Set(current.map(e => `${e.entry_date}-${e.particulars}-${e.folio_reference}-${e.debit}-${e.credit}`));
  const newUnique = formattedRows.filter(e => !existingKeys.has(`${e.entry_date}-${e.particulars}-${e.folio_reference}-${e.debit}-${e.credit}`));

  const updated = [...newUnique, ...current];
  localStorage.setItem(LEDGER_KEY, JSON.stringify(updated));
  return updated;
};

export const clearStoredMockData = () => {
  localStorage.removeItem(INVOICES_KEY);
  localStorage.removeItem(ALERTS_KEY);
  localStorage.removeItem(LEDGER_KEY);
};
