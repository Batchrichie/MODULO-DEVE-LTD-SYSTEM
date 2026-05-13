/**
 * taxRates.ts — Ghana Revenue Authority (GRA) tax rates
 *
 * IMPORTANT: These are the current statutory rates.
 * When GRA changes a rate, update this file — do NOT hardcode
 * rates anywhere else in the codebase. All tax computation
 * services import from here.
 *
 * In a future phase, these will move to a database config table
 * so the System Admin can update them without a code deployment.
 */

export const TAX_RATES = {
  /** Standard VAT rate — GRA */
  VAT: 0.15,

  /** National Health Insurance Levy */
  NHIL: 0.025,

  /** Ghana Education Trust Fund levy */
  GETFUND: 0.025,

  /**
   * Withholding Tax rate on service payments to resident entities.
   * Note: Different rates apply to different payment types.
   * This is the standard rate for construction/professional services.
   */
  WHT_RESIDENT: 0.05,

  /** WHT on payments to non-resident entities */
  WHT_NON_RESIDENT: 0.075,

  /** Corporate Income Tax — standard rate */
  CIT: 0.25,

  /** SSNIT employee contribution */
  SSNIT_EMPLOYEE: 0.055,

  /** SSNIT employer contribution (Tier 1) */
  SSNIT_EMPLOYER_TIER1: 0.13,

  /**
   * PAYE Tax bands (2024 — annual)
   * Source: GRA Income Tax Act (Act 896), as amended
   */
  PAYE_BANDS: [
    { upTo: 4380,   rate: 0.00  }, // First GHS 4,380 — 0%
    { upTo: 1320,   rate: 0.05  }, // Next GHS 1,320 — 5%
    { upTo: 1560,   rate: 0.10  }, // Next GHS 1,560 — 10%
    { upTo: 38_000, rate: 0.175 }, // Next GHS 38,000 — 17.5%
    { upTo: 54_740, rate: 0.25  }, // Next GHS 54,740 — 25%
    { upTo: Infinity, rate: 0.30 } // Remainder — 30%
  ],
} as const;

export type TaxRates = typeof TAX_RATES;
