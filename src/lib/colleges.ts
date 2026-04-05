export interface College {
  name: string;    // Full name (used in profiles, forms)
  acronym: string; // Short code (used in SA Wall cards, filters)
}

export const COLLEGES: College[] = [
  { name: "College of Business and Financial Science", acronym: "CBFS" },
  { name: "College of Computing and Information Sciences", acronym: "CCIS" },
  { name: "College of Construction Sciences and Engineering", acronym: "CCSE" },
  { name: "College of Continuing, Advanced and Professional Studies", acronym: "CCAPS" },
  { name: "College of Human Kinetics", acronym: "CHK" },
  { name: "College of Governance and Public Policy", acronym: "CGPP" },
  { name: "College of Innovative Teacher Education", acronym: "CITE" },
  { name: "College of Liberal Arts and Sciences", acronym: "CLAS" },
  { name: "College of Engineering Technology", acronym: "CET" },
  { name: "College of Tourism and Hospitality Management", acronym: "CTHM" },
  { name: "Institute of Imaging Health Sciences", acronym: "IIHS" },
  { name: "Institute of Accountancy", acronym: "IOA" },
  { name: "Institute of Arts and Design", acronym: "IAD" },
  { name: "Institute of Nursing", acronym: "ION" },
  { name: "Institute of Pharmacy", acronym: "IOP" },
  { name: "Institute of Psychology", acronym: "IOPsy" },
  { name: "Institute for Social Development for Nation Building", acronym: "ISDNB" },
  { name: "School of Law", acronym: "SOL" },
  { name: "CITE-Higher School ng UMak", acronym: "CITE-HSU" },
];

// Helper functions
export function getCollegeByAcronym(acronym: string): College | undefined {
  return COLLEGES.find(c => c.acronym.toUpperCase() === acronym.toUpperCase());
}

export function getCollegeByName(name: string): College | undefined {
  return COLLEGES.find(c => c.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get display text for a college value.
 * Supports both acronyms and full names as input.
 * Format options: 'full' | 'acronym' | 'both'
 */
export function getCollegeDisplay(college: string | null | undefined, format: 'full' | 'acronym' | 'both'): string {
  if (!college) return '';
  const normalized = college.trim();

  // Check if it's an acronym
  const byAcronym = COLLEGES.find(c => c.acronym.toUpperCase() === normalized.toUpperCase());
  if (byAcronym) {
    if (format === 'full') return byAcronym.name;
    if (format === 'acronym') return byAcronym.acronym;
    return `${byAcronym.name} (${byAcronym.acronym})`;
  }

  // Check if it's a full name
  const byName = COLLEGES.find(c => c.name.toLowerCase() === normalized.toLowerCase());
  if (byName) {
    if (format === 'full') return byName.name;
    if (format === 'acronym') return byName.acronym;
    return `${byName.name} (${byName.acronym})`;
  }

  // Unknown college — return as-is (e.g., "Others" or custom entries)
  return normalized;
}

/**
 * Resolve a college value to its canonical acronym.
 * Used when storing to database — always store the acronym.
 */
export function resolveCollegeToAcronym(college: string | null | undefined): string | null {
  if (!college) return null;
  const normalized = college.trim();

  const byAcronym = COLLEGES.find(c => c.acronym.toUpperCase() === normalized.toUpperCase());
  if (byAcronym) return byAcronym.acronym;

  const byName = COLLEGES.find(c => c.name.toLowerCase() === normalized.toLowerCase());
  if (byName) return byName.acronym;

  // Unknown college — return as-is
  return normalized || null;
}
