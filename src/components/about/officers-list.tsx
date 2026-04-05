"use client"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
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
} from "lucide-react"
import Link from "next/link"

interface OfficerNode {
  id: string
  userId: string
  position: string
  positionLabel: string
  orderIndex: number
  email: string | null
  phone: string | null
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

export function OfficersList({ officers, open, onOpenChange }: OfficersListProps) {
  return (
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
                        <p className="text-gray-400 text-xs mt-1 truncate">{officer.email}</p>
                      )}
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
  )
}
