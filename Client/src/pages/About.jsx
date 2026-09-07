// src/pages/About.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Video,
  MessageSquare,
  Briefcase,
  Calendar,
  Figma,
  Layers,
  Sparkles,
  Shield,
  Zap,
  Globe,
  Users,
  Code2,
  Lock,
  Cpu,
  ArrowRight,
  Menu,
  X,
  CheckCircle2,
  Heart
} from "lucide-react";
import { FaGithub, FaTwitter, FaLinkedin } from "react-icons/fa";

const About = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const pillars = [
    {
      icon: <Video className="w-6 h-6 text-blue-400" />,
      title: "Real-Time HD Video & Whiteboard",
      category: "Media Streaming",
      desc: "Peer-to-peer WebRTC video conferencing with sub-100ms latency, multi-user synchronized collaborative canvas whiteboard, in-call live polls, and floating emoji reactions."
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-purple-400" />,
      title: "Multilingual AI Chat Engine",
      category: "Unified Messaging",
      desc: "Instant 16+ languages on-the-fly translation, voice audio messaging, rich media file attachments, reactions, starred bookmarks, and pinned conversation channels."
    },
    {
      icon: <Briefcase className="w-6 h-6 text-emerald-400" />,
      title: "Team CRM & Deal Pipelines",
      category: "Revenue & Sales",
      desc: "Complete client management with customizable sales stages, Kanban & Table views, currency conversions, linked design assets, and instant PDF invoice downloads."
    },
    {
      icon: <Calendar className="w-6 h-6 text-amber-400" />,
      title: "Smart Calendar & Meeting Hub",
      category: "Scheduling & Alerts",
      desc: "Conflict-free meeting scheduler with strict past-date prevention, expired session protection, and automated 1-click audio announcements and team ringing."
    },
    {
      icon: <Figma className="w-6 h-6 text-pink-400" />,
      title: "Embedded Figma Design Hub",
      category: "Creative Workflow",
      desc: "Direct integration with Figma boards and prototypes. Review designs, share assets, and comment without leaving the workspace."
    },
    {
      icon: <Layers className="w-6 h-6 text-cyan-400" />,
      title: "Cloud Tasks & File Storage",
      category: "Sprint Management",
      desc: "Agile Kanban boards, priority filters, multi-file uploads with instant preview, and daily end-of-day (EOD) reporting logs."
    }
  ];

  const techStack = [
    { name: "WebRTC P2P", category: "Low-Latency Audio/Video & Media" },
    { name: "Socket.IO 4.8", category: "Bi-Directional Event Signaling" },
    { name: "React 19 & Vite", category: "Ultra-Fast Reactive Frontend" },
    { name: "Node.js & Express", category: "Robust REST & Real-time Server" },
    { name: "MongoDB Atlas", category: "Distributed Cloud Database" },
    { name: "Tailwind CSS", category: "Modern Responsive Design System" }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased relative overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* Background Ambient Glow Orbs */}
      <div className="fixed top-0 left-1/3 w-96 h-96 bg-blue-600/15 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse"></div>
      <div className="fixed bottom-10 right-1/4 w-[450px] h-[450px] bg-purple-600/15 rounded-full blur-[160px] pointer-events-none -z-10"></div>

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
            <Link to="/company" className="text-blue-400 font-bold transition-colors">About Project</Link>
            <Link to="/legal" className="hover:text-blue-400 transition-colors">Security & Legal</Link>
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
              <Link to="/company" onClick={() => setIsMobileMenuOpen(false)} className="py-2 text-blue-400 font-bold">About Project</Link>
              <Link to="/legal" onClick={() => setIsMobileMenuOpen(false)} className="py-2 hover:text-blue-400">Security & Legal</Link>
            </nav>
            <div className="pt-4 border-t border-slate-800 flex flex-col gap-2.5">
              <Link to="/login" className="w-full text-center py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold border border-slate-800">
                Sign In
              </Link>
              <Link to="/register" className="w-full text-center py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-lg shadow-blue-600/30">
                Get Started Free
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO BANNER ── */}
      <section className="pt-32 sm:pt-44 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Architected for Seamless Distributed Teamwork</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-6 leading-[1.15]">
          About Our Real-Time{" "}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            Collaboration Platform
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed">
          Milapp was engineered to eliminate tool fragmentation. Instead of juggling six disconnected software subscriptions, Milapp provides an all-in-one modern workspace unifying video meetings, collaborative whiteboard, multilingual messaging, sales CRM, Figma embedding, and smart scheduling.
        </p>
      </section>

      {/* ── 6 CORE PLATFORM PILLARS ── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-900">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            The 6 Pillars of the Platform
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Engineered with modern protocols to deliver sub-100ms real-time responsiveness.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {pillars.map((item, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-7 rounded-3xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 backdrop-blur-xl shadow-xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                    {item.category}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TECHNOLOGY STACK & ARCHITECTURE ── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-slate-900">
        <div className="rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-12 shadow-2xl">
          <div className="max-w-2xl mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
              Modern Tech Architecture
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-4 mb-3">
              Built on Modern Real-Time Web Standards
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Zero third-party bloated trackers. Direct peer-to-peer data transport with secure WebSocket event loops.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {techStack.map((tech, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-start gap-3.5"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0 mt-0.5">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{tech.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{tech.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 shadow-2xl text-white relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-black mb-3 tracking-tight">
              Ready to Upgrade Your Team Workspace?
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 mb-8 leading-relaxed">
              Create your free workspace in under 30 seconds. No credit card required.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white text-xs sm:text-sm font-extrabold shadow-xl transition transform hover:scale-105 active:scale-95"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              M
            </div>
            <span className="text-slate-300 font-bold">Milapp Collaboration Platform</span>
          </div>
          <p>© {new Date().getFullYear()} Milapp Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default About;
