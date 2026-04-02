"use client"

import { useState, useEffect, useRef } from "react"
import { motion, useInView } from "framer-motion"
import {
  Crown,
  Shield,
  Star,
  Mail,
  User,
  ArrowLeftRight,
  ExternalLink,
  PenLine,
  Wallet,
  ClipboardCheck,
  Megaphone,
  ChevronRight,
  Users,
} from "lucide-react"
import Link from "next/link"

/* ══════════════════════════════════════════════════════════════════════
   Types — unchanged from original
   ══════════════════════════════════════════════════════════════════════ */

interface OrgChartNode {
  id: string
  userId: string
  position: string
  positionLabel: string
  orderIndex: number
  email: string | null
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

interface OrgChartData {
  presidentName: string
  presidentTitle: string
  presidentEmail: string | null
  vpName: string
  vpTitle: string
  vpEmail: string | null
  adviserName: string
  adviserTitle: string
  adviserEmail: string | null
}

/* ══════════════════════════════════════════════════════════════════════
   Constants
   ══════════════════════════════════════════════════════════════════════ */

const LINE_COLOR = "#CBD5E1"

const LEVEL_COLORS = {
  level1: { border: "#003366", avatar: "#003366", badge: "#e8eef6", text: "#003366" },
  level2: { border: "#1e40af", avatar: "#1e40af", badge: "#e0e7ff", text: "#1e40af" },
  level3: { border: "#C5A000", avatar: "#C5A000", badge: "#fef9e7", text: "#C5A000" },
  adviser: { border: "#059669", avatar: "#059669", badge: "#ecfdf5", text: "#059669" },
} as const

// Officer card dimensions — 160px min as required
const OFFICER_CARD_W = 160
const OFFICER_CARD_GAP = 12

/* ══════════════════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════════════════ */

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function getPositionIcon(position: string) {
  switch (position) {
    case "PRESIDENT":
      return <Crown className="w-3.5 h-3.5" />
    case "VICE_PRESIDENT_INTERNAL":
      return <ArrowLeftRight className="w-3.5 h-3.5" />
    case "VICE_PRESIDENT_EXTERNAL":
      return <ExternalLink className="w-3.5 h-3.5" />
    case "SECRETARY":
      return <PenLine className="w-3.5 h-3.5" />
    case "TREASURER":
      return <Wallet className="w-3.5 h-3.5" />
    case "AUDITOR":
      return <ClipboardCheck className="w-3.5 h-3.5" />
    case "PUBLIC_RELATION_OFFICER":
      return <Megaphone className="w-3.5 h-3.5" />
    default:
      return <User className="w-3.5 h-3.5" />
  }
}

/* ══════════════════════════════════════════════════════════════════════
   Animation Variants
   ══════════════════════════════════════════════════════════════════════ */

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
}

/* ══════════════════════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════════════════════ */

/* ── Shared text overflow style ── */
const truncateStyle: React.CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: "100%",
}

const breakWordStyle: React.CSSProperties = {
  overflowWrap: "break-word",
  wordWrap: "break-word",
  wordBreak: "break-word",
  overflow: "hidden",
  maxWidth: "100%",
}

/* ── Avatar with initials ── */
function OrgAvatar({
  initials,
  bgColor,
  size = 48,
}: {
  initials: string
  bgColor: string
  size?: number
}) {
  const fontSize =
    size >= 48 ? 14 : size >= 40 ? 12 : size >= 32 ? 10 : 9
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        color: "#ffffff",
        fontSize,
      }}
    >
      {initials}
    </div>
  )
}

/* ── Leader Card (Level 1: President, Level 2: VP) ── */
function LeaderCard({
  name,
  title,
  email,
  initials,
  colors,
  icon,
  compact = false,
}: {
  name: string
  title: string
  email?: string | null
  initials: string
  colors: { border: string; avatar: string; badge: string; text: string }
  icon: React.ReactNode
  compact?: boolean
}) {
  return (
    <motion.div
      className="relative bg-white rounded-xl shadow-md"
      style={{
        maxWidth: compact ? 220 : 280,
        minWidth: compact ? 180 : 220,
        width: "100%",
        border: `2px solid ${colors.border}`,
        overflow: "hidden",
      }}
      whileHover={{
        scale: 1.02,
        boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
      }}
      transition={{ duration: 0.2 }}
    >
      {/* Top color accent bar */}
      <div
        className="w-full"
        style={{ height: 4, backgroundColor: colors.border }}
      />

      <div
        className="flex flex-col items-center"
        style={{
          padding: compact ? "14px 14px 12px" : "20px 18px 16px",
          overflowWrap: "break-word",
          wordBreak: "break-word",
        }}
      >
        {/* Avatar at card top */}
        <OrgAvatar
          initials={initials}
          bgColor={colors.avatar}
          size={compact ? 44 : 52}
        />

        {/* Role badge */}
        <div
          className="mt-2.5 inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wider"
          style={{
            backgroundColor: colors.badge,
            color: colors.text,
            fontSize: compact ? 9 : 10,
            padding: "3px 10px",
            maxWidth: "100%",
            overflow: "hidden",
          }}
        >
          {icon}
          <span style={truncateStyle} className="truncate">
            {title}
          </span>
        </div>

        {/* Name */}
        <h3
          className="mt-2.5 font-bold leading-snug text-center"
          style={{
            fontSize: compact ? 13 : 15,
            maxWidth: "100%",
            ...breakWordStyle,
            color: "#111827",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            whiteSpace: "normal",
          }}
          title={name}
        >
          {name}
        </h3>

        {/* Email */}
        {email && (
          <div
            className="mt-1.5 flex items-center gap-1.5 w-full justify-center"
            style={{ maxWidth: "100%" }}
          >
            <Mail
              className="shrink-0"
              style={{ width: compact ? 11 : 13, height: compact ? 11 : 13, color: "#9CA3AF" }}
            />
            <span
              style={{
                fontSize: compact ? 10 : 11,
                color: "#9CA3AF",
                ...truncateStyle,
              }}
              title={email}
            >
              {email}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ── Officer Card (Level 3) ── */
function OfficerCard({
  name,
  positionLabel,
  email,
  initials,
  positionIcon,
}: {
  name: string
  positionLabel: string
  email?: string | null
  initials: string
  positionIcon: React.ReactNode
}) {
  const c = LEVEL_COLORS.level3

  return (
    <motion.div
      className="relative bg-white rounded-xl shadow-md"
      style={{
        width: OFFICER_CARD_W,
        minWidth: OFFICER_CARD_W,
        maxWidth: OFFICER_CARD_W,
        border: `2px solid ${c.border}`,
        overflow: "hidden",
      }}
      whileHover={{
        scale: 1.03,
        boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
      }}
      transition={{ duration: 0.2 }}
    >
      {/* Top accent bar */}
      <div className="w-full" style={{ height: 3, backgroundColor: c.border }} />

      <div
        className="flex flex-col items-center"
        style={{
          padding: "12px 8px 10px",
          overflowWrap: "break-word",
          wordBreak: "break-word",
        }}
      >
        {/* Avatar */}
        <OrgAvatar initials={initials} bgColor={c.avatar} size={38} />

        {/* Name */}
        <h4
          className="mt-2 font-bold leading-snug text-center"
          style={{
            fontSize: 11,
            maxWidth: "100%",
            color: "#111827",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            whiteSpace: "normal",
            overflow: "hidden",
            wordBreak: "break-word",
            overflowWrap: "break-word",
          }}
          title={name}
        >
          {name}
        </h4>

        {/* Position label */}
        <div
          className="mt-1 font-medium text-center"
          style={{
            fontSize: 9,
            maxWidth: "100%",
            color: "#6B7280",
            ...breakWordStyle,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            whiteSpace: "normal",
          }}
          title={positionLabel}
        >
          {positionLabel}
        </div>

        {/* Email */}
        {email && (
          <div
            className="mt-1 flex items-center gap-1 w-full justify-center"
            style={{ maxWidth: "100%" }}
          >
            <Mail className="shrink-0" style={{ width: 9, height: 9, color: "#9CA3AF" }} />
            <span
              style={{
                fontSize: 8,
                color: "#9CA3AF",
                ...truncateStyle,
              }}
              title={email}
            >
              {email}
            </span>
          </div>
        )}

        {/* Role icon at bottom */}
        <div className="mt-2" style={{ color: c.border }}>
          {positionIcon}
        </div>
      </div>
    </motion.div>
  )
}

/* ── Vertical connector (SVG line) ── */
function VerticalLine({ height = 48 }: { height?: number }) {
  return (
    <div className="flex justify-center">
      <svg width={2} height={height} className="block" aria-hidden="true">
        <line x1={1} y1={0} x2={1} y2={height} stroke={LINE_COLOR} strokeWidth={2} />
      </svg>
    </div>
  )
}

/* ── Tree connector: parent → N children (SVG) ── */
function TreeConnector({ childCount }: { childCount: number }) {
  if (childCount <= 0) return null

  const totalW = childCount * OFFICER_CARD_W + (childCount - 1) * OFFICER_CARD_GAP
  const midY = 24

  return (
    <div className="flex justify-center">
      <svg
        width={totalW}
        height={48}
        viewBox={`0 0 ${totalW} 48`}
        className="block"
        aria-hidden="true"
      >
        {/* Vertical drop from parent centre to horizontal bar */}
        <line
          x1={totalW / 2}
          y1={0}
          x2={totalW / 2}
          y2={midY}
          stroke={LINE_COLOR}
          strokeWidth={2}
        />

        {/* Horizontal bar spanning first-child-centre → last-child-centre */}
        <line
          x1={OFFICER_CARD_W / 2}
          y1={midY}
          x2={totalW - OFFICER_CARD_W / 2}
          y2={midY}
          stroke={LINE_COLOR}
          strokeWidth={2}
        />

        {/* Vertical drops from horizontal bar to each child */}
        {Array.from({ length: childCount }, (_, i) => {
          const cx = i * (OFFICER_CARD_W + OFFICER_CARD_GAP) + OFFICER_CARD_W / 2
          return (
            <line
              key={i}
              x1={cx}
              y1={midY}
              x2={cx}
              y2={48}
              stroke={LINE_COLOR}
              strokeWidth={2}
            />
          )
        })}
      </svg>
    </div>
  )
}

/* ── L-shaped side connector (from VP right side → Adviser) ── */
function SideConnectorL({
  hGap = 24,
  vDrop = 0,
}: {
  hGap?: number
  vDrop?: number
}) {
  return (
    <svg width={hGap} height={Math.max(vDrop, 2)} className="block shrink-0" aria-hidden="true">
      {/* Vertical segment */}
      <line x1={0} y1={0} x2={0} y2={vDrop} stroke={LINE_COLOR} strokeWidth={2} />
      {/* Horizontal segment */}
      <line x1={0} y1={vDrop} x2={hGap} y2={vDrop} stroke={LINE_COLOR} strokeWidth={2} />
    </svg>
  )
}

/* ── Level wrapper: scroll-triggered fade-in ── */
function LevelWrapper({
  children,
  delay = 0,
}: {
  children: React.ReactNode
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}

/* ── Responsive officer grid (shared between tablet & mobile) ── */
function OfficerGrid({
  officers,
  gridClass,
}: {
  officers: OrgChartNode[]
  gridClass: string
}) {
  return (
    <motion.div
      className={gridClass}
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
    >
      {officers.map((officer) => (
        <motion.div key={officer.id} variants={cardVariants} className="flex justify-center">
          <OfficerCard
            name={officer.user.fullName}
            positionLabel={officer.positionLabel}
            email={officer.user.email}
            initials={getInitials(officer.user.fullName)}
            positionIcon={getPositionIcon(officer.position)}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   ORG CHART — Main Export
   ══════════════════════════════════════════════════════════════════════ */

export function OrgChart() {
  const [orgChartData, setOrgChartData] = useState<OrgChartData | null>(null)
  const [officers, setOfficers] = useState<OrgChartNode[]>([])
  const [loading, setLoading] = useState(true)

  /* ── Data fetching ── */
  useEffect(() => {
    async function fetchData() {
      try {
        const [orgRes, officersRes] = await Promise.all([
          fetch("/api/org-chart"),
          fetch("/api/officers"),
        ])

        if (orgRes.ok) {
          const data = await orgRes.json()
          setOrgChartData(data)
        }

        if (officersRes.ok) {
          const data = await officersRes.json()
          setOfficers(data.officers || [])
        }
      } catch (error) {
        console.error("Error fetching org chart data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  /* ── Loading spinner ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div
            className="rounded-full animate-spin"
            style={{
              width: 40,
              height: 40,
              border: `3px solid ${LEVEL_COLORS.level1.border}33`,
              borderTopColor: LEVEL_COLORS.level1.border,
            }}
          />
          <p className="text-sm text-gray-500">Loading organization chart…</p>
        </div>
      </div>
    )
  }

  if (!orgChartData) return null

  const officerCount = officers.length

  /* ──────────────────────────────────────────────────────────────────
     DESKTOP (lg+) — full tree layout with SVG connectors
     Wrapped in overflow-x-auto so very wide trees still work.
     ────────────────────────────────────────────────────────────────── */
  const desktopTree = (
    <div className="hidden lg:block w-full">
      <div
        className="lg:flex lg:flex-col lg:items-center w-full overflow-x-auto"
        style={{ minWidth: "fit-content" }}
      >
        {/* ══ Level 1: University President ══ */}
        <LevelWrapper delay={0}>
          <LeaderCard
            name={orgChartData.presidentName}
            title={orgChartData.presidentTitle}
            email={orgChartData.presidentEmail}
            initials={getInitials(orgChartData.presidentName)}
            colors={LEVEL_COLORS.level1}
            icon={<Crown className="w-3.5 h-3.5" />}
          />
        </LevelWrapper>

        {/* Connector: President → VP */}
        <VerticalLine height={48} />

        {/* ══ Level 2: VP (centred) + Adviser (side) ══ */}
        <div className="relative flex flex-col items-center">
          <LevelWrapper delay={0.1}>
            <div className="flex items-center justify-center" style={{ gap: 0 }}>
              {/* VP Card */}
              <LeaderCard
                name={orgChartData.vpName}
                title={orgChartData.vpTitle}
                email={orgChartData.vpEmail}
                initials={getInitials(orgChartData.vpName)}
                colors={LEVEL_COLORS.level2}
                icon={<Shield className="w-3.5 h-3.5" />}
              />
            </div>
          </LevelWrapper>

          {/* ── Adviser: connected via L-connector to the right ── */}
          <motion.div
            className="flex items-center mt-2"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.45, delay: 0.18, ease: "easeOut" }}
          >
            <SideConnectorL hGap={32} vDrop={0} />
            <LeaderCard
              name={orgChartData.adviserName}
              title={orgChartData.adviserTitle}
              email={orgChartData.adviserEmail}
              initials={getInitials(orgChartData.adviserName)}
              colors={LEVEL_COLORS.adviser}
              icon={<Star className="w-3.5 h-3.5" />}
              compact
            />
          </motion.div>

          {/* Connector: VP → Officers tree */}
          <VerticalLine height={24} />
          <TreeConnector childCount={officerCount} />

          {/* ══ Level 3: Officers ══ */}
          <motion.div
            className="flex justify-center"
            style={{ gap: OFFICER_CARD_GAP }}
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
          >
            {officers.map((officer) => (
              <motion.div key={officer.id} variants={cardVariants}>
                <OfficerCard
                  name={officer.user.fullName}
                  positionLabel={officer.positionLabel}
                  email={officer.user.email}
                  initials={getInitials(officer.user.fullName)}
                  positionIcon={getPositionIcon(officer.position)}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  )

  /* ──────────────────────────────────────────────────────────────────
     TABLET (md–lg) — 2-col grid, no tree connectors
     ────────────────────────────────────────────────────────────────── */
  const tabletView = (
    <div className="hidden md:flex md:flex-col md:items-center md:gap-6 lg:hidden w-full">
      {/* Leaders stacked vertically */}
      <LevelWrapper delay={0}>
        <LeaderCard
          name={orgChartData.presidentName}
          title={orgChartData.presidentTitle}
          email={orgChartData.presidentEmail}
          initials={getInitials(orgChartData.presidentName)}
          colors={LEVEL_COLORS.level1}
          icon={<Crown className="w-3.5 h-3.5" />}
        />
      </LevelWrapper>

      <LevelWrapper delay={0.08}>
        <LeaderCard
          name={orgChartData.vpName}
          title={orgChartData.vpTitle}
          email={orgChartData.vpEmail}
          initials={getInitials(orgChartData.vpName)}
          colors={LEVEL_COLORS.level2}
          icon={<Shield className="w-3.5 h-3.5" />}
        />
      </LevelWrapper>

      <LevelWrapper delay={0.16}>
        <LeaderCard
          name={orgChartData.adviserName}
          title={orgChartData.adviserTitle}
          email={orgChartData.adviserEmail}
          initials={getInitials(orgChartData.adviserName)}
          colors={LEVEL_COLORS.adviser}
          icon={<Star className="w-3.5 h-3.5" />}
        />
      </LevelWrapper>

      {/* Officers: 2-column grid */}
      <OfficerGrid
        officers={officers}
        gridClass="grid grid-cols-2 gap-4 w-full max-w-md mt-2"
      />
    </div>
  )

  /* ──────────────────────────────────────────────────────────────────
     MOBILE (<md) — single column, stacked
     ────────────────────────────────────────────────────────────────── */
  const mobileView = (
    <div className="md:hidden flex flex-col items-center gap-5 w-full">
      <LevelWrapper delay={0}>
        <LeaderCard
          name={orgChartData.presidentName}
          title={orgChartData.presidentTitle}
          email={orgChartData.presidentEmail}
          initials={getInitials(orgChartData.presidentName)}
          colors={LEVEL_COLORS.level1}
          icon={<Crown className="w-3.5 h-3.5" />}
        />
      </LevelWrapper>

      <LevelWrapper delay={0.06}>
        <LeaderCard
          name={orgChartData.vpName}
          title={orgChartData.vpTitle}
          email={orgChartData.vpEmail}
          initials={getInitials(orgChartData.vpName)}
          colors={LEVEL_COLORS.level2}
          icon={<Shield className="w-3.5 h-3.5" />}
        />
      </LevelWrapper>

      <LevelWrapper delay={0.12}>
        <LeaderCard
          name={orgChartData.adviserName}
          title={orgChartData.adviserTitle}
          email={orgChartData.adviserEmail}
          initials={getInitials(orgChartData.adviserName)}
          colors={LEVEL_COLORS.adviser}
          icon={<Star className="w-3.5 h-3.5" />}
        />
      </LevelWrapper>

      {/* Officers: single column */}
      <OfficerGrid
        officers={officers}
        gridClass="flex flex-col items-center gap-3 w-full mt-1"
      />
    </div>
  )

  /* ══════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════ */
  return (
    <div
      className="w-full flex flex-col items-center"
      style={{ overflowWrap: "break-word", wordBreak: "break-word" }}
    >
      {desktopTree}
      {tabletView}
      {mobileView}

      {/* ── CTA: View All Student Assistants ── */}
      <LevelWrapper delay={0.5}>
        <div className="mt-8">
          <Link
            href="/sa-wall"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 group"
          >
            <Users className="w-4 h-4" style={{ color: LEVEL_COLORS.level1.border }} />
            <span
              className="text-sm font-semibold"
              style={{ color: LEVEL_COLORS.level1.border }}
            >
              View All Student Assistants
            </span>
            <ChevronRight
              className="w-4 h-4 opacity-50 group-hover:translate-x-0.5 transition-transform"
              style={{ color: LEVEL_COLORS.level1.border }}
            />
          </Link>
        </div>
      </LevelWrapper>
    </div>
  )
}
