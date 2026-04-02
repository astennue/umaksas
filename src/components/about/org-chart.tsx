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
  Building2,
  GraduationCap,
  UserCog,
} from "lucide-react"
import Link from "next/link"

/* ══════════════════════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════════════════════ */

interface OrgChartNode {
  id: string
  userId: string
  position: string
  positionLabel: string
  orderIndex: number
  email: string | null
  phone?: string | null
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

const LINE_COLOR = "#94A3B8" // slate-400, slightly darker for visibility

const COLORS = {
  l1: { border: "#003366", avatar: "#003366", badge: "#e8eef6", text: "#003366" },
  l2: { border: "#1e40af", avatar: "#1e40af", badge: "#e0e7ff", text: "#1e40af" },
  l3: { border: "#059669", avatar: "#059669", badge: "#ecfdf5", text: "#059669" },
  l4: { border: "#C5A000", avatar: "#C5A000", badge: "#fef9e7", text: "#C5A000" },
  l5: { border: "#D4B860", avatar: "#C5A000", badge: "#fef3c7", text: "#92710c" },
} as const

type LevelColorKey = keyof typeof COLORS

// Officer card dimensions
const OFFICER_CARD_W = 156
const OFFICER_CARD_GAP = 14

// Position display order for L5 officers
const POSITION_ORDER: Record<string, number> = {
  VICE_PRESIDENT_INTERNAL: 0,
  VICE_PRESIDENT_EXTERNAL: 1,
  SECRETARY: 2,
  TREASURER: 3,
  AUDITOR: 4,
  PUBLIC_RELATION_OFFICER: 5,
}

// Short position labels for officer cards (compact display)
const SHORT_POSITION_LABELS: Record<string, string> = {
  VICE_PRESIDENT_INTERNAL: "VP - Internal",
  VICE_PRESIDENT_EXTERNAL: "VP - External",
  SECRETARY: "Secretary",
  TREASURER: "Treasurer",
  AUDITOR: "Auditor",
  PUBLIC_RELATION_OFFICER: "PRO",
}

// Level labels for mobile view
const LEVEL_LABELS: Record<string, string> = {
  l1: "University President",
  l2: "OVPSSCD",
  l3: "SAS Adviser",
  l4: "SAS President",
  l5: "Officers",
}

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

function sortOfficersByPosition(offs: OrgChartNode[]): OrgChartNode[] {
  return [...offs].sort((a, b) => {
    const orderA = POSITION_ORDER[a.position] ?? 99
    const orderB = POSITION_ORDER[b.position] ?? 99
    if (orderA !== orderB) return orderA - orderB
    return a.orderIndex - b.orderIndex
  })
}

/* ══════════════════════════════════════════════════════════════════════
   Animation Variants
   ══════════════════════════════════════════════════════════════════════ */

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
}

/* ══════════════════════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════════════════════ */

/* ── Text overflow utilities ── */
const truncateStyle: React.CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: "100%",
  display: "block",
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
  const fontSize = size >= 52 ? 16 : size >= 44 ? 14 : size >= 38 ? 12 : 10
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm"
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        color: "#ffffff",
        fontSize,
        letterSpacing: "0.02em",
      }}
    >
      {initials}
    </div>
  )
}

/* ── Leader Card (used for L1–L4) ── */
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
        maxWidth: compact ? 240 : 300,
        minWidth: compact ? 200 : 260,
        width: "100%",
        border: `2px solid ${colors.border}`,
        overflow: "hidden",
      }}
      whileHover={{
        scale: 1.03,
        boxShadow: "0 10px 35px rgba(0,0,0,0.13)",
      }}
      transition={{ duration: 0.2 }}
    >
      {/* Top accent bar */}
      <div className="w-full" style={{ height: 4, backgroundColor: colors.border }} />

      <div
        className="flex flex-col items-center"
        style={{
          padding: compact ? "14px 16px 12px" : "22px 20px 18px",
          overflowWrap: "break-word",
          wordBreak: "break-word",
        }}
      >
        <OrgAvatar
          initials={initials}
          bgColor={colors.avatar}
          size={compact ? 44 : 54}
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
            color: "#111827",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            whiteSpace: "normal",
            ...breakWordStyle,
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
              style={{
                width: compact ? 11 : 13,
                height: compact ? 11 : 13,
                color: "#9CA3AF",
              }}
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

/* ── Officer Card (used for L5) ── */
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
  const c = COLORS.l5

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
        scale: 1.04,
        boxShadow: "0 8px 30px rgba(0,0,0,0.13)",
        borderColor: "#C5A000",
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
            <Mail
              className="shrink-0"
              style={{ width: 9, height: 9, color: "#9CA3AF" }}
            />
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

        {/* Role icon */}
        <div className="mt-2" style={{ color: c.text }}>
          {positionIcon}
        </div>
      </div>
    </motion.div>
  )
}

/* ── Vertical connector line (single parent → single child) ── */
function VerticalLine({ height = 48 }: { height?: number }) {
  return (
    <div className="flex justify-center" aria-hidden="true">
      <svg width={2} height={height} className="block">
        <line
          x1={1}
          y1={0}
          x2={1}
          y2={height}
          stroke={LINE_COLOR}
          strokeWidth={2}
        />
      </svg>
    </div>
  )
}

/* ── Tree branch connector: 1 parent → N children (SVG) ── */
function TreeBranchConnector({ childCount }: { childCount: number }) {
  if (childCount <= 0) return null
  if (childCount === 1) return <VerticalLine height={48} />

  const totalW =
    childCount * OFFICER_CARD_W + (childCount - 1) * OFFICER_CARD_GAP
  const midY = 24
  const firstChildCenter = OFFICER_CARD_W / 2
  const lastChildCenter = totalW - OFFICER_CARD_W / 2

  return (
    <div className="flex justify-center" aria-hidden="true">
      <svg
        width={totalW}
        height={48}
        viewBox={`0 0 ${totalW} 48`}
        className="block"
      >
        {/* Vertical drop from parent center to horizontal bar */}
        <line
          x1={totalW / 2}
          y1={0}
          x2={totalW / 2}
          y2={midY}
          stroke={LINE_COLOR}
          strokeWidth={2}
        />
        {/* Horizontal bar spanning first to last child center */}
        <line
          x1={firstChildCenter}
          y1={midY}
          x2={lastChildCenter}
          y2={midY}
          stroke={LINE_COLOR}
          strokeWidth={2}
        />
        {/* Vertical drops to each child */}
        {Array.from({ length: childCount }, (_, i) => {
          const cx =
            i * (OFFICER_CARD_W + OFFICER_CARD_GAP) + OFFICER_CARD_W / 2
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

/* ── Level wrapper: scroll-triggered fade-in ── */
function LevelWrapper({
  children,
  delay = 0,
}: {
  children: React.ReactNode
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-40px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 22 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}

/* ── Level badge (mobile only) ── */
function LevelBadge({
  label,
  color,
  icon,
}: {
  label: string
  color: string
  icon: React.ReactNode
}) {
  return (
    <div
      className="flex items-center gap-1.5 mb-2"
      style={{ color }}
    >
      {icon}
      <span className="text-xs font-semibold uppercase tracking-widest">
        {label}
      </span>
    </div>
  )
}

/* ── Student Assistants Link Button ── */
function SAWallLink() {
  return (
    <LevelWrapper delay={0.7}>
      <Link
        href="/sa-wall"
        className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-white border-2 border-gray-200 shadow-sm hover:shadow-lg hover:border-[#C5A000] transition-all duration-200 group"
      >
        <Users
          className="w-4.5 h-4.5 transition-colors duration-200 group-hover:text-[#C5A000]"
          style={{ color: "#003366" }}
        />
        <span
          className="text-sm font-bold transition-colors duration-200 group-hover:text-[#C5A000]"
          style={{ color: "#003366" }}
        >
          Student Assistants
        </span>
        <ChevronRight
          className="w-4 h-4 opacity-40 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all duration-200"
          style={{ color: "#003366" }}
        />
      </Link>
    </LevelWrapper>
  )
}

/* ── Officer Grid (shared between tablet & mobile) ── */
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
      viewport={{ once: true, margin: "-30px" }}
    >
      {officers.map((officer) => (
        <motion.div key={officer.id} variants={cardVariants} className="flex justify-center">
          <OfficerCard
            name={officer.user.fullName}
            positionLabel={
              SHORT_POSITION_LABELS[officer.position] || officer.positionLabel
            }
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
   Level icon helper
   ══════════════════════════════════════════════════════════════════════ */

function getLevelIcon(level: string) {
  switch (level) {
    case "l1":
      return <Building2 className="w-3 h-3" />
    case "l2":
      return <Shield className="w-3 h-3" />
    case "l3":
      return <Star className="w-3 h-3" />
    case "l4":
      return <Crown className="w-3 h-3" />
    case "l5":
      return <UserCog className="w-3 h-3" />
    default:
      return <User className="w-3 h-3" />
  }
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT — OrgChart
   ══════════════════════════════════════════════════════════════════════ */

export function OrgChart() {
  const [orgChartData, setOrgChartData] = useState<OrgChartData | null>(null)
  const [allOfficers, setAllOfficers] = useState<OrgChartNode[]>([])
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
          // Officers API returns all non-adviser officers (including PRESIDENT)
          setAllOfficers(data.officers || [])
        }
      } catch (error) {
        console.error("Error fetching org chart data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  /* ── Derived data ── */
  const sasPresident = allOfficers.find((o) => o.position === "PRESIDENT")
  const otherOfficers = sortOfficersByPosition(
    allOfficers.filter((o) => o.position !== "PRESIDENT")
  )

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div
            className="rounded-full animate-spin"
            style={{
              width: 40,
              height: 40,
              border: `3px solid ${COLORS.l1.border}33`,
              borderTopColor: COLORS.l1.border,
            }}
          />
          <p className="text-sm text-gray-500">Loading organization chart…</p>
        </div>
      </div>
    )
  }

  if (!orgChartData) return null

  const officerCount = otherOfficers.length

  /* ══════════════════════════════════════════════════════════════════════
     DESKTOP (lg+) — Full tree layout with SVG connectors
     ══════════════════════════════════════════════════════════════════════ */
  const desktopTree = (
    <div className="hidden lg:flex lg:flex-col lg:items-center w-full overflow-x-auto pb-4">
      <div
        className="flex flex-col items-center"
        style={{ minWidth: "fit-content" }}
      >
        {/* ══ L1: UMak President ══ */}
        <LevelWrapper delay={0}>
          <LeaderCard
            name={orgChartData.presidentName}
            title={orgChartData.presidentTitle}
            email={orgChartData.presidentEmail}
            initials={getInitials(orgChartData.presidentName)}
            colors={COLORS.l1}
            icon={<Building2 className="w-3.5 h-3.5" />}
          />
        </LevelWrapper>

        {/* Connector L1 → L2 */}
        <VerticalLine height={44} />

        {/* ══ L2: OVPSSCD ══ */}
        <LevelWrapper delay={0.1}>
          <LeaderCard
            name={orgChartData.vpName}
            title={orgChartData.vpTitle}
            email={orgChartData.vpEmail}
            initials={getInitials(orgChartData.vpName)}
            colors={COLORS.l2}
            icon={<Shield className="w-3.5 h-3.5" />}
            compact
          />
        </LevelWrapper>

        {/* Connector L2 → L3 */}
        <VerticalLine height={44} />

        {/* ══ L3: SAS Adviser ══ */}
        <LevelWrapper delay={0.2}>
          <LeaderCard
            name={orgChartData.adviserName}
            title={orgChartData.adviserTitle}
            email={orgChartData.adviserEmail}
            initials={getInitials(orgChartData.adviserName)}
            colors={COLORS.l3}
            icon={<Star className="w-3.5 h-3.5" />}
          />
        </LevelWrapper>

        {/* Connector L3 → L4 */}
        <VerticalLine height={44} />

        {/* ══ L4: SAS President ══ */}
        {sasPresident ? (
          <LevelWrapper delay={0.3}>
            <LeaderCard
              name={sasPresident.user.fullName}
              title={sasPresident.positionLabel}
              email={sasPresident.user.email}
              initials={getInitials(sasPresident.user.fullName)}
              colors={COLORS.l4}
              icon={<Crown className="w-3.5 h-3.5" />}
            />
          </LevelWrapper>
        ) : (
          <LevelWrapper delay={0.3}>
            <div
              className="px-6 py-3 rounded-xl border-2 border-dashed text-center"
              style={{ borderColor: COLORS.l4.border, maxWidth: 260 }}
            >
              <p className="text-sm font-medium" style={{ color: COLORS.l4.text }}>
                No SAS President assigned
              </p>
            </div>
          </LevelWrapper>
        )}

        {/* Connector L4 → L5 */}
        {officerCount > 0 && (
          <>
            <TreeBranchConnector childCount={officerCount} />

            {/* ══ L5: Officers ══ */}
            <motion.div
              className="flex"
              style={{ gap: OFFICER_CARD_GAP }}
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-30px" }}
            >
              {otherOfficers.map((officer) => (
                <motion.div key={officer.id} variants={cardVariants}>
                  <OfficerCard
                    name={officer.user.fullName}
                    positionLabel={
                      SHORT_POSITION_LABELS[officer.position] ||
                      officer.positionLabel
                    }
                    email={officer.user.email}
                    initials={getInitials(officer.user.fullName)}
                    positionIcon={getPositionIcon(officer.position)}
                  />
                </motion.div>
              ))}
            </motion.div>
          </>
        )}

        {/* Connector L5 → L6 (Student Assistants) */}
        {officerCount > 0 && <VerticalLine height={36} />}

        {/* ══ L6: Student Assistants Link ══ */}
        <SAWallLink />
      </div>
    </div>
  )

  /* ══════════════════════════════════════════════════════════════════════
     TABLET (md–lg) — Stacked cards with vertical line connectors
     ══════════════════════════════════════════════════════════════════════ */
  const tabletView = (
    <div className="hidden md:flex md:flex-col md:items-center lg:hidden w-full">
      {/* L1: UMak President */}
      <LevelWrapper delay={0}>
        <LeaderCard
          name={orgChartData.presidentName}
          title={orgChartData.presidentTitle}
          email={orgChartData.presidentEmail}
          initials={getInitials(orgChartData.presidentName)}
          colors={COLORS.l1}
          icon={<Building2 className="w-3.5 h-3.5" />}
        />
      </LevelWrapper>

      <VerticalLine height={32} />

      {/* L2: OVPSSCD */}
      <LevelWrapper delay={0.08}>
        <LeaderCard
          name={orgChartData.vpName}
          title={orgChartData.vpTitle}
          email={orgChartData.vpEmail}
          initials={getInitials(orgChartData.vpName)}
          colors={COLORS.l2}
          icon={<Shield className="w-3.5 h-3.5" />}
        />
      </LevelWrapper>

      <VerticalLine height={32} />

      {/* L3: SAS Adviser */}
      <LevelWrapper delay={0.16}>
        <LeaderCard
          name={orgChartData.adviserName}
          title={orgChartData.adviserTitle}
          email={orgChartData.adviserEmail}
          initials={getInitials(orgChartData.adviserName)}
          colors={COLORS.l3}
          icon={<Star className="w-3.5 h-3.5" />}
        />
      </LevelWrapper>

      <VerticalLine height={32} />

      {/* L4: SAS President */}
      {sasPresident ? (
        <LevelWrapper delay={0.24}>
          <LeaderCard
            name={sasPresident.user.fullName}
            title={sasPresident.positionLabel}
            email={sasPresident.user.email}
            initials={getInitials(sasPresident.user.fullName)}
            colors={COLORS.l4}
            icon={<Crown className="w-3.5 h-3.5" />}
          />
        </LevelWrapper>
      ) : (
        <LevelWrapper delay={0.24}>
          <div
            className="px-5 py-2.5 rounded-xl border-2 border-dashed text-center"
            style={{ borderColor: COLORS.l4.border, maxWidth: 240 }}
          >
            <p className="text-sm font-medium" style={{ color: COLORS.l4.text }}>
              No SAS President assigned
            </p>
          </div>
        </LevelWrapper>
      )}

      {/* Connector to officers */}
      {officerCount > 0 && <VerticalLine height={32} />}

      {/* L5: Officers — 3-column grid */}
      {officerCount > 0 && (
        <OfficerGrid
          officers={otherOfficers}
          gridClass="grid grid-cols-3 gap-4 w-full max-w-lg"
        />
      )}

      <div className="h-6" />

      {/* L6: Student Assistants */}
      <SAWallLink />
    </div>
  )

  /* ══════════════════════════════════════════════════════════════════════
     MOBILE (<md) — Stacked cards with level labels, no connectors
     ══════════════════════════════════════════════════════════════════════ */
  const mobileView = (
    <div className="md:hidden flex flex-col items-center gap-5 w-full">
      {/* L1: UMak President */}
      <LevelWrapper delay={0}>
        <LevelBadge
          label={LEVEL_LABELS.l1}
          color={COLORS.l1.text}
          icon={getLevelIcon("l1")}
        />
        <LeaderCard
          name={orgChartData.presidentName}
          title={orgChartData.presidentTitle}
          email={orgChartData.presidentEmail}
          initials={getInitials(orgChartData.presidentName)}
          colors={COLORS.l1}
          icon={<Building2 className="w-3.5 h-3.5" />}
          compact
        />
      </LevelWrapper>

      {/* L2: OVPSSCD */}
      <LevelWrapper delay={0.06}>
        <LevelBadge
          label={LEVEL_LABELS.l2}
          color={COLORS.l2.text}
          icon={getLevelIcon("l2")}
        />
        <LeaderCard
          name={orgChartData.vpName}
          title={orgChartData.vpTitle}
          email={orgChartData.vpEmail}
          initials={getInitials(orgChartData.vpName)}
          colors={COLORS.l2}
          icon={<Shield className="w-3.5 h-3.5" />}
          compact
        />
      </LevelWrapper>

      {/* L3: SAS Adviser */}
      <LevelWrapper delay={0.12}>
        <LevelBadge
          label={LEVEL_LABELS.l3}
          color={COLORS.l3.text}
          icon={getLevelIcon("l3")}
        />
        <LeaderCard
          name={orgChartData.adviserName}
          title={orgChartData.adviserTitle}
          email={orgChartData.adviserEmail}
          initials={getInitials(orgChartData.adviserName)}
          colors={COLORS.l3}
          icon={<Star className="w-3.5 h-3.5" />}
          compact
        />
      </LevelWrapper>

      {/* L4: SAS President */}
      <LevelWrapper delay={0.18}>
        <LevelBadge
          label={LEVEL_LABELS.l4}
          color={COLORS.l4.text}
          icon={getLevelIcon("l4")}
        />
        {sasPresident ? (
          <LeaderCard
            name={sasPresident.user.fullName}
            title={sasPresident.positionLabel}
            email={sasPresident.user.email}
            initials={getInitials(sasPresident.user.fullName)}
            colors={COLORS.l4}
            icon={<Crown className="w-3.5 h-3.5" />}
            compact
          />
        ) : (
          <div
            className="px-5 py-2.5 rounded-xl border-2 border-dashed text-center w-full"
            style={{ borderColor: COLORS.l4.border }}
          >
            <p className="text-sm font-medium" style={{ color: COLORS.l4.text }}>
              No SAS President assigned
            </p>
          </div>
        )}
      </LevelWrapper>

      {/* L5: Officers — 2-column grid */}
      {officerCount > 0 && (
        <LevelWrapper delay={0.24}>
          <LevelBadge
            label={LEVEL_LABELS.l5}
            color={COLORS.l5.text}
            icon={getLevelIcon("l5")}
          />
          <OfficerGrid
            officers={otherOfficers}
            gridClass="grid grid-cols-2 gap-3 w-full"
          />
        </LevelWrapper>
      )}

      <div className="h-4" />

      {/* L6: Student Assistants */}
      <SAWallLink />
    </div>
  )

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════════ */
  return (
    <div
      className="w-full flex flex-col items-center"
      style={{ overflowWrap: "break-word", wordBreak: "break-word" }}
    >
      {desktopTree}
      {tabletView}
      {mobileView}
    </div>
  )
}
