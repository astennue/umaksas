import { z } from "zod";

// Custom validators
const nameRegex = /^[a-zA-ZÀ-ÿ\s'\-.]+$/;
const phoneRegex = /^[0-9+\-() ]+$/;
const studentNumberRegex = /^[\d-]+$/;
const zipCodeRegex = /^\d{5}$/;
const gwaRegex = /^\d+(\.\d{0,2})?$/;

// Employment record item
const employmentSchema = z.object({
  company: z.string().optional().default(""),
  position: z.string().optional().default(""),
  duration: z.string().optional().default(""),
  description: z.string().optional().default(""),
});

// Training/seminar item
const trainingSchema = z.object({
  name: z.string().optional().default(""),
  organizer: z.string().optional().default(""),
  date: z.string().optional().default(""),
  duration: z.string().optional().default(""),
});

// Character reference item
const referenceSchema = z.object({
  name: z.string().optional().default(""),
  position: z.string().optional().default(""),
  organization: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  relationship: z.string().optional().default(""),
});

// Step 1: Personal Information
export const step1Schema = z.object({
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .regex(nameRegex, "Name can only contain letters, spaces, hyphens, periods, and apostrophes"),
  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .regex(nameRegex, "Name can only contain letters, spaces, hyphens, periods, and apostrophes"),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((val) => {
      if (!val) return false;
      const d = new Date(val);
      const now = new Date();
      const minAge = new Date(now.getFullYear() - 16, now.getMonth(), now.getDate());
      return !isNaN(d.getTime()) && d <= minAge;
    }, "You must be at least 16 years old"),
  placeOfBirth: z.string().min(1, "Place of birth is required"),
  gender: z.string().min(1, "Sex is required"),
  civilStatus: z.string().min(1, "Civil status is required"),
  citizenship: z.string().min(1, "Citizenship is required"),
  religion: z
    .string()
    .optional()
    .default("")
    .refine((val) => !val || nameRegex.test(val), {
      message: "Invalid characters in religion field",
    }),
  middleName: z
    .string()
    .optional()
    .default("")
    .refine((val) => !val || nameRegex.test(val), {
      message: "Name can only contain letters, spaces, hyphens, periods, and apostrophes",
    }),
  suffix: z.string().optional().default(""),
});

// Step 2: Contact Information
export const step2Schema = z.object({
  phone: z
    .string()
    .min(7, "Phone number must be at least 7 characters")
    .max(20, "Phone number is too long")
    .regex(phoneRegex, "Phone can only contain digits, +, -, (, ), and spaces"),
  alternatePhone: z
    .string()
    .optional()
    .default("")
    .refine((val) => !val || (val.length >= 7 && val.length <= 20 && phoneRegex.test(val)), {
      message: "Phone can only contain digits, +, -, (, ), and spaces (7-20 chars)",
    }),
  residenceAddress: z.string().min(5, "Address must be at least 5 characters"),
  residenceCity: z.string().min(1, "City/Municipality is required"),
  residenceZip: z
    .string()
    .optional()
    .default("")
    .refine((val) => !val || zipCodeRegex.test(val), {
      message: "Zip code must be exactly 5 digits",
    }),
});

// Step 3: Family Background
export const step3Schema = z.object({
  fatherName: z
    .string()
    .optional()
    .default("")
    .refine((val) => !val || nameRegex.test(val), {
      message: "Invalid characters in name",
    }),
  fatherOccupation: z.string().optional().default(""),
  fatherContact: z
    .string()
    .optional()
    .default("")
    .refine((val) => !val || (val.length >= 7 && val.length <= 20 && phoneRegex.test(val)), {
      message: "Phone can only contain digits, +, -, (, ), and spaces (7-20 chars)",
    }),
  motherName: z
    .string()
    .optional()
    .default("")
    .refine((val) => !val || nameRegex.test(val), {
      message: "Invalid characters in name",
    }),
  motherMaidenName: z
    .string()
    .optional()
    .default("")
    .refine((val) => !val || nameRegex.test(val), {
      message: "Invalid characters in name",
    }),
  motherOccupation: z.string().optional().default(""),
  motherContact: z
    .string()
    .optional()
    .default("")
    .refine((val) => !val || (val.length >= 7 && val.length <= 20 && phoneRegex.test(val)), {
      message: "Phone can only contain digits, +, -, (, ), and spaces (7-20 chars)",
    }),
  guardianName: z
    .string()
    .optional()
    .default("")
    .refine((val) => !val || nameRegex.test(val), {
      message: "Invalid characters in name",
    }),
  guardianRelation: z.string().optional().default(""),
  guardianContact: z
    .string()
    .optional()
    .default("")
    .refine((val) => !val || (val.length >= 7 && val.length <= 20 && phoneRegex.test(val)), {
      message: "Phone can only contain digits, +, -, (, ), and spaces (7-20 chars)",
    }),
  siblingsCount: z.string().optional().default(""),
});

// Step 4: Educational Background
export const step4Schema = z.object({
  elementarySchool: z.string().min(1, "Elementary school is required"),
  elementaryYear: z.string().min(1, "Year graduated is required"),
  highSchool: z.string().min(1, "High school is required"),
  highSchoolYear: z.string().min(1, "Year graduated is required"),
  seniorHigh: z.string().min(1, "Senior high school is required"),
  seniorHighYear: z.string().min(1, "Year graduated is required"),
  seniorHighTrack: z.string().optional().default(""),
});

// Step 5: Current Education
export const step5Schema = z.object({
  studentNumber: z
    .string()
    .min(5, "Student number must be at least 5 characters")
    .regex(studentNumberRegex, "Student number can only contain digits and hyphens"),
  college: z.string().min(1, "College is required"),
  program: z.string().min(1, "Program/Course is required"),
  yearLevel: z.enum(["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Irregular"], "Please select a valid year level"),
  gwa: z
    .string()
    .min(1, "GWA is required")
    .refine((val) => gwaRegex.test(val), "GWA must be a valid number (e.g., 1.25, 1.5, 2.0)")
    .refine((val) => {
      const num = parseFloat(val);
      return num >= 1.0 && num <= 5.0;
    }, "GWA must be between 1.00 and 5.00"),
  section: z.string().optional().default(""),
});

// Step 6: Weekly Availability
export const step6Schema = z.object({
  availability: z.array(z.boolean()).optional().default([]),
  weeklyAvailability: z.string().optional().default(""),
});

// Step 7: Skills & Employment
export const step7Schema = z.object({
  employment: z.array(employmentSchema).optional().default([]),
  skills: z.string().optional().default(""),
});

// Step 8: Trainings & Seminars
export const step8Schema = z.object({
  trainings: z.array(trainingSchema).optional().default([]),
});

// Step 9: References
export const step9Schema = z.object({
  references: z.array(referenceSchema).optional().default([]),
});

// Step 10: Documents (required only photo, resume, gradeReport)
export const step10Schema = z.object({
  photo: z.string().min(1, "2x2 ID photo is required"),
  resume: z.string().min(1, "Resume/CV is required"),
  gradeReport: z.string().min(1, "Report Card / Grades is required"),
});

// Step 11: Review & Submit
export const step11Schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  confirmAccurate: z.literal(true, {
    message: "You must confirm all information is true and accurate",
  }),
  agreeTerms: z.literal(true, {
    message: "You must agree to the terms and conditions",
  }),
});

// Full form schema
export const applicationFormSchema = z.object({
  // Step 1: Personal Information
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .regex(nameRegex, "Name can only contain letters, spaces, hyphens, periods, and apostrophes"),
  middleName: z
    .string()
    .optional()
    .default("")
    .refine((val) => !val || nameRegex.test(val), {
      message: "Name can only contain letters, spaces, hyphens, periods, and apostrophes",
    }),
  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .regex(nameRegex, "Name can only contain letters, spaces, hyphens, periods, and apostrophes"),
  suffix: z.string().optional().default(""),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((val) => {
      if (!val) return false;
      const d = new Date(val);
      const now = new Date();
      const minAge = new Date(now.getFullYear() - 16, now.getMonth(), now.getDate());
      return !isNaN(d.getTime()) && d <= minAge;
    }, "You must be at least 16 years old"),
  placeOfBirth: z.string().min(1, "Place of birth is required"),
  gender: z.string().min(1, "Sex is required"),
  civilStatus: z.string().min(1, "Civil status is required"),
  citizenship: z.string().min(1, "Citizenship is required"),
  religion: z
    .string()
    .optional()
    .default("")
    .refine((val) => !val || nameRegex.test(val), {
      message: "Invalid characters in religion field",
    }),

  // Step 2: Contact Information
  phone: z
    .string()
    .min(7, "Phone number must be at least 7 characters")
    .max(20, "Phone number is too long")
    .regex(phoneRegex, "Phone can only contain digits, +, -, (, ), and spaces"),
  alternatePhone: z
    .string()
    .optional()
    .default("")
    .refine((val) => !val || (val.length >= 7 && val.length <= 20 && phoneRegex.test(val)), {
      message: "Phone can only contain digits, +, -, (, ), and spaces (7-20 chars)",
    }),
  residenceAddress: z.string().min(5, "Address must be at least 5 characters"),
  residenceCity: z.string().min(1, "City/Municipality is required"),
  residenceZip: z
    .string()
    .optional()
    .default("")
    .refine((val) => !val || zipCodeRegex.test(val), {
      message: "Zip code must be exactly 5 digits",
    }),

  // Step 3: Family Background
  fatherName: z.string().optional().default(""),
  fatherOccupation: z.string().optional().default(""),
  fatherContact: z.string().optional().default(""),
  motherName: z.string().optional().default(""),
  motherMaidenName: z.string().optional().default(""),
  motherOccupation: z.string().optional().default(""),
  motherContact: z.string().optional().default(""),
  guardianName: z.string().optional().default(""),
  guardianRelation: z.string().optional().default(""),
  guardianContact: z.string().optional().default(""),
  siblingsCount: z.string().optional().default(""),

  // Step 4: Educational Background
  elementarySchool: z.string().min(1, "Elementary school is required"),
  elementaryYear: z.string().min(1, "Year graduated is required"),
  highSchool: z.string().min(1, "High school is required"),
  highSchoolYear: z.string().min(1, "Year graduated is required"),
  seniorHigh: z.string().min(1, "Senior high school is required"),
  seniorHighYear: z.string().min(1, "Year graduated is required"),
  seniorHighTrack: z.string().optional().default(""),

  // Step 5: Current Education
  studentNumber: z
    .string()
    .min(5, "Student number must be at least 5 characters")
    .regex(studentNumberRegex, "Student number can only contain digits and hyphens"),
  college: z.string().min(1, "College is required"),
  program: z.string().min(1, "Program/Course is required"),
  yearLevel: z.enum(["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Irregular"], "Please select a valid year level"),
  gwa: z
    .string()
    .min(1, "GWA is required")
    .refine((val) => gwaRegex.test(val), "GWA must be a valid number (e.g., 1.25, 1.5, 2.0)")
    .refine((val) => {
      const num = parseFloat(val);
      return num >= 1.0 && num <= 5.0;
    }, "GWA must be between 1.00 and 5.00"),
  section: z.string().optional().default(""),

  // Step 6: Weekly Availability
  availability: z.array(z.boolean()).optional().default([]),
  weeklyAvailability: z.string().optional().default(""),

  // Step 7: Skills & Employment
  employment: z.array(employmentSchema).optional().default([]),
  skills: z.string().optional().default(""),

  // Step 8: Trainings & Seminars
  trainings: z.array(trainingSchema).optional().default([]),

  // Step 9: References
  references: z.array(referenceSchema).optional().default([]),

  // Step 10: Documents
  photo: z.string().min(1, "2x2 ID photo is required"),
  resume: z.string().min(1, "Resume/CV is required"),
  gradeReport: z.string().min(1, "Report Card / Grades is required"),

  // Step 11: Review & Submit
  email: z.string().email("Please enter a valid email address"),
  confirmAccurate: z.literal(true, {
    message: "You must confirm all information is true and accurate",
  }),
  agreeTerms: z.literal(true, {
    message: "You must agree to the terms and conditions",
  }),
});

export type ApplicationFormData = z.infer<typeof applicationFormSchema>;

// Step schema map (0-indexed) — 11 steps
export const stepSchemaMap = {
  0: step1Schema,
  1: step2Schema,
  2: step3Schema,
  3: step4Schema,
  4: step5Schema,
  5: step6Schema,
  6: step7Schema,
  7: step8Schema,
  8: step9Schema,
  9: step10Schema,
  10: step11Schema,
} as const;

// Availability constants — 11 time slots × 5 days = 55 total
export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

export const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const;

export const TIME_SLOTS = [
  "7:00 AM",
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
] as const;

export const TIME_SLOT_KEYS = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
] as const;

export const SLOTS_PER_DAY = 11;
export const TOTAL_SLOTS = 55; // 5 days × 11 time slots

// Generate 55 false values for default availability
const defaultAvailability = Array(TOTAL_SLOTS).fill(false) as boolean[];

// Convert boolean array to weeklyAvailability JSON string
export function availabilityToJson(availability: boolean[]): string {
  const result: Record<string, string[]> = {};
  DAY_KEYS.forEach((dayKey, dayIndex) => {
    const slots: string[] = [];
    for (let i = 0; i < SLOTS_PER_DAY; i++) {
      const idx = dayIndex * SLOTS_PER_DAY + i;
      if (availability[idx]) {
        slots.push(TIME_SLOT_KEYS[i]);
      }
    }
    result[dayKey] = slots;
  });
  return JSON.stringify(result);
}

// Convert weeklyAvailability JSON string to boolean array
export function jsonToAvailability(json: string): boolean[] {
  try {
    const parsed = JSON.parse(json) as Record<string, string[]>;
    const result = Array(TOTAL_SLOTS).fill(false) as boolean[];
    DAY_KEYS.forEach((dayKey, dayIndex) => {
      const slots = parsed[dayKey] || [];
      slots.forEach((slotKey) => {
        const timeIndex = (TIME_SLOT_KEYS as readonly string[]).indexOf(slotKey);
        if (timeIndex >= 0) {
          result[dayIndex * SLOTS_PER_DAY + timeIndex] = true;
        }
      });
    });
    return result;
  } catch {
    return Array(TOTAL_SLOTS).fill(false) as boolean[];
  }
}

export const defaultFormValues: ApplicationFormData = {
  // Step 1: Personal Info
  firstName: "",
  middleName: "",
  lastName: "",
  suffix: "",
  dateOfBirth: "",
  placeOfBirth: "",
  gender: "",
  civilStatus: "",
  citizenship: "Filipino",
  religion: "",

  // Step 2: Contact
  phone: "",
  alternatePhone: "",
  residenceAddress: "",
  residenceCity: "",
  residenceZip: "",

  // Step 3: Family
  fatherName: "",
  fatherOccupation: "",
  fatherContact: "",
  motherName: "",
  motherMaidenName: "",
  motherOccupation: "",
  motherContact: "",
  guardianName: "",
  guardianRelation: "",
  guardianContact: "",
  siblingsCount: "",

  // Step 4: Education
  elementarySchool: "",
  elementaryYear: "",
  highSchool: "",
  highSchoolYear: "",
  seniorHigh: "",
  seniorHighYear: "",
  seniorHighTrack: "",

  // Step 5: Current Education
  studentNumber: "",
  college: "",
  program: "",
  yearLevel: undefined as unknown as "1st Year",
  gwa: "",
  section: "",

  // Step 6: Weekly Availability
  availability: defaultAvailability,
  weeklyAvailability: "",

  // Step 7: Employment
  employment: [],
  skills: "",

  // Step 8: Trainings
  trainings: [],

  // Step 9: References
  references: [
    { name: "", position: "", organization: "", phone: "", email: "", relationship: "" },
    { name: "", position: "", organization: "", phone: "", email: "", relationship: "" },
    { name: "", position: "", organization: "", phone: "", email: "", relationship: "" },
  ],

  // Step 10: Documents
  photo: "",
  resume: "",
  gradeReport: "",

  // Step 11: Confirmation
  email: "",
  confirmAccurate: false as unknown as true,
  agreeTerms: false as unknown as true,
};

// Step metadata for UI (11 steps)
export const STEPS = [
  { id: 1, title: "Personal Info", shortTitle: "Personal", description: "Basic personal details", icon: "User" },
  { id: 2, title: "Contact", shortTitle: "Contact", description: "Phone & address", icon: "Phone" },
  { id: 3, title: "Family", shortTitle: "Family", description: "Parent & guardian info", icon: "Users" },
  { id: 4, title: "Education", shortTitle: "Education", description: "Academic history", icon: "GraduationCap" },
  { id: 5, title: "Current", shortTitle: "Current", description: "Current enrollment", icon: "School" },
  { id: 6, title: "Availability", shortTitle: "Schedule", description: "Weekly availability", icon: "CalendarClock" },
  { id: 7, title: "Employment", shortTitle: "Employment", description: "Work experience", icon: "Briefcase" },
  { id: 8, title: "Trainings", shortTitle: "Trainings", description: "Seminars attended", icon: "Award" },
  { id: 9, title: "References", shortTitle: "References", description: "Character references", icon: "UserCheck" },
  { id: 10, title: "Documents", shortTitle: "Documents", description: "Upload requirements", icon: "FileUp" },
  { id: 11, title: "Submit", shortTitle: "Submit", description: "Review & submit", icon: "CheckCircle" },
] as const;

// Field keys per step for partial form data extraction
export const stepFields: Record<number, string[]> = {
  0: [
    "firstName", "middleName", "lastName", "suffix", "dateOfBirth",
    "placeOfBirth", "gender", "civilStatus", "citizenship", "religion",
  ],
  1: ["phone", "alternatePhone", "residenceAddress", "residenceCity", "residenceZip"],
  2: [
    "fatherName", "fatherOccupation", "fatherContact",
    "motherName", "motherMaidenName", "motherOccupation", "motherContact",
    "guardianName", "guardianRelation", "guardianContact", "siblingsCount",
  ],
  3: [
    "elementarySchool", "elementaryYear", "highSchool", "highSchoolYear",
    "seniorHigh", "seniorHighYear", "seniorHighTrack",
  ],
  4: ["studentNumber", "college", "program", "yearLevel", "gwa", "section"],
  5: ["availability", "weeklyAvailability"],
  6: ["employment", "skills"],
  7: ["trainings"],
  8: ["references"],
  9: ["photo", "resume", "gradeReport"],
  10: ["email", "confirmAccurate", "agreeTerms"],
};

export const COLLEGES = [
  "College of Computer Studies",
  "College of Business Administration",
  "College of Accountancy",
  "College of Law",
  "College of Education",
  "College of Arts and Sciences",
  "College of Engineering and Technology",
  "College of Architecture and Design",
  "College of Tourism and Hospitality Management",
  "College of Criminal Justice Education",
  "College of Music and Arts",
  "College of Nursing",
  "College of Physical Therapy",
  "College of Medical Technology",
  "College of Pharmacy",
  "College of Public Administration",
  "College of Social Work and Community Development",
  "College of Informatics and Computing Studies",
  "College of Environmental Studies",
  "College of Sports Science and Physical Education",
] as const;

export const PROGRAMS_BY_COLLEGE: Record<string, string[]> = {
  "College of Computer Studies": ["BS Computer Science", "BS Information Technology", "BS Information Systems"],
  "College of Business Administration": ["BS Business Administration", "BS Marketing Management", "BS Human Resource Management", "BS Office Administration"],
  "College of Accountancy": ["BS Accountancy", "BS Internal Auditing", "BS Management Accounting"],
  "College of Law": ["BS Legal Management", "BS Political Science", "AB Juris Doctor"],
  "College of Education": ["BS Elementary Education", "BS Secondary Education", "BEED", "BTLED"],
  "College of Arts and Sciences": ["BA English Language", "BA Filipino", "BA Political Science", "BA Communication", "AB History"],
  "College of Engineering and Technology": ["BS Computer Engineering", "BS Electronics Engineering", "BS Civil Engineering", "BS Electrical Engineering"],
  "College of Architecture and Design": ["BS Architecture", "BS Interior Design"],
  "College of Tourism and Hospitality Management": ["BS Tourism Management", "BS Hospitality Management"],
  "College of Criminal Justice Education": ["BS Criminology", "BS Customs Administration"],
  "College of Music and Arts": ["AB Music", "AB Theater Arts", "AB Communication Arts"],
  "College of Nursing": ["BS Nursing"],
  "College of Physical Therapy": ["BS Physical Therapy"],
  "College of Medical Technology": ["BS Medical Technology", "BS Radiologic Technology"],
  "College of Pharmacy": ["BS Pharmacy"],
  "College of Public Administration": ["BS Public Administration", "BS Public Safety Administration"],
  "College of Social Work and Community Development": ["BS Social Work", "BS Community Development"],
  "College of Informatics and Computing Studies": ["BS Informatics", "BS Library and Information Science"],
  "College of Environmental Studies": ["BS Environmental Science", "BS Environmental Planning"],
  "College of Sports Science and Physical Education": ["BS Sports Science", "BS Physical Education"],
};
