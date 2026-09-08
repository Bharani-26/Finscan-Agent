import React from 'react';
import { X } from 'lucide-react';

export default function AccountingDetailsModal({ isOpen, onClose, invoice, ledgerEntries }) {
  if (!isOpen || !invoice) return null;

  const {
    invoiceNumber,
    vendorName,
    date,
    subtotal,
    gstAmount = 0,
    tdsAmount = 0,
    totalAmount,
    documentType = 'debit_invoice',
    category,
    accountingSummary = {}
  } = invoice;

  const cgst = accountingSummary.cgst || (gstAmount ? gstAmount / 2 : 0);
  const sgst = accountingSummary.sgst || (gstAmount ? gstAmount / 2 : 0);
  const igst = accountingSummary.igst || 0;

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return 'Missing';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(Number(value));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 rounded-lg p-1 hover:bg-slate-800"
        >
          <X size={24} className="text-slate-400" />
        </button>

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white">Accounting Details</h2>
          <p className="mt-1 text-sm text-slate-400">{invoiceNumber}</p>
        </div>

        {/* Invoice Details Section */}
        <div className="mb-8 space-y-6">
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">
              {documentType === 'debit_invoice' ? 'Debit Invoice' : 'Credit Invoice'}: {invoiceNumber}
            </h3>

            <div className="grid grid-cols-2 gap-6 rounded-xl border border-slate-800 bg-slate-950/40 p-6">
              {/* Row 1 */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Document Type</p>
                <p className="mt-2 text-sm font-medium text-slate-200">
                  {documentType === 'debit_invoice' ? 'debit_invoice' : 'credit_invoice'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Invoice Number</p>
                <p className="mt-2 text-sm font-medium text-indigo-300">{invoiceNumber}</p>
              </div>

              {/* Row 2 */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Taxable Amount</p>
                <p className="mt-2 text-sm font-medium text-slate-200">{formatCurrency(subtotal)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">GST Rate</p>
                <p className="mt-2 text-sm font-medium text-slate-200">{gstAmount ? '18%' : '0%'}</p>
              </div>

              {/* Row 3 */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">CGST</p>
                <p className="mt-2 text-sm font-medium text-slate-200">{formatCurrency(cgst)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">SGST</p>
                <p className="mt-2 text-sm font-medium text-slate-200">{formatCurrency(sgst)}</p>
              </div>

              {/* Row 4 */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">IGST</p>
                <p className="mt-2 text-sm font-medium text-slate-200">{igst > 0 ? formatCurrency(igst) : 'Missing'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">TDS Section</p>
                <p className="mt-2 text-sm font-medium text-slate-200">
                  {accountingSummary.tdsSection || 'Not Applicable'}
                </p>
              </div>

              {/* Row 5 */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">TDS Rate</p>
                <p className="mt-2 text-sm font-medium text-slate-200">{accountingSummary.tdsRate || '0%'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">TDS Amount</p>
                <p className="mt-2 text-sm font-medium text-amber-300">{formatCurrency(tdsAmount)}</p>
              </div>

              {/* Row 6 */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Net Payable</p>
                <p className="mt-2 text-lg font-bold text-emerald-300">{formatCurrency(totalAmount)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Reconciliation Status</p>
                <p className="mt-2 text-sm font-medium text-blue-300">
                  {accountingSummary.reconciliationStatus || 'Pending'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ledger Entries Section */}
        {ledgerEntries && ledgerEntries.length > 0 && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">Double-Entry Ledger Entries</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-900/60">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Date
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Particulars / Details
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Debit (₹)
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Credit (₹)
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Folio / Reference
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Description / Narrative
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {ledgerEntries.map((entry, index) => (
                    <tr key={index} className="hover:bg-slate-800/30 transition">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-400 text-xs">
                        {formatDate(entry.date)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-200">{entry.particulars}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-cyan-300">
                        {entry.debit ? formatCurrency(entry.debit) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-amber-300">
                        {entry.credit ? formatCurrency(entry.credit) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-400 text-xs">
                        {entry.folio || 'Missing'}
                      </td>
                      <td className="min-w-48 px-4 py-3 text-slate-300 text-xs">{entry.narrative || 'Missing'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Row */}
            <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Debit</p>
                <p className="mt-2 text-lg font-bold text-cyan-300">
                  {formatCurrency(
                    ledgerEntries
                      .filter((e) => e.debit)
                      .reduce((sum, e) => sum + (Number(e.debit) || 0), 0)
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Credit</p>
                <p className="mt-2 text-lg font-bold text-amber-300">
                  {formatCurrency(
                    ledgerEntries
                      .filter((e) => e.credit)
                      .reduce((sum, e) => sum + (Number(e.credit) || 0), 0)
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Close Button (Bottom) */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-6 py-2.5 font-semibold text-slate-200 transition hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
