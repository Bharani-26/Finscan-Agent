import { createClient } from '@supabase/supabase-js';
import { ACCOUNTING_AGENT_PROMPT } from './accountingPrompt';
import { analyzeDocument } from './mockApi';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
export const hasSupabaseConfig = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
const hasWebhookConfig = Boolean(import.meta.env.VITE_N8N_WEBHOOK_URL);

const readStorage = (key, fallback = []) => {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const writeStorage = (key, value) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
  return value;
};

const isMissingLedgerTableError = (error) => error?.code === 'PGRST205'
  || error?.message?.includes("Could not find the table 'public.ledger_entries'");

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: async () => ({ data: [], error: null }),
          }),
        }),
        insert: () => ({
          select: async () => ({ data: [], error: null }),
        }),
      }),
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
        signOut: async () => ({ error: null }),
      },
    };

export async function uploadAndProcessDocument(file, userId = 'usr_101', documentType = 'invoice', relatedDocuments = '') {
  if (!hasWebhookConfig) {
    const result = await analyzeDocument(file, () => {});
    if (!result.success) {
      throw new Error(result.error || 'Document analysis failed.');
    }
    return result.data;
  }

  const formData = new FormData();
  formData.append('user_id', userId);
  formData.append('document_type', documentType);
  formData.append('accounting_instructions', ACCOUNTING_AGENT_PROMPT);
  if (relatedDocuments) formData.append('related_documents', relatedDocuments);
  formData.append('file', file);

  const response = await fetch(n8nWebhookUrl, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`n8n Webhook Error [HTTP ${response.status}]: ${errorBody || response.statusText}`);
  }

  const responseText = await response.text();
  if (!responseText.trim()) {
    throw new Error('The document processor returned an empty response. Check the n8n Respond to Webhook node.');
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return { rawText: responseText };
  }
}

export async function fetchUserInvoices(userId = 'usr_101') {
  if (!hasSupabaseConfig) {
    return readStorage('finscan_invoices_data', []);
  }

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

export async function fetchUserBankStatements(userId = 'usr_101') {
  if (!hasSupabaseConfig) {
    return readStorage('finscan_bank_statements', []);
  }

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

  if (!hasSupabaseConfig) {
    const storedEntries = readStorage('finscan_ledger_entries', []);
    const nextEntries = [...storedEntries, ...entries];
    writeStorage('finscan_ledger_entries', nextEntries);
    return nextEntries;
  }

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

export async function fetchUserLedgerEntries(userId = 'usr_101') {
  if (!hasSupabaseConfig) {
    return readStorage('finscan_ledger_entries', []).filter((entry) => !userId || entry.user_id === userId);
  }

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
