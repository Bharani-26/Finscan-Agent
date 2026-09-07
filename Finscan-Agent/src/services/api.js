import { createClient } from '@supabase/supabase-js';
import { ACCOUNTING_AGENT_PROMPT } from './accountingPrompt';
import { analyzeDocument } from './mockApi';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
const isValidHttpUrl = (value) => {
  if (!value || value.toLowerCase().includes('placeholder')) return false;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const hasSupabaseConfig = isValidHttpUrl(supabaseUrl) && Boolean(supabaseAnonKey);
const hasWebhookConfig = isValidHttpUrl(n8nWebhookUrl);

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

const AUTH_KEY = 'finscan_user_session';
const PROFILE_KEY = 'finscan_user_profile';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock Auth Implementation
const mockAuth = {
  signInWithPassword: async ({ email, password }) => {
    await delay(400);
    
    if (!email || !email.includes('@')) {
      return { data: { user: null, session: null }, error: { message: 'Please enter a valid email address.' } };
    }
    if (!password || password.length < 6) {
      return { data: { user: null, session: null }, error: { message: 'Password must be at least 6 characters long.' } };
    }

    const storedProfile = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null') || {};
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
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...mockUser.user_metadata, email }));
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
};

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
      auth: mockAuth,
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

  const entries = rows.map((row, idx) => ({
    id: row.id || `led_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
    user_id: context.userId || 'usr_101',
    entry_date: nullable(row.date || row.Date || row.entry_date || context.date),
    particulars: row.particulars || row.Particulars || row.details || row.Details || row.account || row.Account || 'Missing',
    debit: row.debit ?? row.Debit ?? null,
    credit: row.credit ?? row.Credit ?? null,
    folio_reference: row.folio || row.Folio || row.reference || row.Reference || row.ref || row.Ref || context.invoiceNumber || 'Missing',
    narrative: row.description || row.Description || row.narrative || row.Narrative || context.vendor || 'Missing',
    running_balance: row.running_balance ?? row.runningBalance ?? row.balance ?? row.Balance ?? null,
    document_type: context.documentType || null,
    invoice_number: context.invoiceNumber || null,
    vendor_name: context.vendor || null,
    source_document_id: context.sourceDocumentId || null,
    created_at: new Date().toISOString(),
  }));

  // Always save locally to ensure zero data loss under dev/mockAuth/RLS
  const storedEntries = readStorage('finscan_ledger_entries', []);
  const existingKeys = new Set(storedEntries.map(e => `${e.entry_date}-${e.particulars}-${e.folio_reference}-${e.debit}-${e.credit}`));
  const newUnique = entries.filter(e => !existingKeys.has(`${e.entry_date}-${e.particulars}-${e.folio_reference}-${e.debit}-${e.credit}`));
  const nextEntries = [...newUnique, ...storedEntries];
  writeStorage('finscan_ledger_entries', nextEntries);

  if (hasSupabaseConfig) {
    try {
      const { data, error } = await supabase.from('ledger_entries').insert(entries).select();
      if (!error && data && data.length > 0) {
        return data;
      }
      if (error) {
        console.warn('Supabase insertLedgerEntries warning (saved to local storage):', error.message || error);
      }
    } catch (supabaseError) {
      console.warn('Supabase insertLedgerEntries caught exception (saved to local storage):', supabaseError);
    }
  }

  return nextEntries;
}

export async function fetchUserLedgerEntries(userId = 'usr_101') {
  let remoteEntries = [];
  if (hasSupabaseConfig) {
    try {
      const { data, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        remoteEntries = data;
      }
    } catch (err) {
      console.warn('Error fetching ledger entries from Supabase (falling back to local storage):', err);
    }
  }

  const localEntries = readStorage('finscan_ledger_entries', []).filter((entry) => !userId || entry.user_id === userId);

  if (remoteEntries.length > 0 && localEntries.length > 0) {
    const seen = new Set();
    const combined = [];
    for (const e of [...remoteEntries, ...localEntries]) {
      const key = `${e.entry_date || e.date}-${e.particulars}-${e.folio_reference || e.folio}-${e.debit}-${e.credit}`;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(e);
      }
    }
    return combined;
  }

  return remoteEntries.length > 0 ? remoteEntries : localEntries;
}
