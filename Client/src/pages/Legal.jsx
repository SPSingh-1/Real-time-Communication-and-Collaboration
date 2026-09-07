// src/pages/Legal.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Lock, FileText, CheckCircle2, ArrowRight, Menu, X, Globe, Scale } from "lucide-react";

const Legal = () => {
  const [activeTab, setActiveTab] = useState("privacy");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased relative overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* Background Ambient Glow */}
      <div className="fixed top-0 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px] pointer-events-none -z-10"></div>
      <div className="fixed bottom-10 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[160px] pointer-events-none -z-10"></div>

      {/* ── STICKY NAVBAR ── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-transform">
              M
            </div>
            <span className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-blue-400 bg-clip-text text-transparent">
              Milapp
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <Link to="/" className="hover:text-blue-400 transition-colors">Home</Link>
            <Link to="/company" className="hover:text-blue-400 transition-colors">About Project</Link>
            <Link to="/legal" className="text-blue-400 font-bold transition-colors">Security & Legal</Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-950/95 border-b border-slate-800 p-5 space-y-4 animate-fadeIn">
            <nav className="flex flex-col gap-3 text-sm font-semibold text-slate-300">
              <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="py-2 hover:text-blue-400">Home</Link>
              <Link to="/company" onClick={() => setIsMobileMenuOpen(false)} className="py-2 hover:text-blue-400">About Project</Link>
              <Link to="/legal" onClick={() => setIsMobileMenuOpen(false)} className="py-2 text-blue-400 font-bold">Security & Legal</Link>
            </nav>
          </div>
        )}
      </header>

      {/* ── HEADER BANNER ── */}
      <section className="pt-32 sm:pt-40 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6">
          <Shield className="w-3.5 h-3.5" />
          <span>Trust, Data Protection & Compliance</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
          Legal Terms & Privacy Policies
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
          We believe in complete transparency. Learn how we secure your data, encrypt your peer-to-peer calls, and maintain strict privacy standards.
        </p>
      </section>

      {/* ── TAB SELECTOR & MAIN CONTENT ── */}
      <section className="pb-24 sm:pb-32 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {/* Tab Buttons */}
        <div className="flex items-center justify-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 mb-8 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab("privacy")}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === "privacy" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>
          <button
            onClick={() => setActiveTab("terms")}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === "terms" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Terms of Service</span>
          </button>
        </div>

        {/* Legal Document Card */}
        <div className="p-6 sm:p-10 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl shadow-2xl text-xs sm:text-sm text-slate-300 space-y-8 leading-relaxed">
          {activeTab === "privacy" ? (
            <>
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Privacy Policy & Data Encryption</h2>
                <p className="text-xs text-slate-400">Last updated: September 2026</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-bold text-white">1. Peer-to-Peer Media Privacy</h3>
                <p>
                  Milapp's video conferencing and audio calls utilize direct WebRTC peer-to-peer encryption. Video and audio streams are exchanged directly between connected peers and are never recorded or stored on our servers unless explicitly initiated by the meeting host.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-bold text-white">2. Information We Collect</h3>
                <p>
                  We collect account identifiers (Full name, Email address, Phone number) to maintain your workspace identity and role-based permissions. Password credentials are encrypted using industry-standard bcrypt hashing with high work factors.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-bold text-white">3. Third-Party Integrations & Cookies</h3>
                <p>
                  When integrating with Figma or Google Authentication, tokens are stored securely in session headers. We never sell user data or share workspace contents with third-party advertisers.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Terms of Service</h2>
                <p className="text-xs text-slate-400">Effective Date: September 2026</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-bold text-white">1. Acceptance of Terms</h3>
                <p>
                  By creating an account or using Milapp services, you agree to comply with these terms. You are responsible for safeguarding your workspace credentials and all team operations conducted under your organization.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-bold text-white">2. Permitted Use & Service Availability</h3>
                <p>
                  You agree not to use the real-time communication tools for illegal activities, harassment, or unauthorized access attempts. We strive for 99.99% service uptime across all clusters.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-bold text-white">3. Subscription & Billing</h3>
                <p>
                  Paid subscription plans (Pro Team, Enterprise) are billed on a recurring monthly or annual basis. Organizations may cancel or adjust plan tiers at any time without penalty.
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Milapp Inc. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-blue-400 transition">Home</Link>
            <Link to="/company" className="hover:text-blue-400 transition">About</Link>
            <Link to="/legal" className="text-blue-400 font-bold transition">Legal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Legal;
