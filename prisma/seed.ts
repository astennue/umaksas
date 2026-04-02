import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// ============================================
// EMAIL DUPLICATE TRACKER
// ============================================
const usedEmails = new Set<string>();

function getUniqueEmail(baseEmail: string): string {
  if (!usedEmails.has(baseEmail)) {
    usedEmails.add(baseEmail);
    return baseEmail;
  }
  let counter = 1;
  let email: string;
  do {
    email = baseEmail.replace('@', `+${counter}@`);
    counter++;
  } while (usedEmails.has(email));
  usedEmails.add(email);
  return email;
}

// ============================================
// NAME PARSER
// Parses "LastName, FirstName MiddleInitial." format
// ============================================
function parseName(fullName: string): { lastName: string; firstName: string; middleName?: string } {
  const cleaned = fullName.trim();
  const commaIdx = cleaned.indexOf(',');
  if (commaIdx === -1) {
    const words = cleaned.split(/\s+/);
    return { lastName: words[words.length - 1] || cleaned, firstName: words[0] || '', middleName: words.length > 2 ? words.slice(1, -1).join(' ') : undefined };
  }
  const lastName = cleaned.substring(0, commaIdx).trim();
  const rest = cleaned.substring(commaIdx + 1).trim();
  const nameWords = rest.split(/\s+/);
  const firstName = nameWords[0] || '';
  const middleName = nameWords.length > 1 ? nameWords.slice(1).join(' ') : undefined;
  return { lastName, firstName, middleName };
}

// ============================================
// MAIN SEED FUNCTION
// ============================================
async function main() {
  console.log('🌱 Starting database seed with real Excel data...\n');
  const stats = { users: 0, offices: 0, officers: 0, saProfiles: 0, notifPrefs: 0 };

  // ============================================
  // 1. SUPER ADMIN
  // ============================================
  console.log('📋 Creating Super Admin...');
  const superAdmin = await db.user.create({
    data: {
      email: getUniqueEmail('superadmin@umak.edu.ph'),
      password: 'UMakSAS_SuperAdmin_2026',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  stats.users++;
  console.log(`   ✅ Created: ${superAdmin.email} (SUPER_ADMIN)`);

  // ============================================
  // 2. ADVISER
  // ============================================
  console.log('\n📋 Creating Adviser...');
  const adviser = await db.user.create({
    data: {
      email: getUniqueEmail('adviser@umak.edu.ph'),
      password: 'UMakSAS_Adviser@AbejoAlvin_2026',
      firstName: 'Alvin John Y.',
      lastName: 'Abejo',
      role: 'ADVISER',
      isActive: true,
      officerProfile: {
        create: {
          position: 'ADVISER',
          orderIndex: 0,
        },
      },
    },
  });
  stats.users++;
  stats.officers++;
  console.log(`   ✅ Created: ${adviser.email} (ADVISER)`);

  // ============================================
  // 3. ORGANIZATION OFFICERS
  // ============================================
  console.log('\n📋 Creating Organization Officers...');
  const officerData = [
    { name: 'Reiner Nuevas', position: 'PRESIDENT' as const, order: 1, password: 'UMAKSAS_President@Nuevas_2026', emailBase: 'rnuevas.k12042427@umak.edu.ph' },
    { name: 'Jennylyn S. Pelovello', position: 'VICE_PRESIDENT_INTERNAL' as const, order: 2, password: 'UMAKSAS_VPInternal@Pelovello_2026', emailBase: 'jpelovello.a12344479@umak.edu.ph' },
    { name: 'Alexander C. Cerilla', position: 'VICE_PRESIDENT_EXTERNAL' as const, order: 3, password: 'UMAKSAS_External@Cerilla_2026', emailBase: 'acerilla.k12151773@umak.edu.ph' },
    { name: 'Nicolas Nikolai L. Clavo', position: 'SECRETARY' as const, order: 4, password: 'UMAKSAS_Secretary@Clavo_2026', emailBase: 'nclavo.k12255841@umak.edu.ph' },
    { name: 'John Paulo C. Dingle', position: 'TREASURER' as const, order: 5, password: 'UMAKSAS_Treasurer@Dingle_2026', emailBase: 'jdingle.a12343741@umak.edu.ph' },
    { name: 'Marc Aeron B. Cruz', position: 'AUDITOR' as const, order: 6, password: 'UMAKSAS_Auditor@Cruz_2026', emailBase: 'mcruz.k12148911@umak.edu.ph' },
    { name: 'Daniela M. Martinez', position: 'PUBLIC_RELATION_OFFICER' as const, order: 7, password: 'UMAKSAS_PRO@Martinez_2026', emailBase: 'dmartinez.a12343893@umak.edu.ph' },
  ];

  for (const officer of officerData) {
    const email = getUniqueEmail(officer.emailBase);
    const user = await db.user.create({
      data: {
        email,
        password: officer.password,
        firstName: officer.name,
        role: 'OFFICER',
        isActive: true,
        officerProfile: {
          create: {
            position: officer.position,
            orderIndex: officer.order,
          },
        },
      },
    });
    stats.users++;
    stats.officers++;
    console.log(`   ✅ Created: ${email} (${officer.position})`);
  }

  // ============================================
  // 3b. HRMO
  // ============================================
  console.log('\n📋 Creating HRMO...');
  const hrmo = await db.user.create({
    data: {
      email: getUniqueEmail('hrmo@umak.edu.ph'),
      password: 'UMAKSAS_HRMO@2026',
      firstName: 'Maria',
      lastName: 'Santos',
      role: 'HRMO',
      isActive: true,
    },
  });
  stats.users++;
  console.log(`   ✅ Created: ${hrmo.email} (HRMO)`);

  // ============================================
  // 3c. OFFICE SUPERVISORS (generic office accounts)
  // Created dynamically after offices are built
  // ============================================
  // Supervisors will be created in Step 4b after offices

  // ============================================
  // 4. STUDENT ASSISTANTS - FROM EXCEL DATA
  // ============================================
  console.log('\n📋 Creating Offices and Student Assistants from processed Excel data...');

  interface SADataEntry {
    name: string;
    studentNumber: string;
    college: string;
    program: string;
    umakEmail: string;
    contactNumber: string;
    personalEmail: string;
    dateOfBirth: string;
    age: number;
    sex: string;
    courtesyTitle: string;
    office: string;
    officeEmail: string | null;
    officeCode: string;
  }

  const saData: SADataEntry[] = [
    { name: 'Millan, Apolinario A.', studentNumber: 'K12255548', college: 'CHK', program: 'Bachelor of Science in Exercise and Sports Science Major in Fitness and Sports Science', umakEmail: 'amillan.k12255548@umak.edu.ph', contactNumber: '09695603317', personalEmail: 'apolinariomillanac7@gmail.com', dateOfBirth: '2006-07-01', age: 19, sex: 'Male', courtesyTitle: 'Mr.', office: 'Center for Data Protection and Records Management', officeEmail: 'dprms@umak.edu.ph', officeCode: 'CDPRM' },
    { name: 'Cadena, Erin Isabella R.', studentNumber: 'K12255463', college: 'CITE', program: 'Bachelor in Secondary Education Major in Mathematics', umakEmail: 'ecadena.k12255463@umak.edu.ph', contactNumber: '09649628847', personalEmail: 'erinisabellac@gmail.com', dateOfBirth: '2005-08-24', age: 20, sex: 'Female', courtesyTitle: 'Ms.', office: 'Library Learning Commons – School of Law', officeEmail: 'sollibrary@umak.edu.ph', officeCode: 'SOL Library' },
    { name: 'Aquino, Precious Anne M.', studentNumber: 'A12446971', college: 'IAD', program: 'Associate in Customer Service Communication', umakEmail: 'paquino.6971@umak.edu.ph', contactNumber: '09771661251', personalEmail: 'preciousanne.aquino18@gmail.com', dateOfBirth: '2005-04-10', age: 20, sex: 'Female', courtesyTitle: 'Ms.', office: 'Center for International and Global Affairs', officeEmail: 'ciga@umak.edu.ph', officeCode: 'CIGA' },
    { name: 'Vinluan, Christine Mae G.', studentNumber: 'I-BCSAD', college: 'CCIS', program: 'Bachelor of Science in Computer Science', umakEmail: 'christine.vinluan@umak.edu.ph', contactNumber: '09292257118', personalEmail: 'vinluanchristianmae@gmail.com', dateOfBirth: '2004-04-30', age: 22, sex: 'Female', courtesyTitle: 'Ms.', office: 'Supply and Property Management Office', officeEmail: 'spmo@umak.edu.ph', officeCode: 'SPMO' },
    { name: 'Lalic, Imelda M.', studentNumber: 'A12344128', college: 'CBFS', program: 'Bachelor of Science in Office Administration', umakEmail: 'ilalic.a12344128@umak.edu.ph', contactNumber: '09774496133', personalEmail: 'imeldalalic5@gmail.com', dateOfBirth: '2004-12-09', age: 21, sex: 'Female', courtesyTitle: 'Ms.', office: 'Office of the VP for Planning and Research', officeEmail: 'ovppr@umak.edu.ph', officeCode: 'OVPPR' },
    { name: 'Villar, Jorge Steven', studentNumber: 'A12448856', college: 'IDEM', program: 'Disaster and Emergency Management', umakEmail: 'jvillar.a12448856@umak.edu.ph', contactNumber: '09000000001', personalEmail: 'jvillar@umak.edu.ph', dateOfBirth: '2004-01-01', age: 21, sex: 'Male', courtesyTitle: 'Mr.', office: 'Institute for Disaster and Emergency Management', officeEmail: 'idem@umak.edu.ph', officeCode: 'IDEM' },
    { name: 'Navarro, Henrie E.', studentNumber: 'K12154124', college: 'CHK', program: 'Exercise and Sports Science', umakEmail: 'hnavarro.k12154124@umak.edu.ph', contactNumber: '09000000002', personalEmail: 'hnavarro@umak.edu.ph', dateOfBirth: '2004-01-01', age: 21, sex: 'Male', courtesyTitle: 'Mr.', office: 'University Facilities Management Office', officeEmail: 'ufmo@umak.edu.ph', officeCode: 'UFMO' },
    { name: 'Alba, Candice Kim E.', studentNumber: 'A12344115', college: 'CBFS', program: 'Business and Financial Sciences', umakEmail: 'calba.a12344115@umak.edu.ph', contactNumber: '09000000003', personalEmail: 'calba@umak.edu.ph', dateOfBirth: '2004-01-01', age: 21, sex: 'Female', courtesyTitle: 'Ms.', office: 'Center for Linkages and Placement', officeEmail: 'clp@umak.edu.ph', officeCode: 'CLP' },
    { name: 'Dalan, Jester A.', studentNumber: 'K12148865', college: 'CGPP', program: 'Governance and Public Policy', umakEmail: 'jdalan.k12148865@umak.edu.ph', contactNumber: '09000000004', personalEmail: 'jdalan@umak.edu.ph', dateOfBirth: '2004-01-01', age: 21, sex: 'Male', courtesyTitle: 'Mr.', office: 'School of Law', officeEmail: 'schooloflaw@umak.edu.ph', officeCode: 'UMAK SOL' },
    { name: 'Baluya, Kristel Ann D.', studentNumber: 'A12447657', college: 'CBFS', program: 'Business and Financial Sciences', umakEmail: 'kbaluya.a12447657@umak.edu.ph', contactNumber: '09000000005', personalEmail: 'kbaluya@umak.edu.ph', dateOfBirth: '2004-01-01', age: 21, sex: 'Female', courtesyTitle: 'Ms.', office: 'Cash Office', officeEmail: 'cash@umak.edu.ph', officeCode: 'Cash Office' },
    { name: 'Rodriguez, Ralph Christian D.', studentNumber: 'A12240655', college: 'CET', program: 'Engineering Technology', umakEmail: 'rrodriguez.a12240655@umak.edu.ph', contactNumber: '09000000006', personalEmail: 'rrodriguez@umak.edu.ph', dateOfBirth: '2004-01-01', age: 21, sex: 'Male', courtesyTitle: 'Mr.', office: 'Office of the University Registrar', officeEmail: 'registrar@umak.edu.ph', officeCode: 'OUR' },
    { name: 'Mandakawan, Mujahida U.', studentNumber: 'A12447710', college: 'CBFS', program: 'Business and Financial Sciences', umakEmail: 'mmandakawan.a12447710@umak.edu.ph', contactNumber: '09000000007', personalEmail: 'mmandakawan@umak.edu.ph', dateOfBirth: '2004-01-01', age: 20, sex: 'Female', courtesyTitle: 'Ms.', office: 'Institute of Imaging Health Sciences', officeEmail: 'iihs@umak.edu.ph', officeCode: 'IIHS' },
    { name: 'Dupo, Jilian May B.', studentNumber: 'K12257225', college: 'CBFS', program: 'Business and Financial Sciences', umakEmail: 'jdupo.k12257225@umak.edu.ph', contactNumber: '09000000008', personalEmail: 'jdupo@umak.edu.ph', dateOfBirth: '2004-01-01', age: 20, sex: 'Female', courtesyTitle: 'Ms.', office: 'Supply and Property Management Office', officeEmail: 'spmo@umak.edu.ph', officeCode: 'SPMO' },
    { name: 'Samillano, Carleen Z.', studentNumber: 'K12152254', college: 'CCIS', program: 'Computing and Information Sciences', umakEmail: 'csamillano.k12152254@umak.edu.ph', contactNumber: '09000000009', personalEmail: 'csamillano@umak.edu.ph', dateOfBirth: '2004-01-01', age: 21, sex: 'Female', courtesyTitle: 'Ms.', office: 'Office of the VP for Academic Affairs', officeEmail: 'ovpaa@umak.edu.ph', officeCode: 'OVPAA' },
    { name: 'Hubilla, James Gabriel F.', studentNumber: 'K12257664', college: 'CBFS', program: 'Business and Financial Sciences', umakEmail: 'jhubilla.k12257664@umak.edu.ph', contactNumber: '09000000010', personalEmail: 'jhubilla@umak.edu.ph', dateOfBirth: '2004-01-01', age: 20, sex: 'Male', courtesyTitle: 'Mr.', office: 'Library Learning Commons', officeEmail: 'library@umak.edu.ph', officeCode: 'LLC' },
    { name: 'Urdaneta, Mhel Klarenz', studentNumber: 'K12256252', college: 'CCIS', program: 'Computing and Information Sciences', umakEmail: 'murdaneta.k12256252@umak.edu.ph', contactNumber: '09000000011', personalEmail: 'murdaneta@umak.edu.ph', dateOfBirth: '2004-01-01', age: 20, sex: 'Male', courtesyTitle: 'Mr.', office: 'University Library Learning Commons', officeEmail: 'library@umak.edu.ph', officeCode: 'ULLC' },
    { name: 'Lozano, Ma Nathalie C.', studentNumber: 'K12358211', college: 'IAD', program: 'Arts and Design', umakEmail: 'nlozano.k12358211@umak.edu.ph', contactNumber: '09000000012', personalEmail: 'nlozano@umak.edu.ph', dateOfBirth: '2004-01-01', age: 19, sex: 'Female', courtesyTitle: 'Ms.', office: 'Institute of Arts and Design', officeEmail: 'iad@umak.edu.ph', officeCode: 'IAD' },
    { name: 'Pelovello, Jennylyn S.', studentNumber: 'A12344479', college: 'CBFS', program: 'Business and Financial Sciences', umakEmail: 'jpelovello.a12344479@umak.edu.ph', contactNumber: '09000000013', personalEmail: 'jpelovello@umak.edu.ph', dateOfBirth: '2004-01-01', age: 21, sex: 'Female', courtesyTitle: 'Ms.', office: 'OVPSSCD', officeEmail: 'ovpsscd@umak.edu.ph', officeCode: 'OVPSSCD' },
    { name: 'Catalan, Nesery Euenne P.', studentNumber: 'K12043250', college: 'CTHM', program: 'Tourism and Hospitality Management', umakEmail: 'ncatalan.k12043250@umak.edu.ph', contactNumber: '09000000014', personalEmail: 'ncatalan@umak.edu.ph', dateOfBirth: '2004-01-01', age: 22, sex: 'Female', courtesyTitle: 'Ms.', office: 'Medical and Dental Office', officeEmail: 'clinic@umak.edu.ph', officeCode: 'MDO' },
    { name: 'Reyes, Alexsandra C.', studentNumber: 'K12256444', college: 'CTHM', program: 'Tourism and Hospitality Management', umakEmail: 'areyes.k12256444@umak.edu.ph', contactNumber: '09000000015', personalEmail: 'areyes@umak.edu.ph', dateOfBirth: '2004-01-01', age: 20, sex: 'Female', courtesyTitle: 'Ms.', office: 'Human Resource Management Office', officeEmail: 'hrmo@umak.edu.ph', officeCode: 'HRMO' },
    { name: 'Accad, Marwin Mathew Miko M.', studentNumber: 'A12240841', college: 'CTHM', program: 'Tourism and Hospitality Management', umakEmail: 'maccad.a12240841@umak.edu.ph', contactNumber: '09000000016', personalEmail: 'maccad@umak.edu.ph', dateOfBirth: '2004-01-01', age: 22, sex: 'Male', courtesyTitle: 'Mr.', office: 'Office of the University Registrar', officeEmail: 'registrar@umak.edu.ph', officeCode: 'OUR' },
    { name: 'Castillo, Aica Leonhice R.', studentNumber: 'K12255968', college: 'CBFS', program: 'Business and Financial Sciences', umakEmail: 'acastillo.k12255968@umak.edu.ph', contactNumber: '09000000017', personalEmail: 'acastillo@umak.edu.ph', dateOfBirth: '2004-01-01', age: 20, sex: 'Female', courtesyTitle: 'Ms.', office: 'Supply and Property Management Office', officeEmail: 'spmo@umak.edu.ph', officeCode: 'SPMO' },
    { name: 'Panis, Nirissa E.', studentNumber: 'K12151761', college: 'CTHM', program: 'Tourism and Hospitality Management', umakEmail: 'npanis.k12151761@umak.edu.ph', contactNumber: '09000000018', personalEmail: 'npanis@umak.edu.ph', dateOfBirth: '2004-01-01', age: 21, sex: 'Female', courtesyTitle: 'Ms.', office: 'Center for Planning and Development', officeEmail: 'pdc@umak.edu.ph', officeCode: 'CFD' },
    { name: 'Tejam, John Kenneth A.', studentNumber: 'K12150196', college: 'CCIS', program: 'Computing and Information Sciences', umakEmail: 'jtejam.k12150196@umak.edu.ph', contactNumber: '09000000019', personalEmail: 'jtejam@umak.edu.ph', dateOfBirth: '2004-01-01', age: 21, sex: 'Male', courtesyTitle: 'Mr.', office: 'College of Computing and Information Sciences', officeEmail: 'ccis@umak.edu.ph', officeCode: 'CCIS' },
    { name: 'Tulio, Sherry Julianne E.', studentNumber: 'A12447711', college: 'CBFS', program: 'Business and Financial Sciences', umakEmail: 'stulio.a12447711@umak.edu.ph', contactNumber: '09000000020', personalEmail: 'stulio@umak.edu.ph', dateOfBirth: '2004-01-01', age: 20, sex: 'Female', courtesyTitle: 'Ms.', office: 'Accounting Office', officeEmail: 'accounting@umak.edu.ph', officeCode: 'AO' },
    { name: 'Abila, Angela Mae B.', studentNumber: 'K12150235', college: 'CBFS', program: 'Business and Financial Sciences', umakEmail: 'aabilia.k12150235@umak.edu.ph', contactNumber: '09000000021', personalEmail: 'aabilia@umak.edu.ph', dateOfBirth: '2004-01-01', age: 21, sex: 'Female', courtesyTitle: 'Ms.', office: 'Center for Student Formation and Discipline', officeEmail: 'csfd@umak.edu.ph', officeCode: 'CSFD' },
    { name: 'Cuagon, Angel', studentNumber: 'K12149506', college: 'CGPP', program: 'Governance and Public Policy', umakEmail: 'acuagon.k12149506@umak.edu.ph', contactNumber: '09000000022', personalEmail: 'acuagon@umak.edu.ph', dateOfBirth: '2004-01-01', age: 21, sex: 'Male', courtesyTitle: 'Mr.', office: 'General Services Office', officeEmail: 'gso@umak.edu.ph', officeCode: 'GSO' },
    { name: 'Beredo, Krisha Anne C.', studentNumber: 'K12254329', college: 'CBFS', program: 'Business and Financial Sciences', umakEmail: 'kberedo.k12254329@umak.edu.ph', contactNumber: '09000000023', personalEmail: 'kberedo@umak.edu.ph', dateOfBirth: '2004-01-01', age: 20, sex: 'Female', courtesyTitle: 'Ms.', office: 'College of Business and Financial Sciences', officeEmail: 'cbfs@umak.edu.ph', officeCode: 'CBFS' },
    { name: 'Martinez, Daniela M.', studentNumber: 'A12343893', college: 'CBFS', program: 'Business and Financial Sciences', umakEmail: 'dmartinez.a12343893@umak.edu.ph', contactNumber: '09000000024', personalEmail: 'dmartinez@umak.edu.ph', dateOfBirth: '2004-01-01', age: 21, sex: 'Female', courtesyTitle: 'Ms.', office: 'Institute of Technical Education and Skills Training', officeEmail: 'itest@umak.edu.ph', officeCode: 'ITEST' },
    { name: 'Omilig, Dimple Ann L.', studentNumber: 'A12343617', college: 'CBFS', program: 'Business and Financial Sciences', umakEmail: 'domilig.a12343617@umak.edu.ph', contactNumber: '09000000025', personalEmail: 'domilig@umak.edu.ph', dateOfBirth: '2004-01-01', age: 21, sex: 'Female', courtesyTitle: 'Ms.', office: 'College of Tourism and Hospitality Management', officeEmail: 'cthm@umak.edu.ph', officeCode: 'CTHM' },
    { name: 'Bendaña, Mark R.', studentNumber: 'A62345008', college: 'IAD', program: 'Arts and Design', umakEmail: 'mbendana.a62345008@umak.edu.ph', contactNumber: '09000000026', personalEmail: 'mbendana@umak.edu.ph', dateOfBirth: '2004-01-01', age: 22, sex: 'Male', courtesyTitle: 'Mr.', office: 'Center for Technology-Based Learning', officeEmail: 'tblhub@umak.edu.ph', officeCode: 'CTBL' },
    { name: 'Tunguia, Chloe Meg L.', studentNumber: 'K12255437', college: 'CBFS', program: 'Business and Financial Sciences', umakEmail: 'ctunguia.k12255437@umak.edu.ph', contactNumber: '09000000027', personalEmail: 'ctunguia@umak.edu.ph', dateOfBirth: '2004-01-01', age: 20, sex: 'Female', courtesyTitle: 'Ms.', office: 'Center for Admission and Scholarship', officeEmail: 'cas@umak.edu.ph', officeCode: 'CAS' },
    { name: 'Saliente, Roseann Joy H.', studentNumber: 'K12358386', college: 'CCIS', program: 'Computing and Information Sciences', umakEmail: 'rsaliente.k12358386@umak.edu.ph', contactNumber: '09000000028', personalEmail: 'rsaliente@umak.edu.ph', dateOfBirth: '2004-01-01', age: 19, sex: 'Female', courtesyTitle: 'Ms.', office: 'Center for Admission and Scholarship', officeEmail: 'cas@umak.edu.ph', officeCode: 'CAS' },
    { name: 'Albano, Krisha Layne S.', studentNumber: 'K12153910', college: 'CBFS', program: 'Business and Financial Sciences', umakEmail: 'kalbano.k12153910@umak.edu.ph', contactNumber: '09000000029', personalEmail: 'kalbano@umak.edu.ph', dateOfBirth: '2004-01-01', age: 21, sex: 'Female', courtesyTitle: 'Ms.', office: 'Center for Quality Management and Development', officeEmail: 'cqmdc@umak.edu.ph', officeCode: 'CQMD' },
    { name: 'Pelaez, Mara Shamer V.', studentNumber: 'A12343657', college: 'CBFS', program: 'Business and Financial Sciences', umakEmail: 'mpelaez.a12343657@umak.edu.ph', contactNumber: '09000000030', personalEmail: 'mpelaez@umak.edu.ph', dateOfBirth: '2004-01-01', age: 21, sex: 'Female', courtesyTitle: 'Ms.', office: 'College of Liberal Arts and Sciences', officeEmail: 'clas@umak.edu.ph', officeCode: 'CLAS' },
    { name: 'Bolisay, Princess Jm M.', studentNumber: 'A12447567', college: 'CBFS', program: 'Business and Financial Sciences', umakEmail: 'pbolisay.a12447567@umak.edu.ph', contactNumber: '09000000031', personalEmail: 'pbolisay@umak.edu.ph', dateOfBirth: '2004-01-01', age: 20, sex: 'Female', courtesyTitle: 'Ms.', office: 'College of Engineering Technology', officeEmail: 'cet@umak.edu.ph', officeCode: 'CET' },
    { name: 'Tagacay, Jane Abigail E.', studentNumber: 'A12343658', college: 'CBFS', program: 'Business and Financial Sciences', umakEmail: 'jtagacay.a12343658@umak.edu.ph', contactNumber: '09000000032', personalEmail: 'jtagacay@umak.edu.ph', dateOfBirth: '2004-01-01', age: 21, sex: 'Female', courtesyTitle: 'Ms.', office: 'Office of the University Registrar', officeEmail: 'registrar@umak.edu.ph', officeCode: 'OUR' },
    { name: 'Soberano, Ralph Christopher P.', studentNumber: 'K12152953', college: 'CCIS', program: 'Computing and Information Sciences', umakEmail: 'rsoberano.k12152953@umak.edu.ph', contactNumber: '09000000033', personalEmail: 'rsoberano@umak.edu.ph', dateOfBirth: '2004-01-01', age: 21, sex: 'Male', courtesyTitle: 'Mr.', office: 'Center for University Research', officeEmail: 'research@umak.edu.ph', officeCode: 'CUR' },
    { name: 'Yumang, Megan Adele M.', studentNumber: 'A12550143', college: 'CTHM', program: 'Tourism and Hospitality Management', umakEmail: 'myumang.a12550143@umak.edu.ph', contactNumber: '09000000034', personalEmail: 'myumang@umak.edu.ph', dateOfBirth: '2004-01-01', age: 19, sex: 'Female', courtesyTitle: 'Ms.', office: 'Center for Linkages and Placement', officeEmail: 'clp@umak.edu.ph', officeCode: 'CLP' },
    { name: 'Manalo, Jamaya Karyl R.', studentNumber: 'K12358267', college: 'CBFS', program: 'Business and Financial Sciences', umakEmail: 'jmanalo.k12358267@umak.edu.ph', contactNumber: '09000000035', personalEmail: 'jmanalo@umak.edu.ph', dateOfBirth: '2004-01-01', age: 19, sex: 'Female', courtesyTitle: 'Ms.', office: 'Institute of Social Work', officeEmail: 'isw@umak.edu.ph', officeCode: 'ISW' },
    { name: 'Tapales, Rexie Ysabel F.', studentNumber: 'A12447893', college: 'CBFS', program: 'Business and Financial Sciences', umakEmail: 'rtapales.a12447893@umak.edu.ph', contactNumber: '09000000036', personalEmail: 'rtapales@umak.edu.ph', dateOfBirth: '2004-01-01', age: 20, sex: 'Female', courtesyTitle: 'Ms.', office: 'Center for Technology Incubation and Enterprise Development', officeEmail: 'bi.expres@umak.edu.ph', officeCode: 'CTIED' },
    { name: 'Fernandez, Sofia Lyka D.', studentNumber: 'A12343802', college: 'CBFS', program: 'Business and Financial Sciences', umakEmail: 'sfernandez.a12343802@umak.edu.ph', contactNumber: '09000000037', personalEmail: 'sfernandez@umak.edu.ph', dateOfBirth: '2004-01-01', age: 21, sex: 'Female', courtesyTitle: 'Ms.', office: 'Center for Guidance and Counseling Services', officeEmail: 'gcc@umak.edu.ph', officeCode: 'CGCS' },
    { name: 'Tapia, Fiona Sophia Kirsten A.', studentNumber: 'A12552516', college: 'IAD', program: 'Arts and Design', umakEmail: 'ftapia.a12552516@umak.edu.ph', contactNumber: '09000000038', personalEmail: 'ftapia@umak.edu.ph', dateOfBirth: '2004-01-01', age: 18, sex: 'Female', courtesyTitle: 'Ms.', office: 'Center for Technology Incubation and Enterprise Development', officeEmail: 'bi.expres@umak.edu.ph', officeCode: 'CTIED' },
    { name: 'Acohon, Rea Jane', studentNumber: 'K12152262', college: 'CBFS', program: 'Business and Financial Sciences', umakEmail: 'racohon.k12152262@umak.edu.ph', contactNumber: '09000000039', personalEmail: 'racohon@umak.edu.ph', dateOfBirth: '2004-01-01', age: 21, sex: 'Female', courtesyTitle: 'Ms.', office: 'Center for Admission and Scholarship', officeEmail: 'cas@umak.edu.ph', officeCode: 'CAS' },
    { name: 'Andres, Jhayson G.', studentNumber: 'K12256563', college: 'CTHM', program: 'Tourism and Hospitality Management', umakEmail: 'jandres.k12256563@umak.edu.ph', contactNumber: '09000000040', personalEmail: 'jandres@umak.edu.ph', dateOfBirth: '2004-01-01', age: 20, sex: 'Male', courtesyTitle: 'Mr.', office: 'Center for Technology-Based Learning', officeEmail: 'tblhub@umak.edu.ph', officeCode: 'CTBL' },
    { name: 'Digol, Emmaus L.', studentNumber: 'A12240991', college: 'CCIS', program: 'Computing and Information Sciences', umakEmail: 'edigol.a12240991@umak.edu.ph', contactNumber: '09000000041', personalEmail: 'edigol@umak.edu.ph', dateOfBirth: '2004-01-01', age: 22, sex: 'Male', courtesyTitle: 'Mr.', office: 'Office of the University President', officeEmail: 'president@umak.edu.ph', officeCode: 'OUP' },
    { name: 'Nuevas, Reiner', studentNumber: 'K12042427', college: 'CCIS', program: 'Computing and Information Sciences', umakEmail: 'rnuevas.k12042427@umak.edu.ph', contactNumber: '09000000042', personalEmail: 'rnuevas@umak.edu.ph', dateOfBirth: '2004-01-01', age: 22, sex: 'Male', courtesyTitle: 'Mr.', office: 'Center for Student Formation and Discipline', officeEmail: 'csfd@umak.edu.ph', officeCode: 'CSFD' },
    { name: 'Aldea, Jordan F.', studentNumber: 'K12255179', college: 'CCIS', program: 'Computing and Information Sciences', umakEmail: 'jaldea.k12255179@umak.edu.ph', contactNumber: '09000000043', personalEmail: 'jaldea@umak.edu.ph', dateOfBirth: '2004-01-01', age: 20, sex: 'Male', courtesyTitle: 'Mr.', office: 'UMak Research and Extension Center', officeEmail: 'umrec@umak.edu.ph', officeCode: 'UMREC' },
    { name: 'Tabbu, Paul Bryan G.', studentNumber: 'A12550540', college: 'IOA', program: 'Accountancy', umakEmail: 'ptabbu.a12550540@umak.edu.ph', contactNumber: '09000000044', personalEmail: 'ptabbu@umak.edu.ph', dateOfBirth: '2004-01-01', age: 18, sex: 'Male', courtesyTitle: 'Mr.', office: 'Library Learning Commons', officeEmail: 'library@umak.edu.ph', officeCode: 'LLC' },
    { name: 'Madrid, Aaliyah Lheene P.', studentNumber: 'K12042691', college: 'CTHM', program: 'Tourism and Hospitality Management', umakEmail: 'amadrid.k12042691@umak.edu.ph', contactNumber: '09000000045', personalEmail: 'amadrid@umak.edu.ph', dateOfBirth: '2004-01-01', age: 22, sex: 'Female', courtesyTitle: 'Ms.', office: 'Medical and Dental Office', officeEmail: 'clinic@umak.edu.ph', officeCode: 'MDO' },
    { name: 'Cerilla, Alexander C.', studentNumber: 'K12151773', college: 'CCIS', program: 'Computing and Information Sciences', umakEmail: 'acerilla.k12151773@umak.edu.ph', contactNumber: '09000000046', personalEmail: 'acerilla@umak.edu.ph', dateOfBirth: '2004-01-01', age: 22, sex: 'Male', courtesyTitle: 'Mr.', office: 'Center for Information Technology', officeEmail: 'cit@umak.edu.ph', officeCode: 'CIT' },
    { name: 'Marayag, Benzaki Y.', studentNumber: 'A12344805', college: 'CITE', program: 'Innovative Teacher Education', umakEmail: 'bmarayag.a12344805@umak.edu.ph', contactNumber: '09000000047', personalEmail: 'bmarayag@umak.edu.ph', dateOfBirth: '2004-01-01', age: 22, sex: 'Male', courtesyTitle: 'Mr.', office: 'OVPSSCD', officeEmail: 'ovpsscd@umak.edu.ph', officeCode: 'OVPSSCD' },
    { name: 'Dingle, John Paulo C.', studentNumber: 'A12343741', college: 'CBFS', program: 'Business and Financial Sciences', umakEmail: 'jdingle.a12343741@umak.edu.ph', contactNumber: '09000000048', personalEmail: 'jdingle@umak.edu.ph', dateOfBirth: '2004-01-01', age: 23, sex: 'Male', courtesyTitle: 'Mr.', office: 'Center for Community Extension and Development', officeEmail: 'communitydevelopment@umak.edu.ph', officeCode: 'CCED' },
    { name: 'Tuason, Danelle Mae C.', studentNumber: 'K12256094', college: 'IDEM', program: 'Disaster and Emergency Management', umakEmail: 'dtuason.k12256094@umak.edu.ph', contactNumber: '09000000049', personalEmail: 'dtuason@umak.edu.ph', dateOfBirth: '2004-01-01', age: 20, sex: 'Female', courtesyTitle: 'Ms.', office: 'Institute for Disaster and Emergency Management', officeEmail: 'idem@umak.edu.ph', officeCode: 'IDEM' },
    { name: 'Clavo, Nicolas Nikolai L.', studentNumber: 'K12255841', college: 'CBFS', program: 'Business and Financial Sciences', umakEmail: 'nclavo.k12255841@umak.edu.ph', contactNumber: '09000000050', personalEmail: 'nclavo@umak.edu.ph', dateOfBirth: '2004-01-01', age: 20, sex: 'Male', courtesyTitle: 'Mr.', office: 'Center for Guidance and Counseling Services', officeEmail: 'gcc@umak.edu.ph', officeCode: 'CGCS' },
    { name: 'Cruz, Marc Aeron B.', studentNumber: 'K12148911', college: 'CCIS', program: 'Computing and Information Sciences', umakEmail: 'mcruz.k12148911@umak.edu.ph', contactNumber: '09000000051', personalEmail: 'mcruz@umak.edu.ph', dateOfBirth: '2004-01-01', age: 22, sex: 'Male', courtesyTitle: 'Mr.', office: 'Center for Student Organizations and Activities', officeEmail: 'csoa@umak.edu.ph', officeCode: 'CSOA' },
    { name: 'Molina, Jan Ezra C.', studentNumber: 'K12254551', college: 'CBFS', program: 'Business and Financial Sciences', umakEmail: 'jmolina.k12254551@umak.edu.ph', contactNumber: '09000000052', personalEmail: 'jmolina@umak.edu.ph', dateOfBirth: '2004-01-01', age: 20, sex: 'Male', courtesyTitle: 'Mr.', office: 'Center for Student Formation and Discipline', officeEmail: null, officeCode: 'CIC' },
    { name: 'Aurelio, Charles Joshua Aranas', studentNumber: 'K12149330', college: 'CCIS', program: 'Computing and Information Sciences', umakEmail: 'caurelio.k12149330@umak.edu.ph', contactNumber: '09000000053', personalEmail: 'caurelio@umak.edu.ph', dateOfBirth: '2004-01-01', age: 22, sex: 'Male', courtesyTitle: 'Mr.', office: 'Information and Communications Office', officeEmail: null, officeCode: 'IMC' },
  ];

  // --- Step 4a: Create unique offices ---
  const officeMap = new Map<string, { name: string; code: string; email: string }>();

  for (const sa of saData) {
    if (!officeMap.has(sa.office)) {
      officeMap.set(sa.office, {
        name: sa.office,
        code: sa.officeCode,
        email: sa.officeEmail || '',
      });
    }
  }

  console.log(`\n   🏢 Creating ${officeMap.size} unique offices...`);
  const officeIdMap = new Map<string, string>();

  for (const [officeName, officeInfo] of officeMap) {
    try {
      const office = await db.office.create({
        data: {
          name: officeInfo.name,
          code: officeInfo.code,
          email: officeInfo.email,
          isActive: true,
        },
      });
      officeIdMap.set(officeName, office.id);
      stats.offices++;
    } catch (error: any) {
      console.log(`   ⚠️  Office "${officeName}" skipped (may already exist): ${error.message}`);
    }
  }
  console.log(`   ✅ Created ${stats.offices} offices`);

  // --- Step 4b: Create Office Supervisor accounts for each office ---
  console.log('\n   👤 Creating Office Supervisor accounts (generic office accounts)...');
  const supervisorCredentials: Array<{ officeName: string; officeCode: string; email: string; password: string }> = [];

  for (const [officeName, officeInfo] of officeMap) {
    // Sanitize code: remove spaces, uppercase for password, lowercase for email
    const cleanCode = officeInfo.code.replace(/\s+/g, '').toUpperCase();
    const emailBase = cleanCode.toLowerCase() + '@umak.edu.ph';
    const password = `UMAKSAS_Sup_${cleanCode}_2026`;

    // Special handling: HRMO office uses the existing HRMO user as its supervisor
    if (cleanCode === 'HRMO') {
      const office = await db.office.findFirst({ where: { code: officeInfo.code } });
      if (office) {
        await db.office.update({
          where: { id: office.id },
          data: { headUserId: hrmo.id },
        });
        supervisorCredentials.push({
          officeName: officeName,
          officeCode: cleanCode,
          email: hrmo.email,
          password: hrmo.password,
        });
        console.log(`   🔗 HRMO Office → linked to existing HRMO user (${hrmo.email})`);
      }
      continue;
    }

    const email = getUniqueEmail(emailBase);
    try {
      const user = await db.user.create({
        data: {
          email,
          password,
          firstName: officeName,
          lastName: 'Office',
          role: 'OFFICE_SUPERVISOR',
          isActive: true,
        },
      });
      stats.users++;

      // Link supervisor to office
      const office = await db.office.findFirst({ where: { code: officeInfo.code } });
      if (office) {
        await db.office.update({
          where: { id: office.id },
          data: { headUserId: user.id },
        });
      }

      supervisorCredentials.push({
        officeName: officeName,
        officeCode: cleanCode,
        email,
        password,
      });
      console.log(`   ✅ ${cleanCode}: ${email} (OFFICE_SUPERVISOR)`);
    } catch (error: any) {
      console.log(`   ❌ Error creating supervisor for ${cleanCode}: ${error.message}`);
    }
  }

  // Print supervisor credentials summary
  console.log('\n   📋 OFFICE SUPERVISOR CREDENTIALS:');
  console.log('   ' + '-'.repeat(70));
  for (const sup of supervisorCredentials) {
    console.log(`   ${sup.officeCode.padEnd(15)} │ ${sup.email.padEnd(35)} │ ${sup.password}`);
  }
  console.log('   ' + '-'.repeat(70));

  // --- Step 4c: Create SA Users and Profiles with real data ---
  console.log(`\n   👥 Creating ${saData.length} Student Assistants with real data...`);
  let saCounter = 0;

  for (const sa of saData) {
    const parsed = parseName(sa.name);
    const surname = parsed.lastName;
    const password = `UMAKSA@${surname}_2026`;

    // Use UMak email as primary email
    const email = getUniqueEmail(sa.umakEmail);

    try {
      const officeId = officeIdMap.get(sa.office) || null;

      const user = await db.user.create({
        data: {
          email,
          password,
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          middleName: parsed.middleName,
          role: 'STUDENT_ASSISTANT',
          isActive: true,
          phone: sa.contactNumber || null,
          profile: {
            create: {
              studentNumber: sa.studentNumber || null,
              college: sa.college || null,
              program: sa.program || null,
              status: 'ACTIVE',
              officeId,
              dateOfBirth: sa.dateOfBirth ? new Date(sa.dateOfBirth) : null,
              age: sa.age || null,
              sex: sa.sex || null,
              courtesyTitle: sa.courtesyTitle || null,
              contactNumber: sa.contactNumber || null,
              personalEmail: sa.personalEmail || null,
            },
          },
        },
      });
      stats.users++;
      stats.saProfiles++;
      saCounter++;

      if (saCounter % 10 === 0 || saCounter === saData.length) {
        console.log(`   📝 Progress: ${saCounter}/${saData.length} SAs created`);
      }
    } catch (error: any) {
      console.log(`   ❌ Error creating SA "${sa.name}" (${email}): ${error.message}`);
    }
  }
  console.log(`   ✅ Created ${saCounter} Student Assistants`);

  // ============================================
  // 5. ORG CHART
  // ============================================
  console.log('\n📋 Creating Org Chart...');
  try {
    const orgChart = await db.orgChart.create({
      data: {
        presidentName: 'Dr. Elyxzur C. Ramos',
        presidentTitle: 'University President',
        vpName: 'Mr. Virgilio B. Tabbu',
        vpTitle: 'Vice President for Student Services and Community Development',
        adviserName: 'Mr. Alvin John Y. Abejo',
        adviserTitle: 'UMak SAS Adviser',
      },
    });
    console.log(`   ✅ Created Org Chart: ${orgChart.presidentName}`);
  } catch (error: any) {
    console.log(`   ⚠️  Org Chart skipped (may already exist): ${error.message}`);
  }

  // ============================================
  // 6. SYSTEM SETTINGS
  // ============================================
  console.log('\n📋 Creating System Settings...');
  try {
    const sysSettings = await db.systemSettings.create({
      data: {
        academicYear: '2025-2026',
        currentSemester: '2nd Semester',
        applicationOpen: true,
        siteName: 'UMAK Student Assistant Management System',
      },
    });
    console.log(`   ✅ Created System Settings: AY ${sysSettings.academicYear}`);
  } catch (error: any) {
    console.log(`   ⚠️  System Settings skipped (may already exist): ${error.message}`);
  }

  // ============================================
  // 7. NOTIFICATION PREFERENCES (for all users)
  // ============================================
  console.log('\n📋 Creating Notification Preferences for all users...');
  const allUsers = await db.user.findMany({ select: { id: true, email: true } });
  let prefCount = 0;

  for (const user of allUsers) {
    try {
      await db.notificationPreference.create({
        data: {
          userId: user.id,
          applicationSubmitted: true,
          applicationApproved: true,
          applicationRejected: true,
          interviewScheduled: true,
          interviewReminder: true,
          evaluationDue: true,
          evaluationSubmitted: true,
          paymentDue: true,
          paymentVerified: true,
          eventAssigned: true,
          eventReminder: true,
          scheduleApproved: true,
          attendanceCorrected: true,
          accountCreated: true,
          system: true,
        },
      });
      prefCount++;
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`   ⚠️  Notification pref already exists for ${user.email}`);
      } else {
        console.log(`   ❌ Error creating notif pref for ${user.email}: ${error.message}`);
      }
    }
  }
  stats.notifPrefs = prefCount;
  console.log(`   ✅ Created ${prefCount} notification preferences`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(50));
  console.log('📊 SEED COMPLETE - SUMMARY');
  console.log('='.repeat(50));
  console.log(`   👤 Total Users Created:       ${stats.users}`);
  console.log(`      - Super Admin:              1`);
  console.log(`      - Adviser:                  1`);
  console.log(`      - Officers:                 ${stats.officers - 1} (+ 1 adviser officer profile)`);
  console.log(`      - HRMO:                     1`);
  console.log(`      - Office Supervisors:       ${supervisorCredentials.length}`);
  console.log(`      - Student Assistants:       ${saCounter}`);
  console.log(`   🏢 Offices Created:            ${stats.offices}`);
  console.log(`   📋 SA Profiles Created:        ${stats.saProfiles}`);
  console.log(`   🔔 Notification Preferences:    ${stats.notifPrefs}`);
  console.log(`   🏛️  Org Chart:                  1`);
  console.log(`   ⚙️  System Settings:            1`);
  console.log('='.repeat(50));
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
