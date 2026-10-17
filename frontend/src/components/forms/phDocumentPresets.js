// Common Philippine pre-employment documents used as one-tap job requirements.
// Each entry becomes a file-upload requirement on the provider's job listing.
export const phDocumentGroups = [
  {
    label: 'Identity & clearances',
    documents: [
      { title: 'PSA Birth Certificate', description: 'Upload a clear copy of your PSA/NSO-issued birth certificate.' },
      { title: 'NBI Clearance', description: 'Upload a valid NBI clearance issued within the last 6 months.' },
      { title: 'Police Clearance', description: 'Upload a valid police clearance from the PNP or your local station.' },
      { title: 'Barangay Clearance', description: 'Upload a barangay clearance issued within the last 6 months.' },
      { title: 'Government-issued ID', description: "Upload a valid government ID (driver's license, passport, UMID, or national ID)." },
      { title: 'Medical Certificate', description: 'Upload a medical certificate issued within the last 6 months.' },
      { title: 'Drug Test Result', description: 'Upload a recent drug test result from an accredited facility.' },
    ],
  },
  {
    label: 'Government numbers',
    documents: [
      { title: 'SSS E-1 Form / ID', description: 'Upload your SSS E-1 form or SSS ID.' },
      { title: 'PhilHealth MDR / ID', description: 'Upload your PhilHealth Member Data Record (MDR) or ID.' },
      { title: 'Pag-IBIG MID / ID', description: 'Upload your Pag-IBIG Member ID (MID) or loyalty card.' },
      { title: 'TIN ID / BIR Form 1902', description: 'Upload your TIN ID or BIR Form 1902.' },
    ],
  },
  {
    label: 'Employment & education',
    documents: [
      { title: 'Resume / CV', description: 'Upload an updated resume or curriculum vitae.' },
      { title: 'Certificate of Employment (COE)', description: 'Upload a certificate of employment from your previous employer.' },
      { title: 'Diploma / Transcript of Records', description: 'Upload your diploma or transcript of records (TOR).' },
    ],
  },
];

// Flat list for lookups (e.g. the "standard set" quick action).
export const phDocumentPresets = phDocumentGroups.flatMap((group) => group.documents);

// The starter set added by the "Add standard requirements" button.
export const standardPhDocumentTitles = [
  'PSA Birth Certificate',
  'NBI Clearance',
  'Police Clearance',
  'Barangay Clearance',
  'Resume / CV',
];
