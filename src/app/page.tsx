"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import {
  GraduationCap,
  BookOpen,
  Award,
  Clock,
  Users,
  Building2,
  CalendarDays,
  Star,
  CheckCircle2,
  ArrowRight,
 ClipboardList,
  UserCheck,
  Briefcase,
 Rocket,
  Sparkles,
  Heart,
  Shield,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PublicLayout } from "@/components/public/public-layout";
import { cn } from "@/lib/utils";

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
  title: React.ReactNode;
  subtitle: string;
}) {
  return (
    <SectionReveal className="text-center">
      <Badge
        variant="secondary"
        className="mb-4 bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400 dark:bg-yellow-500/10 dark:border-yellow-500/20"
      >
        {badge}
      </Badge>
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl text-gray-900 dark:text-white">
        {title}
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">{subtitle}</p>
    </SectionReveal>
  );
}

/* ───────────────────────── data ───────────────────────── */
const features = [
  {
    icon: BookOpen,
    title: "Quality Education",
    description:
      "Earn while you learn. Balance your academics with hands-on professional experience in various university offices.",
    color: "blue",
  },
  {
    icon: Award,
    title: "Professional Development",
    description:
      "Build essential workplace skills including communication, time management, and teamwork that prepare you for your career.",
    color: "emerald",
  },
  {
    icon: Clock,
    title: "Flexible Schedule",
    description:
      "Work schedules designed to complement your class timetable, ensuring you never miss an important lecture or activity.",
    color: "violet",
  },
  {
    icon: Shield,
    title: "Recognition & Benefits",
    description:
      "Receive certificates of service, monthly stipends, and official recognition as a valued member of the UMak community.",
    color: "amber",
  },
];

const steps = [
  {
    icon: ClipboardList,
    step: "01",
    title: "Apply Online",
    description:
      "Fill out the application form with your personal and academic details. The process is simple and straightforward.",
  },
  {
    icon: UserCheck,
    step: "02",
    title: "Interview",
    description:
      "Attend a scheduled interview with the SA coordinators. Show your enthusiasm and readiness to contribute.",
  },
  {
    icon: Briefcase,
    step: "03",
    title: "Get Assigned",
    description:
      "Once accepted, you'll be matched with a university office that fits your skills, schedule, and preferences.",
  },
  {
    icon: Rocket,
    step: "04",
    title: "Start Working",
    description:
      "Begin your journey as a Student Assistant. Attend orientation, meet your team, and start making a difference.",
  },
];

const benefits = [
  "Monthly stipend to support your education",
  "Certificate of Service upon completion",
  "Hands-on work experience in your field",
  "Networking with university professionals",
  "Flexible hours that respect your academics",
  "Opportunity to serve the UMak community",
];

const iconColorMap: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  emerald:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  violet:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
  amber:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
};

/* ═══════════════════════════════════════════════════════════════════════════
   HOME PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const [stats, setStats] = useState({ saCount: 58, officeCount: 42, collegeCount: 10 });
  const [applicationOpen, setApplicationOpen] = useState<boolean | null>(null);
  const [announcements, setAnnouncements] = useState<Array<{
    id: string;
    title: string;
    excerpt: string | null;
    content: string | null;
    imageUrl: string | null;
    isPinned: boolean;
    priority: string;
    createdAt: string;
  }>>([]);

  useEffect(() => {
    fetch("/api/public-stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => {/* use defaults */});

    fetch("/api/system-settings")
      .then((res) => res.json())
      .then((data) => setApplicationOpen(data.applicationOpen ?? false))
      .catch(() => setApplicationOpen(false));

    // Fetch latest announcements
    fetch("/api/announcements/public")
      .then((res) => res.json())
      .then((data) => setAnnouncements(data.announcements || []))
      .catch(() => {/* ignore */});
  }, []);

  const statsItems = [
    `${stats.saCount} Student Assistants`,
    `${stats.officeCount} University Offices`,
    `${stats.collegeCount} Colleges Served`,
  ];

  return (
    <PublicLayout>
      {/* ─── 1. Hero Section ─── */}
      <section className="hero-fade-bottom relative overflow-hidden text-white live-gradient bg-gradient-to-br from-[#0a0e27] via-[#0f1b4d] to-[#0d2247]">
        {/* Decorative blurred circles */}
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

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8 lg:pb-36 lg:pt-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-3xl text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <Badge className={cn(
                "mb-4 px-3 py-1 text-xs sm:mb-6 sm:px-4 sm:py-1.5 sm:text-sm",
                applicationOpen === true
                  ? "border-yellow-400/30 bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30"
                  : "border-gray-400/30 bg-gray-500/20 text-gray-300 hover:bg-gray-500/30"
              )}>
                {applicationOpen === null ? (
                  <span className="animate-pulse mr-1.5 inline-block h-3.5 w-3.5 rounded-full bg-gray-400" />
                ) : applicationOpen === false ? (
                  <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                )}
                {applicationOpen === null ? "Loading..." : applicationOpen === false ? "Applications are currently closed" : "Applications are now open!"}
              </Badge>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl"
            >
              Empowering Students,{" "}
              <span className="text-yellow-400">Building Futures</span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.6 }}
              className="mx-auto mt-4 max-w-lg text-base text-yellow-100/70 sm:mt-6 sm:max-w-2xl sm:text-lg"
            >
              Join the Universidad Makati Student Assistant Program. Gain
              valuable work experience, earn while you learn, and make a
              difference in the university community.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4"
            >
              {applicationOpen === null ? (
                <Button size="lg" disabled className="bg-gray-500/50 px-5 py-5 text-sm font-bold text-white/70 cursor-not-allowed sm:px-6 sm:py-6 sm:text-base">
                  <span className="animate-pulse">Loading...</span>
                </Button>
              ) : applicationOpen === false ? (
                <Button asChild size="lg" disabled className="bg-gray-500/50 px-5 py-5 text-sm font-bold text-white/70 cursor-not-allowed sm:px-6 sm:py-6 sm:text-base">
                  <span>Applications Closed</span>
                </Button>
              ) : (
                <Button asChild size="lg" className="bg-yellow-500 px-5 py-5 text-sm font-bold text-white shadow-lg shadow-yellow-500/25 hover:bg-yellow-600 sm:px-6 sm:py-6 sm:text-base">
                  <Link href="/apply">Apply Now <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              )}
              <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/10 px-5 py-5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20 hover:text-white sm:px-6 sm:py-6 sm:text-base">
                <Link href="/sa-wall">Meet Our SAs</Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.6 }}
            className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs sm:mt-16 sm:gap-x-6 sm:gap-y-2 sm:text-sm"
          >
            {statsItems.map((s, i) => (
                <span key={s} className="flex items-center gap-2 text-yellow-100/70">
                  {i > 0 && (
                    <span className="text-yellow-400/40">•</span>
                  )}
                  {s}
                </span>
              ))}
            <span className="relative ml-1 flex items-center gap-2 text-yellow-300 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-400" />
              </span>
              Active
            </span>
          </motion.div>
        </div>
      </section>

      {/* ─── 2. Why Join USAP ─── */}
      <section className="relative overflow-hidden bg-white py-12 sm:py-16 lg:py-20 dark:bg-gray-950">
        {/* Subtle gradient orbs */}
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute -top-20 right-[15%] h-[300px] w-[300px] rounded-full bg-blue-500/[0.04] dark:bg-blue-500/[0.06] blur-3xl"
            animate={{ x: [0, 20, -15, 0], y: [0, -20, 15, 0], scale: [1, 1.05, 0.95, 1] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-16 left-[10%] h-[250px] w-[250px] rounded-full bg-yellow-500/[0.05] dark:bg-yellow-500/[0.07] blur-3xl"
            animate={{ x: [0, -15, 20, 0], y: [0, 15, -20, 0], scale: [1, 0.95, 1.08, 1] }}
            transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-1/2 left-[60%] h-[200px] w-[200px] rounded-full bg-yellow-500/[0.03] dark:bg-yellow-500/[0.05] blur-3xl"
            animate={{ x: [0, 10, -25, 0], y: [0, -15, 10, 0], scale: [1, 1.08, 0.92, 1] }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            badge="Why Join USAP"
            title={
              <>
                What Makes the SA Program{" "}
                <span className="text-blue-700 dark:text-yellow-400">
                  Special
                </span>
              </>
            }
            subtitle="The Student Assistant program at Universidad Makati offers a unique blend of financial support, professional growth, and community service."
          />

          <div className="mt-10 grid gap-4 sm:mt-14 sm:gap-6 lg:grid-cols-4">
            {features.map((f, i) => (
              <SectionReveal key={f.title} delay={i * 0.1}>
                <Card className="shimmer-card h-full border-0 bg-gradient-to-br from-white to-gray-50 shadow-lg transition-shadow hover:shadow-xl dark:from-gray-800 dark:to-gray-900">
                  <CardHeader>
                    <div
                      className={`mb-2 flex h-12 w-12 items-center justify-center rounded-xl ${iconColorMap[f.color]}`}
                    >
                      <f.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">
                      {f.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. How It Works ─── */}
      <section className="relative overflow-hidden live-gradient bg-gradient-to-br from-[#0a0e27] via-[#0f1b4d] to-[#0d2247] py-12 sm:py-16 lg:py-20 dark:from-[#0a0e27] dark:via-[#0f1b4d] dark:to-[#0d2247]">
        {/* Subtle gradient orbs */}
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute -top-10 left-[20%] h-[350px] w-[350px] rounded-full bg-white/[0.03] dark:bg-white/[0.04] blur-3xl"
            animate={{ x: [0, 25, -10, 0], y: [0, -15, 20, 0], scale: [1, 1.08, 0.94, 1] }}
            transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-20 right-[5%] h-[300px] w-[300px] rounded-full bg-yellow-500/[0.05] dark:bg-yellow-500/[0.08] blur-3xl"
            animate={{ x: [0, -20, 15, 0], y: [0, 20, -15, 0], scale: [1, 0.93, 1.1, 1] }}
            transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-[30%] right-[40%] h-[200px] w-[200px] rounded-full bg-blue-400/[0.04] dark:bg-blue-400/[0.06] blur-3xl"
            animate={{ x: [0, 15, -20, 0], y: [0, -25, 10, 0], scale: [1, 1.1, 0.9, 1] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <SectionReveal>
              <Badge
                variant="secondary"
                className="mb-4 bg-white/10 text-white/80 border-white/20 dark:bg-white/5 dark:text-yellow-400 dark:border-yellow-500/20"
              >
                How It Works
              </Badge>
            </SectionReveal>
            <SectionReveal delay={0.1}>
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                Your Journey to{" "}
                <span className="text-yellow-400">Becoming an SA</span>
              </h2>
            </SectionReveal>
            <SectionReveal delay={0.15}>
              <p className="mx-auto mt-4 max-w-2xl text-yellow-100/70 dark:text-gray-400">
                Follow these four simple steps to start your journey as a
                Student Assistant at Universidad Makati.
              </p>
            </SectionReveal>
          </div>

          <div className="mt-10 grid gap-6 sm:mt-14 sm:gap-8 lg:grid-cols-4">
            {steps.map((s, i) => (
              <SectionReveal key={s.step} delay={i * 0.12}>
                <div className="relative text-center">
                  {/* Connector line (desktop only) */}
                  {i < steps.length - 1 && (
                    <div className="absolute left-1/2 top-10 hidden h-0.5 w-full bg-gradient-to-r from-yellow-400/50 to-transparent lg:block" />
                  )}

                  {/* Step circle */}
                  <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20 sm:mb-5">
                    <div className="absolute inset-0 rounded-full bg-white/5 dark:bg-white/5" />
                    <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 text-gray-900 shadow-lg shadow-yellow-500/30 sm:h-14 sm:w-14">
                      <s.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] font-bold text-yellow-600 shadow dark:bg-gray-800 dark:text-yellow-400 sm:h-7 sm:w-7 sm:text-xs">
                      {s.step}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-white dark:text-gray-100">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm text-yellow-100/70 dark:text-gray-400">
                    {s.description}
                  </p>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. Program Benefits ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 py-12 sm:py-16 lg:py-20 dark:from-gray-950 dark:to-gray-900">
        {/* Subtle gradient orbs */}
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute -top-16 -left-16 h-[280px] w-[280px] rounded-full bg-blue-500/[0.04] dark:bg-blue-500/[0.06] blur-3xl"
            animate={{ x: [0, 20, -10, 0], y: [0, -20, 15, 0], scale: [1, 1.06, 0.94, 1] }}
            transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-20 right-[10%] h-[320px] w-[320px] rounded-full bg-yellow-500/[0.04] dark:bg-yellow-500/[0.07] blur-3xl"
            animate={{ x: [0, -18, 22, 0], y: [0, 18, -12, 0], scale: [1, 0.94, 1.08, 1] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-[40%] left-[50%] h-[220px] w-[220px] rounded-full bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05] blur-3xl"
            animate={{ x: [0, -12, 18, 0], y: [0, 22, -16, 0], scale: [1, 1.1, 0.92, 1] }}
            transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-8 sm:gap-12 lg:grid-cols-2">
            {/* Left – benefits list */}
            <SectionReveal>
              <Badge
                variant="secondary"
                className="mb-4 bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400 dark:bg-yellow-500/10 dark:border-yellow-500/20"
              >
                Benefits
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl lg:text-4xl dark:text-white">
                More Than Just a{" "}
                <span className="text-blue-700 dark:text-yellow-400">Job</span>
              </h2>
              <p className="mt-4 text-muted-foreground">
                Being a Student Assistant is an enriching experience that goes
                beyond financial support. Here&apos;s what you gain:
              </p>
              <ul className="mt-6 space-y-3">
                {benefits.map((b, i) => (
                  <li key={b} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {b}
                    </span>
                  </li>
                ))}
              </ul>
            </SectionReveal>

            {/* Right – CTA card */}
            <SectionReveal delay={0.2}>
              <div className="shimmer-card relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f1b4d] to-[#0d2247] p-5 text-white shadow-2xl sm:p-8">
                <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-yellow-500/20 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
                <div className="relative">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500 shadow-lg shadow-yellow-500/30 sm:mb-6 sm:h-16 sm:w-16">
                    <Heart className="h-6 w-6 text-white sm:h-8 sm:w-8" />
                  </div>
                  <h3 className="text-xl font-bold sm:text-2xl">Start Your Journey Today</h3>
                  <p className="mt-3 text-yellow-100/70">
                    Every great career starts with a single step. Take yours now
                    by joining the UMak Student Assistant program.
                  </p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    {applicationOpen === false ? (
                      <Button
                        disabled
                        className="bg-gray-500/50 font-semibold text-white/70 cursor-not-allowed"
                      >
                        Applications Closed
                      </Button>
                    ) : (
                      <Button
                        asChild
                        className="bg-yellow-500 font-semibold text-white hover:bg-yellow-600"
                      >
                        <Link href="/apply">
                          Apply Now
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    <Button
                      asChild
                      variant="outline"
                      className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                    >
                      <Link href="/about">Learn More</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* ─── 5. CTA Section ─── */}
      <section className="relative overflow-hidden live-gradient bg-gradient-to-br from-[#0a0e27] via-[#0f1b4d] to-[#0d2247] py-12 sm:py-16 lg:py-20 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/4 h-64 w-64 rounded-full bg-yellow-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          <motion.div
            className="absolute -top-20 left-[30%] h-[300px] w-[300px] rounded-full bg-yellow-500/[0.06] dark:bg-yellow-500/[0.08] blur-3xl"
            animate={{ x: [0, 20, -15, 0], y: [0, -20, 15, 0], scale: [1, 1.08, 0.92, 1] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-24 right-[20%] h-[280px] w-[280px] rounded-full bg-white/[0.04] dark:bg-white/[0.06] blur-3xl"
            animate={{ x: [0, -15, 20, 0], y: [0, 15, -20, 0], scale: [1, 0.92, 1.1, 1] }}
            transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-[20%] right-[60%] h-[200px] w-[200px] rounded-full bg-blue-400/[0.05] dark:bg-blue-400/[0.07] blur-3xl"
            animate={{ x: [0, 10, -25, 0], y: [0, -15, 10, 0], scale: [1, 1.06, 0.94, 1] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <SectionReveal>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500 shadow-lg shadow-yellow-500/30 sm:mb-6 sm:h-16 sm:w-16">
              <GraduationCap className="h-6 w-6 text-white sm:h-8 sm:w-8" />
            </div>
          </SectionReveal>
          <SectionReveal delay={0.1}>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              Ready to Make a{" "}
              <span className="text-yellow-400">Difference</span>?
            </h2>
          </SectionReveal>
          <SectionReveal delay={0.2}>
            <p className="mx-auto mt-3 max-w-lg text-base text-yellow-100/70 sm:mt-4 sm:max-w-xl sm:text-lg">
              Join hundreds of UMAK students who are building their future while
              serving the university community.
            </p>
          </SectionReveal>
          <SectionReveal delay={0.3}>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
              {applicationOpen === null ? (
                <Button asChild size="lg" disabled className="bg-gray-500/50 px-5 py-5 text-sm font-bold text-white/70 cursor-not-allowed sm:px-6 sm:py-6 sm:text-base">
                  <span className="animate-pulse">Loading...</span>
                </Button>
              ) : applicationOpen === false ? (
                <Button asChild size="lg" disabled className="bg-gray-500/50 px-5 py-5 text-sm font-bold text-white/70 cursor-not-allowed sm:px-6 sm:py-6 sm:text-base">
                  <span>Applications Closed</span>
                </Button>
              ) : (
                <Button asChild size="lg" className="bg-yellow-500 px-5 py-5 text-sm font-bold text-white shadow-lg shadow-yellow-500/25 hover:bg-yellow-600 sm:px-6 sm:py-6 sm:text-base">
                  <Link href="/apply">Apply Now <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              )}
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/10 px-5 py-5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20 hover:text-white sm:px-6 sm:py-6 sm:text-base"
              >
                <Link href="/sa-wall">Meet Our SAs</Link>
              </Button>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ─── Announcements Ticker ─── */}
      {announcements.length > 0 && (
        <section className="bg-white border-y border-gray-100 dark:bg-gray-950 dark:border-gray-800">
          <div className="mx-auto max-w-6xl px-4 py-5">
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className="h-4 w-4 text-yellow-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Latest Announcements</h3>
            </div>
            <div className="space-y-3">
              {announcements.slice(0, 3).map((a) => (
                <Link
                  key={a.id}
                  href="/announcements"
                  className="group block rounded-lg border border-gray-100 p-3 transition-all hover:border-yellow-300 hover:shadow-sm dark:bg-gray-900 dark:border-gray-800"
                >
                  <div className="flex items-start gap-3">
                    {a.imageUrl && (
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
                        <img src={a.imageUrl} alt="" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {a.isPinned && (
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-yellow-100 dark:bg-yellow-900/30">
                            <Star className="h-3 w-3 text-yellow-600 dark:text-yellow-400 fill-yellow-600 dark:fill-yellow-400" />
                          </span>
                        )}
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-yellow-600 transition-colors">
                          {a.title}
                        </h4>
                        {a.priority === "URGENT" && (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] border-red-200 dark:border-red-800 shrink-0">URGENT</Badge>
                        )}
                      </div>
                      {a.excerpt && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{a.excerpt}</p>
                      )}
                      <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                        {a.createdAt ? new Date(a.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : ""}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-3 text-center">
              <Link
                href="/announcements"
                className="text-xs font-medium text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 inline-flex items-center gap-1 transition-colors"
              >
                View All Announcements
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>
      )}
    </PublicLayout>
  );
}
