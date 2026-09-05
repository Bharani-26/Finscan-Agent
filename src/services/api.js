import { createClient } from '@supabase/supabase-js';

// Load Vite Environment Variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;

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
