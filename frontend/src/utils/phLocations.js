// Philippine location data used for location inputs, autocomplete suggestions,
// and map bounds. Everything here is limited to the Philippines so forms never
// accept an address outside the country.

export const PH_CENTER = { latitude: 12.8797, longitude: 121.774 };
export const PH_DEFAULT_ZOOM = 6;
export const PH_BOUNDS = [[4.5, 116.9], [21.5, 126.7]];

// Region -> province -> [cities / municipalities]
const PH_REGIONS = {
  'Metro Manila': {
    NCR: [
      'Caloocan', 'Las Pinas', 'Makati', 'Malabon', 'Manila', 'Marikina', 'Mandaluyong', 'Muntinlupa',
      'Navotas', 'Paranaque', 'Pasay', 'Pasig', 'Pateros', 'Quezon City', 'San Juan', 'Taguig', 'Valenzuela',
    ],
  },
  'Ilocos Region': {
    'Ilocos Norte': ['Laoag', 'Batac', 'Burgos', 'Currimao', 'Dingras', 'Marcos', 'Paoay', 'Pasuquin', 'Piddig', 'Sarrat', 'Vintar'],
    'Ilocos Sur': ['Vigan', 'Candon', 'Bantay', 'Baternion', 'Cabugao', 'Carmona', 'Casigan', 'Cervantes', 'Galiano', 'Gregorio Ordinales', 'Magsasaka', 'Nabuat', 'Narvacan', 'Salcedo', 'San Agustin', 'San Ildefonso', 'Santa Catalina', 'Santa Maria', 'Tayug', 'Villa Vista'],
    'La Union': ['San Fernando', 'Agoo', 'Bacnotan', 'Bagulin', 'Balaoan', 'Bangar', 'Bauang', 'Burgos', 'Caba', 'Luna', 'Pugo', 'Rosario', 'San Gabriel', 'Santol', 'Sudipen', 'Tubao'],
    'Pangasinan': [
      'Alaminos City', 'Dagupan City', 'San Carlos City', 'Urdaneta City',
      'Agno', 'Aguilar', 'Alcala', 'Anda', 'Asingan', 'Balungao', 'Bani', 'Basista',
      'Bautista', 'Bayambang', 'Binalonan', 'Binmaley', 'Bolinao', 'Bugallon', 'Burgos',
      'Calasiao', 'Dasol', 'Infanta', 'Laoac', 'Labrador', 'Lingayen', 'Mabini',
      'Malasiqui', 'Manaoag', 'Mangaldan', 'Mangatarem', 'Mapandan', 'Natividad',
      'Pozorrubio', 'Rosales', 'San Fabian', 'San Jacinto', 'San Manuel', 'San Nicolas',
      'San Quintin', 'Santa Barbara', 'Santa Maria', 'Santo Tomas', 'Sison', 'Sual',
      'Tayug', 'Umingan', 'Urbiztondo', 'Villasis',
    ],
  },
  'Cagayan Valley': {
    Batanes: ['Basco', 'Ivana', 'Itbayat', 'Mahfid', 'Sapi', 'Tayug'],
    Cagayan: ['Tuguegarao', 'Agoo', 'Alcala', 'Allacapan', 'Amulung', 'Aparri', 'Ballesteros', 'Bannigan', 'Bauko', 'Bayamban', 'Cabalangan', 'Calayan', 'Camalaniugan', 'Claveria', 'Concepcion', 'Divilacan', 'Dupax del Norte', 'Dupax del Sur', 'Enrile', 'Gattaran', 'Gonzaga', 'Igualada', 'Lal-lo', 'Lope', 'Maddela', 'Masapinto', 'Mauya', 'Mesa', 'Nagtipunan', 'Penablanca', 'Piat', 'Rizal', 'Sanchez-Mira', 'Santa Isabel', 'Santo Nino', 'Solano', 'Tabuk', 'Tumauini'],
    Isabela: ['Ilagan', 'Cauayan', 'Santiago', 'Cabagan', 'Cordon', 'Delfin Albano', 'Dinapigue', 'Divilacan', 'Echague', 'Gamu', 'Jones', 'Maconacon', 'Maguila', 'Malo', 'Naguilian', 'Palayan', 'Quezon', 'Roxas', 'San Agustin', 'San Guillermo', 'San Isidro', 'San Manuel', 'San Mariano', 'Sibuco', 'Tumauini', 'San Pablo', 'Santo Tomas'],
    'Nueva Vizcaya': ['Bayombong', 'Aglipay', 'Almira', 'Ambuklao', 'Baggabag', 'Basqueang', 'Benito Soliven', 'Bombo Ranao', 'Brinas', 'Budyong', 'Calumpit', 'Dupax del Norte', 'Esmeralda', 'Gutad', 'Kaayan', 'Maddela', 'Magsaysay', 'Malinao', 'Palanas', 'Santa Fe', 'Solano', 'Villa Flores', 'Youngs'],
    Quirino: ['Aglipay', 'Cabagatan', 'Diffun', 'Maddela', 'Nagtipunan', 'Sagpatay', 'Saud'],
  },
  'Central Luzon': {
    Aurora: ['Baler', 'Casiguran', 'Dialect', 'Dinalupihan', 'Dipangit', 'Maria Aurora', 'San Luis'],
    Bataan: ['Balanga', 'Bagac', 'Dinalupihan', 'Heros', 'Limay', 'Mariveles', 'Orani', 'Olongapo', 'Pilar', 'San Marcelino', 'Santa Lim', 'Santo Tomas', 'Sual'],
    Bulacan: ['Malolos', 'Baliwag', 'Bocaue', 'Bulakan', 'Bustos', 'Calumpit', 'Candaba', 'Castillejos', 'Castro', 'Dona Remedios Trinidad', 'Guiguinto', 'Norzagaray', 'Obando', 'Pandi', 'Paombong', 'Plaridel', 'Pulilan', 'San Ildefonso', 'San Miguel', 'Santa Maria', 'San Rafael'],
    'Nueva Ecija': ['Palayan', 'Cabanatuan', 'San Jose City', 'Cuyapo', 'Dona Remedios Trinidad', 'General Tinio', 'Gabaldon', 'Laoag', 'Mariano', 'San Leonardo', 'Santo Tomas', 'Tarlac City', 'Zaragoza'],
    Pampanga: ['San Fernando', 'Angeles', 'Apalit', 'Araulo', 'Candaba', 'Capas', 'Floridablanca', 'Guagua', 'Lubao', 'Mabalacat', 'Macabebe', 'Mexico', 'Minalin', 'Porac', 'San Simon', 'Santa Rita', 'Sasmuan', 'Sau', 'Santo Tomas'],
    Tarlac: ['Tarlac City', 'Camiling', 'Concepcion', 'Gerona', 'La Paz', 'Moncada', 'Paniqui', 'San Jose', 'Santa Maria', 'Victoria', 'Cursao'],
    Zambales: ['Olongapo', 'Botolan', 'Cabangan', 'Candelaria', 'Castillejos', 'Iba', 'Masinloc', 'San Antonio', 'San Felipe', 'San Marcelino', 'Santa Cruz', 'Subic'],
  },
  CALABARZON: {
    Batangas: ['Batangas City', 'Agoo', 'Alitagtag', 'Balete', 'Bauan', 'Calaca', 'Calatagan', 'Cuenca', 'Ibaan', 'Laoag', 'Lemery', 'Lipa', 'Malvar', 'Mabini', 'Nasugbu', 'Noveleta', 'Rosario', 'San Jose', 'San Pablo', 'Santo Tomas', 'Talisay', 'Tanauan', 'Tayabas', 'Tiaong'],
    Cavite: ['Bacoor', 'Cavite City', 'Alfonso', 'Amadeo', 'Carmona', 'Dasmarinas', 'General Emilio Aguinaldo', 'General Mariano Alvarez', 'General Trias', 'Imus', 'Indang', 'Kawit', 'Magallanes', 'Maragondon', 'Mendez', 'Naic', 'Noveleta', 'Rosario', 'Silang', 'Tanza', 'Trece Martires', 'Tremblantes'],
    Laguna: ['Calamba', 'Santa Rosa', 'Binangonan', 'Santa Cruz', 'San Pablo', 'Nagcarlan', 'Los Banos', 'Pangil', 'Alaminos', 'Bay', 'Cabling', 'Canlubang', 'Lumban', 'Mabitac', 'Majayjay', 'Pila', 'Rizal', 'Santo Tomas', 'Victoria'],
    Quezon: ['Lucena', 'Antipolo', 'Caldirong', 'Casiguran', 'Danao', 'Dolores', 'General Luna', 'Infanta', 'Lopez', 'Macalelon', 'Pagbilao', 'Pandan', 'Perez', 'Polillo', 'Sariaya', 'Tiaong', 'Unisan', 'Tayabas', 'Sampaloc'],
    Rizal: ['Antipolo', 'Angono', 'Baras', 'Binangonan', 'Binsa', 'Cabuyugan', 'Cardona', 'Carlos Polistana', 'Mabitac', 'Montalban', 'Morong', 'Nagcarlan', 'Noveleta', 'Pililla', 'Pinto', 'Rodriguez', 'San Mateo', 'Tanay', 'Teresa'],
  },
  MIMAROPA: {
    Marinduque: ['Boac', 'Buenavista', 'Mogpog', 'Montalban', 'Santa Cruz', 'Torrijos'],
    'Mindoro Occidental': ['San Jose', 'Bancal', 'Calapan', 'Mamburao', 'Mangaran', 'Concepcion', 'Lubang'],
    'Mindoro Oriental': ['Calapan', 'Baco', 'Bansal', 'Bacu', 'Victoria', 'Gloria', 'Naujan', 'San Jose', 'Balingasag', 'Bulalacao', 'Orihuela', 'Pinamalayan', 'Socorro'],
    Romblon: ['Romblon', 'Carmona', 'Cagayan', 'Batanes', 'Magdiwang', 'Odioman', 'San Andres', 'Santa Maria', 'San Francisco', 'Lazan'],
  },
  'Bicol Region': {
    Albay: ['Legazpi', 'Daraga', 'Camalig', 'Guinauw', 'Joroa', 'Ligao', 'Libon', 'Oas', 'Pilar', 'Tabaco', 'Tiwi', 'Polangui', 'Malilipot', 'Raposo'],
    'Camarines Norte': ['Daet', 'Basud', 'Capalonga', 'Jose Panganiban', 'Labo', 'Magdiwang', 'Merida', 'Paracale', 'San Antonio', 'San Felipe', 'San Vicente', 'Talisay', 'Vinzon', 'San Lazaro', 'Sicang'],
    'Camarines Sur': ['Naga', 'Iriga', 'Pili', 'Tigaon', 'Bato', 'Bula', 'Canaman', 'Casiguran', 'Del Pilar', 'Lagonoy', 'Milaor', 'Nabituo', 'Pandaon', 'Ramon', 'Sagunto', 'San Vicente', 'Magarao', 'Sirua'],
    Catanduanes: ['Paniqui', 'Pandan', 'San Andres', 'Virac', 'Bagamanoc', 'Caramoan', 'Viga'],
    Masbate: ['Masbate City', 'Aroroy', 'Balud', 'Batuan', 'Caramoran', 'Claveria', 'Esperanza', 'Jazmine', 'Mandaon', 'Montalban', 'San Jacinto', 'San Pascual', 'Santo Tomas', 'Susuang'],
    Sorsogon: ['Sorsogon City', 'Bacon', 'Bulan', 'Gubat', 'Irosan', 'Magallon', 'Matanao', 'Prieto Diaz', 'San Pascual', 'Santa Elena', 'Veruela', 'Villamata', 'Casiguran'],
  },
  'Western Visayas': {
    Aklan: ['Kalibo', 'Altavas', 'Baluan', 'Batan', 'Buruanga', 'Ibajay', 'Lezo', 'Libacao', 'Madalag', 'Makato', 'Malay', 'Nabas', 'New Washington', 'Numancia', 'Tangalan'],
    Antique: ['San Jose de Buenavista', 'Belison', 'Buenavista', 'Hamtic', 'Laua-an', 'Mali-ao', 'Pand-an', 'San Remigio', 'Sibalom', 'Tingib'],
    Capiz: ['Roxas City', 'Capiz', 'Mavez', 'Mambusao', 'Mundat', 'Pontevedra', 'Sinacaban', 'Tanza', 'Villalova'],
    Guimaras: ['Jordan', 'Buenavista', 'Mclain', 'Miraveles', 'San Roque'],
    Iloilo: ['Iloilo City', 'Ajuy', 'Alcalden', 'Avance', 'Bacolod', 'Barotac Viejo', 'Batuan', 'Bingawan', 'Cabatuan', 'Calinog', 'Caramoran', 'Casate', 'Concepcion', 'Dingle', 'Dumangas', 'Estancia', 'Guimaras', 'Igbaras', 'Isabela', 'Jaro', 'Jordan', 'Leones', 'Lobo', 'Mambusao', 'Miagao', 'Milan', 'Nagila', 'New Lucena', 'Oton', 'Pavia', 'Pototan', 'San Dionisio', 'San Joaquin', 'Sara', 'Tansas', 'Tubao'],
    'Negros Occidental': ['Bacolod City', 'Bago City', 'City of Escalante', 'Caningal', 'E.B. Magalona', 'Granada', 'Hinoba-an', 'La Carlota', 'Lucena', 'Manapla', 'Murcia', 'Pavia', 'Pulupandan', 'Sagay City', 'Salvador Benedicto', 'San Carlos City', 'Silay', 'Sicogon', 'Talisay', 'Valladolid', 'Victorias'],
  },
  'Central Visayas': {
    Bohol: ['Tagbilaran City', 'Alburquerque', 'Antequera', 'Baclayon', 'Batuan', 'Bilar', 'Buenavista', 'Calape', 'Carmona', 'Clarin', 'Corazon', 'Cortes', 'Dauis', 'Dimiao', 'Inabanga', 'Jagna', 'Loboc', 'Loon', 'Mabuhay', 'Maribojoc', 'Panglao', 'Pilar', 'San Isidro', 'San Jose', 'Santa Fe', 'Sikat', 'Talon', 'Trinidad', 'Ubay', 'Valencia'],
    Cebu: ['Cebu City', 'Lapu-Lapu City', 'Mandaue City', 'Carcar', 'Consolacion', 'Cordova', 'Danao', 'Getafe', 'Ibanda', 'Liloan', 'Mactan', 'Moalboal', 'Naga', 'Porcelan', 'Sogod', 'Talisay', 'Toledo', 'Bogo'],
    Dumaguete: ['Dumaguete City', 'Ambilog', 'Bacong', 'Badian', 'Baslay', 'Bayog', 'Bogo', 'Buenavista', 'Calinan', 'Dauin', 'Dauis', 'Loboc', 'Mabinay', 'Manjuyod', 'Maria', 'Mati', 'Nabawan', 'New Bohol', 'Pilar', 'San Vicente', 'Siaton', 'Sibulan', 'Siquijor', 'Talisay', 'Valencia'],
    'Negros Oriental': ['Dumaguete City', 'Bacong', 'Bindang', 'Bogo', 'Valencia', 'Guiljuran', 'Ajuy', 'Aloguinsan', 'Alcala', 'Alegria', 'Amlan', 'Ayog', 'Bais', 'Balabac', 'Bantayan', 'Basil', 'Bayabas', 'Bontoc', 'Buan', 'Cancabalong'],
    Siquijor: ['Lazi', 'Cang-alwang', 'Dapitan', 'Dinagat', 'Luna', 'Maria'],
  },
  'Eastern Visayas': {
    Biliran: ['Naval', 'Almeria', 'Bacubac', 'Calainan', 'Culaba', 'Kawayan', 'Maripipi', 'San Francisco'],
    'Eastern Samar': ['Borongan', 'Arteche', 'Balangiga', 'Can-avid', 'Catbalogan', 'Doroteo', 'General MacArthur', 'Guitart', 'Llorente', 'Maydolo', 'Mercedes', 'Oras', 'Padada', 'Salcedo', 'San Isidro', 'San Jorge', 'Santa Maria', 'Sulat', 'Taft'],
    Leyte: ['Tacloban City', 'Ormoc City', 'Baybay City', 'Abuyog', 'Alangasian', 'Almeria', 'Baranquillo', 'Bato', 'Bayog', 'Bontoc', 'Burauen', 'Calubog', 'Candijay', 'Can-avid', 'Casilda', 'Carmona', 'Cebu', 'Cordova', 'Dagohoy', 'Guindaras', 'Inabanga', 'Jaro', 'Kananga', 'Kilubo', 'La Paz', 'Leyte', 'Libagon', 'Lobo', 'Mahayag', 'Merida', 'Mobo', 'Pastrana', 'Pintado', 'Palo', 'Talibon', 'Tanuan', 'Tibon', 'Villalba'],
    'Northern Samar': ['Catarman', 'Allen', 'Basi', 'Biringan', 'Borongan', 'Capul', 'Caramoran', 'Cataogan', 'Del Norte', 'Gabler', 'Guadalupe', 'Labang', 'La Libertad', 'Llanera', 'Magsaysay', 'Mambajao', 'Mandanau', 'Moncada', 'Ora', 'Pambujan', 'Pandan', 'Pangibilan', 'Picado', 'San Isidro', 'San Roque', 'San Vicente', 'Sanjuan', 'Santo Tomas', 'Tarangnan', 'Villanueva'],
    Samar: ['Catbalogan', 'Almeria', 'Basey', 'Biri', 'Buenavista', 'Calbiga', 'Concepcion', 'Corazon', 'Gandara', 'Guinlgang', 'Hinugayan', 'Matanao', 'Matalino', 'Merida', 'Parang', 'Patroa', 'Pena', 'Polan', 'Talofan', 'Tawi-Tawi', 'Villareal'],
  },
  'Northern Mindanao': {
    Bukidnon: ['Malaybalay City', 'Cabinda', 'Bacolod', 'Cagayan de Oro', 'Impasugong', 'Lantapan', 'Manolo Fortich', 'Maramag', 'Quezon', 'Sumilao', 'Talakag', 'Valencia City', 'Kibawe'],
    Camiguin: ['Mambajao', 'Catarman', 'Kiman'],
    'Lanao del Norte': ['Tubod', 'Baroy', 'Balingasag', 'Kapatagan', 'Lala', 'Linamon', 'Maigo', 'Matungao', 'Nunungan', 'Ozamiz', 'Pantao Ragat', 'Pantar', 'Poona Piagapo', 'Sao Llorente', 'Salug', 'Sindangan', 'Laguindana'],
    'Lanao del Sur': ['Marawi', 'Bacampagan', 'Balingasag', 'Ditsaan-Ramain', 'Masiu', 'Mulun', 'Piagapo', 'Piparaco', 'Poona Piagapo', 'Sagui', 'Sampagar', 'Shariff Saydona Mustapha', 'Sultan sa Barongis', 'Tantag', 'Tapole'],
    'Misamis Occidental': ['Oroquieta City', 'Calamba', 'Concepcion', 'Dumingag', 'Lala', 'Loreto', 'Mambajao', 'Ozamiz', 'Panaon', 'Plaridel', 'Sapang Dalaga', 'Sicogon', 'Sinacaban', 'Tudela', 'Baliangao'],
    'Misamis Oriental': ['Cagayan de Oro City', 'Aledo', 'Balingasag', 'Baliangao', 'Bontoc', 'Claveria', 'Gingoog', 'Jasaan', 'Kalingalan', 'Laguindana', 'Medina', 'Naval', 'Poblacion', 'Salay', 'Sagay', 'Santo Nino', 'Villanueva', 'Talisay'],
  },
  'Davao Region': {
    'Davao del Norte': ['Tagum City', 'Carmen', 'Ising', 'Kapalong', 'New Corella', 'San Isidro', 'Santo Tomas', 'Talaingod', 'Bansalan', 'Mawab', 'San Fernando', 'Tarragona'],
    'Davao del Sur': ['Digos City', 'Padada', 'Bansalan', 'Kiblawan', 'Mawab', 'Santa Cruz', 'Sulop', 'Malalag'],
    'Davao Occidental': ['Don Marcelino', 'Haggit', 'Jose Abad Santos', 'Malita', 'Sarangani', 'Santa Maria'],
    'Davao Oriental': ['Mati City', 'Banaybanay', 'Cateel', 'Governor Generoso', 'Lupon', 'San Isidro', 'Tarragona', 'Baganga', 'Caraga'],
  },
  'SOCCSKSARGEN': {
    Cotabato: ['Cotabato City', 'Batu', 'Buluan', 'Datu Piang', 'Datu Saudi-Ampatuan', 'Kidapawan', 'Matanog', 'Pagagawan', 'Parang', 'Pikit', 'Shariff Kabunsuan', 'Talayan'],
    Sarangani: ['Alabel', 'Bulan', 'Kiadtawan', 'Sarangani', 'Tampakan'],
    'South Cotabato': ['Koronadal City', 'Bacu', 'Banta', 'Bolo', 'Bucana', 'Datu Piang', 'Glan', 'Lake Sebu', 'Norala', 'Pikit', 'Tampakan', 'Tantunan', 'Tupi'],
    'Sultan Kudarat': ['Bongao', 'Buluan', 'Datu Saudi-Ampatuan', 'Datu Piang', 'Isabela', 'Kalamaleng', 'Matanog', 'Moro', 'Midsurp', 'Naga', 'Pikit', 'Talayan'],
  },
  Caraga: {
    'Agusan del Norte': ['Butuan City', 'Buenavista', 'Cabadbaran', 'Espiritu Santo', 'La Libertad', 'Poblacion', 'Nasugbu', 'Tubod', 'Kinsay', 'Roxas', 'San Miguel', 'Santiago', 'Atabon'],
    'Agusan del Sur': ['Prosperidad', 'Bayugan', 'Buna', 'Dasol', 'Esperanza', 'La Libertad', 'San Luis', 'Mali-ao', 'San Francisco', 'San Isidro', 'Tarragona', 'Tandag'],
    'Surigao del Norte': ['Surigao City', 'Alegria', 'Bacuag', 'Carrascal', 'Gigaquit', 'Mainit', 'Placer', 'San Francisco', 'Sison', 'Tagana-an', 'Tubod'],
    'Surigao del Sur': ['Tandag', 'Alegria', 'Bacuag', 'Carrascal', 'Cortina', 'Gigaquit', 'Lianga', 'Mainit', 'Placer', 'San Francisco', 'San Isidro', 'Sison', 'Tagana-an', 'Tubod'],
  },
  'Autonomous Region in Muslim Mindanao': {
    Basilan: ['Isabela City', 'Lamitan', 'Aklan', 'Alunan', 'Lantawan', 'Malinao', 'Malungun', 'Parang', 'Siasi', 'Sumilao', 'Tapul'],
    Maguindanao: ['Buluan', 'Parang', 'Shariff Saydona Mustapha', 'Datu Piang', 'Datu Saudi-Ampatuan', 'Matanog'],
    Sulu: ['Jolo', 'Bongao', 'Hadji-fatimah', 'Indanan', 'Kalingalan', 'Luuk', 'Old Panamao', 'Pangutaran', 'Pata', 'Talipao', 'Tapul'],
    'Tawi-Tawi': ['Bongao', 'Pahutut', 'Sanga-Sanga', 'Simandag'],
  },
};

// Flat, searchable list of "City, Province" strings.
const PH_LOCATION_ENTRIES = (() => {
  const entries = [];
  Object.entries(PH_REGIONS).forEach(([region, provinces]) => {
    Object.entries(provinces).forEach(([province, cities]) => {
      cities.forEach((city) => {
        entries.push({ city, province, region, label: `${city}, ${province}` });
      });
    });
  });
  return entries;
})();

// Pangasinan's barangays are included with their municipality/city so repeated
// barangay names stay distinguishable in the shared location picker.
import pangasinanBarangays from './pangasinanBarangays.js';
const PH_PANGASINAN_BARANGAY_ENTRIES = pangasinanBarangays.map(({ name, municipality }) => ({
  kind: 'barangay',
  barangay: name,
  city: municipality,
  municipality,
  province: 'Pangasinan',
  region: 'Ilocos Region',
  label: `${name}, ${municipality}, Pangasinan`,
}));

export const PH_PROVINCES = [...new Set(PH_LOCATION_ENTRIES.map((entry) => entry.province))].sort((a, b) => a.localeCompare(b));

export const PH_CITIES = [...new Set(PH_LOCATION_ENTRIES.map((entry) => entry.city))].sort((a, b) => a.localeCompare(b));

export const PH_LOCATIONS = PH_LOCATION_ENTRIES
  .map((entry) => entry.label)
  .sort((a, b) => a.localeCompare(b));

export const isPhilippineLocation = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return false;
  return PH_LOCATION_ENTRIES.some((entry) => (
    entry.city.toLowerCase() === normalized
    || entry.province.toLowerCase() === normalized
    || entry.label.toLowerCase() === normalized
  )) || PH_PANGASINAN_BARANGAY_ENTRIES.some((entry) => (
    entry.label.toLowerCase() === normalized
  ));
};

const PH_ALIASES = {
  qc: 'Quezon City',
  'q.c.': 'Quezon City',
  bgc: 'Taguig',
  'bonifacio global city': 'Taguig',
  cdo: 'Cagayan de Oro',
  csfp: 'San Fernando',
  sjdm: 'San Jose del Monte',
  ncr: 'Manila',
  'metro manila': 'Manila',
  makaty: 'Makati',
  tagig: 'Taguig',
  pasigg: 'Pasig',
  munti: 'Muntinlupa',
  cebuu: 'Cebu City',
  'davao cty': 'Davao City',
};

const levenshtein = (a, b) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

// True when the text points at a Philippine place. A bare city or province is
// enough, but a "City, Province" pair is only accepted when the second part is
// a Philippine province or region, so "Quezon City, Metro Manila" passes while
// "San Francisco, CA" does not.
export const matchesPhilippineLocation = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === 'philippines' || normalized === 'remote (philippines)' || normalized === 'remote') return true;
  if (PH_ALIASES[normalized]) return true;
  if (isPhilippineLocation(normalized)) return true;
  if (PH_PANGASINAN_BARANGAY_ENTRIES.filter((entry) => entry.barangay.toLowerCase() === normalized).length === 1) return true;
  if (findPhilippineLocation(normalized)) return true;
  const parts = normalized.split(',').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return false;
  const city = parts[0];
  const candidates = PH_LOCATION_ENTRIES.filter((entry) => entry.city.toLowerCase() === city);
  if (!candidates.length) {
    return PH_LOCATION_ENTRIES.some((entry) => (
      entry.province.toLowerCase() === city || entry.region.toLowerCase() === city
    ));
  }
  if (parts.length === 1) return true;
  const province = parts[1];
  return candidates.some((entry) => (
    entry.province.toLowerCase() === province || entry.region.toLowerCase() === province
  ));
};

// Returns the best Philippine match for a free-text value, or null when the
// text does not correspond to any known Philippine place.
export const findPhilippineLocation = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;

  // Check aliases first (e.g. QC -> Quezon City)
  if (PH_ALIASES[normalized]) {
    const aliasTarget = PH_ALIASES[normalized].toLowerCase();
    const aliasMatch = PH_LOCATION_ENTRIES.find((entry) => entry.city.toLowerCase() === aliasTarget);
    if (aliasMatch) return aliasMatch;
  }

  const exactBarangay = PH_PANGASINAN_BARANGAY_ENTRIES.find((entry) => entry.label.toLowerCase() === normalized);
  if (exactBarangay) return exactBarangay;
  const sameNameBarangays = PH_PANGASINAN_BARANGAY_ENTRIES.filter((entry) => entry.barangay.toLowerCase() === normalized);
  if (sameNameBarangays.length === 1) return sameNameBarangays[0];

  const exact = PH_LOCATION_ENTRIES.find((entry) => (
    entry.city.toLowerCase() === normalized
    || entry.province.toLowerCase() === normalized
    || entry.label.toLowerCase() === normalized
  ));
  if (exact) return exact;

  const startsWith = PH_LOCATION_ENTRIES.find((entry) => (
    entry.city.toLowerCase().startsWith(normalized)
    || entry.label.toLowerCase().startsWith(normalized)
  ));
  if (startsWith) return startsWith;

  const includes = PH_LOCATION_ENTRIES.find((entry) => (
    entry.city.toLowerCase().includes(normalized)
    || entry.label.toLowerCase().includes(normalized)
  ));
  if (includes) return includes;

  // Fuzzy match for typos (length >= 4 and edit distance <= 2)
  if (normalized.length >= 4) {
    let closest = null;
    let minDistance = 3;
    for (const entry of PH_LOCATION_ENTRIES) {
      const city = entry.city.toLowerCase();
      if (Math.abs(city.length - normalized.length) <= 2) {
        const dist = levenshtein(normalized, city);
        if (dist < minDistance) {
          minDistance = dist;
          closest = entry;
        }
      }
    }
    if (closest) return closest;
  }

  return null;
};

// Type-ahead suggestions for a partially typed Philippine location.
export const suggestPhilippineLocations = (value, limit = 8) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return PH_LOCATIONS.slice(0, limit).map((label) => {
      const [city, ...rest] = label.split(', ');
      return { city, province: rest.join(', '), region: '', label };
    });
  }

  const scored = [];
  const seen = new Set();

  // Alias lookup (e.g. QC -> Quezon City)
  if (PH_ALIASES[normalized]) {
    const aliasTarget = PH_ALIASES[normalized].toLowerCase();
    const aliasMatches = PH_LOCATION_ENTRIES.filter((entry) => entry.city.toLowerCase() === aliasTarget);
    aliasMatches.forEach((entry) => {
      scored.push({ ...entry, score: -1, isAutocorrect: true });
      seen.add(entry.label);
    });
  }

  PH_LOCATION_ENTRIES.forEach((entry) => {
    if (seen.has(entry.label)) return;
    const city = entry.city.toLowerCase();
    const label = entry.label.toLowerCase();
    let score = -1;
    if (city === normalized) score = 0;
    else if (label === normalized) score = 1;
    else if (city.startsWith(normalized)) score = 2;
    else if (label.startsWith(normalized)) score = 3;
    else if (city.includes(normalized)) score = 4;
    else if (label.includes(normalized)) score = 5;
    else if (entry.province.toLowerCase().includes(normalized)) score = 6;
    if (score >= 0) {
      scored.push({ ...entry, score, isAutocorrect: false });
      seen.add(entry.label);
    }
  });

  PH_PANGASINAN_BARANGAY_ENTRIES.forEach((entry) => {
    if (seen.has(entry.label)) return;
    const name = entry.barangay.toLowerCase();
    const label = entry.label.toLowerCase();
    let score = -1;
    if (name === normalized) score = 0;
    else if (label === normalized) score = 1;
    else if (name.startsWith(normalized)) score = 2;
    else if (label.startsWith(normalized)) score = 3;
    else if (name.includes(normalized)) score = 4;
    else if (label.includes(normalized)) score = 5;
    if (score >= 0) {
      scored.push({ ...entry, score, isAutocorrect: false });
      seen.add(entry.label);
    }
  });

  // If few suggestions found, check fuzzy match for typos
  if (scored.length < limit && normalized.length >= 4) {
    PH_LOCATION_ENTRIES.forEach((entry) => {
      if (seen.has(entry.label)) return;
      const city = entry.city.toLowerCase();
      if (Math.abs(city.length - normalized.length) <= 2) {
        const dist = levenshtein(normalized, city);
        if (dist <= 2) {
          scored.push({ ...entry, score: 10 + dist, isAutocorrect: true });
          seen.add(entry.label);
        }
      }
    });
    PH_PANGASINAN_BARANGAY_ENTRIES.forEach((entry) => {
      if (seen.has(entry.label)) return;
      const name = entry.barangay.toLowerCase();
      if (Math.abs(name.length - normalized.length) <= 2) {
        const dist = levenshtein(normalized, name);
        if (dist <= 2) {
          scored.push({ ...entry, score: 10 + dist, isAutocorrect: true });
          seen.add(entry.label);
        }
      }
    });
  }

  return scored
    .sort((a, b) => a.score - b.score || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map(({ score, ...entry }) => entry);
};

// True when a coordinate pair falls inside the Philippine bounding box.
export const isWithinPhilippines = (latitude, longitude) => {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  return lat >= PH_BOUNDS[0][0] && lat <= PH_BOUNDS[1][0] && lon >= PH_BOUNDS[0][1] && lon <= PH_BOUNDS[1][1];
};
