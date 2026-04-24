export const INCOTERMS = [
  'EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP',
] as const;

export const INCOTERM_LABELS: Record<string, string> = {
  EXW: 'Ex Works',
  FCA: 'Free Carrier',
  FAS: 'Free Alongside Ship',
  FOB: 'Free On Board',
  CFR: 'Cost and Freight',
  CIF: 'Cost, Insurance and Freight',
  CPT: 'Carriage Paid To',
  CIP: 'Carriage and Insurance Paid To',
  DAP: 'Delivered at Place',
  DPU: 'Delivered at Place Unloaded',
  DDP: 'Delivered Duty Paid',
};

export interface IncotermInfo {
  sellerResponsibilities: string[];
  buyerResponsibilities: string[];
  riskTransfer: string;
}

export const INCOTERM_DETAILS: Record<string, IncotermInfo> = {
  EXW: {
    sellerResponsibilities: ['Make goods available at premises'],
    buyerResponsibilities: ['All transport costs', 'Export & import clearance', 'Insurance', 'Loading'],
    riskTransfer: "When goods are made available at seller's premises",
  },
  FCA: {
    sellerResponsibilities: ['Deliver goods to carrier', 'Export customs clearance'],
    buyerResponsibilities: ['Main carriage', 'Import customs clearance', 'Insurance'],
    riskTransfer: 'When goods are handed to the carrier',
  },
  FAS: {
    sellerResponsibilities: ['Deliver goods alongside vessel', 'Export customs clearance'],
    buyerResponsibilities: ['Loading on vessel', 'Ocean freight', 'Insurance', 'Import clearance'],
    riskTransfer: 'When goods are placed alongside vessel at port',
  },
  FOB: {
    sellerResponsibilities: ['Deliver goods to port', 'Load goods on vessel', 'Export customs clearance', 'Costs until goods on vessel'],
    buyerResponsibilities: ['Pay ocean freight', 'Pay insurance', 'Import customs clearance', 'Inland transport from port'],
    riskTransfer: "When goods cross ship's rail",
  },
  CFR: {
    sellerResponsibilities: ['Deliver to port', 'Pay ocean freight', 'Export customs clearance'],
    buyerResponsibilities: ['Insurance', 'Import customs clearance', 'Unloading & inland transport'],
    riskTransfer: "When goods cross ship's rail at origin port",
  },
  CIF: {
    sellerResponsibilities: ['Deliver to port', 'Pay ocean freight', 'Pay insurance (min coverage)', 'Export customs clearance'],
    buyerResponsibilities: ['Import customs clearance', 'Unloading & inland transport'],
    riskTransfer: "When goods cross ship's rail at origin port",
  },
  CPT: {
    sellerResponsibilities: ['Deliver to carrier', 'Pay freight to destination', 'Export customs clearance'],
    buyerResponsibilities: ['Insurance', 'Import customs clearance', 'Unloading'],
    riskTransfer: 'When goods are handed to the first carrier',
  },
  CIP: {
    sellerResponsibilities: ['Deliver to carrier', 'Pay freight to destination', 'Pay insurance (all risks)', 'Export customs clearance'],
    buyerResponsibilities: ['Import customs clearance', 'Unloading'],
    riskTransfer: 'When goods are handed to the first carrier',
  },
  DAP: {
    sellerResponsibilities: ['All transport to destination', 'Export customs clearance', 'All costs except import duties'],
    buyerResponsibilities: ['Import customs clearance', 'Unloading at destination'],
    riskTransfer: 'When goods are ready for unloading at destination',
  },
  DPU: {
    sellerResponsibilities: ['All transport to destination', 'Unloading at destination', 'Export customs clearance'],
    buyerResponsibilities: ['Import customs clearance'],
    riskTransfer: 'When goods are unloaded at destination',
  },
  DDP: {
    sellerResponsibilities: ['All transport', 'Export & import customs clearance', 'All duties & taxes', 'Delivery to destination'],
    buyerResponsibilities: ['Unloading at final destination'],
    riskTransfer: 'When goods are delivered at destination, ready for unloading',
  },
};

export const PAYMENT_TERMS_OPTIONS = [
  { value: 'CIA', label: 'Cash in Advance (CIA/Prepayment)' },
  { value: 'TT_30_70', label: 'T/T 30% Advance, 70% Before Shipment' },
  { value: 'TT_50_50', label: 'T/T 50% Advance, 50% on Delivery' },
  { value: 'TT_100', label: 'T/T 100% After Delivery' },
  { value: 'LC_SIGHT', label: 'L/C at Sight' },
  { value: 'LC_30', label: 'L/C 30 Days' },
  { value: 'LC_60', label: 'L/C 60 Days' },
  { value: 'LC_90', label: 'L/C 90 Days' },
  { value: 'DP', label: 'D/P (Documents against Payment)' },
  { value: 'DA', label: 'D/A (Documents against Acceptance)' },
  { value: 'CAD', label: 'CAD (Cash Against Documents)' },
  { value: 'NET_30', label: 'Net 30' },
  { value: 'NET_60', label: 'Net 60' },
  { value: 'NET_90', label: 'Net 90' },
  { value: 'COD', label: 'Cash on Delivery' },
  { value: 'CONSIGNMENT', label: 'Consignment' },
  { value: 'OTHER', label: 'Other' },
] as const;

// Warnings based on incoterm for PO (buyer perspective)
export function getPOIncotermWarning(incoterm: string): string | null {
  if (['FOB', 'FCA', 'EXW', 'FAS'].includes(incoterm)) {
    return '⚠️ You are responsible for arranging freight & insurance. Remember to add shipment costs.';
  }
  return null;
}

// Warnings based on incoterm for SO (seller perspective)
export function getSOIncotermWarning(incoterm: string): string | null {
  if (['CIF', 'CIP', 'DDP', 'DAP', 'DPU', 'CFR', 'CPT'].includes(incoterm)) {
    return '⚠️ You are responsible for freight, insurance, and/or duties. Ensure costs are budgeted.';
  }
  return null;
}
