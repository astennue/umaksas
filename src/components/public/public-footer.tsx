import Link from "next/link";
import Image from "next/image";
import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
} from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo/umak-sas-logo.png"
                alt="UMAK SAS Logo"
                width={36}
                height={36}
                className="h-9 w-auto object-contain"
              />
              <div className="flex flex-col leading-tight">
                <span className="text-lg font-bold">UMAK S.A.S</span>
                <span className="text-[10px] font-medium uppercase tracking-widest text-blue-300">
                  Student Assistants
                </span>
              </div>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-blue-200">
              The official Student Assistant Management System of Universidad
              Makati. Empowering students through meaningful work experience and
              professional development.
            </p>
            {/* Social Links */}
            <div className="mt-6 flex gap-3">
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-blue-200 transition-all duration-200 hover:bg-amber-400 hover:text-blue-900"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-blue-200 transition-all duration-200 hover:bg-amber-400 hover:text-blue-900"
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-blue-200 transition-all duration-200 hover:bg-amber-400 hover:text-blue-900"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-400">
              Quick Links
            </h3>
            <ul className="mt-4 space-y-2">
              {[
                { href: "/", label: "Home" },
                { href: "/about", label: "About" },
                { href: "/sa-wall", label: "Student Assistants Wall" },
                { href: "/announcements", label: "Announcements" },
                { href: "/apply", label: "Apply" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-blue-200 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-400">
              Resources
            </h3>
            <ul className="mt-4 space-y-2">
              {[
                { href: "#", label: "Student Handbook" },
                { href: "#", label: "SA Policies" },
                { href: "#", label: "Office Directory" },
                { href: "#", label: "FAQ" },
                { href: "#", label: "Contact Support" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-blue-200 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Us */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-400">
              Contact Us
            </h3>
            <ul className="mt-4 space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-200" />
                <span className="text-sm text-blue-200">
                  J.P. Rizal St., Brgy. Pio del Pilar,
                  <br />
                  Makati City, Philippines
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-blue-200" />
                <span className="text-sm text-blue-200">(02) 8882-2500</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-blue-200" />
                <span className="text-sm text-blue-200">sas@umak.edu.ph</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 border-t border-white/10 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-blue-300">
              &copy; 2026 University of Makati &mdash; Student Assistant
              Management System. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="#"
                className="text-xs text-blue-300 transition-colors hover:text-white"
              >
                Privacy Policy
              </Link>
              <Link
                href="#"
                className="text-xs text-blue-300 transition-colors hover:text-white"
              >
                Terms of Use
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
