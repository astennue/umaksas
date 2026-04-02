"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
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
   Constants — ALL cards share the same dimensions
   ══════════════════════════════════════════════════════════════════════ */

const LINE_COLOR = "#94A3B8"

const COLORS = {
  l1: { border: "#003366", avatar: "#003366", badge: "#e8eef6", text: "#003366" },
  l2: { border: "#1e40af", avatar: "#1e40af", badge: "#e0e7ff", text: "#1e40af" },
  l3: { border: "#059669", avatar: "#059669", badge: "#ecfdf5", text: "#059669" },
  l4: { border: "#C5A000", avatar: "#C5A000", badge: "#fef9e7", text: "#C5A000" },
  l5: { border: "#D4B860", avatar: "#C5A000", badge: "#fef3c7", text: "#92710c" },
} as const

// ── Uniform card size for ALL levels — fits 6 officers in container ──
// 6 × 176 + 5 × 16 = 1136px → fits in max-w-7xl (1216px usable)
const CARD_W = 176
const CARD_GAP = 16
const AVATAR_SIZE = 80

const POSITION_ORDER: Record<string, number> = {
  VICE_PRESIDENT_INTERNAL: 0,
  VICE_PRESIDENT_EXTERNAL: 1,
  SECRETARY: 2,
  TREASURER: 3,
  AUDITOR: 4,
  PUBLIC_RELATION_OFFICER: 5,
}

const SHORT_POSITION_LABELS: Record<string, string> = {
  VICE_PRESIDENT_INTERNAL: "Vice President\nInternal",
  VICE_PRESIDENT_EXTERNAL: "Vice President\nExternal",
  SECRETARY: "Secretary",
  TREASURER: "Treasurer",
  AUDITOR: "Auditor",
  PUBLIC_RELATION_OFFICER: "Public Relations\nOfficer",
}

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
      return <User className="w-4 h-4" />
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

const truncateStyle: React.CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: "100%",
  display: "block",
}

/* ── Unified Card used for ALL levels (L1–L5) ── */
function OrgCard({
  name,
  title,
  email,
  initials,
  photoUrl,
  colors,
  icon,
}: {
  name: string
  title: string
  email?: string | null
  initials: string
  photoUrl?: string | null
  colors: { border: string; avatar: string; badge: string; text: string }
  icon: React.ReactNode
}) {
  return (
    <motion.div
      className="relative bg-white rounded-2xl shadow-md flex flex-col"
      style={{
        width: CARD_W,
        minWidth: CARD_W,
        maxWidth: CARD_W,
        border: `2px solid ${colors.border}`,
        overflow: "hidden",
      }}
      whileHover={{
        scale: 1.04,
        boxShadow: "0 12px 40px rgba(0,0,0,0.14)",
        borderColor: colors.avatar,
      }}
      transition={{ duration: 0.2 }}
    >
      {/* Top accent bar */}
      <div className="w-full shrink-0" style={{ height: 6, backgroundColor: colors.border }} />

      <div
        className="flex flex-col items-center"
        style={{
          padding: "16px 12px 14px",
          overflowWrap: "break-word",
          wordBreak: "break-word",
        }}
      >
        {/* Avatar — large, supports photo or initials */}
        <div
          className="rounded-full overflow-hidden shrink-0 shadow-md ring-3 ring-white"
          style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
        >
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={name}
              width={AVATAR_SIZE}
              height={AVATAR_SIZE}
              className="object-cover w-full h-full"
              unoptimized
            />
          ) : (
            <div
              className="w-full h-full rounded-full flex items-center justify-center font-bold"
              style={{
                backgroundColor: colors.avatar,
                color: "#ffffff",
                fontSize: 22,
                letterSpacing: "0.03em",
              }}
            >
              {initials}
            </div>
          )}
        </div>

        {/* Role badge — supports 2-line text */}
        <div
          className="mt-3 inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wider"
          style={{
            backgroundColor: colors.badge,
            color: colors.text,
            fontSize: 8,
            padding: "3px 8px",
            maxWidth: "100%",
            lineHeight: 1.3,
            // Allow 2-line wrapping
            display: "inline-flex",
            WebkitLineClamp: 2,
            whiteSpace: "pre-line",
            textAlign: "center",
            wordBreak: "break-word",
          }}
        >
          {icon}
          <span>{title}</span>
        </div>

        {/* Name */}
        <h3
          className="mt-2 font-bold leading-snug text-center"
          style={{
            fontSize: 13,
            maxWidth: "100%",
            color: "#111827",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            whiteSpace: "normal",
            overflowWrap: "break-word",
            wordBreak: "break-word",
            overflow: "hidden",
          }}
          title={name}
        >
          {name}
        </h3>

        {/* Email */}
        {email && (
          <div
            className="mt-2 flex items-center gap-1.5 w-full justify-center"
            style={{ maxWidth: "100%" }}
          >
            <Mail className="shrink-0" style={{ width: 12, height: 12, color: "#9CA3AF" }} />
            <span
              style={{
                fontSize: 10,
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

/* ── Vertical connector line ── */
function VerticalLine({ height = 48 }: { height?: number }) {
  return (
    <div className="flex justify-center" aria-hidden="true">
      <svg width={2} height={height} className="block">
        <line x1={1} y1={0} x2={1} y2={height} stroke={LINE_COLOR} strokeWidth={2} />
      </svg>
    </div>
  )
}

/* ── Tree branch connector: 1 parent → N children ── */
function TreeBranchConnector({ childCount }: { childCount: number }) {
  if (childCount <= 0) return null
  if (childCount === 1) return <VerticalLine height={48} />

  const totalW = childCount * CARD_W + (childCount - 1) * CARD_GAP
  const midY = 24

  return (
    <div className="flex justify-center" aria-hidden="true">
      <svg
        width={totalW}
        height={48}
        viewBox={`0 0 ${totalW} 48`}
        className="block"
      >
        {/* Vertical drop from parent center */}
        <line x1={totalW / 2} y1={0} x2={totalW / 2} y2={midY} stroke={LINE_COLOR} strokeWidth={2} />
        {/* Horizontal bar */}
        <line x1={CARD_W / 2} y1={midY} x2={totalW - CARD_W / 2} y2={midY} stroke={LINE_COLOR} strokeWidth={2} />
        {/* Vertical drops to each child */}
        {Array.from({ length: childCount }, (_, i) => {
          const cx = i * (CARD_W + CARD_GAP) + CARD_W / 2
          return (
            <line key={i} x1={cx} y1={midY} x2={cx} y2={48} stroke={LINE_COLOR} strokeWidth={2} />
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

/* ── Level badge (mobile) ── */
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
    <div className="flex items-center gap-1.5 mb-3" style={{ color }}>
      {icon}
      <span className="text-xs font-semibold uppercase tracking-widest">{label}</span>
    </div>
  )
}

/* ── Student Assistants Link ── */
function SAWallLink() {
  return (
    <LevelWrapper delay={0.7}>
      <Link
        href="/sa-wall"
        className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-white border-2 border-gray-200 shadow-sm hover:shadow-lg hover:border-[#C5A000] transition-all duration-200 group"
      >
        <Users
          className="w-5 h-5 transition-colors duration-200 group-hover:text-[#C5A000]"
          style={{ color: "#003366" }}
        />
        <span
          className="text-sm font-bold transition-colors duration-200 group-hover:text-[#C5A000]"
          style={{ color: "#003366" }}
        >
          View All Student Assistants
        </span>
        <ChevronRight
          className="w-4 h-4 opacity-40 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all duration-200"
          style={{ color: "#003366" }}
        />
      </Link>
    </LevelWrapper>
  )
}

/* ── Officer Grid (tablet & mobile) ── */
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
          <OrgCard
            name={officer.user.fullName}
            title={SHORT_POSITION_LABELS[officer.position] || officer.positionLabel}
            email={officer.user.email}
            initials={getInitials(officer.user.fullName)}
            photoUrl={officer.user.photoUrl}
            colors={COLORS.l5}
            icon={getPositionIcon(officer.position)}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}

function getLevelIcon(level: string) {
  switch (level) {
    case "l1":
      return <Building2 className="w-3.5 h-3.5" />
    case "l2":
      return <Shield className="w-3.5 h-3.5" />
    case "l3":
      return <Star className="w-3.5 h-3.5" />
    case "l4":
      return <Crown className="w-3.5 h-3.5" />
    case "l5":
      return <UserCog className="w-3.5 h-3.5" />
    default:
      return <User className="w-3.5 h-3.5" />
  }
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════ */

export function OrgChart() {
  const [orgChartData, setOrgChartData] = useState<OrgChartData | null>(null)
  const [allOfficers, setAllOfficers] = useState<OrgChartNode[]>([])
  const [loading, setLoading] = useState(true)

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

  const sasPresident = allOfficers.find((o) => o.position === "PRESIDENT")
  const otherOfficers = sortOfficersByPosition(
    allOfficers.filter((o) => o.position !== "PRESIDENT")
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div
            className="rounded-full animate-spin"
            style={{
              width: 44,
              height: 44,
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
     DESKTOP (lg+) — Full tree layout
     ══════════════════════════════════════════════════════════════════════ */
  const desktopTree = (
    <div className="hidden lg:flex lg:flex-col lg:items-center w-full py-6">
      <div className="flex flex-col items-center">
        {/* L1: UMak President */}
        <LevelWrapper delay={0}>
          <OrgCard
            name={orgChartData.presidentName}
            title={orgChartData.presidentTitle}
            email={orgChartData.presidentEmail}
            initials={getInitials(orgChartData.presidentName)}
            colors={COLORS.l1}
            icon={<Building2 className="w-4 h-4" />}
          />
        </LevelWrapper>

        <VerticalLine height={44} />

        {/* L2: OVPSSCD */}
        <LevelWrapper delay={0.1}>
          <OrgCard
            name={orgChartData.vpName}
            title={orgChartData.vpTitle}
            email={orgChartData.vpEmail}
            initials={getInitials(orgChartData.vpName)}
            colors={COLORS.l2}
            icon={<Shield className="w-4 h-4" />}
          />
        </LevelWrapper>

        <VerticalLine height={44} />

        {/* L3: SAS Adviser */}
        <LevelWrapper delay={0.2}>
          <OrgCard
            name={orgChartData.adviserName}
            title={orgChartData.adviserTitle}
            email={orgChartData.adviserEmail}
            initials={getInitials(orgChartData.adviserName)}
            colors={COLORS.l3}
            icon={<Star className="w-4 h-4" />}
          />
        </LevelWrapper>

        <VerticalLine height={44} />

        {/* L4: SAS President */}
        {sasPresident ? (
          <LevelWrapper delay={0.3}>
            <OrgCard
              name={sasPresident.user.fullName}
              title={sasPresident.positionLabel}
              email={sasPresident.user.email}
              initials={getInitials(sasPresident.user.fullName)}
              photoUrl={sasPresident.user.photoUrl}
              colors={COLORS.l4}
              icon={<Crown className="w-4 h-4" />}
            />
          </LevelWrapper>
        ) : (
          <LevelWrapper delay={0.3}>
            <div
              className="px-6 py-5 rounded-2xl border-2 border-dashed text-center"
              style={{ borderColor: COLORS.l4.border, width: CARD_W }}
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

            {/* L5: Officers */}
            <motion.div
              className="flex"
              style={{ gap: CARD_GAP }}
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-30px" }}
            >
              {otherOfficers.map((officer) => (
                <motion.div key={officer.id} variants={cardVariants}>
                  <OrgCard
                    name={officer.user.fullName}
                    title={SHORT_POSITION_LABELS[officer.position] || officer.positionLabel}
                    email={officer.user.email}
                    initials={getInitials(officer.user.fullName)}
                    photoUrl={officer.user.photoUrl}
                    colors={COLORS.l5}
                    icon={getPositionIcon(officer.position)}
                  />
                </motion.div>
              ))}
            </motion.div>
          </>
        )}

        {/* Connector L5 → L6 */}
        {officerCount > 0 && <VerticalLine height={40} />}

        {/* L6: Student Assistants */}
        <SAWallLink />
      </div>
    </div>
  )

  /* ══════════════════════════════════════════════════════════════════════
     TABLET (md–lg)
     ══════════════════════════════════════════════════════════════════════ */
  const tabletView = (
    <div className="hidden md:flex md:flex-col md:items-center lg:hidden w-full py-4">
      <LevelWrapper delay={0}>
        <OrgCard
          name={orgChartData.presidentName}
          title={orgChartData.presidentTitle}
          email={orgChartData.presidentEmail}
          initials={getInitials(orgChartData.presidentName)}
          colors={COLORS.l1}
          icon={<Building2 className="w-4 h-4" />}
        />
      </LevelWrapper>

      <VerticalLine height={32} />

      <LevelWrapper delay={0.08}>
        <OrgCard
          name={orgChartData.vpName}
          title={orgChartData.vpTitle}
          email={orgChartData.vpEmail}
          initials={getInitials(orgChartData.vpName)}
          colors={COLORS.l2}
          icon={<Shield className="w-4 h-4" />}
        />
      </LevelWrapper>

      <VerticalLine height={32} />

      <LevelWrapper delay={0.16}>
        <OrgCard
          name={orgChartData.adviserName}
          title={orgChartData.adviserTitle}
          email={orgChartData.adviserEmail}
          initials={getInitials(orgChartData.adviserName)}
          colors={COLORS.l3}
          icon={<Star className="w-4 h-4" />}
        />
      </LevelWrapper>

      <VerticalLine height={32} />

      {sasPresident ? (
        <LevelWrapper delay={0.24}>
          <OrgCard
            name={sasPresident.user.fullName}
            title={sasPresident.positionLabel}
            email={sasPresident.user.email}
            initials={getInitials(sasPresident.user.fullName)}
            photoUrl={sasPresident.user.photoUrl}
            colors={COLORS.l4}
            icon={<Crown className="w-4 h-4" />}
          />
        </LevelWrapper>
      ) : (
        <LevelWrapper delay={0.24}>
          <div
            className="px-5 py-4 rounded-2xl border-2 border-dashed text-center"
            style={{ borderColor: COLORS.l4.border, width: CARD_W }}
          >
            <p className="text-sm font-medium" style={{ color: COLORS.l4.text }}>
              No SAS President assigned
            </p>
          </div>
        </LevelWrapper>
      )}

      {officerCount > 0 && <VerticalLine height={32} />}

      {officerCount > 0 && (
        <OfficerGrid
          officers={otherOfficers}
          gridClass="grid grid-cols-2 gap-5 w-full max-w-[520px]"
        />
      )}

      <div className="h-8" />
      <SAWallLink />
    </div>
  )

  /* ══════════════════════════════════════════════════════════════════════
     MOBILE (<md)
     ══════════════════════════════════════════════════════════════════════ */
  const mobileView = (
    <div className="md:hidden flex flex-col items-center gap-6 w-full py-2">
      <LevelWrapper delay={0}>
        <LevelBadge label={LEVEL_LABELS.l1} color={COLORS.l1.text} icon={getLevelIcon("l1")} />
        <OrgCard
          name={orgChartData.presidentName}
          title={orgChartData.presidentTitle}
          email={orgChartData.presidentEmail}
          initials={getInitials(orgChartData.presidentName)}
          colors={COLORS.l1}
          icon={<Building2 className="w-4 h-4" />}
        />
      </LevelWrapper>

      <LevelWrapper delay={0.06}>
        <LevelBadge label={LEVEL_LABELS.l2} color={COLORS.l2.text} icon={getLevelIcon("l2")} />
        <OrgCard
          name={orgChartData.vpName}
          title={orgChartData.vpTitle}
          email={orgChartData.vpEmail}
          initials={getInitials(orgChartData.vpName)}
          colors={COLORS.l2}
          icon={<Shield className="w-4 h-4" />}
        />
      </LevelWrapper>

      <LevelWrapper delay={0.12}>
        <LevelBadge label={LEVEL_LABELS.l3} color={COLORS.l3.text} icon={getLevelIcon("l3")} />
        <OrgCard
          name={orgChartData.adviserName}
          title={orgChartData.adviserTitle}
          email={orgChartData.adviserEmail}
          initials={getInitials(orgChartData.adviserName)}
          colors={COLORS.l3}
          icon={<Star className="w-4 h-4" />}
        />
      </LevelWrapper>

      <LevelWrapper delay={0.18}>
        <LevelBadge label={LEVEL_LABELS.l4} color={COLORS.l4.text} icon={getLevelIcon("l4")} />
        {sasPresident ? (
          <OrgCard
            name={sasPresident.user.fullName}
            title={sasPresident.positionLabel}
            email={sasPresident.user.email}
            initials={getInitials(sasPresident.user.fullName)}
            photoUrl={sasPresident.user.photoUrl}
            colors={COLORS.l4}
            icon={<Crown className="w-4 h-4" />}
          />
        ) : (
          <div
            className="w-full px-5 py-4 rounded-2xl border-2 border-dashed text-center"
            style={{ borderColor: COLORS.l4.border }}
          >
            <p className="text-sm font-medium" style={{ color: COLORS.l4.text }}>
              No SAS President assigned
            </p>
          </div>
        )}
      </LevelWrapper>

      {officerCount > 0 && (
        <LevelWrapper delay={0.24}>
          <LevelBadge label={LEVEL_LABELS.l5} color={COLORS.l5.text} icon={getLevelIcon("l5")} />
          <OfficerGrid
            officers={otherOfficers}
            gridClass="grid grid-cols-2 gap-4 w-full"
          />
        </LevelWrapper>
      )}

      <div className="h-6" />
      <SAWallLink />
    </div>
  )

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════════ */
  return (
    <div
      className="w-full flex flex-col items-center overflow-hidden"
      style={{ overflowWrap: "break-word", wordBreak: "break-word" }}
    >
      {desktopTree}
      {tabletView}
      {mobileView}
    </div>
  )
}
