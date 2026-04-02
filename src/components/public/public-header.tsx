"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Menu, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/announcements", label: "Announcements" },
  { href: "/sa-wall", label: "Student Assistants Wall" },
  { href: "/apply", label: "Apply", isApplyLink: true },
];

export function PublicHeader() {
  const pathname = usePathname();
  const { setTheme, resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [applicationOpen, setApplicationOpen] = useState<boolean | null>(null);

  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    fetch("/api/system-settings")
      .then((res) => res.json())
      .then((data) => setApplicationOpen(data.applicationOpen ?? false))
      .catch(() => setApplicationOpen(false));
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-violet-100/60 dark:border-gray-700">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <Image
            src="/logo/umak-sas-logo.png"
            alt="UMAK SAS Logo"
            width={36}
            height={36}
            className="h-7 w-auto sm:h-9 object-contain"
          />
          <span className="hidden text-lg font-bold tracking-tight text-gray-900 dark:text-white sm:block">
            UMAK S.A.S
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isApplyDisabled = link.isApplyLink && applicationOpen === false;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => { if (isApplyDisabled) e.preventDefault(); }}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  isApplyDisabled
                    ? "text-gray-400 cursor-not-allowed opacity-60"
                    : pathname === link.href
                      ? "text-violet-700 bg-violet-50 dark:text-violet-400 dark:bg-violet-400/10"
                      : "text-gray-600 hover:text-violet-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-violet-400"
                )}
              >
                {isApplyDisabled ? "Apply (Closed)" : link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="text-gray-600 hover:bg-gray-100 hover:text-violet-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-violet-400"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Mobile Hamburger */}
          <div className="md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-600 hover:bg-gray-100 hover:text-violet-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-violet-400"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 bg-white dark:bg-gray-900">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <Image
                      src="/logo/umak-sas-logo.png"
                      alt="UMAK SAS Logo"
                      width={36}
                      height={36}
                      className="h-8 w-auto object-contain"
                    />
                    UMAK S.A.S
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-1">
                  {navLinks.map((link) => {
                    const isApplyDisabled = link.isApplyLink && applicationOpen === false;
                    return (
                      <SheetClose asChild key={link.href}>
                        <Link
                          href={link.href}
                          onClick={(e) => { if (isApplyDisabled) e.preventDefault(); }}
                          className={cn(
                            "rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200",
                            isApplyDisabled
                              ? "text-gray-400 cursor-not-allowed opacity-60"
                              : pathname === link.href
                                ? "text-violet-700 bg-violet-50 dark:text-violet-400 dark:bg-violet-400/10"
                                : "text-gray-600 hover:text-violet-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-violet-400"
                          )}
                        >
                          {isApplyDisabled ? "Apply (Closed)" : link.label}
                        </Link>
                      </SheetClose>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
