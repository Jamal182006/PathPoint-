// Curated lists of schools, degrees, and fields of study with acronym lookup
// for intelligent autocomplete suggestions in the Education profile section.

export const PHILIPPINE_SCHOOLS = [
  'University of the Philippines Diliman',
  'University of the Philippines Manila',
  'University of the Philippines Los Baños',
  'University of the Philippines Visayas',
  'University of the Philippines Mindanao',
  'University of the Philippines Open University',
  'Ateneo de Manila University',
  'De La Salle University - Manila',
  'De La Salle University - Dasmariñas',
  'University of Santo Tomas',
  'Polytechnic University of the Philippines',
  'Mapúa University',
  'Far Eastern University',
  'Adamson University',
  'University of the East - Manila',
  'University of the East - Caloocan',
  'Technological University of the Philippines',
  'Pamantasan ng Lungsod ng Maynila',
  'San Beda University',
  'Saint Louis University (Baguio)',
  'University of San Carlos (Cebu)',
  'Ateneo de Davao University',
  'Silliman University',
  'Mindanao State University - Iligan Institute of Technology',
  'Mindanao State University - Main (Marawi)',
  'Technological Institute of the Philippines',
  'Centro Escolar University',
  'National University',
  'Lyceum of the Philippines University',
  'Emilio Aguinaldo College',
  'Philippine Normal University',
  'Trinity University of Asia',
  'Rizal Technological University',
  'Bulacan State University',
  'Cavite State University',
  'Batangas State University',
  'Central Luzon State University',
  'Pangasinan State University',
  'Don Mariano Marcos Memorial State University',
  'Tarlac State University',
  'Bicol University',
  'West Visayas State University',
  'University of Southeastern Philippines',
  'Xavier University – Ateneo de Cagayan',
  'Holy Angel University',
  'Colegio de San Juan de Letran',
  'Miriam College',
  'San Sebastian College – Recoletos',
  'AMA University',
  'STI College',
  'FEU Institute of Technology',
  'Asia Pacific College',
  'Enderun Colleges',
  'De La Salle-College of Saint Benilde',
  'San Beda College Alabang',
  'Our Lady of Fatima University',
  'University of Perpetual Help System DALTA',
  'Arellano University',
  'University of the Cordilleras',
  'University of Baguio',
  'University of San Jose - Recoletos (Cebu)',
  'Cebu Institute of Technology – University',
  'University of Southern Mindanao',
  'Notre Dame University (Cotabato)',
];

const SCHOOL_ALIASES = {
  up: 'University of the Philippines Diliman',
  'u.p.': 'University of the Philippines Diliman',
  upd: 'University of the Philippines Diliman',
  upm: 'University of the Philippines Manila',
  uplb: 'University of the Philippines Los Baños',
  ateneo: 'Ateneo de Manila University',
  admu: 'Ateneo de Manila University',
  dlsu: 'De La Salle University - Manila',
  'la salle': 'De La Salle University - Manila',
  ust: 'University of Santo Tomas',
  pup: 'Polytechnic University of the Philippines',
  mapua: 'Mapúa University',
  feu: 'Far Eastern University',
  adamson: 'Adamson University',
  ue: 'University of the East - Manila',
  tup: 'Technological University of the Philippines',
  plm: 'Pamantasan ng Lungsod ng Maynila',
  slu: 'Saint Louis University (Baguio)',
  usc: 'University of San Carlos (Cebu)',
  addu: 'Ateneo de Davao University',
  msu: 'Mindanao State University - Iligan Institute of Technology',
  tip: 'Technological Institute of the Philippines',
  ceu: 'Centro Escolar University',
  nu: 'National University',
  lpu: 'Lyceum of the Philippines University',
  rtu: 'Rizal Technological University',
  bulsu: 'Bulacan State University',
  cvsu: 'Cavite State University',
  bsu: 'Batangas State University',
  clsu: 'Central Luzon State University',
  csb: 'De La Salle-College of Saint Benilde',
  benilde: 'De La Salle-College of Saint Benilde',
};

export const DEGREE_TYPES = [
  'Bachelor of Science (B.S.)',
  'Bachelor of Arts (B.A.)',
  'Bachelor of Science in Information Technology (BSIT)',
  'Bachelor of Science in Computer Science (BSCS)',
  'Bachelor of Science in Business Administration (BSBA)',
  'Bachelor of Science in Accountancy (BSA)',
  'Bachelor of Science in Nursing (BSN)',
  'Bachelor of Science in Civil Engineering (BSCE)',
  'Bachelor of Science in Mechanical Engineering (BSME)',
  'Bachelor of Science in Electrical Engineering (BSEE)',
  'Bachelor of Science in Electronics Engineering (BSECE)',
  'Bachelor of Science in Industrial Engineering (BSIE)',
  'Bachelor of Science in Hospitality Management (BSHM)',
  'Bachelor of Science in Tourism Management (BSTM)',
  'Bachelor of Elementary Education (BEEd)',
  'Bachelor of Secondary Education (BSEd)',
  'Bachelor of Science in Psychology (BS Psych)',
  'Bachelor of Science in Medical Technology (BSMT)',
  'Bachelor of Science in Pharmacy (BS Pharm)',
  'Associate in Computer Technology (ACT)',
  'Associate Degree',
  'Master of Science (M.S.)',
  'Master of Arts (M.A.)',
  'Master of Business Administration (MBA)',
  'Master in Information Technology (MIT)',
  'Doctor of Philosophy (Ph.D.)',
  'Doctor of Medicine (M.D.)',
  'Juris Doctor (J.D.)',
  'Senior High School Diploma (STEM)',
  'Senior High School Diploma (ABM)',
  'Senior High School Diploma (HUMSS)',
  'Senior High School Diploma (GAS)',
  'Senior High School Diploma (TVL Track)',
  'Vocational / Technical Certificate (TESDA NC II)',
  'Vocational / Technical Certificate (TESDA NC III)',
  'Post-Graduate Diploma',
  'High School Diploma',
];

const DEGREE_ALIASES = {
  bs: 'Bachelor of Science (B.S.)',
  'b.s.': 'Bachelor of Science (B.S.)',
  ba: 'Bachelor of Arts (B.A.)',
  'b.a.': 'Bachelor of Arts (B.A.)',
  bsit: 'Bachelor of Science in Information Technology (BSIT)',
  bscs: 'Bachelor of Science in Computer Science (BSCS)',
  bsba: 'Bachelor of Science in Business Administration (BSBA)',
  bsa: 'Bachelor of Science in Accountancy (BSA)',
  bsn: 'Bachelor of Science in Nursing (BSN)',
  bsce: 'Bachelor of Science in Civil Engineering (BSCE)',
  bsme: 'Bachelor of Science in Mechanical Engineering (BSME)',
  bsee: 'Bachelor of Science in Electrical Engineering (BSEE)',
  bsece: 'Bachelor of Science in Electronics Engineering (BSECE)',
  bsie: 'Bachelor of Science in Industrial Engineering (BSIE)',
  bshm: 'Bachelor of Science in Hospitality Management (BSHM)',
  bstm: 'Bachelor of Science in Tourism Management (BSTM)',
  beed: 'Bachelor of Elementary Education (BEEd)',
  bsed: 'Bachelor of Secondary Education (BSEd)',
  mba: 'Master of Business Administration (MBA)',
  ms: 'Master of Science (M.S.)',
  ma: 'Master of Arts (M.A.)',
  mit: 'Master in Information Technology (MIT)',
  phd: 'Doctor of Philosophy (Ph.D.)',
  'ph.d.': 'Doctor of Philosophy (Ph.D.)',
  md: 'Doctor of Medicine (M.D.)',
  jd: 'Juris Doctor (J.D.)',
  tesda: 'Vocational / Technical Certificate (TESDA NC II)',
  shs: 'Senior High School Diploma (STEM)',
};

export const FIELDS_OF_STUDY = [
  'Computer Science',
  'Information Technology',
  'Software Engineering',
  'Information Systems',
  'Cybersecurity & Network Administration',
  'Data Science & Analytics',
  'Web & Mobile Application Development',
  'Business Administration',
  'Accountancy & Financial Management',
  'Marketing Management',
  'Human Resource Development Management',
  'Operations Management',
  'Economics',
  'Entrepreneurship',
  'Nursing',
  'Pharmacy',
  'Medical Laboratory Science / Medical Technology',
  'Physical Therapy',
  'Public Health',
  'Psychology',
  'Civil Engineering',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Electronics & Communications Engineering',
  'Industrial Engineering',
  'Computer Engineering',
  'Chemical Engineering',
  'Architecture',
  'Elementary Education',
  'Secondary Education (Major in English)',
  'Secondary Education (Major in Mathematics)',
  'Secondary Education (Major in Science)',
  'Special Needs Education',
  'Communication & Media Studies',
  'Journalism & Broadcasting',
  'Hospitality & Tourism Management',
  'Culinary Arts & Hotel Management',
  'Criminology & Law Enforcement',
  'Political Science',
  'Public Administration',
  'Biology / Life Sciences',
  'Chemistry',
  'Applied Mathematics & Statistics',
  'Multimedia Arts & Animation',
  'Graphic Design & Fine Arts',
  'English Language & Literature',
];

const FIELD_ALIASES = {
  cs: 'Computer Science',
  it: 'Information Technology',
  se: 'Software Engineering',
  is: 'Information Systems',
  ds: 'Data Science & Analytics',
  ba: 'Business Administration',
  acct: 'Accountancy & Financial Management',
  accounting: 'Accountancy & Financial Management',
  ce: 'Civil Engineering',
  me: 'Mechanical Engineering',
  ee: 'Electrical Engineering',
  ece: 'Electronics & Communications Engineering',
  ie: 'Industrial Engineering',
  cpe: 'Computer Engineering',
  psych: 'Psychology',
  medtech: 'Medical Laboratory Science / Medical Technology',
  nurs: 'Nursing',
  archi: 'Architecture',
  educ: 'Elementary Education',
  crim: 'Criminology & Law Enforcement',
  polsci: 'Political Science',
  comm: 'Communication & Media Studies',
};

/**
 * Filter suggestions for a given input query.
 */
export const suggestEducationItems = (query, type = 'school', limit = 8) => {
  const normalized = String(query || '').trim().toLowerCase();

  let list = PHILIPPINE_SCHOOLS;
  let aliases = SCHOOL_ALIASES;

  if (type === 'degree') {
    list = DEGREE_TYPES;
    aliases = DEGREE_ALIASES;
  } else if (type === 'field') {
    list = FIELDS_OF_STUDY;
    aliases = FIELD_ALIASES;
  }

  if (!normalized) {
    return list.slice(0, limit);
  }

  const results = [];
  const seen = new Set();

  // Alias lookup
  if (aliases[normalized]) {
    const aliasTarget = aliases[normalized];
    results.push(aliasTarget);
    seen.add(aliasTarget.toLowerCase());
  }

  // Exact / startsWith matches
  list.forEach((item) => {
    const lower = item.toLowerCase();
    if (seen.has(lower)) return;
    if (lower === normalized || lower.startsWith(normalized)) {
      results.push(item);
      seen.add(lower);
    }
  });

  // Contains matches
  if (results.length < limit) {
    list.forEach((item) => {
      const lower = item.toLowerCase();
      if (seen.has(lower)) return;
      if (lower.includes(normalized)) {
        results.push(item);
        seen.add(lower);
      }
    });
  }

  return results.slice(0, limit);
};
