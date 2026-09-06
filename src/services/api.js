import { createClient } from '@supabase/supabase-js';

// Load Vite Environment Variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;

const isMissingLedgerTableError = (error) => error?.code === 'PGRST205'
  || error?.message?.includes("Could not find the table 'public.ledger_entries'");

// Initialize Supabase Client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploads a document to the n8n webhook for Gemini AI tax calculation and ledger assignment.
 * @param {File} file - The uploaded PDF or Image invoice/bank statement.
 * @param {string} userId - User identifier (defaults to 'usr_101').
 */
export async function uploadAndProcessDocument(file, userId = 'usr_101', documentType = 'invoice') {
  if (!n8nWebhookUrl) {
    throw new Error('VITE_N8N_WEBHOOK_URL is not defined in your .env file.');
  }

  const formData = new FormData();
  formData.append('user_id', userId);
  formData.append('document_type', documentType);
  formData.append('file', file);

  const response = await fetch(n8nWebhookUrl, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`n8n Webhook Error [HTTP ${response.status}]: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetches processed invoices and tax calculations from Supabase.
 * @param {string} userId - User identifier.
 */
export async function fetchUserInvoices(userId = 'usr_101') {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invoices from Supabase:', error);
    throw error;
  }

  return data;
}

/**
 * Fetches processed bank statements from Supabase.
 * @param {string} userId - User identifier.
 */
export async function fetchUserBankStatements(userId = 'usr_101') {
  const { data, error } = await supabase
    .from('bank_statements')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching bank statements from Supabase:', error);
    throw error;
  }

  return data;
}

/**
 * Stores the double-entry rows returned by the document processor.
 * @param {Array} rows - Ledger rows from the n8n response.
 * @param {object} context - Source document metadata.
 */
export async function insertLedgerEntries(rows, context = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const nullable = (value) => value === undefined || value === null || value === '' || value === 'Not available' || value === 'Missing' ? null : value;

  const entries = rows.map((row) => ({
    user_id: context.userId || 'usr_101',
    entry_date: nullable(row.date || row.Date || context.date),
    particulars: row.particulars || row.Particulars || row.details || row.Details || row.account || row.Account || 'Missing',
    debit: row.debit ?? row.Debit ?? null,
    credit: row.credit ?? row.Credit ?? null,
    folio_reference: row.folio || row.Folio || row.reference || row.Reference || row.ref || row.Ref || null,
    narrative: row.description || row.Description || row.narrative || row.Narrative || null,
    running_balance: row.running_balance ?? row.runningBalance ?? row.balance ?? row.Balance ?? null,
    document_type: context.documentType || null,
    invoice_number: context.invoiceNumber || null,
    vendor_name: context.vendor || null,
    source_document_id: context.sourceDocumentId || null,
  }));

  const { data, error } = await supabase.from('ledger_entries').insert(entries).select();
  if (error) {
    console.error('Error inserting ledger entries into Supabase:', error);
    if (isMissingLedgerTableError(error)) {
      throw new Error('The ledger_entries table is not installed. Run the Supabase migration before uploading ledger documents.');
    }
    throw error;
  }

  return data;
}

/**
 * Fetches persisted ledger entries for a user.
 * @param {string} userId - User identifier.
 */
export async function fetchUserLedgerEntries(userId = 'usr_101') {
  const { data, error } = await supabase
    .from('ledger_entries')
    .select('*')
    .eq('user_id', userId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching ledger entries from Supabase:', error);
    if (isMissingLedgerTableError(error)) {
      throw new Error('The ledger_entries table is not installed. Run the Supabase migration in the Supabase SQL Editor.');
    }
    throw error;
  }

  return data;
}
