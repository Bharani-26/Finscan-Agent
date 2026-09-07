/**
 * Ledger Entry Generator
 * Converts invoice data into double-entry bookkeeping ledger entries
 */

export const generateLedgerEntries = (invoice, documentType = 'debit_invoice') => {
  const entries = [];
  
  // Extract invoice details
  const {
    invoiceNumber,
    vendorName,
    date,
    category,
    subtotal,
    gstAmount,
    totalAmount,
    tdsAmount = 0,
    riskLevel
  } = invoice;

  // Determine if GST is CGST+SGST (intra-state) or IGST (inter-state)
  const isCGST = gstAmount ? gstAmount / 2 : 0; // Simplified: assume 50-50 split
  const isSGST = gstAmount ? gstAmount / 2 : 0;
  const isIGST = 0; // For inter-state, would be full gstAmount

  const dateFormatted = date || new Date().toISOString().split('T')[0];

  if (documentType === 'debit_invoice' || documentType === 'invoice') {
    /**
     * Purchase Invoice (Debit Invoice)
     * Debit: Expense Account (Purchase/Service)
     * Debit: Input Tax Credit (CGST/SGST/IGST)
     * Credit: Vendor Payable Account
     */
    
    // 1. Expense Account Entry
    entries.push({
      date: dateFormatted,
      particulars: `${category || 'Purchases'} A/c`,
      debit: parseFloat(subtotal) || 0,
      credit: null,
      folio: `INV-${invoiceNumber}`,
      narrative: `Purchase from ${vendorName} - ${invoiceNumber}`,
      running_balance: null
    });

    // 2. CGST Entry (if applicable)
    if (isCGST > 0) {
      entries.push({
        date: dateFormatted,
        particulars: 'CGST Input Tax Credit A/c',
        debit: parseFloat(isCGST) || 0,
        credit: null,
        folio: `INV-${invoiceNumber}`,
        narrative: `CGST @ 9% on ${vendorName} purchase`,
        running_balance: null
      });
    }

    // 3. SGST Entry (if applicable)
    if (isSGST > 0) {
      entries.push({
        date: dateFormatted,
        particulars: 'SGST Input Tax Credit A/c',
        debit: parseFloat(isSGST) || 0,
        credit: null,
        folio: `INV-${invoiceNumber}`,
        narrative: `SGST @ 9% on ${vendorName} purchase`,
        running_balance: null
      });
    }

    // 4. IGST Entry (if applicable - inter-state)
    if (isIGST > 0) {
      entries.push({
        date: dateFormatted,
        particulars: 'IGST Input Tax Credit A/c',
        debit: parseFloat(isIGST) || 0,
        credit: null,
        folio: `INV-${invoiceNumber}`,
        narrative: `IGST @ 18% on ${vendorName} purchase`,
        running_balance: null
      });
    }

    // 5. TDS Entry (if applicable)
    if (tdsAmount > 0) {
      entries.push({
        date: dateFormatted,
        particulars: 'TDS Payable A/c',
        debit: parseFloat(tdsAmount) || 0,
        credit: null,
        folio: `INV-${invoiceNumber}`,
        narrative: `TDS @ applicable rate on ${vendorName}`,
        running_balance: null
      });
    }

    // 6. Vendor Payable Entry (Credit side)
    const creditAmount = parseFloat(totalAmount) || parseFloat(subtotal + (gstAmount || 0)) - (tdsAmount || 0);
    entries.push({
      date: dateFormatted,
      particulars: `${vendorName} A/c (Payable)`,
      debit: null,
      credit: creditAmount,
      folio: `INV-${invoiceNumber}`,
      narrative: `Payable to ${vendorName} - ${invoiceNumber}`,
      running_balance: null
    });

  } else if (documentType === 'credit_invoice') {
    /**
     * Credit Note (Sales Return)
     * Debit: Customer Receivable/Sales Returns A/c
     * Debit: GST Reversal
     * Credit: Revenue Account
     */

    // 1. Sales Returns Entry
    entries.push({
      date: dateFormatted,
      particulars: `Sales Returns/Customer Debit A/c`,
      debit: parseFloat(subtotal) || 0,
      credit: null,
      folio: `CR-${invoiceNumber}`,
      narrative: `Credit note return from ${vendorName} - ${invoiceNumber}`,
      running_balance: null
    });

    // 2. GST Reversal - CGST
    if (isCGST > 0) {
      entries.push({
        date: dateFormatted,
        particulars: 'CGST Reversal A/c',
        debit: parseFloat(isCGST) || 0,
        credit: null,
        folio: `CR-${invoiceNumber}`,
        narrative: `CGST reversal on credit note`,
        running_balance: null
      });
    }

    // 3. GST Reversal - SGST
    if (isSGST > 0) {
      entries.push({
        date: dateFormatted,
        particulars: 'SGST Reversal A/c',
        debit: parseFloat(isSGST) || 0,
        credit: null,
        folio: `CR-${invoiceNumber}`,
        narrative: `SGST reversal on credit note`,
        running_balance: null
      });
    }

    // 4. Revenue/Sales Account Credit
    entries.push({
      date: dateFormatted,
      particulars: `${category || 'Sales'} Revenue A/c`,
      debit: null,
      credit: parseFloat(subtotal) || 0,
      folio: `CR-${invoiceNumber}`,
      narrative: `Sales credit note - ${invoiceNumber}`,
      running_balance: null
    });

    // 5. Receivable Account Credit
    const creditAmount = parseFloat(totalAmount) || parseFloat(subtotal + (gstAmount || 0));
    entries.push({
      date: dateFormatted,
      particulars: `${vendorName} A/c (Receivable)`,
      debit: null,
      credit: creditAmount,
      folio: `CR-${invoiceNumber}`,
      narrative: `Receivable reversal from ${vendorName}`,
      running_balance: null
    });

  } else if (documentType === 'bank_statement') {
    /**
     * Bank Statement Entry
     * Debit/Credit: Bank A/c
     * Debit/Credit: Corresponding Account
     */

    // 1. Bank Account Entry
    const isCredit = totalAmount > 0;
    entries.push({
      date: dateFormatted,
      particulars: 'Bank A/c',
      debit: isCredit ? parseFloat(totalAmount) : null,
      credit: isCredit ? null : parseFloat(totalAmount),
      folio: invoiceNumber,
      narrative: `Bank transaction - ${vendorName || 'Bank Statement'}`,
      running_balance: null
    });

    // 2. Corresponding Entry (contra account)
    entries.push({
      date: dateFormatted,
      particulars: `${category || 'Unclassified'} A/c`,
      debit: isCredit ? null : parseFloat(totalAmount),
      credit: isCredit ? parseFloat(totalAmount) : null,
      folio: invoiceNumber,
      narrative: `Reconciliation entry - ${invoiceNumber}`,
      running_balance: null
    });
  }

  return entries;
};

/**
 * Calculate running balance for a series of ledger entries
 */
export const calculateRunningBalance = (entries) => {
  let balance = 0;
  return entries.map((entry) => {
    const debitAmount = entry.debit || 0;
    const creditAmount = entry.credit || 0;
    balance = balance + debitAmount - creditAmount;
    return {
      ...entry,
      running_balance: balance
    };
  });
};

/**
 * Generate accounting summary for display
 */
export const generateAccountingSummary = (invoice) => {
  const { invoiceNumber, vendorName, date, subtotal, gstAmount = 0, tdsAmount = 0, totalAmount } = invoice;

  const cgst = gstAmount ? gstAmount / 2 : 0;
  const sgst = gstAmount ? gstAmount / 2 : 0;

  return {
    documentType: invoice.documentType || 'invoice',
    invoiceNumber: invoiceNumber,
    vendorName: vendorName,
    date: date,
    taxableAmount: parseFloat(subtotal) || 0,
    gstRate: gstAmount ? '18%' : '0%',
    cgst: parseFloat(cgst) || 0,
    sgst: parseFloat(sgst) || 0,
    igst: 0,
    tdsSection: '194I', // Example section - would be dynamic
    tdsRate: tdsAmount ? '2%' : '0%',
    tdsAmount: parseFloat(tdsAmount) || 0,
    tdsBase: parseFloat(subtotal) || 0,
    netPayable: parseFloat(totalAmount) || 0,
    reconciliationStatus: 'Pending',
    complianceStatus: 'Verified'
  };
};
