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

  const rawGst = parseFloat(gstAmount) || 0;
  const rawSubtotal = parseFloat(subtotal) || 0;
  const rawTotal = parseFloat(totalAmount) || rawSubtotal + rawGst;

  const isCGST = rawGst ? Math.round((rawGst / 2) * 100) / 100 : 0;
  const isSGST = rawGst ? Math.round((rawGst - isCGST) * 100) / 100 : 0;
  const isIGST = 0;

  const dateFormatted = date || new Date().toISOString().split('T')[0];

  if (documentType === 'debit_invoice' || documentType === 'invoice') {
    /**
     * Purchase Invoice (Debit Invoice)
     * Debit: Expense Account (Purchase/Service)
     * Debit: Input Tax Credit (CGST/SGST/IGST)
     * Credit: Vendor Payable Account
     */

    const addDebit = (particulars, amount, narrative) => {
      entries.push({
        date: dateFormatted,
        particulars,
        debit: amount,
        credit: null,
        folio: `INV-${invoiceNumber}`,
        narrative,
        running_balance: null
      });
    };

    // 1. Expense Account Entry
    addDebit(`${category || 'Purchases'} A/c`, rawSubtotal, `Purchase from ${vendorName} - ${invoiceNumber}`);

    // 2. CGST Entry (if applicable)
    if (isCGST > 0) {
      addDebit('CGST Input Tax Credit A/c', isCGST, `CGST @ 9% on ${vendorName} purchase`);
    }

    // 3. SGST Entry (if applicable)
    if (isSGST > 0) {
      addDebit('SGST Input Tax Credit A/c', isSGST, `SGST @ 9% on ${vendorName} purchase`);
    }

    // 4. IGST Entry (if applicable - inter-state)
    if (isIGST > 0) {
      addDebit('IGST Input Tax Credit A/c', isIGST, `IGST @ 18% on ${vendorName} purchase`);
    }

    // 5. TDS Entry (if applicable) - shown as credit since TDS is a withheld liability
    const rawTds = parseFloat(tdsAmount) || 0;
    if (rawTds > 0) {
      entries.push({
        date: dateFormatted,
        particulars: 'TDS Payable A/c',
        debit: null,
        credit: rawTds,
        folio: `INV-${invoiceNumber}`,
        narrative: `TDS @ applicable rate on ${vendorName}`,
        running_balance: null
      });
    }

    // 6. Vendor Payable Entry (Credit side) - net of TDS
    const vendorPayable = Math.round((rawSubtotal + rawGst - rawTds) * 100) / 100;
    entries.push({
      date: dateFormatted,
      particulars: `${vendorName} A/c (Payable)`,
      debit: null,
      credit: vendorPayable,
      folio: `INV-${invoiceNumber}`,
      narrative: `Payable to ${vendorName} - ${invoiceNumber}`,
      running_balance: null
    });

  } else if (documentType === 'credit_invoice') {
    /**
     * Credit Note (Sales Return)
     * Debit: Sales Returns A/c
     * Debit: GST Reversal (CGST/SGST)
     * Credit: Customer Receivable A/c
     */

    const rawSubtotal = parseFloat(subtotal) || 0;
    const rawGst = parseFloat(gstAmount) || 0;
    const rawTotal = parseFloat(totalAmount) || rawSubtotal + rawGst;
    const isCGST = rawGst ? Math.round((rawGst / 2) * 100) / 100 : 0;
    const isSGST = rawGst ? Math.round((rawGst - isCGST) * 100) / 100 : 0;

    // 1. Sales Returns Entry (debit to reduce revenue)
    entries.push({
      date: dateFormatted,
      particulars: `Sales Returns/Customer Debit A/c`,
      debit: rawSubtotal,
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
        debit: isCGST,
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
        debit: isSGST,
        credit: null,
        folio: `CR-${invoiceNumber}`,
        narrative: `SGST reversal on credit note`,
        running_balance: null
      });
    }

    // 4. Receivable Account Credit (full credit note amount)
    entries.push({
      date: dateFormatted,
      particulars: `${vendorName} A/c (Receivable)`,
      debit: null,
      credit: rawTotal,
      folio: `CR-${invoiceNumber}`,
      narrative: `Receivable reversal from ${vendorName}`,
      running_balance: null
    });

  } else if (documentType === 'bank_statement') {
    /**
     * Bank Statement Entry
     * For payments (debit in bank terms): Bank A/c Credit, Contra Account Debit
     * For receipts (credit in bank terms): Bank A/c Debit, Contra Account Credit
     */

    const isPayment = Number(invoice.debitAmount) > 0;
    const bankAmount = parseFloat(totalAmount) || 0;

    // 1. Bank Account Entry
    entries.push({
      date: dateFormatted,
      particulars: 'Bank A/c',
      debit: isPayment ? null : bankAmount,
      credit: isPayment ? bankAmount : null,
      folio: invoiceNumber,
      narrative: `Bank transaction - ${vendorName || 'Bank Statement'}`,
      running_balance: null
    });

    // 2. Corresponding Entry (contra account)
    entries.push({
      date: dateFormatted,
      particulars: `${vendorName || category || 'Unclassified'} A/c`,
      debit: isPayment ? bankAmount : null,
      credit: isPayment ? null : bankAmount,
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
  const { invoiceNumber, vendorName, date, subtotal, gstAmount = 0, tdsAmount = 0, totalAmount, gstRate, tdsRate } = invoice;

  const rawGst = parseFloat(gstAmount) || 0;
  const cgst = rawGst ? Math.round((rawGst / 2) * 100) / 100 : 0;
  const sgst = rawGst ? Math.round((rawGst - cgst) * 100) / 100 : 0;

  return {
    documentType: invoice.documentType || 'invoice',
    invoiceNumber: invoiceNumber,
    vendorName: vendorName,
    date: date,
    taxableAmount: parseFloat(subtotal) || 0,
    gstRate: gstRate ? `${gstRate}%` : (rawGst ? '18%' : '0%'),
    cgst,
    sgst,
    igst: 0,
    tdsSection: invoice.tdsSection || '194I',
    tdsRate: tdsRate || (parseFloat(tdsAmount) ? '2%' : '0%'),
    tdsAmount: parseFloat(tdsAmount) || 0,
    tdsBase: parseFloat(subtotal) || 0,
    netPayable: parseFloat(totalAmount) || 0,
    reconciliationStatus: 'Pending',
    complianceStatus: 'Verified'
  };
};
