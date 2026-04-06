"use client"

import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { motion, AnimatePresence } from "framer-motion"
import {
  Crown,
  ArrowLeftRight,
  BookOpen,
  PenLine,
  Wallet,
  ClipboardCheck,
  Megaphone,
  ExternalLink,
  Users,
  Building2,
  GraduationCap,
  Mail,
  User,
} from "lucide-react"
import Link from "next/link"
import { getCollegeDisplay } from "@/lib/colleges"

interface OfficerNode {
  id: string
  userId: string
  position: string
  positionLabel: string
  orderIndex: number
  email: string | null
  phone: string | null
  college: string | null
  program: string | null
  officeName: string | null
  officeEmail: string | null
  user: {
    id: string
    firstName: string | null
    lastName: string | null
    middleName: string | null
    email: string
    photoUrl: string | null
    role: string
    isActive: boolean
    fullName: string
  }
}

interface OfficersListProps {
  officers: OfficerNode[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function getPositionIcon(position: string) {
  switch (position) {
    case "PRESIDENT":
      return <Crown className="w-4 h-4" />
    case "VICE_PRESIDENT_INTERNAL":
      return <ArrowLeftRight className="w-4 h-4" />
    case "VICE_PRESIDENT_EXTERNAL":
      return <ExternalLink className="w-4 h-4" />
    case "SECRETARY":
      return <PenLine className="w-4 h-4" />
    case "TREASURER":
      return <Wallet className="w-4 h-4" />
    case "AUDITOR":
      return <ClipboardCheck className="w-4 h-4" />
    case "PUBLIC_RELATION_OFFICER":
      return <Megaphone className="w-4 h-4" />
    default:
      return <Users className="w-4 h-4" />
  }
}

function getPositionColor(position: string) {
  switch (position) {
    case "PRESIDENT":
      return { bg: "#1e3a8a", light: "#1e3a8a" }
    case "VICE_PRESIDENT_INTERNAL":
      return { bg: "#1e40af", light: "#1e40af" }
    case "VICE_PRESIDENT_EXTERNAL":
      return { bg: "#1d4ed8", light: "#1d4ed8" }
    case "SECRETARY":
      return { bg: "#2563eb", light: "#2563eb" }
    case "TREASURER":
      return { bg: "#f59e0b", light: "#f59e0b" }
    case "AUDITOR":
      return { bg: "#d97706", light: "#d97706" }
    case "PUBLIC_RELATION_OFFICER":
      return { bg: "#b45309", light: "#b45309" }
    default:
      return { bg: "#6b7280", light: "#6b7280" }
  }
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

/* ─── Officer Profile Modal ─── */
function OfficerProfileModal({
  officer,
  open,
  onOpenChange,
}: {
  officer: OfficerNode | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!officer) return null

  const colors = getPositionColor(officer.position)
  const icon = getPositionIcon(officer.position)
  const fullName = officer.user.fullName
  const hasData = !!(officer.college || officer.program || officer.officeName || officer.officeEmail || officer.user.email)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="max-h-[85vh] overflow-y-auto"
            >
              <DialogHeader className="sr-only">
                <DialogTitle>{fullName} - Officer Profile</DialogTitle>
                <DialogDescription>Profile information for {fullName}</DialogDescription>
              </DialogHeader>

              {/* Header with gradient */}
              <div className="relative bg-gradient-to-br from-[#0f1b4d] to-[#0d2247] px-6 pt-8 pb-10 text-center">
                {/* Decorative circles */}
                <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-yellow-500/10 blur-xl" />
                <div className="absolute bottom-2 left-4 w-16 h-16 rounded-full bg-blue-500/10 blur-xl" />

                {/* Avatar */}
                <div className="flex justify-center mb-3 relative z-10">
                  <div className="relative">
                    <div className="h-[120px] w-[120px] rounded-full overflow-hidden border-3 border-white/30 flex items-center justify-center shadow-lg">
                      {officer.user.photoUrl ? (
                        <img
                          src={officer.user.photoUrl}
                          alt={fullName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-white font-bold text-3xl">
                          {getInitials(fullName)}
                        </div>
                      )}
                    </div>
                    {/* Position icon badge */}
                    <div
                      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md border-2 border-white/20"
                      style={{ backgroundColor: colors.bg }}
                    >
                      {icon}
                    </div>
                  </div>
                </div>

                {/* Name */}
                <h2 className="text-xl font-bold text-white relative z-10 break-words max-w-[280px] mx-auto">
                  {fullName}
                </h2>

                {/* Position badge */}
                <div className="flex justify-center mt-2 relative z-10">
                  <Badge
                    className="text-xs font-medium px-3 py-1 border"
                    style={{
                      backgroundColor: `${colors.light}20`,
                      color: `${colors.light}`,
                      borderColor: `${colors.light}40`,
                    }}
                  >
                    {officer.positionLabel}
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-6">
                <Separator className="-mx-6" />
                <div className="mt-5 space-y-3.5">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Profile Information
                  </h3>

                  {/* College */}
                  {officer.college ? (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">College</p>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                          {getCollegeDisplay(officer.college, 'both')}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* Program */}
                  {officer.program ? (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0 text-violet-600 dark:text-violet-400">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Program</p>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                          {officer.program}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* Office Assigned */}
                  {officer.officeName ? (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 text-amber-600 dark:text-amber-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Office Assigned</p>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                          {officer.officeName}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* Office Email */}
                  {officer.officeEmail ? (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 text-green-600 dark:text-green-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Office Email</p>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                          {officer.officeEmail}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* UMAK Email */}
                  {officer.user.email ? (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">UMAK Email</p>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                          {officer.user.email}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* Show message if no data available */}
                  {!officer.college && !officer.program && !officer.officeName && !officer.officeEmail && !officer.user.email && (
                    <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                      No profile information available yet.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

export function OfficersList({ officers, open, onOpenChange }: OfficersListProps) {
  const [selectedOfficer, setSelectedOfficer] = useState<OfficerNode | null>(null)

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl p-0 overflow-y-auto"
        >
          <SheetHeader className="p-6 pb-0 bg-gradient-to-b from-[#1e3a8a]/5 to-transparent sticky top-0 z-10 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1e3a8a] flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <SheetTitle className="text-lg">UMak SAS Officers</SheetTitle>
                <SheetDescription>
                  {officers.length} officers serving for the current term
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="p-6 pt-4">
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {officers.map((officer) => {
                const colors = getPositionColor(officer.position)
                const icon = getPositionIcon(officer.position)
                const isPresident = officer.position === "PRESIDENT"

                return (
                  <motion.div key={officer.id} variants={item}>
                    <Card
                      className={`group hover:shadow-lg transition-all duration-300 ${
                        isPresident
                          ? "border-[#1e3a8a]/30 hover:border-[#1e3a8a]/50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {isPresident && (
                        <div className="h-1 rounded-t-xl bg-gradient-to-r from-[#1e3a8a] to-[#f59e0b]" />
                      )}
                      <CardContent className="p-4 text-center">
                        <div className="flex justify-center mb-3">
                          <div className="relative">
                            <Avatar className="w-14 h-14 border-2 shadow-sm" style={{ borderColor: `${colors.light}30` }}>
                              {officer.user.photoUrl ? (
                                <img
                                  src={officer.user.photoUrl}
                                  alt={officer.user.fullName}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <AvatarFallback
                                  className="text-base font-bold text-white"
                                  style={{ backgroundColor: colors.bg }}
                                >
                                  {getInitials(officer.user.fullName)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div
                              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-sm"
                              style={{ backgroundColor: colors.bg }}
                            >
                              {icon}
                            </div>
                          </div>
                        </div>
                      <Badge
                        variant="secondary"
                        className="mb-2 text-[10px] font-medium"
                        style={{
                          backgroundColor: `${colors.light}15`,
                          color: colors.light,
                          border: `1px solid ${colors.light}30`,
                        }}
                      >
                        {officer.positionLabel}
                      </Badge>
                      <h3 className="text-sm font-semibold text-gray-900 leading-tight mt-1">
                        {officer.user.fullName}
                      </h3>
                      {officer.email && (
                        <p className="text-gray-500 text-xs mt-1 truncate">{officer.email}</p>
                      )}

                      {/* View Profile button */}
                      <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-7 text-xs gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedOfficer(officer)
                          }}
                        >
                          <User className="h-3 w-3" />
                          View Profile
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
            </motion.div>

            {/* View Student Assistants Link */}
            <div className="mt-6 pt-6 border-t">
              <Link href="/sa-wall" onClick={() => onOpenChange(false)}>
                <Button className="w-full bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white gap-2 h-11">
                  <BookOpen className="w-4 h-4" />
                  View Student Assistants
                </Button>
              </Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Officer Profile Modal */}
      <OfficerProfileModal
        officer={selectedOfficer}
        open={!!selectedOfficer}
        onOpenChange={(open) => {
          if (!open) setSelectedOfficer(null)
        }}
      />
    </>
  )
}
