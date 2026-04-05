"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Database, Users, ShieldCheck, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";

interface SeedResult {
  success: boolean;
  stats: { users: number; offices: number; officers: number; saProfiles: number; errors: string[] };
  log: string[];
  credentials?: Record<string, { email: string; password: string }>;
  error?: string;
  message?: string;
}

interface OfficerFixResult {
  success: boolean;
  activatedCount: number;
  profilesCreated: number;
  errors?: string[];
  error?: string;
  totalOfficers?: number;
  inactiveOfficers?: number;
  officersWithoutProfile?: number;
}

export default function SetupPage() {
  const [seedLoading, setSeedLoading] = useState(false);
  const [fixLoading, setFixLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [seedResult, setSeedResult] = useState<SeedResult | null>(null);
  const [fixResult, setFixResult] = useState<OfficerFixResult | null>(null);
  const [previewData, setPreviewData] = useState<OfficerFixResult | null>(null);

  const handleSeed = async () => {
    setSeedLoading(true);
    setSeedResult(null);
    try {
      const res = await fetch("/api/setup/seed?secret=umak-sas-setup-2025");
      const data: SeedResult = await res.json();
      setSeedResult(data);
    } catch (err) {
      setSeedResult({ success: false, stats: { users: 0, offices: 0, officers: 0, saProfiles: 0, errors: [] }, log: [], error: "Network error" });
    } finally {
      setSeedLoading(false);
    }
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const res = await fetch("/api/officers/fix");
      const data: OfficerFixResult = await res.json();
      setPreviewData(data);
    } catch {
      setPreviewData({ success: false, activatedCount: 0, profilesCreated: 0, error: "Network error" });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleFix = async () => {
    setFixLoading(true);
    setFixResult(null);
    try {
      const res = await fetch("/api/officers/fix", { method: "POST" });
      const data: OfficerFixResult = await res.json();
      setFixResult(data);
    } catch {
      setFixResult({ success: false, activatedCount: 0, profilesCreated: 0, error: "Network error" });
    } finally {
      setFixLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 pt-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#003366] to-[#004488] shadow-lg">
            <Database className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">UMAK SAS Setup</h1>
          <p className="text-sm text-gray-500">One-time database initialization &amp; maintenance tools</p>
          <Badge variant="outline" className="text-xs">
            {new URL(window.location.origin).hostname}
          </Badge>
        </div>

        {/* WARNING */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold">Important</p>
              <p className="mt-1">Run these steps in order. Step 1 seeds all users (admin, officers, SAs). Step 2 activates officers and creates profiles. After setup, delete or disable this page.</p>
            </div>
          </CardContent>
        </Card>

        {/* STEP 1: Seed Database */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Step 1: Seed Database</CardTitle>
                <CardDescription>Create all admin, officer, HRMO, supervisor &amp; SA accounts</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleSeed}
              disabled={seedLoading}
              className="w-full h-12 text-base bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600"
            >
              {seedLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Seeding database...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Run Database Seed
                </>
              )}
            </Button>

            {seedResult && (
              <div className={`rounded-lg border p-4 text-sm ${seedResult.success ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                {seedResult.success ? (
                  <>
                    <div className="flex items-center gap-2 font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Seed completed!
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-emerald-600">
                      <div>Users: <strong>{seedResult.stats.users}</strong></div>
                      <div>Offices: <strong>{seedResult.stats.offices}</strong></div>
                      <div>Officers: <strong>{seedResult.stats.officers}</strong></div>
                      <div>SA Profiles: <strong>{seedResult.stats.saProfiles}</strong></div>
                    </div>
                    {seedResult.credentials && (
                      <div className="mt-3 space-y-2 rounded-md bg-white p-3 border border-emerald-200">
                        <p className="font-semibold text-emerald-800">🔑 Login Credentials:</p>
                        <div className="grid gap-1.5 text-xs font-mono">
                          <div className="flex justify-between"><span>Admin:</span><span>{seedResult.credentials.superAdmin.email}</span></div>
                          <div className="flex justify-between"><span>Pass:</span><span>{seedResult.credentials.superAdmin.password}</span></div>
                        </div>
                        <Button asChild size="sm" className="mt-2 w-full" variant="outline">
                          <a href="/portal-login">
                            Go to Login Page <ArrowRight className="ml-1 h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    )}
                    {seedResult.stats.errors.length > 0 && (
                      <div className="mt-2 text-amber-600">
                        <p className="font-semibold">Warnings ({seedResult.stats.errors.length}):</p>
                        {seedResult.stats.errors.map((e, i) => <p key={i} className="text-xs mt-1">⚠️ {e}</p>)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="font-semibold text-red-700">
                    ❌ Error: {seedResult.error || seedResult.message || "Unknown error"}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* STEP 2: Officer Fix */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#003366]/10">
                <ShieldCheck className="h-5 w-5 text-[#003366]" />
              </div>
              <div>
                <CardTitle className="text-lg">Step 2: Officer Fix</CardTitle>
                <CardDescription>Activate officer accounts &amp; create missing SA profiles</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={handlePreview}
                disabled={previewLoading || seedLoading}
                variant="outline"
                className="flex-1"
              >
                {previewLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Preview
              </Button>
              <Button
                onClick={handleFix}
                disabled={fixLoading || seedLoading}
                className="flex-1 bg-gradient-to-r from-[#003366] to-[#004488] hover:from-[#004080] hover:to-[#003366]"
              >
                {fixLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Run Fix
              </Button>
            </div>

            {previewData && !previewData.error && (
              <div className="rounded-lg border bg-gray-50 p-3 text-sm space-y-1">
                <p className="font-semibold text-gray-700">Preview Results:</p>
                <p>Total Officers: <strong>{previewData.totalOfficers}</strong></p>
                <p>Active: <strong>{previewData.activeOfficers}</strong></p>
                <p>Inactive: <strong>{previewData.inactiveOfficers}</strong></p>
                <p>Missing Profiles: <strong>{previewData.officersWithoutProfile}</strong></p>
              </div>
            )}

            {fixResult && (
              <div className={`rounded-lg border p-4 text-sm ${fixResult.success ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                {fixResult.success ? (
                  <>
                    <div className="flex items-center gap-2 font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Officer Fix completed!
                    </div>
                    <p className="mt-1 text-emerald-600">Activated: <strong>{fixResult.activatedCount}</strong> | Profiles created: <strong>{fixResult.profilesCreated}</strong></p>
                    {fixResult.errors && fixResult.errors.length > 0 && (
                      <div className="mt-2 text-amber-600 text-xs">
                        {fixResult.errors.map((e, i) => <p key={i}>⚠️ {e}</p>)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="font-semibold text-red-700">❌ Error: {fixResult.error}</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-8">
          After setup, remove <code className="bg-gray-200 px-1 rounded">/setup</code> route and <code className="bg-gray-200 px-1 rounded">/api/setup/seed</code> for security.
        </p>
      </div>
    </div>
  );
}
