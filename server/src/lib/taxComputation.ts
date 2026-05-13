const TAX_RATES = {
    VAT: 0.15,
    NHIL: 0.025,
    GETFUND: 0.025,
    WHT: 0.05,
  };
  
  export interface InvoiceTax {
    subtotal: number;
    vatAmount: number;
    nhilAmount: number;
    getfundAmount: number;
    grossTotal: number;
    whtAmount: number;
    netPayable: number;
  }
  
  function round2(value: number): number {
    return Math.round(value * 100) / 100;
  }
  
  export function computeInvoiceTax(
    subtotal: number,
    applyVAT: boolean,
    applyWHT: boolean
  ): InvoiceTax {
    const vatAmount    = applyVAT ? round2(subtotal * TAX_RATES.VAT)     : 0;
    const nhilAmount   = applyVAT ? round2(subtotal * TAX_RATES.NHIL)    : 0;
    const getfundAmount = applyVAT ? round2(subtotal * TAX_RATES.GETFUND) : 0;
  
    const grossTotal = round2(subtotal + vatAmount + nhilAmount + getfundAmount);
  
    const whtAmount  = applyWHT ? round2(grossTotal * TAX_RATES.WHT) : 0;
    const netPayable = round2(grossTotal - whtAmount);
  
    return { subtotal: round2(subtotal), vatAmount, nhilAmount, getfundAmount, grossTotal, whtAmount, netPayable };
  }