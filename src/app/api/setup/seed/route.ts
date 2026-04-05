import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// ONE-TIME DATABASE SEED ENDPOINT
// Usage: GET /api/setup/seed?secret=umak-sas-setup-2025
//
// This seeds the SUPER_ADMIN, ADVISER, Officers, HRMO,
// Offices, Supervisors, and all SA data into the database.
//
// SECURITY: Protected by secret param.
// After first successful run, remove or disable this route.
// ============================================

const SETUP_SECRET = "umak-sas-setup-2025";

const OFFICER_DATA = [
  { name: "Reiner Nuevas", position: "PRESIDENT" as const, order: 1, email: "rnuevas.k12042427@umak.edu.ph", password: "UMAKSAS@Officer_2026" },
  { name: "Jennylyn S. Pelovello", position: "VICE_PRESIDENT_INTERNAL" as const, order: 2, email: "jpelovello.a12344479@umak.edu.ph", password: "UMAKSAS@Officer_2026" },
  { name: "Alexander C. Cerilla", position: "VICE_PRESIDENT_EXTERNAL" as const, order: 3, email: "acerilla.k12151773@umak.edu.ph", password: "UMAKSAS@Officer_2026" },
  { name: "Nicolas Nikolai L. Clavo", position: "SECRETARY" as const, order: 4, email: "nclavo.k12255841@umak.edu.ph", password: "UMAKSAS@Officer_2026" },
  { name: "John Paulo C. Dingle", position: "TREASURER" as const, order: 5, email: "jdingle.a12343741@umak.edu.ph", password: "UMAKSAS@Officer_2026" },
  { name: "Marc Aeron B. Cruz", position: "AUDITOR" as const, order: 6, email: "mcruz.k12148911@umak.edu.ph", password: "UMAKSAS@Officer_2026" },
  { name: "Daniela M. Martinez", position: "PUBLIC_RELATION_OFFICER" as const, order: 7, email: "dmartinez.a12343893@umak.edu.ph", password: "UMAKSAS@Officer_2026" },
];

const SA_DATA = [
  { name: "Millan, Apolinario, A.", sn: "K12255548", college: "CHK", program: "BS Exercise and Sports Science", email: "amillan.k12255548@umak.edu.ph", phone: "09695603317", pemail: "apolinariomillanac7@gmail.com", sex: "Male", ocode: "CDPRM", oemail: "dprms@umak.edu.ph", oname: "Center for Data Protection and Records Management" },
  { name: "Cadena, Erin Isabella R.", sn: "K12255463", college: "CITE", program: "BSEd Major in Mathematics", email: "ecadena.k12255463@umak.edu.ph", phone: "09649628847", pemail: "erinisabellac@gmail.com", sex: "Female", ocode: "SOL", oemail: "sollibrary@umak.edu.ph", oname: "Library Learning Commons – School of Law" },
  { name: "Aquino, Precious Anne M.", sn: "A12446971", college: "IAD", program: "Associate in Customer Service Communication", email: "paquino.6971@umak.edu.ph", phone: "09771661251", pemail: "preciousanne.aquino18@gmail.com", sex: "Female", ocode: "CIGA", oemail: "ciga@umak.edu.ph", oname: "Center for International and Global Affairs" },
  { name: "Vinluan, Christine Mae G.", sn: "I-BCSAD", college: "CCIS", program: "BS Computer Science", email: "christine.vinluan@umak.edu.ph", phone: "09292257118", pemail: "vinluanchristianmae@gmail.com", sex: "Female", ocode: "SPMO", oemail: "spmo@umak.edu.ph", oname: "Supply and Property Management Office" },
  { name: "Lalic, Imelda M.", sn: "A12344128", college: "CBFS", program: "BS Office Administration", email: "ilalic.a12344128@umak.edu.ph", phone: "09774496133", pemail: "imeldalalic5@gmail.com", sex: "Female", ocode: "OVPPR", oemail: "ovppr@umak.edu.ph", oname: "Office of the VP for Planning and Research" },
  { name: "Villar, Jorge Steven.", sn: "A12448856", college: "IDEM", program: "BS Disaster Risk Management", email: "jvillar.8856@umak.edu.ph", phone: "09166155352", pemail: "jorgestevenpazvillar@gmail.com", sex: "Male", ocode: "IDEM", oemail: "idem@umak.edu.ph", oname: "Institute for Disaster and Emergency Management" },
  { name: "Navarro, Henrie E.", sn: "K12154124", college: "CHK", program: "BS Exercise and Sports Science", email: "hnavarro.k12154124@umak.edu.ph", phone: "0977009863", pemail: "navarrohenrie20@gmail.com", sex: "Male", ocode: "UFMO", oemail: "ufmo@umak.edu.ph", oname: "University Facilities Management Office" },
  { name: "Alba, Candice Kim E.", sn: "A12344115", college: "CBFS", program: "BSBA Major in Marketing Management", email: "calba.a12344115@umak.edu.ph", phone: "09120471089", pemail: "alba.candicekim@gmail.com", sex: "Female", ocode: "CLP", oemail: "clp@umak.edu.ph", oname: "Center for Linkages and Placement" },
  { name: "Dalan, Jester A.", sn: "K12148865", college: "CGPP", program: "BA Political Science Major in Policy Management", email: "jdalan.k12148865@umak.edu.ph", phone: "09702151448", pemail: "jesterdalan28@gmail.com", sex: "Male", ocode: "SOL", oemail: "schooloflaw@umak.edu.ph", oname: "School of Law" },
  { name: "Baluya, Kristel Ann D.", sn: "A12447657", college: "CBFS", program: "BSBA Major in Marketing Management", email: "kbaluya.7657@umak.edu.ph", phone: "09930668075", pemail: "talayui161@gmail.com", sex: "Female", ocode: "CASH", oemail: "cash@umak.edu.ph", oname: "Cash Office" },
  { name: "Rodriguez, Ralph Christian D.", sn: "A12240655", college: "CET", program: "BET Major in Electrical Technology", email: "rrodriguez.a12240655@umak.edu.ph", phone: "09927205047", pemail: "rodriguezralphchristiandoyo@gmail.com", sex: "Male", ocode: "OUR", oemail: "registrar@umak.edu.ph", oname: "Office of the University Registrar" },
  { name: "Mandakawan, Mujahida U.", sn: "A12447710", college: "CBFS", program: "BSBA Major in Marketing Management", email: "mmandakawan.7710@umak.edu.ph", phone: "09945982177", pemail: "mujahidaamandakawan@gmail.com", sex: "Female", ocode: "IIHS", oemail: "iihs@umak.edu.ph", oname: "Institute of Imaging Health Sciences" },
  { name: "Dupo, Jilian May B.", sn: "K12257225", college: "CBFS", program: "BSBA Major in Marketing Management", email: "jdupo.k12257225@umak.edu.ph", phone: "09910757064", pemail: "jilianmaydupo@gmail.com", sex: "Female", ocode: "SPMO", oemail: "spmo@umak.edu.ph", oname: "Supply and Property Management Office" },
  { name: "Samillano, Carleen Z.", sn: "K12152254", college: "CCIS", program: "BSIT Major in Information and Network Security", email: "csamillano.k12152254@umak.edu.ph", phone: "09457881175", pemail: "carleensamillano@gmail.com", sex: "Female", ocode: "OVPAA", oemail: "ovpaa@umak.edu.ph", oname: "Office of the VP for Academic Affairs" },
  { name: "Hubilla, James Gabriel F.", sn: "K12257664", college: "CBFS", program: "BSBA Major in Marketing Management", email: "jhubilla.k12257664@umak.edu.ph", phone: "09668211160", pemail: "jgfhubilla@gmail.com", sex: "Male", ocode: "LLC", oemail: "library@umak.edu.ph", oname: "Library Learning Commons" },
  { name: "Urdaneta, Mhel Klarenz", sn: "K12256252", college: "CCIS", program: "BSCS Major in Application Development", email: "murdaneta.k12256252@umak.edu.ph", phone: "09954642319", pemail: "Klarenzurdaneta9@gmail.com", sex: "Male", ocode: "ULLC", oemail: "library@umak.edu.ph", oname: "University Library Learning Commons" },
  { name: "Lozano, Ma Nathalie C.", sn: "K12358211", college: "IAD", program: "Bachelor of Multimedia Arts", email: "ma.lozano@umak.edu.ph", phone: "09095338534", pemail: "manathalie2017@gmail.com", sex: "Female", ocode: "IAD", oemail: "iad@umak.edu.ph", oname: "Institute of Arts and Design" },
  { name: "Catalan, Nesery Euenne P.", sn: "K12043250", college: "CTHM", program: "BS Hospitality Management", email: "ncatalan.k12043250@umak.edu.ph", phone: "09205692657", pemail: "catalannesery06@gmail.com", sex: "Female", ocode: "MDO", oemail: "clinic@umak.edu.ph", oname: "Medical and Dental Office" },
  { name: "Reyes, Alexsandra C.", sn: "K12256444", college: "CTHM", program: "BS Hospitality Management", email: "areyes.k12256444@umak.edu.ph", phone: "09056848106", pemail: "alexsandrareyes1512@gmail.com", sex: "Female", ocode: "HRMO", oemail: "hrmo@umak.edu.ph", oname: "Human Resource Management Office" },
  { name: "Accad, Marwin Mathew Miko M.", sn: "A12240841", college: "CTHM", program: "BS Hospitality Management", email: "maccad.a12240841@umak.edu.ph", phone: "09351225600", pemail: "accadmiko@gmail.com", sex: "Male", ocode: "OUR", oemail: "registrar@umak.edu.ph", oname: "Office of the University Registrar" },
  { name: "Castillo, Aica Leonhice R.", sn: "K12255968", college: "CBFS", program: "BSBA Major in Marketing Management", email: "acastillo.k12255968@umak.edu.ph", phone: "09930963271", pemail: "castilloaicaleonhice@gmail.com", sex: "Female", ocode: "SPMO", oemail: "spmo@umak.edu.ph", oname: "Supply and Property Management Office" },
  { name: "Panis, Nirissa E.", sn: "K12151761", college: "CTHM", program: "BS Tourism Management", email: "npanis.k12151761@umak.edu.ph", phone: "09982692871", pemail: "nirissapanis.20@gmail.com", sex: "Female", ocode: "CFD", oemail: "pdc@umak.edu.ph", oname: "Center for Planning and Development" },
  { name: "Tejam, John Kenneth A.", sn: "K12150196", college: "CCIS", program: "BSCS Major in Application Development", email: "jtejam.k12150196@umak.edu.ph", phone: "09989337318", pemail: "jktejam2@gmail.com", sex: "Male", ocode: "CCIS", oemail: "ccis@umak.edu.ph", oname: "College of Computing and Information Sciences" },
  { name: "Tulio, Sherry Julianne E.", sn: "A12447711", college: "CBFS", program: "BSBA Major in Marketing Management", email: "stulio.7711@umak.edu.ph", phone: "09931378674", pemail: "sherrytulio@gmail.com", sex: "Female", ocode: "AO", oemail: "accounting@umak.edu.ph", oname: "Accounting Office" },
  { name: "Abila, Angela Mae B.", sn: "K12150235", college: "CBFS", program: "BS Office Administration", email: "aabila.k12150235@umak.edu.ph", phone: "9308829382", pemail: "angelamaeabila203@gmail.com", sex: "Female", ocode: "CSFD", oemail: "csfd@umak.edu.ph", oname: "Center for Student Formation and Discipline" },
  { name: "Cuagon, Angel", sn: "K12149506", college: "CGPP", program: "BA Political Science Major in Local Administration", email: "acuagon.k12149506@umak.edu.ph", phone: "09453144733", pemail: "gellycuagon@gmail.com", sex: "Female", ocode: "GSO", oemail: "gso@umak.edu.ph", oname: "General Services Office" },
  { name: "Beredo, Krisha Anne C.", sn: "K12254329", college: "CBFS", program: "BSBA Major in Marketing Management", email: "kberedo.k12254329@umak.edu.ph", phone: "09278802438", pemail: "krishaberedo111@gmail.com", sex: "Female", ocode: "CBFS", oemail: "cbfs@umak.edu.ph", oname: "College of Business and Financial Sciences" },
  { name: "Omilig, Dimple Ann L.", sn: "A12343617", college: "CBFS", program: "BS Office Administration", email: "domilig.a12343617@umak.edu.ph", phone: "09927297760", pemail: "dimpleannomilig000@gmail.com", sex: "Female", ocode: "CTHM", oemail: "cthm@umak.edu.ph", oname: "College of Tourism and Hospitality Management" },
  { name: "Bendana, Mark R.", sn: "A62345008", college: "IAD", program: "Bachelor of Multimedia Arts", email: "mbendana.a62345008@umak.edu.ph", phone: "09653903562", pemail: "mark.bendana22@gmail.com", sex: "Male", ocode: "CTBL", oemail: "tblhub@umak.edu.ph", oname: "Center for Technology-Based Learning" },
  { name: "Tunguia, Chloe Meg L.", sn: "K12255437", college: "CBFS", program: "BSBA Major in Marketing Management", email: "ctunguia.k12255437@umak.edu.ph", phone: "09691301218", pemail: "chloemegtunguia@gmail.com", sex: "Female", ocode: "CAS", oemail: "cas@umak.edu.ph", oname: "Center for Admission and Scholarship" },
  { name: "Saliente, Roseann Joy H.", sn: "K12358386", college: "CCIS", program: "BSIT Major in Information and Network Security", email: "roseann.saliente@umak.edu.ph", phone: "09052412224", pemail: "roseannjoysaliente@gmail.com", sex: "Female", ocode: "CAS", oemail: "cas@umak.edu.ph", oname: "Center for Admission and Scholarship" },
  { name: "Albano, Krisha Layne S.", sn: "K12153910", college: "CBFS", program: "BSBA Major in Marketing Management", email: "kalbano.k12153910@umak.edu.ph", phone: "09086123270", pemail: "albanokrishalayne6@gmail.com", sex: "Female", ocode: "CQMD", oemail: "cqmdc@umak.edu.ph", oname: "Center for Quality Management and Development" },
  { name: "Pelaez, Mara Shamer V.", sn: "A12343657", college: "CBFS", program: "BSBA Major in Marketing Management", email: "mpelaez.a12343657@umak.edu.ph", phone: "09661508528", pemail: "marapelaez6@gmail.com", sex: "Female", ocode: "CLAS", oemail: "clas@umak.edu.ph", oname: "College of Liberal Arts and Sciences" },
  { name: "Bolisay, Princess JM M.", sn: "A12447567", college: "CBFS", program: "BSBA Major in Marketing Management", email: "pbolisay.7567@umak.edu.ph", phone: "09934177845", pemail: "p.bolisay24@gmail.com", sex: "Female", ocode: "CET", oemail: "cet@umak.edu.ph", oname: "College of Engineering Technology" },
  { name: "Tagacay, Jane Abigail E.", sn: "A12343658", college: "CBFS", program: "BSBA Major in Marketing Management", email: "jtagacay.a12343658@umak.edu.ph", phone: "09674423045", pemail: "janeabigailtagacay15@gmail.com", sex: "Female", ocode: "OUR", oemail: "registrar@umak.edu.ph", oname: "Office of the University Registrar" },
  { name: "Soberano, Ralph Christopher P.", sn: "K12152953", college: "CCIS", program: "BSIT Major in Information and Network Security", email: "rsoberano.k12152953@umak.edu.ph", phone: "09613599432", pemail: "chrissoberano3@gmail.com", sex: "Male", ocode: "CUR", oemail: "research@umak.edu.ph", oname: "Center for University Research" },
  { name: "Yumang, Megan Adele M.", sn: "A12550143", college: "CTHM", program: "BS Tourism Management", email: "myumang.0143@umak.edu.ph", phone: "09354807518", pemail: "meganadele18@gmail.com", sex: "Female", ocode: "CLP", oemail: "clp@umak.edu.ph", oname: "Center for Linkages and Placement" },
  { name: "Manalo, Jamaya Karyl R.", sn: "K12358267", college: "CBFS", program: "BSBA Major in HRDM", email: "jamaya.manalo@umak.edu.ph", phone: "09926460424", pemail: "jamforstuffspurposes@gmail.com", sex: "Female", ocode: "ISW", oemail: "isw@umak.edu.ph", oname: "Institute of Social Work" },
  { name: "Tapales, Rexie Ysabel F.", sn: "A12447893", college: "CBFS", program: "BSBA Major in Financial Management", email: "rtapales.7893@umak.edu.ph", phone: "09955168835", pemail: "rexieysabelt@gmail.com", sex: "Female", ocode: "CTIED", oemail: "bi.expres@umak.edu.ph", oname: "Center for Technology Incubation and Enterprise Development" },
  { name: "Fernandez, Sofia Lyka D.", sn: "A12343802", college: "CBFS", program: "BSBA Major in Marketing Management", email: "sfernandez.a12343802@umak.edu.ph", phone: "09605448730", pemail: "sofialykafernandez123@gmail.com", sex: "Female", ocode: "CGCS", oemail: "gcc@umak.edu.ph", oname: "Center for Guidance and Counseling Services" },
  { name: "Tapia, Fiona Sophia Kirsten A.", sn: "A12552516", college: "IAD", program: "Bachelor of Multimedia Arts", email: "ftapia.2516@umak.edu.ph", phone: "09671452710", pemail: "sai.fukarai901@gmail.com", sex: "Female", ocode: "CTIED", oemail: "bi.expres@umak.edu.ph", oname: "Center for Technology Incubation and Enterprise Development" },
  { name: "Acohon, Rea Jane", sn: "K12152262", college: "CBFS", program: "BSBA Major in Financial Management", email: "racohon.k12152262@umak.edu.ph", phone: "09929678229", pemail: "reajaneacohon1@gmail.com", sex: "Female", ocode: "CAS", oemail: "cas@umak.edu.ph", oname: "Center for Admission and Scholarship" },
  { name: "Andres, Jhayson G.", sn: "K12256563", college: "CTHM", program: "BS Tourism Management", email: "jandres.k12256563@umak.edu.ph", phone: "09770053563", pemail: "jhaysonandres9@gmail.com", sex: "Male", ocode: "CTBL", oemail: "tblhub@umak.edu.ph", oname: "Center for Technology-Based Learning" },
  { name: "Digol, Emmaus L.", sn: "A12240991", college: "CCIS", program: "BSCS Major in Application Development", email: "edigol.a12240991@umak.edu.ph", phone: "09762900025", pemail: "emmausldigol@gmail.com", sex: "Female", ocode: "OUP", oemail: "president@umak.edu.ph", oname: "Office of the University President" },
  { name: "Aldea, Jordan F.", sn: "K12255179", college: "CCIS", program: "BSCS Major in Application Development", email: "jaldea.k12255179@umak.edu.ph", phone: "09266415299", pemail: "jordanaldea06@gmail.com", sex: "Male", ocode: "UMREC", oemail: "umrec@umak.edu.ph", oname: "UMak Research and Extension Center" },
  { name: "Tabbu, Paul Bryan G.", sn: "A12550540", college: "IOA", program: "BS Management Accounting", email: "ptabbu.0540@umak.edu.ph", phone: "09218419095", pemail: "paulbryantabbu@gmail.com", sex: "Male", ocode: "LLC", oemail: "library@umak.edu.ph", oname: "Library Learning Commons" },
  { name: "Madrid, Aaliyah Lheene P.", sn: "K12042691", college: "CTHM", program: "BS Hospitality Management", email: "amadrid.k12042691@umak.edu.ph", phone: "09358371907", pemail: "madridalheene@gmail.com", sex: "Female", ocode: "MDO", oemail: "clinic@umak.edu.ph", oname: "Medical and Dental Office" },
  { name: "Marayag, Benzaki Y.", sn: "A12344805", college: "CITE", program: "BSEd Major in Social Studies", email: "bmarayag.a12344805@umak.edu.ph", phone: "09213876713", pemail: "marayagzak.019@gmail.com", sex: "Male", ocode: "OVPSSCD", oemail: "ovpsscd@umak.edu.ph", oname: "Office of the VP for Student Services and Community Development" },
  { name: "Tuason, Danelle Mae C.", sn: "K12256094", college: "IDEM", program: "BS Disaster Risk Management", email: "dtuason.k12256094@umak.edu.ph", phone: "09938465479", pemail: "tuasondanellemae20@gmail.com", sex: "Female", ocode: "IDEM", oemail: "idem@umak.edu.ph", oname: "Institute for Disaster and Emergency Management" },
  { name: "Molina, Jan Ezra C.", sn: "K12254551", college: "CBFS", program: "BSBA Major in Financial Management", email: "jmolina.k12254551@umak.edu.ph", phone: "09451764727", pemail: "janezramolina20@gmail.com", sex: "Female", ocode: "CIC", oemail: null, oname: "Center for Information and Communications" },
  { name: "Aurelio, Charles Joshua Aranas", sn: "K12149330", college: "CCIS", program: "BSIT Major in Information and Network Security", email: "caurelio.k12149330@umak.edu.ph", phone: "09538895848", pemail: "Charlesjoshuaaurelio@gmail.com", sex: "Male", ocode: "IMC", oemail: null, oname: "Information and Communications Office" },
];

const officerEmails = new Set(OFFICER_DATA.map(o => o.email));

function parseName(fullName: string): { lastName: string; firstName: string; middleName?: string } {
  const cleaned = fullName.trim();
  const commaIdx = cleaned.indexOf(",");
  if (commaIdx === -1) {
    const words = cleaned.split(/\s+/);
    return { lastName: words[words.length - 1] || cleaned, firstName: words[0] || "", middleName: words.length > 2 ? words.slice(1, -1).join(" ") : undefined };
  }
  const lastName = cleaned.substring(0, commaIdx).trim();
  const rest = cleaned.substring(commaIdx + 1).trim();
  const nameWords = rest.split(/\s+/);
  return { lastName, firstName: nameWords[0] || "", middleName: nameWords.length > 1 ? nameWords.slice(1).join(" ") : undefined };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const useSecret = process.env.SETUP_SECRET || SETUP_SECRET;

  if (!secret || secret !== useSecret) {
    return NextResponse.json({ error: "Invalid or missing secret", hint: "Use ?secret=umak-sas-setup-2025" }, { status: 403 });
  }

  const stats = { users: 0, offices: 0, officers: 0, saProfiles: 0, errors: [] as string[] };
  const log: string[] = [];

  try {
    log.push("🌱 Starting database seed...");

    // 1. SUPER ADMIN
    log.push("── Creating Super Admin ──");
    await db.user.upsert({
      where: { email: "superadmin@umak.edu.ph" },
      update: { password: "UMAKSAS@Super2025", firstName: "System", lastName: "Administrator", role: "SUPER_ADMIN", isActive: true },
      create: { email: "superadmin@umak.edu.ph", password: "UMAKSAS@Super2025", firstName: "System", lastName: "Administrator", role: "SUPER_ADMIN", isActive: true },
    });
    stats.users++;
    log.push("  ✅ superadmin@umak.edu.ph (SUPER_ADMIN)");

    // 2. ADVISER
    log.push("── Creating Adviser ──");
    const adviser = await db.user.upsert({
      where: { email: "adviser@umak.edu.ph" },
      update: { password: "UMAKSAS@Adviser2025", firstName: "Alvin John Y.", lastName: "Abejo", role: "ADVISER", isActive: true },
      create: { email: "adviser@umak.edu.ph", password: "UMAKSAS@Adviser2025", firstName: "Alvin John Y.", lastName: "Abejo", role: "ADVISER", isActive: true },
    });
    const existingAdvProfile = await db.officerProfile.findUnique({ where: { userId: adviser.id } });
    if (!existingAdvProfile) await db.officerProfile.create({ data: { userId: adviser.id, position: "ADVISER", orderIndex: 0 } });
    stats.users++; stats.officers++;
    log.push("  ✅ adviser@umak.edu.ph (ADVISER)");

    // 3. OFFICERS
    log.push("── Creating Officers ──");
    for (const officer of OFFICER_DATA) {
      const user = await db.user.upsert({
        where: { email: officer.email },
        update: { password: officer.password, firstName: officer.name, lastName: "", role: "OFFICER", isActive: true },
        create: { email: officer.email, password: officer.password, firstName: officer.name, lastName: "", role: "OFFICER", isActive: true },
      });
      const existing = await db.officerProfile.findUnique({ where: { userId: user.id } });
      if (!existing) await db.officerProfile.create({ data: { userId: user.id, position: officer.position, orderIndex: officer.order } });
      stats.users++; stats.officers++;
      log.push(`  ✅ ${officer.email} (${officer.position})`);
    }

    // 4. HRMO
    log.push("── Creating HRMO ──");
    const hrmo = await db.user.upsert({
      where: { email: "hrmo@umak.edu.ph" },
      update: { password: "UMAKSAS@HRMO_2026", firstName: "Maria", lastName: "Santos", role: "HRMO", isActive: true },
      create: { email: "hrmo@umak.edu.ph", password: "UMAKSAS@HRMO_2026", firstName: "Maria", lastName: "Santos", role: "HRMO", isActive: true },
    });
    stats.users++;
    log.push("  ✅ hrmo@umak.edu.ph (HRMO)");

    // 5. OFFICES
    log.push("── Creating Offices ──");
    const officeMap = new Map<string, { name: string; code: string; email: string | null }>();
    for (const sa of SA_DATA) {
      if (!officeMap.has(sa.ocode)) officeMap.set(sa.ocode, { name: sa.oname, code: sa.ocode, email: sa.oemail });
    }
    const officeIdByCode = new Map<string, string>();
    for (const [, info] of officeMap) {
      const office = await db.office.upsert({
        where: { code: info.code },
        update: { name: info.name, email: info.email || null, isActive: true },
        create: { name: info.name, code: info.code, email: info.email || null, isActive: true },
      });
      officeIdByCode.set(info.code, office.id);
      stats.offices++;
    }
    log.push(`  ✅ ${stats.offices} offices created`);

    // Link HRMO
    const hrmoOfficeId = officeIdByCode.get("HRMO");
    if (hrmoOfficeId) {
      await db.office.update({ where: { id: hrmoOfficeId }, data: { headUserId: hrmo.id } });
    }

    // 6. OFFICE SUPERVISORS
    log.push("── Creating Office Supervisors ──");
    for (const [, info] of officeMap) {
      const code = info.code.toUpperCase();
      if (code === "HRMO" || !info.email || info.email.trim() === "") continue;
      try {
        const sup = await db.user.upsert({
          where: { email: info.email },
          update: { password: `UMAKSAS_Sup_${code}_2026`, firstName: info.name, lastName: "Supervisor", role: "OFFICE_SUPERVISOR", isActive: true },
          create: { email: info.email, password: `UMAKSAS_Sup_${code}_2026`, firstName: info.name, lastName: "Supervisor", role: "OFFICE_SUPERVISOR", isActive: true },
        });
        const oid = officeIdByCode.get(code);
        if (oid) await db.office.update({ where: { id: oid }, data: { headUserId: sup.id } });
        stats.users++;
        log.push(`  ✅ ${info.email} (${code})`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        stats.errors.push(`${code}: ${msg}`);
        log.push(`  ❌ ${code} — ${msg}`);
      }
    }

    // 7. STUDENT ASSISTANTS
    log.push("── Creating Student Assistants ──");
    for (const sa of SA_DATA) {
      if (officerEmails.has(sa.email)) continue;
      const { lastName, firstName, middleName } = parseName(sa.name);
      const user = await db.user.upsert({
        where: { email: sa.email },
        update: { password: `UMAKSAS_SA_${sa.sn}`, firstName, middleName: middleName || null, lastName, role: "STUDENT_ASSISTANT", isActive: true, phone: sa.phone },
        create: { email: sa.email, password: `UMAKSAS_SA_${sa.sn}`, firstName, middleName: middleName || null, lastName, role: "STUDENT_ASSISTANT", isActive: true, phone: sa.phone },
      });
      const existing = await db.sAProfile.findUnique({ where: { userId: user.id } });
      if (!existing) {
        const oid = officeIdByCode.get(sa.ocode) || null;
        await db.sAProfile.create({ data: { userId: user.id, studentNumber: sa.sn, college: sa.college, program: sa.program, sex: sa.sex, contactNumber: sa.phone, personalEmail: sa.pemail, status: "ACTIVE", officeId: oid } });
        stats.saProfiles++;
      }
      stats.users++;
    }
    log.push(`  ✅ ${stats.saProfiles} SA profiles created`);

    log.push("🎉 Seed completed!");

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully! You can now log in.",
      stats,
      log,
      credentials: {
        superAdmin: { email: "superadmin@umak.edu.ph", password: "UMAKSAS@Super2025" },
        adviser: { email: "adviser@umak.edu.ph", password: "UMAKSAS@Adviser2025" },
        hrmo: { email: "hrmo@umak.edu.ph", password: "UMAKSAS@HRMO_2026" },
        officerExample: { email: OFFICER_DATA[0].email, password: OFFICER_DATA[0].password },
        note: "SA password format: UMAKSAS_SA_{studentNumber}",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Seed Error]", error);
    return NextResponse.json({ error: "Seed failed", message: msg, stats, log, errors: stats.errors }, { status: 500 });
  }
}
