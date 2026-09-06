create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  entry_date date,
  particulars text not null default 'Missing',
  debit numeric(18, 2),
  credit numeric(18, 2),
  folio_reference text,
  narrative text,
  running_balance numeric(18, 2),
  document_type text,
  invoice_number text,
  vendor_name text,
  source_document_id text,
  created_at timestamptz not null default now()
);

create index if not exists ledger_entries_user_id_idx
  on public.ledger_entries (user_id);

create index if not exists ledger_entries_entry_date_idx
  on public.ledger_entries (user_id, entry_date desc);

alter table public.ledger_entries enable row level security;

create policy "Users can view their ledger entries"
  on public.ledger_entries
  for select
  using (auth.uid()::text = user_id);

create policy "Users can insert their ledger entries"
  on public.ledger_entries
  for insert
  with check (auth.uid()::text = user_id);
