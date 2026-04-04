"use client";

import { ApplicationFormData } from "@/lib/validations/application";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  Phone,
  Users,
  GraduationCap,
  School,
  Briefcase,
  Award,
  UserCheck,
  FileUp,
  CalendarDays,
  CalendarClock,
  Pencil,
  Mail,
} from "lucide-react";
import { DAYS, TIME_SLOTS, SLOTS_PER_DAY, DAY_KEYS, TIME_SLOT_KEYS } from "@/lib/validations/application";

interface ReviewSectionProps {
  data: ApplicationFormData;
  onEditStep: (step: number) => void;
}

interface SectionHeaderProps {
  title: string;
  icon: React.ReactNode;
  step: number;
  onEdit: () => void;
}

function SectionHeader({ title, icon, step, onEdit }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
          {icon}
        </div>
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onEdit}
        className="gap-1.5 text-muted-foreground hover:text-blue-700"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </Button>
    </div>
  );
}

interface FieldRowProps {
  label: string;
  value?: string | null;
}

function FieldRow({ label, value }: FieldRowProps) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start">
      <span className="w-40 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function EmptyField({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start">
      <span className="w-40 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm italic text-muted-foreground">Not provided</span>
    </div>
  );
}

export function ReviewSection({ data, onEditStep }: ReviewSectionProps) {
  const suffixLabel = (s: string) => {
    const map: Record<string, string> = {
      "Jr.": "Jr.",
      "Sr.": "Sr.",
      "III": "III",
      "IV": "IV",
      "None": "",
    };
    return map[s] || s;
  };

  const fullName = [
    data.firstName,
    data.middleName ? `${data.middleName.charAt(0).toUpperCase()}.` : null,
    data.lastName,
    suffixLabel(data.suffix),
  ]
    .filter(Boolean)
    .join(" ");

  // Build availability summary from boolean array or JSON string
  const getAvailabilitySummary = () => {
    const availability = data.availability || [];
    if (availability.length === 0 && !data.weeklyAvailability) return null;

    const days: { day: string; slots: string[]; count: number }[] = [];

    if (availability.length > 0 && availability.length === SLOTS_PER_DAY * DAYS.length) {
      DAYS.forEach((day, dayIndex) => {
        const slots: string[] = [];
        let count = 0;
        for (let i = 0; i < SLOTS_PER_DAY; i++) {
          const idx = dayIndex * SLOTS_PER_DAY + i;
          if (availability[idx]) {
            slots.push(TIME_SLOTS[i]);
            count++;
          }
        }
        if (count > 0) {
          days.push({ day, slots, count });
        }
      });
    } else if (data.weeklyAvailability) {
      try {
        const parsed = JSON.parse(data.weeklyAvailability) as Record<string, string[]>;
        DAY_KEYS.forEach((dayKey, dayIndex) => {
          const slots = parsed[dayKey] || [];
          if (slots.length > 0) {
            const displaySlots = slots.map((s) => {
              const idx = (TIME_SLOT_KEYS as readonly string[]).indexOf(s);
              return idx >= 0 ? TIME_SLOT_KEYS[idx] : s;
            });
            days.push({ day: DAYS[dayIndex], slots: displaySlots, count: slots.length });
          }
        });
      } catch {
        // ignore
      }
    }

    const totalSlots = days.reduce((sum, d) => sum + d.count, 0);
    return { days, totalSlots };
  };

  const availabilitySummary = getAvailabilitySummary();

  return (
    <div className="space-y-6">
      {/* Step 1: Personal Information */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <SectionHeader
            title="Personal Information"
            icon={<User className="h-4 w-4 text-blue-700 dark:text-amber-500" />}
            step={1}
            onEdit={() => onEditStep(1)}
          />
        </CardHeader>
        <CardContent className="space-y-2">
          <FieldRow label="Full Name" value={fullName} />
          <FieldRow label="Date of Birth" value={data.dateOfBirth} />
          <FieldRow label="Place of Birth" value={data.placeOfBirth} />
          <FieldRow label="Sex" value={data.gender} />
          <FieldRow label="Civil Status" value={data.civilStatus} />
          <FieldRow label="Religion" value={data.religion || undefined} />
          <FieldRow label="Citizenship" value={data.citizenship} />
        </CardContent>
      </Card>

      {/* Step 2: Contact Information */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <SectionHeader
            title="Contact Information"
            icon={<Phone className="h-4 w-4 text-blue-700 dark:text-amber-500" />}
            step={2}
            onEdit={() => onEditStep(2)}
          />
        </CardHeader>
        <CardContent className="space-y-2">
          <FieldRow label="Phone" value={data.phone} />
          <FieldRow label="Alternate Phone" value={data.alternatePhone || undefined} />
          <FieldRow label="Address" value={data.residenceAddress} />
          <FieldRow label="City/Municipality" value={data.residenceCity} />
          <FieldRow label="Zip Code" value={data.residenceZip || undefined} />
        </CardContent>
      </Card>

      {/* Step 3: Family Background */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <SectionHeader
            title="Family Background"
            icon={<Users className="h-4 w-4 text-blue-700 dark:text-amber-500" />}
            step={3}
            onEdit={() => onEditStep(3)}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Father
            </p>
            <div className="space-y-1 rounded-lg bg-muted/50 p-3 dark:bg-muted/20">
              <FieldRow label="Name" value={data.fatherName || undefined} />
              <FieldRow label="Occupation" value={data.fatherOccupation || undefined} />
              <FieldRow label="Contact" value={data.fatherContact || undefined} />
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mother
            </p>
            <div className="space-y-1 rounded-lg bg-muted/50 p-3 dark:bg-muted/20">
              <FieldRow label="Name" value={data.motherName || undefined} />
              <FieldRow label="Maiden Name" value={data.motherMaidenName || undefined} />
              <FieldRow label="Occupation" value={data.motherOccupation || undefined} />
              <FieldRow label="Contact" value={data.motherContact || undefined} />
            </div>
          </div>
          {data.guardianName && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Guardian
              </p>
              <div className="space-y-1 rounded-lg bg-muted/50 p-3 dark:bg-muted/20">
                <FieldRow label="Name" value={data.guardianName} />
                <FieldRow label="Relationship" value={data.guardianRelation || undefined} />
                <FieldRow label="Contact" value={data.guardianContact || undefined} />
              </div>
            </div>
          )}
          {data.siblingsCount && (
            <FieldRow label="Number of Siblings" value={data.siblingsCount} />
          )}
        </CardContent>
      </Card>

      {/* Step 4: Educational Background */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <SectionHeader
            title="Educational Background"
            icon={<GraduationCap className="h-4 w-4 text-blue-700 dark:text-amber-500" />}
            step={4}
            onEdit={() => onEditStep(4)}
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1 rounded-lg bg-muted/50 p-3 dark:bg-muted/20">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Elementary
            </p>
            <FieldRow label="School" value={data.elementarySchool} />
            <FieldRow label="Year Graduated" value={data.elementaryYear} />
          </div>
          <div className="space-y-1 rounded-lg bg-muted/50 p-3 dark:bg-muted/20">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              High School
            </p>
            <FieldRow label="School" value={data.highSchool} />
            <FieldRow label="Year Graduated" value={data.highSchoolYear} />
          </div>
          <div className="space-y-1 rounded-lg bg-muted/50 p-3 dark:bg-muted/20">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Senior High
            </p>
            <FieldRow label="School" value={data.seniorHigh} />
            <FieldRow label="Year Graduated" value={data.seniorHighYear} />
            <FieldRow label="Strand/Track" value={data.seniorHighTrack || undefined} />
          </div>
        </CardContent>
      </Card>

      {/* Step 5: Current Education */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <SectionHeader
            title="Current Education"
            icon={<School className="h-4 w-4 text-blue-700 dark:text-amber-500" />}
            step={5}
            onEdit={() => onEditStep(5)}
          />
        </CardHeader>
        <CardContent className="space-y-2">
          <FieldRow label="Student No." value={data.studentNumber} />
          <FieldRow label="College" value={data.college} />
          <FieldRow label="Program" value={data.program} />
          <FieldRow label="Year Level" value={data.yearLevel} />
          <FieldRow label="Section" value={data.section || undefined} />
          <FieldRow label="GWA" value={data.gwa} />
        </CardContent>
      </Card>

      {/* Step 6: Weekly Availability */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <SectionHeader
            title="Weekly Availability"
            icon={<CalendarClock className="h-4 w-4 text-blue-700 dark:text-amber-500" />}
            step={6}
            onEdit={() => onEditStep(6)}
          />
        </CardHeader>
        <CardContent>
          {availabilitySummary && availabilitySummary.totalSlots > 0 ? (
            <div className="space-y-2">
              <Badge
                variant="secondary"
                className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              >
                <CalendarDays className="mr-1 h-3 w-3" />
                {availabilitySummary.totalSlots} slot{availabilitySummary.totalSlots !== 1 ? "s" : ""} available
              </Badge>
              <div className="space-y-1.5">
                {availabilitySummary.days.map(({ day, slots, count }) => (
                  <div key={day} className="flex items-start gap-2">
                    <span className="w-24 shrink-0 text-xs font-semibold text-muted-foreground">
                      {day}
                    </span>
                    <span className="text-xs">
                      {count === SLOTS_PER_DAY
                        ? "Full day"
                        : `${slots[0]}${count > 1 ? ` - ${slots[slots.length - 1]}` : ""} (${count} slots)`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">No availability set</p>
          )}
        </CardContent>
      </Card>

      {/* Step 7: Skills & Employment */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <SectionHeader
            title="Skills & Employment"
            icon={<Briefcase className="h-4 w-4 text-blue-700 dark:text-amber-500" />}
            step={7}
            onEdit={() => onEditStep(7)}
          />
        </CardHeader>
        <CardContent>
          {data.skills && (
            <div className="mb-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Skills
              </p>
              <p className="text-sm">{data.skills}</p>
            </div>
          )}
          {data.employment && data.employment.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Employment History ({data.employment.length})
              </p>
              {data.employment.map((emp, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-muted/50 p-3 dark:bg-muted/20"
                >
                  <p className="font-medium">{emp.company || "Unknown Company"}</p>
                  <p className="text-sm text-muted-foreground">
                    {emp.position} {emp.duration ? `• ${emp.duration}` : ""}
                  </p>
                  {emp.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{emp.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">No employment history</p>
          )}
        </CardContent>
      </Card>

      {/* Step 8: Trainings */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <SectionHeader
            title="Trainings & Seminars"
            icon={<Award className="h-4 w-4 text-blue-700 dark:text-amber-500" />}
            step={8}
            onEdit={() => onEditStep(8)}
          />
        </CardHeader>
        <CardContent>
          {data.trainings && data.trainings.length > 0 ? (
            <div className="space-y-2">
              {data.trainings.map((t, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-muted/50 p-3 dark:bg-muted/20"
                >
                  <p className="font-medium">{t.name || "Unnamed Training"}</p>
                  <p className="text-sm text-muted-foreground">
                    {t.organizer} {t.date ? `• ${t.date}` : ""}{" "}
                    {t.duration ? `• ${t.duration}` : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              No trainings or seminars listed
            </p>
          )}
        </CardContent>
      </Card>

      {/* Step 9: References */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <SectionHeader
            title="Character References"
            icon={<UserCheck className="h-4 w-4 text-blue-700 dark:text-amber-500" />}
            step={9}
            onEdit={() => onEditStep(9)}
          />
        </CardHeader>
        <CardContent>
          {data.references && data.references.length > 0 ? (
            <div className="space-y-2">
              {data.references.map((ref, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-muted/50 p-3 dark:bg-muted/20"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">
                      {ref.name || `Reference ${i + 1}`}
                    </p>
                    {ref.relationship && (
                      <Badge variant="secondary" className="text-xs">
                        {ref.relationship}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {ref.position} {ref.organization ? `at ${ref.organization}` : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {ref.phone && <span>{ref.phone}</span>}
                    {ref.email && <span>{ref.email}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">No references added</p>
          )}
        </CardContent>
      </Card>

      {/* Step 10: Documents */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <SectionHeader
            title="Documents"
            icon={<FileUp className="h-4 w-4 text-blue-700 dark:text-amber-500" />}
            step={10}
            onEdit={() => onEditStep(10)}
          />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Uploaded Documents
            </p>
            <div className="space-y-1">
              <FieldRow
                label="2x2 Photo"
                value={data.photo ? "✓ Uploaded" : undefined}
              />
              {data.photo ? null : <EmptyField label="2x2 Photo" />}
              <FieldRow
                label="Resume/CV"
                value={data.resume ? "✓ Uploaded" : undefined}
              />
              {data.resume ? null : <EmptyField label="Resume/CV" />}
              <FieldRow
                label="Grade Report"
                value={data.gradeReport ? "✓ Uploaded" : undefined}
              />
              {data.gradeReport ? null : <EmptyField label="Grade Report" />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 11: Email */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <SectionHeader
            title="Contact Email"
            icon={<Mail className="h-4 w-4 text-blue-700 dark:text-amber-500" />}
            step={11}
            onEdit={() => onEditStep(11)}
          />
        </CardHeader>
        <CardContent>
          <FieldRow label="Email Address" value={data.email} />
        </CardContent>
      </Card>
    </div>
  );
}
