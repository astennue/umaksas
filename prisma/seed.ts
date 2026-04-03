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
    return {
      lastName: words[words.length - 1] || cleaned,
      firstName: words[0] || '',
      middleName: words.length > 2 ? words.slice(1, -1).join(' ') : undefined,
    };
  }
  const lastName = cleaned.substring(0, commaIdx).trim();
  const rest = cleaned.substring(commaIdx + 1).trim();
  const nameWords = rest.split(/\s+/);
  const firstName = nameWords[0] || '';
  const middleName = nameWords.length > 1 ? nameWords.slice(1).join(' ') : undefined;
  return { lastName, firstName, middleName };
}

// ============================================
// OFFICER EMAILS (to exclude from SA creation)
// ============================================
const officerEmails = new Set([
  'rnuevas.k12042427@umak.edu.ph',
  'jpelovello.a12344479@umak.edu.ph',
  'acerilla.k12151773@umak.edu.ph',
  'nclavo.k12255841@umak.edu.ph',
  'jdingle.a12343741@umak.edu.ph',
  'mcruz.k12148911@umak.edu.ph',
  'dmartinez.a12343893@umak.edu.ph',
]);

// ============================================
// MAIN SEED FUNCTION
// ============================================
async function main() {
  console.log('Starting database seed with real Excel data...\n');
  const stats = { users: 0, offices: 0, officers: 0, saProfiles: 0, notifPrefs: 0 };

  // ============================================
  // 1. SUPER ADMIN
  // ============================================
  console.log('Creating Super Admin...');
  const superAdmin = await db.user.create({
    data: {
      email: getUniqueEmail('superadmin@umak.edu.ph'),
      password: 'UMAKSAS@Super2025',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  stats.users++;
  console.log(`  Created: ${superAdmin.email} (SUPER_ADMIN)`);

  // ============================================
  // 2. ADVISER
  // ============================================
  console.log('\nCreating Adviser...');
  const adviser = await db.user.create({
    data: {
      email: getUniqueEmail('adviser@umak.edu.ph'),
      password: 'UMAKSAS@Adviser2025',
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
  console.log(`  Created: ${adviser.email} (ADVISER)`);

  // ============================================
  // 3. ORGANIZATION OFFICERS (7 total)
  // ============================================
  console.log('\nCreating Organization Officers...');
  const officerData = [
    {
      name: 'Reiner Nuevas',
      position: 'PRESIDENT' as const,
      order: 1,
      emailBase: 'rnuevas.k12042427@umak.edu.ph',
    },
    {
      name: 'Jennylyn S. Pelovello',
      position: 'VICE_PRESIDENT_INTERNAL' as const,
      order: 2,
      emailBase: 'jpelovello.a12344479@umak.edu.ph',
    },
    {
      name: 'Alexander C. Cerilla',
      position: 'VICE_PRESIDENT_EXTERNAL' as const,
      order: 3,
      emailBase: 'acerilla.k12151773@umak.edu.ph',
    },
    {
      name: 'Nicolas Nikolai L. Clavo',
      position: 'SECRETARY' as const,
      order: 4,
      emailBase: 'nclavo.k12255841@umak.edu.ph',
    },
    {
      name: 'John Paulo C. Dingle',
      position: 'TREASURER' as const,
      order: 5,
      emailBase: 'jdingle.a12343741@umak.edu.ph',
    },
    {
      name: 'Marc Aeron B. Cruz',
      position: 'AUDITOR' as const,
      order: 6,
      emailBase: 'mcruz.k12148911@umak.edu.ph',
    },
    {
      name: 'Daniela M. Martinez',
      position: 'PUBLIC_RELATION_OFFICER' as const,
      order: 7,
      emailBase: 'dmartinez.a12343893@umak.edu.ph',
    },
  ];

  for (const officer of officerData) {
    const email = getUniqueEmail(officer.emailBase);
    const user = await db.user.create({
      data: {
        email,
        password: 'UMAKSAS@Officer_2026',
        firstName: officer.name,
        lastName: '',
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
    console.log(`  Created: ${email} (${officer.position})`);
  }

  // ============================================
  // 4. HRMO
  // ============================================
  console.log('\nCreating HRMO...');
  const hrmo = await db.user.create({
    data: {
      email: getUniqueEmail('hrmo@umak.edu.ph'),
      password: 'UMAKSAS@HRMO_2026',
      firstName: 'Maria',
      lastName: 'Santos',
      role: 'HRMO',
      isActive: true,
    },
  });
  stats.users++;
  console.log(`  Created: ${hrmo.email} (HRMO)`);

  // ============================================
  // 5. STUDENT ASSISTANT DATA (58 entries from Excel)
  // ============================================
  console.log('\nProcessing SA data and building offices...');

  interface SADataEntry {
    name: string;
    studentNumber: string;
    college: string;
    program: string;
    umakEmail: string;
    contactNumber: string;
    personalEmail: string;
    sex: string;
    officeCode: string;
    officeEmail: string | null;
    officeName: string;
  }

  const saData: SADataEntry[] = [
    // 1
    {
      name: 'Millan, Apolinario, A.',
      studentNumber: 'K12255548',
      college: 'CHK',
      program: 'Bachelor of Science in Exercise and Sports Science Major in Fitness and Sports Science',
      umakEmail: 'amillan.k12255548@umak.edu.ph',
      contactNumber: '09695603317',
      personalEmail: 'apolinariomillanac7@gmail.com',
      sex: 'Male',
      officeCode: 'CDPRM',
      officeEmail: 'dprms@umak.edu.ph',
      officeName: 'Center for Data Protection and Records Management',
    },
    // 2
    {
      name: 'Cadena, Erin Isabella R.',
      studentNumber: 'K12255463',
      college: 'CITE',
      program: 'Bachelor in Secondary Education Major in Mathematics',
      umakEmail: 'ecadena.k12255463@umak.edu.ph',
      contactNumber: '09649628847',
      personalEmail: 'erinisabellac@gmail.com',
      sex: 'Female',
      officeCode: 'SOL',
      officeEmail: 'sollibrary@umak.edu.ph',
      officeName: 'Library Learning Commons \u2013 School of Law',
    },
    // 3
    {
      name: 'Aquino, Precious Anne M.',
      studentNumber: 'A12446971',
      college: 'IAD',
      program: 'Associate in Customer Service Communication',
      umakEmail: 'paquino.6971@umak.edu.ph',
      contactNumber: '09771661251',
      personalEmail: 'preciousanne.aquino18@gmail.com',
      sex: 'Female',
      officeCode: 'CIGA',
      officeEmail: 'ciga@umak.edu.ph',
      officeName: 'Center for International and Global Affairs',
    },
    // 4
    {
      name: 'Vinluan, Christine Mae G.',
      studentNumber: 'I-BCSAD',
      college: 'CCIS',
      program: 'Bachelor of Science in Computer Science',
      umakEmail: 'christine.vinluan@umak.edu.ph',
      contactNumber: '09292257118',
      personalEmail: 'vinluanchristianmae@gmail.com',
      sex: 'Female',
      officeCode: 'SPMO',
      officeEmail: 'spmo@umak.edu.ph',
      officeName: 'Supply and Property Management Office',
    },
    // 5
    {
      name: 'Lalic, Imelda M.',
      studentNumber: 'A12344128',
      college: 'CBFS',
      program: 'Bachelor of Science in Office Administration',
      umakEmail: 'ilalic.a12344128@umak.edu.ph',
      contactNumber: '09774496133',
      personalEmail: 'imeldalalic5@gmail.com',
      sex: 'Female',
      officeCode: 'OVPPR',
      officeEmail: 'ovppr@umak.edu.ph',
      officeName: 'Office of the VP for Planning and Research',
    },
    // 6
    {
      name: 'Villar, Jorge Steven',
      studentNumber: 'A12448856',
      college: 'IDEM',
      program: 'Bachelor of Science in Disaster Risk Management',
      umakEmail: 'jvillar.8856@umak.edu.ph',
      contactNumber: '09166155352',
      personalEmail: 'jorgestevenpazvillar@gmail.com',
      sex: 'Male',
      officeCode: 'IDEM',
      officeEmail: 'idem@umak.edu.ph',
      officeName: 'Institute for Disaster and Emergency Management',
    },
    // 7
    {
      name: 'Navarro, Henrie E.',
      studentNumber: 'K12154124',
      college: 'CHK',
      program: 'Bachelor of Science in Exercise and Sports Science Major in Fitness and Sports Science',
      umakEmail: 'hnavarro.k12154124@umak.edu.ph',
      contactNumber: '0977009863',
      personalEmail: 'navarrohenrie20@gmail.com',
      sex: 'Male',
      officeCode: 'UFMO',
      officeEmail: 'ufmo@umak.edu.ph',
      officeName: 'University Facilities Management Office',
    },
    // 8
    {
      name: 'Alba, Candice Kim E.',
      studentNumber: 'A12344115',
      college: 'CBFS',
      program: 'Bachelor of Science in Business Administration Major in Marketing Management',
      umakEmail: 'calba.a12344115@umak.edu.ph',
      contactNumber: '09120471089',
      personalEmail: 'alba.candicekim@gmail.com',
      sex: 'Female',
      officeCode: 'CLP',
      officeEmail: 'clp@umak.edu.ph',
      officeName: 'Center for Linkages and Placement',
    },
    // 9
    {
      name: 'Dalan, Jester A.',
      studentNumber: 'K12148865',
      college: 'CGPP',
      program: 'Bachelor of Arts in Political Science Major in Policy Management',
      umakEmail: 'jdalan.k12148865@umak.edu.ph',
      contactNumber: '09702151448',
      personalEmail: 'jesterdalan28@gmail.com',
      sex: 'Male',
      officeCode: 'SOL',
      officeEmail: 'schooloflaw@umak.edu.ph',
      officeName: 'School of Law',
    },
    // 10
    {
      name: 'Baluya, Kristel Ann D.',
      studentNumber: 'A12447657',
      college: 'CBFS',
      program: 'Bachelor of Science in Marketing Management',
      umakEmail: 'kbaluya.7657@umak.edu.ph',
      contactNumber: '09930668075',
      personalEmail: 'talayui161@gmail.com',
      sex: 'Female',
      officeCode: 'CASH',
      officeEmail: 'cash@umak.edu.ph',
      officeName: 'Cash Office',
    },
    // 11
    {
      name: 'Rodriguez, Ralph Christian D.',
      studentNumber: 'A12240655',
      college: 'CET',
      program: 'Bachelor of Engineering Technology Major in Electrical Technology',
      umakEmail: 'rrodriguez.a12240655@umak.edu.ph',
      contactNumber: '09927205047',
      personalEmail: 'rodriguezralphchristiandoyo@gmail.com',
      sex: 'Male',
      officeCode: 'OUR',
      officeEmail: 'registrar@umak.edu.ph',
      officeName: 'Office of the University Registrar',
    },
    // 12
    {
      name: 'Mandakawan, Mujahida U.',
      studentNumber: 'A12447710',
      college: 'CBFS',
      program: 'Bachelor of Science in Business Administration Major in Marketing Management',
      umakEmail: 'mmandakawan.7710@umak.edu.ph',
      contactNumber: '09945982177',
      personalEmail: 'mujahidaamandakawan@gmail.com',
      sex: 'Female',
      officeCode: 'IIHS',
      officeEmail: 'iihs@umak.edu.ph',
      officeName: 'Institute of Imaging Health Sciences',
    },
    // 13
    {
      name: 'Dupo, Jilian May B.',
      studentNumber: 'K12257225',
      college: 'CBFS',
      program: 'Bachelor of Science in Business Administration Major in Marketing Management',
      umakEmail: 'jdupo.k12257225@umak.edu.ph',
      contactNumber: '09910757064',
      personalEmail: 'jilianmaydupo@gmail.com',
      sex: 'Female',
      officeCode: 'SPMO',
      officeEmail: 'spmo@umak.edu.ph',
      officeName: 'Supply and Property Management Office',
    },
    // 14
    {
      name: 'Samillano, Carleen Z.',
      studentNumber: 'K12152254',
      college: 'CCIS',
      program: 'Bachelor of Science in Information Technology Major in Information and Network Security',
      umakEmail: 'csamillano.k12152254@umak.edu.ph',
      contactNumber: '09457881175',
      personalEmail: 'carleensamillano@gmail.com',
      sex: 'Female',
      officeCode: 'OVPAA',
      officeEmail: 'ovpaa@umak.edu.ph',
      officeName: 'Office of the VP for Academic Affairs',
    },
    // 15
    {
      name: 'Hubilla, James Gabriel F.',
      studentNumber: 'K12257664',
      college: 'CBFS',
      program: 'Bachelor of Science in Business Administration Major in Marketing Management',
      umakEmail: 'jhubilla.k12257664@umak.edu.ph',
      contactNumber: '09668211160',
      personalEmail: 'jgfhubilla@gmail.com',
      sex: 'Male',
      officeCode: 'LLC',
      officeEmail: 'library@umak.edu.ph',
      officeName: 'Library Learning Commons',
    },
    // 16
    {
      name: 'Urdaneta, Mhel Klarenz',
      studentNumber: 'K12256252',
      college: 'CCIS',
      program: 'Bachelor of Science in Computer Science Major in Application Development',
      umakEmail: 'murdaneta.k12256252@umak.edu.ph',
      contactNumber: '09954642319',
      personalEmail: 'Klarenzurdaneta9@gmail.com',
      sex: 'Male',
      officeCode: 'ULLC',
      officeEmail: 'library@umak.edu.ph',
      officeName: 'University Library Learning Commons',
    },
    // 17
    {
      name: 'Lozano, Ma Nathalie C.',
      studentNumber: 'K12358211',
      college: 'IAD',
      program: 'Bachelor of Multimedia Arts',
      umakEmail: 'ma.lozano@umak.edu.ph',
      contactNumber: '09095338534',
      personalEmail: 'manathalie2017@gmail.com',
      sex: 'Female',
      officeCode: 'IAD',
      officeEmail: 'iad@umak.edu.ph',
      officeName: 'Institute of Arts and Design',
    },
    // 18 - OFFICER (VP Internal: Pelovello) - included for office creation, skipped during SA user creation
    {
      name: 'Pelovello, Jennylyn S.',
      studentNumber: 'A12344479',
      college: 'CBFS',
      program: 'Bachelor of Science in Office Administration',
      umakEmail: 'jpelovello.a12344479@umak.edu.ph',
      contactNumber: '9511556292',
      personalEmail: 'jpelovello.a12344479@umak.edu.ph',
      sex: 'Female',
      officeCode: 'OVPSSCD',
      officeEmail: 'ovpsscd@umak.edu.ph',
      officeName: 'Office of the VP for Student Services and Community Development',
    },
    // 19
    {
      name: 'Catalan, Nesery Euenne P.',
      studentNumber: 'K12043250',
      college: 'CTHM',
      program: 'Bachelor of Science in Hospitality Management',
      umakEmail: 'ncatalan.k12043250@umak.edu.ph',
      contactNumber: '09205692657',
      personalEmail: 'catalannesery06@gmail.com',
      sex: 'Female',
      officeCode: 'MDO',
      officeEmail: 'clinic@umak.edu.ph',
      officeName: 'Medical and Dental Office',
    },
    // 20
    {
      name: 'Reyes, Alexsandra C.',
      studentNumber: 'K12256444',
      college: 'CTHM',
      program: 'Bachelor of Science in Hospitality Management',
      umakEmail: 'areyes.k12256444@umak.edu.ph',
      contactNumber: '09056848106',
      personalEmail: 'alexsandrareyes1512@gmail.com',
      sex: 'Female',
      officeCode: 'HRMO',
      officeEmail: 'hrmo@umak.edu.ph',
      officeName: 'Human Resource Management Office',
    },
    // 21
    {
      name: 'Accad, Marwin Mathew Miko M.',
      studentNumber: 'A12240841',
      college: 'CTHM',
      program: 'Bachelor of Science in Hospitality Management',
      umakEmail: 'maccad.a12240841@umak.edu.ph',
      contactNumber: '09351225600',
      personalEmail: 'accadmiko@gmail.com',
      sex: 'Male',
      officeCode: 'OUR',
      officeEmail: 'registrar@umak.edu.ph',
      officeName: 'Office of the University Registrar',
    },
    // 22
    {
      name: 'Castillo, Aica Leonhice R.',
      studentNumber: 'K12255968',
      college: 'CBFS',
      program: 'Bachelor of Science in Business Administration Major in Marketing Management',
      umakEmail: 'acastillo.k12255968@umak.edu.ph',
      contactNumber: '09930963271',
      personalEmail: 'castilloaicaleonhice@gmail.com',
      sex: 'Female',
      officeCode: 'SPMO',
      officeEmail: 'spmo@umak.edu.ph',
      officeName: 'Supply and Property Management Office',
    },
    // 23
    {
      name: 'Panis, Nirissa E.',
      studentNumber: 'K12151761',
      college: 'CTHM',
      program: 'Bachelor of Science in Tourism Management',
      umakEmail: 'npanis.k12151761@umak.edu.ph',
      contactNumber: '09982692871',
      personalEmail: 'nirissapanis.20@gmail.com',
      sex: 'Female',
      officeCode: 'CFD',
      officeEmail: 'pdc@umak.edu.ph',
      officeName: 'Center for Planning and Development',
    },
    // 24
    {
      name: 'Tejam, John Kenneth A.',
      studentNumber: 'K12150196',
      college: 'CCIS',
      program: 'Bachelor of Science in Computer Science Major in Application Development',
      umakEmail: 'jtejam.k12150196@umak.edu.ph',
      contactNumber: '09989337318',
      personalEmail: 'jktejam2@gmail.com',
      sex: 'Male',
      officeCode: 'CCIS',
      officeEmail: 'ccis@umak.edu.ph',
      officeName: 'College of Computing and Information Sciences',
    },
    // 25
    {
      name: 'Tulio, Sherry Julianne E.',
      studentNumber: 'A12447711',
      college: 'CBFS',
      program: 'Bachelor of Science in Business Administration Major in Marketing Management',
      umakEmail: 'stulio.7711@umak.edu.ph',
      contactNumber: '09931378674',
      personalEmail: 'sherrytulio@gmail.com',
      sex: 'Female',
      officeCode: 'AO',
      officeEmail: 'accounting@umak.edu.ph',
      officeName: 'Accounting Office',
    },
    // 26
    {
      name: 'Abila, Angela Mae B.',
      studentNumber: 'K12150235',
      college: 'CBFS',
      program: 'Bachelor of Science in Office Administration',
      umakEmail: 'aabila.k12150235@umak.edu.ph',
      contactNumber: '9308829382',
      personalEmail: 'angelamaeabila203@gmail.com',
      sex: 'Female',
      officeCode: 'CSFD',
      officeEmail: 'csfd@umak.edu.ph',
      officeName: 'Center for Student Formation and Discipline',
    },
    // 27
    {
      name: 'Cuagon, Angel',
      studentNumber: 'K12149506',
      college: 'CGPP',
      program: 'Bachelor of Arts in Political Science Major in Local Administration',
      umakEmail: 'acuagon.k12149506@umak.edu.ph',
      contactNumber: '09453144733',
      personalEmail: 'gellycuagon@gmail.com',
      sex: 'Female',
      officeCode: 'GSO',
      officeEmail: 'gso@umak.edu.ph',
      officeName: 'General Services Office',
    },
    // 28
    {
      name: 'Beredo, Krisha Anne C.',
      studentNumber: 'K12254329',
      college: 'CBFS',
      program: 'Bachelor of Science in Business Administration Major in Marketing Management',
      umakEmail: 'kberedo.k12254329@umak.edu.ph',
      contactNumber: '09278802438',
      personalEmail: 'krishaberedo111@gmail.com',
      sex: 'Female',
      officeCode: 'CBFS',
      officeEmail: 'cbfs@umak.edu.ph',
      officeName: 'College of Business and Financial Sciences',
    },
    // 29 - OFFICER (PRO: Martinez) - included for office creation, skipped during SA user creation
    {
      name: 'Martinez, Daniela M.',
      studentNumber: 'A12343893',
      college: 'CBFS',
      program: 'Bachelor of Science in Business Administration Major in Financial Management',
      umakEmail: 'dmartinez.a12343893@umak.edu.ph',
      contactNumber: '09920452722',
      personalEmail: 'dmecaydor@gmail.com',
      sex: 'Female',
      officeCode: 'ITEST',
      officeEmail: 'itest@umak.edu.ph',
      officeName: 'Institute of Technical Education and Skills Training',
    },
    // 30
    {
      name: 'Omilig, Dimple Ann L.',
      studentNumber: 'A12343617',
      college: 'CBFS',
      program: 'Bachelor of Science in Office Administration',
      umakEmail: 'domilig.a12343617@umak.edu.ph',
      contactNumber: '09927297760',
      personalEmail: 'dimpleannomilig000@gmail.com',
      sex: 'Female',
      officeCode: 'CTHM',
      officeEmail: 'cthm@umak.edu.ph',
      officeName: 'College of Tourism and Hospitality Management',
    },
    // 31
    {
      name: 'Bendana, Mark R.',
      studentNumber: 'A62345008',
      college: 'IAD',
      program: 'Bachelor in Multimedia Arts',
      umakEmail: 'mbendana.a62345008@umak.edu.ph',
      contactNumber: '09653903562',
      personalEmail: 'mark.bendana22@gmail.com',
      sex: 'Male',
      officeCode: 'CTBL',
      officeEmail: 'tblhub@umak.edu.ph',
      officeName: 'Center for Technology-Based Learning',
    },
    // 32
    {
      name: 'Tunguia, Chloe Meg L.',
      studentNumber: 'K12255437',
      college: 'CBFS',
      program: 'Bachelor of Science in Business Administration Major in Marketing Management',
      umakEmail: 'ctunguia.k12255437@umak.edu.ph',
      contactNumber: '09691301218',
      personalEmail: 'chloemegtunguia@gmail.com',
      sex: 'Female',
      officeCode: 'CAS',
      officeEmail: 'cas@umak.edu.ph',
      officeName: 'Center for Admission and Scholarship',
    },
    // 33
    {
      name: 'Saliente, Roseann Joy H.',
      studentNumber: 'K12358386',
      college: 'CCIS',
      program: 'Bachelor of Science in Information Technology Major in Information and Network Security',
      umakEmail: 'roseann.saliente@umak.edu.ph',
      contactNumber: '09052412224',
      personalEmail: 'roseannjoysaliente@gmail.com',
      sex: 'Female',
      officeCode: 'CAS',
      officeEmail: 'cas@umak.edu.ph',
      officeName: 'Center for Admission and Scholarship',
    },
    // 34
    {
      name: 'Albano, Krisha Layne S.',
      studentNumber: 'K12153910',
      college: 'CBFS',
      program: 'Bachelor of Science in Business Administration Major in Marketing Management',
      umakEmail: 'kalbano.k12153910@umak.edu.ph',
      contactNumber: '09086123270',
      personalEmail: 'albanokrishalayne6@gmail.com',
      sex: 'Female',
      officeCode: 'CQMD',
      officeEmail: 'cqmdc@umak.edu.ph',
      officeName: 'Center for Quality Management and Development',
    },
    // 35
    {
      name: 'Pelaez, Mara Shamer V.',
      studentNumber: 'A12343657',
      college: 'CBFS',
      program: 'Bachelor of Science in Business Administration Major in Marketing Management',
      umakEmail: 'mpelaez.a12343657@umak.edu.ph',
      contactNumber: '09661508528',
      personalEmail: 'marapelaez6@gmail.com',
      sex: 'Female',
      officeCode: 'CLAS',
      officeEmail: 'clas@umak.edu.ph',
      officeName: 'College of Liberal Arts and Sciences',
    },
    // 36
    {
      name: 'Bolisay, Princess JM M.',
      studentNumber: 'A12447567',
      college: 'CBFS',
      program: 'Bachelor of Science in Business Administration Major in Marketing Management',
      umakEmail: 'pbolisay.7567@umak.edu.ph',
      contactNumber: '09934177845',
      personalEmail: 'p.bolisay24@gmail.com',
      sex: 'Female',
      officeCode: 'CET',
      officeEmail: 'cet@umak.edu.ph',
      officeName: 'College of Engineering Technology',
    },
    // 37
    {
      name: 'Tagacay, Jane Abigail E.',
      studentNumber: 'A12343658',
      college: 'CBFS',
      program: 'Bachelor of Science in Business Administration Major in Marketing Management',
      umakEmail: 'jtagacay.a12343658@umak.edu.ph',
      contactNumber: '09674423045',
      personalEmail: 'janeabigailtagacay15@gmail.com',
      sex: 'Female',
      officeCode: 'OUR',
      officeEmail: 'registrar@umak.edu.ph',
      officeName: 'Office of the University Registrar',
    },
    // 38
    {
      name: 'Soberano, Ralph Christopher P.',
      studentNumber: 'K12152953',
      college: 'CCIS',
      program: 'Bachelor of Science in Information Technology Major in Information and Network Security',
      umakEmail: 'rsoberano.k12152953@umak.edu.ph',
      contactNumber: '09613599432',
      personalEmail: 'chrissoberano3@gmail.com',
      sex: 'Male',
      officeCode: 'CUR',
      officeEmail: 'research@umak.edu.ph',
      officeName: 'Center for University Research',
    },
    // 39
    {
      name: 'Yumang, Megan Adele M.',
      studentNumber: 'A12550143',
      college: 'CTHM',
      program: 'Bachelor of Science in Tourism Management',
      umakEmail: 'myumang.0143@umak.edu.ph',
      contactNumber: '09354807518',
      personalEmail: 'meganadele18@gmail.com',
      sex: 'Female',
      officeCode: 'CLP',
      officeEmail: 'clp@umak.edu.ph',
      officeName: 'Center for Linkages and Placement',
    },
    // 40
    {
      name: 'Manalo, Jamaya Karyl R.',
      studentNumber: 'K12358267',
      college: 'CBFS',
      program: 'Bachelor of Science in Business Administration Major in Human Resource Development Management',
      umakEmail: 'jamaya.manalo@umak.edu.ph',
      contactNumber: '09926460424',
      personalEmail: 'jamforstuffspurposes@gmail.com',
      sex: 'Female',
      officeCode: 'ISW',
      officeEmail: 'isw@umak.edu.ph',
      officeName: 'Institute of Social Work',
    },
    // 41
    {
      name: 'Tapales, Rexie Ysabel F.',
      studentNumber: 'A12447893',
      college: 'CBFS',
      program: 'Bachelor of Science in Business Administration Major in Financial Management',
      umakEmail: 'rtapales.7893@umak.edu.ph',
      contactNumber: '09955168835',
      personalEmail: 'rexieysabelt@gmail.com',
      sex: 'Female',
      officeCode: 'CTIED',
      officeEmail: 'bi.expres@umak.edu.ph',
      officeName: 'Center for Technology Incubation and Enterprise Development',
    },
    // 42
    {
      name: 'Fernandez, Sofia Lyka D.',
      studentNumber: 'A12343802',
      college: 'CBFS',
      program: 'Bachelor of Science in Business Administration Major in Marketing Management',
      umakEmail: 'sfernandez.a12343802@umak.edu.ph',
      contactNumber: '09605448730',
      personalEmail: 'sofialykafernandez123@gmail.com',
      sex: 'Female',
      officeCode: 'CGCS',
      officeEmail: 'gcc@umak.edu.ph',
      officeName: 'Center for Guidance and Counseling Services',
    },
    // 43
    {
      name: 'Tapia, Fiona Sophia Kirsten A.',
      studentNumber: 'A12552516',
      college: 'IAD',
      program: 'Bachelor of Multimedia Arts',
      umakEmail: 'ftapia.2516@umak.edu.ph',
      contactNumber: '09671452710',
      personalEmail: 'sai.fukarai901@gmail.com',
      sex: 'Female',
      officeCode: 'CTIED',
      officeEmail: 'bi.expres@umak.edu.ph',
      officeName: 'Center for Technology Incubation and Enterprise Development',
    },
    // 44
    {
      name: 'Acohon, Rea Jane',
      studentNumber: 'K12152262',
      college: 'CBFS',
      program: 'Bachelor of Science in Business Administration Major in Financial Management',
      umakEmail: 'racohon.k12152262@umak.edu.ph',
      contactNumber: '09929678229',
      personalEmail: 'reajaneacohon1@gmail.com',
      sex: 'Female',
      officeCode: 'CAS',
      officeEmail: 'cas@umak.edu.ph',
      officeName: 'Center for Admission and Scholarship',
    },
    // 45
    {
      name: 'Andres, Jhayson G.',
      studentNumber: 'K12256563',
      college: 'CTHM',
      program: 'Bachelor of Science in Tourism Management',
      umakEmail: 'jandres.k12256563@umak.edu.ph',
      contactNumber: '09770053563',
      personalEmail: 'jhaysonandres9@gmail.com',
      sex: 'Male',
      officeCode: 'CTBL',
      officeEmail: 'tblhub@umak.edu.ph',
      officeName: 'Center for Technology-Based Learning',
    },
    // 46
    {
      name: 'Digol, Emmaus L.',
      studentNumber: 'A12240991',
      college: 'CCIS',
      program: 'Bachelor of Science in Computer Science Major in Application Development',
      umakEmail: 'edigol.a12240991@umak.edu.ph',
      contactNumber: '09762900025',
      personalEmail: 'emmausldigol@gmail.com',
      sex: 'Female',
      officeCode: 'OUP',
      officeEmail: 'president@umak.edu.ph',
      officeName: 'Office of the University President',
    },
    // 47 - OFFICER (President: Nuevas) - included for office creation, skipped during SA user creation
    {
      name: 'Nuevas, Reiner',
      studentNumber: 'K12042427',
      college: 'CCIS',
      program: 'Bachelor of Science in Computer Science Major in Application Development',
      umakEmail: 'rnuevas.k12042427@umak.edu.ph',
      contactNumber: '09916614695',
      personalEmail: 'reinernuevas.work@gmail.com',
      sex: 'Male',
      officeCode: 'CSFD',
      officeEmail: 'csfd@umak.edu.ph',
      officeName: 'Center for Student Formation and Discipline',
    },
    // 48
    {
      name: 'Aldea, Jordan F.',
      studentNumber: 'K12255179',
      college: 'CCIS',
      program: 'Bachelor of Science in Computer Science Major in Application Development',
      umakEmail: 'jaldea.k12255179@umak.edu.ph',
      contactNumber: '09266415299',
      personalEmail: 'jordanaldea06@gmail.com',
      sex: 'Male',
      officeCode: 'UMREC',
      officeEmail: 'umrec@umak.edu.ph',
      officeName: 'UMak Research and Extension Center',
    },
    // 49
    {
      name: 'Tabbu, Paul Bryan G.',
      studentNumber: 'A12550540',
      college: 'IOA',
      program: 'Bachelor of Science in Management Accounting',
      umakEmail: 'ptabbu.0540@umak.edu.ph',
      contactNumber: '09218419095',
      personalEmail: 'paulbryantabbu@gmail.com',
      sex: 'Male',
      officeCode: 'LLC',
      officeEmail: 'library@umak.edu.ph',
      officeName: 'Library Learning Commons',
    },
    // 50
    {
      name: 'Madrid, Aaliyah Lheene P.',
      studentNumber: 'K12042691',
      college: 'CTHM',
      program: 'Bachelor of Science in Hospitality Management',
      umakEmail: 'amadrid.k12042691@umak.edu.ph',
      contactNumber: '09358371907',
      personalEmail: 'madridalheene@gmail.com',
      sex: 'Female',
      officeCode: 'MDO',
      officeEmail: 'clinic@umak.edu.ph',
      officeName: 'Medical and Dental Office',
    },
    // 51 - OFFICER (VP External: Cerilla) - included for office creation, skipped during SA user creation
    {
      name: 'Cerilla, Alexander C.',
      studentNumber: 'K12151773',
      college: 'CCIS',
      program: 'Bachelor of Science in Information Technology Major in Information and Network Security',
      umakEmail: 'acerilla.k12151773@umak.edu.ph',
      contactNumber: '09451179464',
      personalEmail: 'cerillaalexander@gmail.com',
      sex: 'Male',
      officeCode: 'CIT',
      officeEmail: 'cit@umak.edu.ph',
      officeName: 'Center for Information Technology',
    },
    // 52
    {
      name: 'Marayag, Benzaki Y.',
      studentNumber: 'A12344805',
      college: 'CITE',
      program: 'Bachelor of Secondary Education Major in Social Studies',
      umakEmail: 'bmarayag.a12344805@umak.edu.ph',
      contactNumber: '09213876713',
      personalEmail: 'marayagzak.019@gmail.com',
      sex: 'Male',
      officeCode: 'OVPSSCD',
      officeEmail: 'ovpsscd@umak.edu.ph',
      officeName: 'Office of the VP for Student Services and Community Development',
    },
    // 53 - OFFICER (Treasurer: Dingle) - included for office creation, skipped during SA user creation
    {
      name: 'Dingle, John Paulo C.',
      studentNumber: 'A12343741',
      college: 'CBFS',
      program: 'Bachelor of Science in Building and Property Management',
      umakEmail: 'jdingle.a12343741@umak.edu.ph',
      contactNumber: '09162572785',
      personalEmail: 'dinglepaulo144@gmail.com',
      sex: 'Male',
      officeCode: 'CCED',
      officeEmail: 'communitydevelopment@umak.edu.ph',
      officeName: 'Center for Community Extension and Development',
    },
    // 54
    {
      name: 'Tuason, Danelle Mae C.',
      studentNumber: 'K12256094',
      college: 'IDEM',
      program: 'Bachelor of Science in Disaster Risk Management',
      umakEmail: 'dtuason.k12256094@umak.edu.ph',
      contactNumber: '09938465479',
      personalEmail: 'tuasondanellemae20@gmail.com',
      sex: 'Female',
      officeCode: 'IDEM',
      officeEmail: 'idem@umak.edu.ph',
      officeName: 'Institute for Disaster and Emergency Management',
    },
    // 55 - OFFICER (Secretary: Clavo) - included for office creation, skipped during SA user creation
    {
      name: 'Clavo, Nicolas Nikolai L.',
      studentNumber: 'K12255841',
      college: 'CBFS',
      program: 'Bachelor of Science in Business Administration Major in Marketing Management',
      umakEmail: 'nclavo.k12255841@umak.edu.ph',
      contactNumber: '09984647089',
      personalEmail: 'nicolasnikolailantingclavo@gmail.com',
      sex: 'Male',
      officeCode: 'CGCS',
      officeEmail: 'gcc@umak.edu.ph',
      officeName: 'Center for Guidance and Counseling Services',
    },
    // 56 - OFFICER (Auditor: Cruz) - included for office creation, skipped during SA user creation
    {
      name: 'Cruz, Marc Aeron B.',
      studentNumber: 'K12148911',
      college: 'CCIS',
      program: 'Bachelor of Science in Information Technology Major in Information and Network Security',
      umakEmail: 'mcruz.k12148911@umak.edu.ph',
      contactNumber: '09614970093',
      personalEmail: 'marcaeronc@gmail.com',
      sex: 'Male',
      officeCode: 'CSOA',
      officeEmail: 'csoa@umak.edu.ph',
      officeName: 'Center for Student Organizations and Activities',
    },
    // 57
    {
      name: 'Molina, Jan Ezra C.',
      studentNumber: 'K12254551',
      college: 'CBFS',
      program: 'Bachelor of Science in Business Administration Major in Financial Management',
      umakEmail: 'jmolina.k12254551@umak.edu.ph',
      contactNumber: '09451764727',
      personalEmail: 'janezramolina20@gmail.com',
      sex: 'Female',
      officeCode: 'CIC',
      officeEmail: null,
      officeName: 'Center for Information and Communications',
    },
    // 58
    {
      name: 'Aurelio, Charles Joshua Aranas',
      studentNumber: 'K12149330',
      college: 'CCIS',
      program: 'Bachelor of Science in Information Technology Major in Information and Network Security',
      umakEmail: 'caurelio.k12149330@umak.edu.ph',
      contactNumber: '09538895848',
      personalEmail: 'Charlesjoshuaaurelio@gmail.com',
      sex: 'Male',
      officeCode: 'IMC',
      officeEmail: null,
      officeName: 'Information and Communications Office',
    },
  ];

  // ============================================
  // 6. CREATE OFFICES (from SA data, keyed by code)
  // ============================================
  const officeMap = new Map<string, { name: string; code: string; email: string }>();

  for (const sa of saData) {
    if (!officeMap.has(sa.officeCode)) {
      officeMap.set(sa.officeCode, {
        name: sa.officeName,
        code: sa.officeCode,
        email: sa.officeEmail || '',
      });
    }
  }

  console.log(`\n  Creating ${officeMap.size} unique offices...`);
  const officeIdByCode = new Map<string, string>();

  for (const [, officeInfo] of officeMap) {
    try {
      const office = await db.office.create({
        data: {
          name: officeInfo.name,
          code: officeInfo.code,
          email: officeInfo.email || null,
          isActive: true,
        },
      });
      officeIdByCode.set(officeInfo.code, office.id);
      stats.offices++;
    } catch (error: any) {
      console.log(`  Warning: Office "${officeInfo.name}" (${officeInfo.code}) skipped: ${error.message}`);
      // Try to find existing office to get its ID
      const existing = await db.office.findFirst({ where: { code: officeInfo.code } });
      if (existing) {
        officeIdByCode.set(officeInfo.code, existing.id);
      }
    }
  }
  console.log(`  Created ${stats.offices} offices`);

  // ============================================
  // 7. CREATE OFFICE SUPERVISOR ACCOUNTS
  // ============================================
  console.log('\n  Creating Office Supervisor accounts...');
  const supervisorCredentials: Array<{ officeName: string; officeCode: string; email: string; password: string }> = [];

  for (const [, officeInfo] of officeMap) {
    const cleanCode = officeInfo.code.toUpperCase();
    const emailBase = cleanCode.toLowerCase() + '@umak.edu.ph';
    const password = `UMAKSAS_Sup_${cleanCode}_2026`;

    // Special handling: HRMO office uses the existing HRMO user
    if (cleanCode === 'HRMO') {
      const officeId = officeIdByCode.get('HRMO');
      if (officeId) {
        await db.office.update({
          where: { id: officeId },
          data: { headUserId: hrmo.id },
        });
      }
      supervisorCredentials.push({
        officeName: officeInfo.name,
        officeCode: cleanCode,
        email: hrmo.email,
        password: hrmo.password,
      });
      console.log(`  HRMO Office -> linked to existing HRMO user (${hrmo.email})`);
      continue;
    }

    const email = getUniqueEmail(emailBase);
    try {
      const user = await db.user.create({
        data: {
          email,
          password,
          firstName: officeInfo.name,
          lastName: 'Supervisor',
          role: 'OFFICE_SUPERVISOR',
          isActive: true,
        },
      });
      stats.users++;

      // Link supervisor to office
      const officeId = officeIdByCode.get(officeInfo.code);
      if (officeId) {
        await db.office.update({
          where: { id: officeId },
          data: { headUserId: user.id },
        });
      }

      supervisorCredentials.push({
        officeName: officeInfo.name,
        officeCode: cleanCode,
        email,
        password,
      });
      console.log(`  Created: ${cleanCode}: ${email} (OFFICE_SUPERVISOR)`);
    } catch (error: any) {
      console.log(`  Error creating supervisor for ${cleanCode}: ${error.message}`);
    }
  }

  // Print supervisor credentials summary
  console.log('\n  OFFICE SUPERVISOR CREDENTIALS:');
  console.log('  ' + '-'.repeat(80));
  for (const sup of supervisorCredentials) {
    console.log(`  ${sup.officeCode.padEnd(15)} | ${sup.email.padEnd(40)} | ${sup.password}`);
  }
  console.log('  ' + '-'.repeat(80));

  // ============================================
  // 8. CREATE SA USERS (skip 7 officers)
  // ============================================
  console.log(`\n  Creating Student Assistants (skipping ${officerEmails.size} officers who already exist)...`);
  let saCounter = 0;

  for (const sa of saData) {
    // Skip officers who already have accounts
    if (officerEmails.has(sa.umakEmail)) {
      console.log(`  Skipped (officer): ${sa.name} (${sa.umakEmail})`);
      continue;
    }

    const parsed = parseName(sa.name);
    const surname = parsed.lastName;
    const password = `UMAKSA@${surname}_2026`;
    const email = getUniqueEmail(sa.umakEmail);
    const courtesyTitle = sa.sex === 'Male' ? 'Mr.' : 'Ms.';

    try {
      const officeId = officeIdByCode.get(sa.officeCode) || null;

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
              dateOfBirth: null,
              age: null,
              sex: sa.sex || null,
              courtesyTitle,
              contactNumber: sa.contactNumber || null,
              personalEmail: sa.personalEmail || null,
            },
          },
        },
      });
      stats.users++;
      stats.saProfiles++;
      saCounter++;

      if (saCounter % 10 === 0 || saCounter === 51) {
        console.log(`  Progress: ${saCounter} SAs created`);
      }
    } catch (error: any) {
      console.log(`  Error creating SA "${sa.name}" (${email}): ${error.message}`);
    }
  }
  console.log(`  Created ${saCounter} Student Assistants`);

  // ============================================
  // 9. ORG CHART
  // ============================================
  console.log('\nCreating Org Chart...');
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
    console.log(`  Created Org Chart: ${orgChart.presidentName}`);
  } catch (error: any) {
    console.log(`  Org Chart skipped (may already exist): ${error.message}`);
  }

  // ============================================
  // 10. SYSTEM SETTINGS
  // ============================================
  console.log('\nCreating System Settings...');
  try {
    const sysSettings = await db.systemSettings.create({
      data: {
        academicYear: '2025-2026',
        currentSemester: '2nd Semester',
        applicationOpen: true,
        siteName: 'UMAK Student Assistant Management System',
      },
    });
    console.log(`  Created System Settings: AY ${sysSettings.academicYear}`);
  } catch (error: any) {
    console.log(`  System Settings skipped (may already exist): ${error.message}`);
  }

  // ============================================
  // 11. NOTIFICATION PREFERENCES (for all users)
  // ============================================
  console.log('\nCreating Notification Preferences for all users...');
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
        console.log(`  Notification pref already exists for ${user.email}`);
      } else {
        console.log(`  Error creating notif pref for ${user.email}: ${error.message}`);
      }
    }
  }
  stats.notifPrefs = prefCount;
  console.log(`  Created ${prefCount} notification preferences`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(50));
  console.log('SEED COMPLETE - SUMMARY');
  console.log('='.repeat(50));
  console.log(`  Total Users Created:       ${stats.users}`);
  console.log(`     - Super Admin:           1`);
  console.log(`     - Adviser:               1`);
  console.log(`     - Officers:              7`);
  console.log(`     - HRMO:                  1`);
  console.log(`     - Office Supervisors:     ${supervisorCredentials.length}`);
  console.log(`     - Student Assistants:    ${saCounter}`);
  console.log(`  Offices Created:            ${stats.offices}`);
  console.log(`  SA Profiles Created:        ${stats.saProfiles}`);
  console.log(`  Notification Preferences:   ${stats.notifPrefs}`);
  console.log(`  Org Chart:                  1`);
  console.log(`  System Settings:            1`);
  console.log('='.repeat(50));
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
