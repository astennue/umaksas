"use client";

import { useRef, useState, useEffect } from "react";
import { PublicLayout } from "@/components/public/public-layout";
import { OrgChart } from "@/components/about/org-chart";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, useInView } from "framer-motion";
import {
  Eye,
  Target,
  History,
  Building2,
  Users,
  GraduationCap,
  Award,
  Heart,
  Globe,
  Mail,
  Phone,
  MapPin,
  Clock,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/* ───────────────────────── scroll‑reveal wrapper ───────────────────────── */
function SectionReveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ───────────────────────── section header ───────────────────────── */
function SectionHeader({
  badge,
  title,
  subtitle,
}: {
  badge: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-10 text-center">
      <Badge
        variant="secondary"
        className="mb-4 bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400 dark:bg-yellow-500/10 dark:border-yellow-500/20"
      >
        {badge}
      </Badge>
      <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
        {subtitle}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ABOUT PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
/* ───────────────────────── default journey events (fallback) ───────────────────────── */
const defaultJourneyEvents = [
  {
    year: "2002",
    title: "Program Inception",
    description:
      "The University of Makati established the Student Assistant Program to support underprivileged but deserving students with work opportunities within the university.",
  },
  {
    year: "2008",
    title: "Campus-Wide Expansion",
    description:
      "The program expanded to deploy student assistants across all university colleges and administrative offices.",
  },
  {
    year: "2014",
    title: "Policy Reforms",
    description:
      "Comprehensive policies and guidelines were formalized, including attendance tracking, evaluation criteria, and benefit structures.",
  },
  {
    year: "2018",
    title: "Digital Transition",
    description:
      "The system transitioned from manual record-keeping to digital processes, improving efficiency and accountability.",
  },
  {
    year: "2022",
    title: "Unified Management",
    description:
      "A unified management approach was adopted, standardizing operations across all offices and departments.",
  },
  {
    year: "2025",
    title: "Full System Launch",
    description:
      "The comprehensive UMak SAS digital platform launched with real-time attendance, schedule management, evaluations, and analytics.",
  },
];

export default function AboutPage() {
  const [stats, setStats] = useState({ saCount: 58, officeCount: 41, collegeCount: 12 });
  const [journeyEvents, setJourneyEvents] = useState(defaultJourneyEvents);

  useEffect(() => {
    fetch("/api/public-stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => {/* use defaults */});
  }, []);

  useEffect(() => {
    fetch("/api/journey-events")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setJourneyEvents(
            data.map((e: { year: string; title: string; description?: string }) => ({
              year: e.year || "",
              title: e.title || "",
              description: e.description || "",
            }))
          );
        }
      })
      .catch(() => {/* keep defaults */});
  }, []);

  return (
    <PublicLayout>
      {/* ─── 1. Hero Section ─── */}
      <section className="relative overflow-hidden live-gradient hero-fade-bottom text-white bg-gradient-to-br from-[#0a0e27] via-[#0f1b4d] to-[#0d2247]">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute inset-0">
          <div className="animate-blob absolute -top-24 right-[10%] h-[480px] w-[480px] rounded-full bg-yellow-500/15 blur-3xl" />
          <div className="animate-blob-delay absolute -bottom-24 left-[5%] h-[420px] w-[420px] rounded-full bg-blue-500/15 blur-3xl" />
          <motion.div
            className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-yellow-500/15 dark:bg-yellow-500/10 blur-3xl"
            animate={{ x: [0, 30, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.1, 0.95, 1] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-500/15 dark:bg-blue-500/10 blur-3xl"
            animate={{ x: [0, -25, 15, 0], y: [0, 25, -15, 0], scale: [1, 0.95, 1.1, 1] }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center"
          >
            <Badge className="mb-6 border-white/20 bg-white/10 px-4 py-1 text-sm text-white backdrop-blur-sm">
              <GraduationCap className="mr-1.5 h-3.5 w-3.5" />
              About Us
            </Badge>

            <h1 className="text-4xl font-bold tracking-tight leading-tight sm:text-5xl lg:text-6xl">
              University of Makati
              <span className="mt-1 block text-yellow-400">
                Student Assistant System
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-blue-100 sm:text-lg">
              Empowering students through meaningful work experiences while
              supporting the university&apos;s operational excellence and community
              development.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/sa-wall">
                <Button className="h-11 gap-2 bg-yellow-500 px-6 text-white shadow-lg shadow-yellow-500/25 hover:bg-yellow-600">
                  <Users className="h-4 w-4" />
                  Meet Our Student Assistants
                </Button>
              </Link>
              <a href="#org-chart">
                <Button
                  variant="outline"
                  className="h-11 gap-2 border-white/30 bg-white/10 px-6 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
                >
                  <Building2 className="h-4 w-4" />
                  Org Chart
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Stats bar – glassmorphism cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6"
          >
            {[
              { label: "Student Assistants", value: String(stats.saCount), icon: Users },
              { label: "University Offices", value: String(stats.officeCount), icon: Building2 },
              { label: "Years Active", value: "10+", icon: Award },
              { label: "Colleges Served", value: String(stats.collegeCount), icon: GraduationCap },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/20 bg-white/5 p-4 text-center backdrop-blur-sm sm:p-5"
              >
                <stat.icon className="mx-auto mb-2 h-5 w-5 text-yellow-400" />
                <div className="text-2xl font-bold sm:text-3xl">
                  {stat.value}
                </div>
                <div className="mt-0.5 text-xs text-yellow-100/70 sm:text-sm">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── 2. Mission & Vision ─── */}
      <section className="relative overflow-hidden bg-white py-20 dark:bg-gray-950">
        {/* Subtle gradient orbs */}
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute -top-16 right-[10%] h-[300px] w-[300px] rounded-full bg-blue-500/[0.04] dark:bg-blue-500/[0.06] blur-3xl"
            animate={{ x: [0, 20, -15, 0], y: [0, -20, 15, 0], scale: [1, 1.06, 0.94, 1] }}
            transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-20 left-[15%] h-[260px] w-[260px] rounded-full bg-yellow-500/[0.04] dark:bg-yellow-500/[0.06] blur-3xl"
            animate={{ x: [0, -18, 22, 0], y: [0, 18, -12, 0], scale: [1, 0.94, 1.08, 1] }}
            transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            badge="Our Purpose"
            title="Mission & Vision"
            subtitle="Guided by our commitment to excellence in student development and service"
          />

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Mission */}
            <SectionReveal delay={0.1}>
              <Card className="shimmer-card h-full border-0 shadow-lg transition-shadow hover:shadow-xl dark:border dark:border-white/10">
                {/* Blue accent bar */}
                <div className="rounded-t-xl bg-gradient-to-r from-[#0f1b4d] to-[#1a2d6d] px-8 pt-8 pb-6 text-white">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
                      <Target className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Our Mission</h3>
                      <div className="mt-0.5 h-0.5 w-8 rounded-full bg-white/40" />
                    </div>
                  </div>
                </div>
                <CardContent className="px-8 pb-8 pt-6">
                  <p className="leading-relaxed text-gray-600 dark:text-gray-300">
                    To provide meaningful work opportunities for deserving
                    students of the University of Makati, enabling them to
                    develop professional skills, gain practical experience, and
                    contribute to the university&apos;s operational efficiency while
                    pursuing their academic goals.
                  </p>
                  <div className="mt-6 space-y-2">
                    {[
                      "Develop practical work skills",
                      "Support university operations",
                      "Foster professional growth",
                    ].map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-700 dark:bg-yellow-400" />
                        {item}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </SectionReveal>

            {/* Vision */}
            <SectionReveal delay={0.2}>
              <Card className="shimmer-card h-full border-0 shadow-lg transition-shadow hover:shadow-xl dark:border dark:border-white/10">
                {/* Violet accent bar */}
                <div className="rounded-t-xl bg-gradient-to-r from-yellow-600 to-yellow-500 px-8 pt-8 pb-6 text-white">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
                      <Eye className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Our Vision</h3>
                      <div className="mt-0.5 h-0.5 w-8 rounded-full bg-white/40" />
                    </div>
                  </div>
                </div>
                <CardContent className="px-8 pb-8 pt-6">
                  <p className="leading-relaxed text-gray-600 dark:text-gray-300">
                    To be a model student assistance program that produces
                    well-rounded, competent, and socially responsible graduates
                    equipped with real-world experience and professional values
                    that prepare them for future careers.
                  </p>
                  <div className="mt-6 space-y-2">
                    {[
                      "Excellence in student development",
                      "Community impact and service",
                      "Career readiness for graduates",
                    ].map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-yellow-600 dark:bg-yellow-400" />
                        {item}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </SectionReveal>
          </div>

          {/* Core Values */}
          <SectionReveal delay={0.3} className="mt-12">
            <h3 className="mb-6 text-center text-lg font-semibold text-gray-900 dark:text-white">
              Our Core Values
            </h3>
            <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { icon: Heart, label: "Integrity", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
                { icon: Users, label: "Teamwork", color: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300" },
                { icon: Award, label: "Excellence", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
                { icon: Globe, label: "Service", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400" },
                { icon: GraduationCap, label: "Learning", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400" },
                { icon: Target, label: "Commitment", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400" },
              ].map((v) => (
                <Card
                  key={v.label}
                  className="shimmer-card cursor-default border-0 py-5 shadow-md transition-all hover:shadow-lg group"
                >
                  <CardContent className="p-0 text-center">
                    <div
                      className={`mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-lg transition-transform group-hover:scale-110 ${v.color}`}
                    >
                      <v.icon className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {v.label}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ─── 3. Our Journey (Timeline) ─── */}
      <section className="relative overflow-hidden bg-[#0a0e27] py-20">
        {/* Gradient orbs — adapted for dark background */}
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute -top-20 -left-10 h-[320px] w-[320px] rounded-full bg-yellow-500/[0.08] blur-3xl"
            animate={{ x: [0, 15, -20, 0], y: [0, -15, 20, 0], scale: [1, 1.06, 0.94, 1] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-16 right-[5%] h-[280px] w-[280px] rounded-full bg-blue-500/[0.07] blur-3xl"
            animate={{ x: [0, -20, 15, 0], y: [0, 15, -20, 0], scale: [1, 0.92, 1.1, 1] }}
            transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-[50%] left-[45%] h-[200px] w-[200px] rounded-full bg-yellow-400/[0.05] blur-3xl"
            animate={{ x: [0, -12, 18, 0], y: [0, 22, -16, 0], scale: [1, 1.08, 0.92, 1] }}
            transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="mb-14 text-center">
            <Badge
              variant="secondary"
              className="mb-4 border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
            >
              <History className="mr-1.5 h-3.5 w-3.5" />
              Our Story
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Our Journey
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-gray-400">
              Tracing our journey from inception to digital transformation
            </p>
          </div>

          {/* Vertical Timeline */}
          <div className="relative">
            {/* Central vertical line — left on mobile, center on desktop */}
            <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-yellow-500/40 via-yellow-500/20 to-yellow-500/40 md:left-1/2 md:-translate-x-px" />

            {/* Timeline events */}
            {journeyEvents.map((event, i) => (
              <SectionReveal key={event.year} delay={0.1 + i * 0.12}>
                <div className="relative mb-10">
                  {/* Timeline node — yellow dot with glow */}
                  <div className="absolute left-[13px] top-6 z-10 h-3 w-3 rounded-full bg-yellow-400 ring-4 ring-[#0a0e27] shadow-[0_0_14px_rgba(234,179,8,0.5)] md:left-1/2 md:-translate-x-1/2 md:top-7" />

                  {/* Card container — left on mobile, alternating on desktop */}
                  <div
                    className={
                      i % 2 === 0
                        ? "pl-12 md:w-[calc(50%-2rem)] md:pr-0"
                        : "pl-12 md:ml-auto md:w-[calc(50%-2rem)] md:pl-0"
                    }
                  >
                    <div className="rounded-xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08] sm:p-6">
                      {/* Year badge */}
                      <Badge
                        variant="secondary"
                        className="mb-3 border-yellow-500/30 bg-yellow-500/20 text-xs text-yellow-300"
                      >
                        {event.year}
                      </Badge>

                      {/* Title */}
                      <h3 className="text-base font-semibold leading-snug text-white sm:text-lg">
                        {event.title}
                      </h3>

                      {/* Description */}
                      <p className="mt-2 text-sm leading-relaxed text-gray-400">
                        {event.description}
                      </p>
                    </div>
                  </div>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. Organization Chart ─── */}
      <section
        id="org-chart"
        className="relative overflow-hidden scroll-mt-20 bg-slate-50 py-24 dark:bg-gray-900"
      >
        {/* Subtle gradient orbs */}
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute -top-12 left-[30%] h-[250px] w-[250px] rounded-full bg-blue-500/[0.03] dark:bg-blue-500/[0.05] blur-3xl"
            animate={{ x: [0, 18, -12, 0], y: [0, -18, 12, 0], scale: [1, 1.05, 0.95, 1] }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-16 right-[25%] h-[220px] w-[220px] rounded-full bg-yellow-500/[0.03] dark:bg-yellow-500/[0.05] blur-3xl"
            animate={{ x: [0, -15, 18, 0], y: [0, 15, -18, 0], scale: [1, 0.94, 1.06, 1] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            badge="Leadership"
            title="Organization Chart"
            subtitle="Meet the leaders who guide and support the Student Assistant System"
          />

          <SectionReveal delay={0.1}>
            <div className="overflow-hidden">
              <OrgChart />
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ─── 5. Contact Us ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 py-20 dark:from-gray-900 dark:to-gray-950">
        {/* Subtle gradient orbs */}
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute -top-20 right-[20%] h-[280px] w-[280px] rounded-full bg-blue-500/[0.04] dark:bg-blue-500/[0.06] blur-3xl"
            animate={{ x: [0, 15, -20, 0], y: [0, -15, 20, 0], scale: [1, 1.06, 0.94, 1] }}
            transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-16 left-[10%] h-[300px] w-[300px] rounded-full bg-yellow-500/[0.04] dark:bg-yellow-500/[0.06] blur-3xl"
            animate={{ x: [0, -20, 15, 0], y: [0, 20, -15, 0], scale: [1, 0.94, 1.08, 1] }}
            transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-[30%] left-[55%] h-[200px] w-[200px] rounded-full bg-yellow-500/[0.03] dark:bg-yellow-500/[0.05] blur-3xl"
            animate={{ x: [0, -10, 22, 0], y: [0, 18, -14, 0], scale: [1, 1.08, 0.92, 1] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            badge="Get in Touch"
            title="Contact Us"
            subtitle="Have questions or need assistance? Reach out to our team"
          />

          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
            {/* Address */}
            <SectionReveal delay={0.1}>
              <Card className="h-full border-0 py-6 text-center shadow-lg transition-shadow hover:shadow-xl dark:border dark:border-white/10">
                <CardContent className="px-6">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
                    <MapPin className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Address
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                    University of Makati
                    <br />
                    J.P. Rizal Extension
                    <br />
                    West Rembo, Makati City
                  </p>
                </CardContent>
              </Card>
            </SectionReveal>

            {/* Email */}
            <SectionReveal delay={0.2}>
              <Card className="h-full border-0 py-6 text-center shadow-lg transition-shadow hover:shadow-xl dark:border dark:border-white/10">
                <CardContent className="px-6">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 dark:bg-yellow-900/40">
                    <Mail className="h-5 w-5 text-yellow-700 dark:text-yellow-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Email
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    sas@umak.edu.ph
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    We&apos;ll respond within 24-48 hours
                  </p>
                </CardContent>
              </Card>
            </SectionReveal>

            {/* Phone */}
            <SectionReveal delay={0.3}>
              <Card className="h-full border-0 py-6 text-center shadow-lg transition-shadow hover:shadow-xl dark:border dark:border-white/10">
                <CardContent className="px-6">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
                    <Phone className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Phone
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    (02) 8882-2500
                  </p>
                  <div className="mt-1 flex items-center justify-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                    <Clock className="h-3 w-3" />
                    Mon-Fri, 8:00 AM - 5:00 PM
                  </div>
                </CardContent>
              </Card>
            </SectionReveal>
          </div>

          {/* CTA to SA Wall */}
          <SectionReveal delay={0.4} className="mt-12">
            <Card className="mx-auto max-w-2xl overflow-hidden border-0 shadow-lg dark:border dark:border-white/10">
              <div className="flex flex-col items-center gap-6 p-8 sm:flex-row">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 shadow-lg">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Want to become a Student Assistant?
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Visit our Student Assistants Wall to see our current student assistants and
                    learn more about the program.
                  </p>
                </div>
                <Link href="/sa-wall" className="shrink-0">
                  <Button className="gap-2 bg-blue-700 text-white hover:bg-blue-800 dark:bg-yellow-500 dark:text-gray-900 dark:hover:bg-yellow-600">
                    Visit Student Assistants Wall
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          </SectionReveal>
        </div>
      </section>
    </PublicLayout>
  );
}
