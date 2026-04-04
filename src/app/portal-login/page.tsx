"use client";

import { useState, useEffect, useMemo } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  Loader2,
  Bell,
  AlertTriangle,
  ArrowRight,
  Circle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PublicAnnouncement {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  isPinned: boolean;
  publishedAt: string | null;
  createdAt: string;
  author: string;
}

const PRIORITY_DOT: Record<string, string> = {
  URGENT: "bg-red-500",
  HIGH: "bg-orange-500",
  NORMAL: "bg-blue-500",
  LOW: "bg-gray-400",
};

/* ──────────────────────────────────────────────
   Floating geometric shapes — decorative particles
   ────────────────────────────────────────────── */
function FloatingGeometricShapes() {
  const shapes = useMemo(
    () =>
      [
        // Large hexagon outline — top right
        {
          id: "hex-1",
          type: "hexagon",
          size: 120,
          x: "75%",
          y: "15%",
          rotate: 0,
          duration: 40,
          opacity: 0.06,
          borderColor: "#C5A000",
        },
        // Small diamond — left
        {
          id: "dia-1",
          type: "diamond",
          size: 28,
          x: "12%",
          y: "25%",
          rotate: 45,
          duration: 25,
          opacity: 0.12,
          borderColor: "#ffffff",
        },
        // Tiny diamond — right
        {
          id: "dia-2",
          type: "diamond",
          size: 18,
          x: "88%",
          y: "60%",
          rotate: 45,
          duration: 20,
          opacity: 0.1,
          borderColor: "#C5A000",
        },
        // Medium hexagon — bottom left
        {
          id: "hex-2",
          type: "hexagon",
          size: 70,
          x: "18%",
          y: "78%",
          rotate: 30,
          duration: 35,
          opacity: 0.05,
          borderColor: "#ffffff",
        },
        // Small triangle — top center
        {
          id: "tri-1",
          type: "triangle",
          size: 22,
          x: "45%",
          y: "10%",
          rotate: 0,
          duration: 22,
          opacity: 0.1,
          borderColor: "#C5A000",
        },
        // Tiny circle — scattered
        {
          id: "cir-1",
          type: "circle",
          size: 6,
          x: "30%",
          y: "40%",
          rotate: 0,
          duration: 18,
          opacity: 0.15,
          borderColor: "#ffffff",
        },
        {
          id: "cir-2",
          type: "circle",
          size: 4,
          x: "65%",
          y: "30%",
          rotate: 0,
          duration: 22,
          opacity: 0.12,
          borderColor: "#C5A000",
        },
        {
          id: "cir-3",
          type: "circle",
          size: 5,
          x: "80%",
          y: "85%",
          rotate: 0,
          duration: 16,
          opacity: 0.1,
          borderColor: "#ffffff",
        },
        {
          id: "cir-4",
          type: "circle",
          size: 3,
          x: "22%",
          y: "55%",
          rotate: 0,
          duration: 20,
          opacity: 0.08,
          borderColor: "#C5A000",
        },
        // Larger triangle — bottom right
        {
          id: "tri-2",
          type: "triangle",
          size: 35,
          x: "85%",
          y: "82%",
          rotate: 180,
          duration: 30,
          opacity: 0.04,
          borderColor: "#ffffff",
        },
      ] as const,
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {shapes.map((s) => (
        <motion.div
          key={s.id}
          className="absolute"
          style={{
            left: s.x,
            top: s.y,
            opacity: s.opacity,
          }}
          animate={{
            y: [0, -20, 0, 15, 0],
            rotate: [s.rotate, s.rotate + 15, s.rotate - 10, s.rotate + 5, s.rotate],
          }}
          transition={{
            duration: s.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {s.type === "hexagon" && (
            <svg
              width={s.size}
              height={s.size}
              viewBox="0 0 100 100"
              fill="none"
            >
              <polygon
                points="50,2 93,25 93,75 50,98 7,75 7,25"
                stroke={s.borderColor}
                strokeWidth="1.5"
              />
            </svg>
          )}
          {s.type === "diamond" && (
            <svg
              width={s.size}
              height={s.size}
              viewBox="0 0 100 100"
              fill="none"
            >
              <rect
                x="15"
                y="15"
                width="70"
                height="70"
                stroke={s.borderColor}
                strokeWidth="1.5"
                transform="rotate(45 50 50)"
              />
            </svg>
          )}
          {s.type === "triangle" && (
            <svg
              width={s.size}
              height={s.size}
              viewBox="0 0 100 100"
              fill="none"
            >
              <polygon
                points="50,5 95,95 5,95"
                stroke={s.borderColor}
                strokeWidth="1.5"
              />
            </svg>
          )}
          {s.type === "circle" && (
            <div
              className="rounded-full"
              style={{
                width: s.size,
                height: s.size,
                border: `1px solid ${s.borderColor}`,
              }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Floating subtle particles (small dots)
   ────────────────────────────────────────────── */
function FloatingParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 25 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 18 + 12,
        delay: Math.random() * 8,
        drift: Math.random() * 30 + 10,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/20"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -p.drift, 0],
            opacity: [0.15, 0.4, 0.15],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Subtle grid overlay
   ────────────────────────────────────────────── */
function GridOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.03]"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
      }}
    />
  );
}

/* ──────────────────────────────────────────────
   Main Login Page
   ────────────────────────────────────────────── */
export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [announcements, setAnnouncements] = useState<PublicAnnouncement[]>([]);

  useEffect(() => {
    fetch("/api/announcements/public")
      .then((res) => res.json())
      .then((data) => {
        if (data.announcements) {
          setAnnouncements(data.announcements);
        }
      })
      .catch(() => {
        // Silently fail — announcements are optional
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please try again.");
      } else {
        setIsRedirecting(true);
        // Allow fade-out animation before redirect
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 600);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const displayAnnouncements = announcements.slice(0, 3);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="login-page"
        exit={{ opacity: 0, scale: 0.97, filter: "blur(4px)" }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex min-h-screen items-center justify-center overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #001233 0%, #002244 30%, #003366 60%, #002244 85%, #001233 100%)",
        }}
      >
        {/* Animated gradient overlay for subtle color shifting */}
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              "radial-gradient(ellipse at 25% 25%, rgba(0,51,102,0.4) 0%, transparent 50%), radial-gradient(ellipse at 75% 75%, rgba(197,160,0,0.06) 0%, transparent 50%)",
              "radial-gradient(ellipse at 60% 40%, rgba(0,51,102,0.5) 0%, transparent 50%), radial-gradient(ellipse at 30% 70%, rgba(197,160,0,0.08) 0%, transparent 50%)",
              "radial-gradient(ellipse at 40% 60%, rgba(0,51,102,0.4) 0%, transparent 50%), radial-gradient(ellipse at 70% 30%, rgba(197,160,0,0.06) 0%, transparent 50%)",
              "radial-gradient(ellipse at 25% 25%, rgba(0,51,102,0.4) 0%, transparent 50%), radial-gradient(ellipse at 75% 75%, rgba(197,160,0,0.06) 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Grid overlay */}
        <GridOverlay />

        {/* Floating geometric shapes */}
        <FloatingGeometricShapes />

        {/* Floating particles */}
        <FloatingParticles />

        {/* ── Content ── */}
        <div className="relative z-10 w-full max-w-md space-y-6 px-4 py-12">
          {/* ── Login Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.8,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <Card className="border-0 bg-white/95 shadow-2xl backdrop-blur-xl dark:bg-gray-900/90 rounded-2xl overflow-hidden">
              {/* Gold accent line at top */}
              <div className="h-[3px] bg-gradient-to-r from-[#003366] via-[#C5A000] to-[#003366]" />

              <CardContent className="p-8 pt-7">
                {/* ── Logo with glow ── */}
                <div className="mb-8 flex flex-col items-center text-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.3, filter: "blur(10px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    transition={{
                      duration: 1,
                      ease: [0.16, 1, 0.3, 1],
                      delay: 0.3,
                    }}
                    className="relative mb-5"
                  >
                    {/* Glow effect behind logo */}
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background:
                          "radial-gradient(circle, rgba(197,160,0,0.25) 0%, transparent 70%)",
                        filter: "blur(20px)",
                      }}
                      animate={{
                        opacity: [0.5, 0.8, 0.5],
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                    <Image
                      src="/logo/umak-sas-logo.png"
                      alt="UMAK SAS Logo"
                      width={72}
                      height={72}
                      className="relative h-[72px] w-auto object-contain drop-shadow-lg"
                      priority
                    />
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="text-2xl font-bold bg-gradient-to-r from-[#003366] to-[#004080] bg-clip-text text-transparent dark:from-[#C5A000] dark:to-[#e0b800]"
                  >
                    Admin Portal
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="mt-1.5 text-sm text-gray-500 dark:text-gray-400"
                  >
                    Sign in to your{" "}
                    <span className="font-semibold text-[#C5A000]">UMak SAS</span>{" "}
                    account
                  </motion.p>
                </div>

                {/* ── Login Form ── */}
                <motion.form
                  onSubmit={handleSubmit}
                  className="space-y-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  {/* Error Message — with shake animation */}
                  <AnimatePresence mode="wait">
                    {error && (
                      <motion.div
                        key="error-msg"
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{
                          opacity: 1,
                          height: "auto",
                          y: 0,
                          x: [
                            0,
                            -12,
                            12,
                            -10,
                            10,
                            -6,
                            6,
                            -2,
                            2,
                            0,
                          ],
                        }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        transition={{
                          height: { duration: 0.3 },
                          opacity: { duration: 0.3 },
                          y: { duration: 0.3 },
                          x: {
                            duration: 0.6,
                            ease: "easeOut",
                          },
                        }}
                        className="overflow-hidden rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-400"
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                          {error}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Email Input */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Email Address
                    </Label>
                    <div className="relative rounded-lg transition-all duration-300 focus-within:shadow-[0_0_0_3px_rgba(0,51,102,0.12)] dark:focus-within:shadow-[0_0_0_3px_rgba(197,160,0,0.15)]">
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@umak.edu.ph"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-11 border-gray-200 bg-gray-50/80 text-gray-900 placeholder:text-gray-400 transition-all duration-300 focus:border-[#003366] focus:ring-0 focus:bg-white dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-[#C5A000] dark:focus:bg-gray-800"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Password
                    </Label>
                    <div className="relative rounded-lg transition-all duration-300 focus-within:shadow-[0_0_0_3px_rgba(0,51,102,0.12)] dark:focus-within:shadow-[0_0_0_3px_rgba(197,160,0,0.15)]">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-11 border-gray-200 bg-gray-50/80 pr-10 text-gray-900 placeholder:text-gray-400 transition-all duration-300 focus:border-[#003366] focus:ring-0 focus:bg-white dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-[#C5A000] dark:focus:bg-gray-800"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-all duration-200 hover:text-gray-600 dark:hover:text-gray-300"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          {showPassword ? (
                            <motion.div
                              key="eye-off"
                              initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
                              animate={{ opacity: 1, scale: 1, rotate: 0 }}
                              exit={{ opacity: 0, scale: 0.8, rotate: 90 }}
                              transition={{ duration: 0.2 }}
                            >
                              <EyeOff className="h-4 w-4" />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="eye-on"
                              initial={{ opacity: 0, scale: 0.8, rotate: 90 }}
                              animate={{ opacity: 1, scale: 1, rotate: 0 }}
                              exit={{ opacity: 0, scale: 0.8, rotate: -90 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Eye className="h-4 w-4" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </button>
                    </div>
                  </div>

                  {/* Submit Button — with shimmer on hover */}
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    >
                      <button
                        type="submit"
                        disabled={loading || isRedirecting}
                        className="group relative h-11 w-full overflow-hidden rounded-lg bg-gradient-to-r from-[#003366] via-[#004488] to-[#003366] text-white shadow-lg shadow-[#003366]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[#003366]/40 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {/* Shimmer overlay — slides on hover */}
                        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />

                        {/* Subtle animated border glow */}
                        <span className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/10" />

                        <span className="relative flex items-center justify-center gap-2">
                          {loading || isRedirecting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {isRedirecting ? "Redirecting..." : "Signing in..."}
                            </>
                          ) : (
                            "Sign In"
                          )}
                        </span>
                      </button>
                    </motion.div>
                  </motion.form>

                {/* Footer */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                  className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500"
                >
                  Unauthorized access is strictly prohibited.
                  <br />
                  By signing in, you agree to the UMak SAS terms of use.
                </motion.p>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Announcements Section ── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <Card className="border-0 bg-white/90 shadow-xl backdrop-blur-xl dark:bg-gray-900/85 rounded-2xl overflow-hidden">
              {/* Thin accent line */}
              <div className="h-[2px] bg-gradient-to-r from-transparent via-[#C5A000]/40 to-transparent" />

              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2.5 text-base font-semibold text-gray-900 dark:text-gray-100">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                      delay: 0.8,
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#003366] to-[#004488] shadow-md shadow-[#003366]/20"
                  >
                    <Bell className="h-4 w-4 text-white" />
                  </motion.div>
                  Latest Announcements
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {displayAnnouncements.length === 0 ? (
                  <div className="py-6 text-center">
                    <Bell className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No announcements at this time
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayAnnouncements.map(
                      (announcement, index) => (
                        <motion.div
                          key={announcement.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            duration: 0.4,
                            delay: 0.7 + index * 0.1,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          whileHover={{
                            y: -2,
                            transition: { duration: 0.2 },
                          }}
                          className="group flex items-start gap-3 rounded-xl p-3 transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          {/* Priority dot */}
                          <div className="mt-1.5 flex-shrink-0">
                            <Circle
                              className={`h-2.5 w-2.5 fill-current ${PRIORITY_DOT[announcement.priority] || PRIORITY_DOT.NORMAL}`}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="line-clamp-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                                {announcement.title}
                              </h4>
                              {announcement.isPinned && (
                                <AlertTriangle className="h-3 w-3 flex-shrink-0 text-[#C5A000]" />
                              )}
                            </div>
                            {announcement.publishedAt ||
                              announcement.createdAt ? (
                              <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <time
                                  dateTime={
                                    announcement.publishedAt ||
                                    announcement.createdAt ||
                                    ""
                                  }
                                >
                                  {format(
                                    new Date(
                                      announcement.publishedAt ||
                                        announcement.createdAt ||
                                        ""
                                    ),
                                    "MMM d, yyyy"
                                  )}
                                </time>
                              </div>
                            ) : null}
                            <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                              {announcement.excerpt || announcement.content}
                            </p>
                          </div>
                        </motion.div>
                      )
                    )}

                    {/* View All Link */}
                    {announcements.length > 3 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                      >
                        <Link
                          href="/announcements"
                          className="flex items-center justify-center gap-1.5 pt-2 text-sm font-medium text-[#003366] hover:text-[#004488] dark:text-[#C5A000] dark:hover:text-[#e0b800] transition-colors duration-200"
                        >
                          View All Announcements
                          <motion.span
                            className="inline-flex"
                            whileHover={{ x: 3 }}
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </motion.span>
                        </Link>
                      </motion.div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ── Bottom branding ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="absolute bottom-4 left-0 right-0 z-10 text-center"
        >
          <p className="text-xs text-white/20">
            © {new Date().getFullYear()} University of Makati — Student Affairs
            System
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
