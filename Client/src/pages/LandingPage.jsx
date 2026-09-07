// src/pages/LandingPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  Video,
  MessageSquare,
  Briefcase,
  Calendar,
  Figma,
  CheckCircle2,
  Sparkles,
  Shield,
  Zap,
  Globe,
  ArrowRight,
  Play,
  Layers,
  ChevronRight,
  Menu,
  X,
  TrendingUp,
  Activity,
  Users2
} from "lucide-react";
import { FaGithub, FaLinkedin, FaTwitter } from "react-icons/fa";

// ── SCROLL-TRIGGERED NUMBER COUNTER COMPONENT ──────────────────────
const AnimatedCounter = ({
  target,
  start = 1,
  duration = 2000,
  decimals = 0,
  prefix = "",
  suffix = ""
}) => {
  const [count, setCount] = useState(start);
  const [isVisible, setIsVisible] = useState(false);
  const countRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.15 }
    );

    const currentElem = countRef.current;
    if (currentElem) {
      observer.observe(currentElem);
    }

    return () => {
      if (currentElem) observer.unobserve(currentElem);
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime = null;
    const startVal = Number(start) || 1;
    const endVal = Number(target);
    if (isNaN(endVal)) return;

    let animationFrame;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic: f(t) = 1 - (1 - t)^3
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * easeProgress;

      setCount(current);

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
      } else {
        setCount(endVal);
      }
    };

    animationFrame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [isVisible, target, start, duration]);

  const formatted =
    decimals > 0
      ? count.toFixed(decimals)
      : Math.floor(count).toLocaleString();

  return (
    <span ref={countRef} className="tabular-nums font-extrabold tracking-tight">
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};

// Fallback plans if backend is initializing
const DEFAULT_PLANS_FALLBACK = [
  {
    key: "starter",
    name: "Starter",
    tagline: "For individuals and freelancers getting started",
    priceMonthly: 0,
    priceAnnual: 0,
    currency: "₹",
    period: "forever free",
    popular: false,
    badge: "Free Tier",
    features: [
      "Up to 5 Team Members",
      "HD Video Conferencing (45 mins/call)",
      "Collaborative Whiteboard & Polls",
      "Personal & Team Chat",
      "1 GB Cloud File Storage",
      "Basic Task Manager"
    ],
    ctaText: "Start Free",
    ctaLink: "/register",
    buttonStyle: "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
  },
  {
    key: "pro",
    name: "Pro Team",
    tagline: "For growing teams that need full real-time collaboration",
    priceMonthly: 999,
    priceAnnual: 799,
    currency: "₹",
    period: "per team / month",
    popular: true,
    badge: "Most Popular",
    features: [
      "Unlimited Team Members",
      "Unlimited HD Video & Audio Calls",
      "Real-Time Collaborative Whiteboard",
      "Full Team CRM with Invoicing",
      "Smart Calendar with Auto-Ringing",
      "Live Multilingual AI Chat Translation",
      "Figma Integration & 50 GB Cloud Files",
      "Meeting Recordings & Attendance Logs"
    ],
    ctaText: "Get Pro Team",
    ctaLink: "/register",
    buttonStyle: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30"
  },
  {
    key: "enterprise",
    name: "Enterprise",
    tagline: "For high-scale organizations requiring custom controls",
    priceMonthly: 2499,
    priceAnnual: 1999,
    currency: "₹",
    period: "per team / month",
    popular: false,
    badge: "Custom Scale",
    features: [
      "Everything in Pro Team",
      "Dedicated Multi-Tenant Database",
      "Custom Roles & SuperAdmin Dashboard",
      "Advanced Audit Logs & Reporting",
      "Client Portal Magic Links",
      "Unlimited Cloud Storage",
      "24/7 Priority SLA Support"
    ],
    ctaText: "Contact Enterprise",
    ctaLink: "/register",
    buttonStyle: "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
  }
];

const LandingPage = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("video");
  const [pricingCycle, setPricingCycle] = useState("monthly"); // 'monthly' | 'annual'

  // Dynamic Plans State loaded from Super Admin API
  const [plans, setPlans] = useState(DEFAULT_PLANS_FALLBACK);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchDynamicPlans = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/plans`);
        if (isMounted && res.data.success && Array.isArray(res.data.plans) && res.data.plans.length > 0) {
          setPlans(res.data.plans);
        }
      } catch (err) {
        console.warn("Could not load dynamic plans from backend, using default presets:", err.message);
      } finally {
        if (isMounted) setLoadingPlans(false);
      }
    };

    fetchDynamicPlans();
    return () => {
      isMounted = false;
    };
  }, []);

  // Features data with full modern toolset
  const featureList = [
    {
      id: "video",
      title: "HD Video & Collaborative Whiteboard",
      category: "Real-Time Meetings",
      badge: "WebRTC P2P",
      icon: <Video className="w-6 h-6 text-blue-400" />,
      color: "from-blue-500/20 to-indigo-500/20 border-blue-500/30",
      description: "Crystal clear HD audio/video calls with instant screen sharing, live floating emoji reactions, multi-user synchronized whiteboard drawing, and in-call interactive polls.",
      highlights: ["Zero-latency P2P streaming", "Multi-user live whiteboard", "Live polls & emoji reactions", "Meeting recording to WebM"]
    },
    {
      id: "chat",
      title: "Team & 1-on-1 Multilingual Chat",
      category: "Unified Messaging",
      badge: "16+ Languages",
      icon: <MessageSquare className="w-6 h-6 text-purple-400" />,
      color: "from-purple-500/20 to-pink-500/20 border-purple-500/30",
      description: "Direct personal messages and team channels with on-the-fly multi-language translation, voice audio notes, file attachments, emoji reactions, and message pinning.",
      highlights: ["AI Multi-language translation", "Voice note recorder", "Instant rich file previews", "Starred & pinned messages"]
    },
    {
      id: "crm",
      title: "Team CRM & Deal Pipeline",
      category: "Sales & Client Management",
      badge: "Kanban & Table",
      icon: <Briefcase className="w-6 h-6 text-emerald-400" />,
      color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
      description: "Manage client relationships from discovery to closed-won. Custom deal stages, deal value analytics, currency conversion, linked Figma files, and instant invoice downloads.",
      highlights: ["Drag-and-drop deal board", "Custom stage pipelines", "Invoice generator & PDF export", "Client portal magic links"]
    },
    {
      id: "calendar",
      title: "Smart Calendar & Meeting Hub",
      category: "Productivity & Scheduling",
      badge: "Auto-Ringing",
      icon: <Calendar className="w-6 h-6 text-amber-400" />,
      color: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
      description: "Schedule team events with past-date prevention, conflict checks, and expired meeting protection. Auto-rings targeted members with sound announcements when meetings start.",
      highlights: ["Strict past-date validation", "Instant 1-click ringing @all", "Expired event protection", "Attendee join duration tracking"]
    },
    {
      id: "figma",
      title: "Interactive Figma Design Hub",
      category: "Creative Collaboration",
      badge: "Live Embeds",
      icon: <Figma className="w-6 h-6 text-pink-400" />,
      color: "from-pink-500/20 to-rose-500/20 border-pink-500/30",
      description: "Collaborate on UI/UX mockups and prototypes directly inside your workspace without leaving tabs. Embed live Figma boards and review comments in real-time.",
      highlights: ["Seamless Figma URL embeds", "Team asset sharing", "Interactive prototype preview", "Live sync with project tasks"]
    },
    {
      id: "tasks",
      title: "Kanban Tasks & Cloud Files",
      category: "Workflow Management",
      badge: "Cloud Storage",
      icon: <Layers className="w-6 h-6 text-cyan-400" />,
      color: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30",
      description: "Organize project sprints with Kanban boards, custom tags, priorities, and deadlines. Centralized file management with secure versioning and instant download links.",
      highlights: ["Sprint & backlog boards", "Multi-file cloud manager", "Daily reporting & standups", "Role-based permissions"]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-blue-600 selection:text-white relative overflow-x-hidden">
      
      {/* Dynamic Background Glow Elements */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse"></div>
      <div className="fixed top-1/3 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-[140px] pointer-events-none -z-10"></div>
      <div className="fixed bottom-10 left-1/3 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none -z-10"></div>

      {/* ── STICKY GLASSMORPHIC NAVBAR ── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-transform">
              M
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-white group-hover:text-blue-400 transition-colors">
                Milapp
              </span>
              <span className="text-[10px] font-semibold text-blue-400/90 -mt-1 tracking-wider uppercase">
                Real-Time Collab OS
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-blue-400 transition-colors">Features</a>
            <a href="#metrics" className="hover:text-blue-400 transition-colors">Performance</a>
            <a href="#preview" className="hover:text-blue-400 transition-colors">Interactive Tools</a>
            <a href="#pricing" className="hover:text-blue-400 transition-colors">Pricing</a>
            <Link to="/company" className="hover:text-blue-400 transition-colors">About</Link>
          </nav>

          {/* Right Action CTA */}
          <div className="hidden sm:flex items-center gap-4">
            <Link
              to="/login"
              className="text-xs font-bold text-slate-300 hover:text-white px-4 py-2.5 rounded-xl hover:bg-slate-900 transition"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-xs font-bold px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 transition transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-950/95 border-b border-slate-800 px-6 py-5 space-y-4 animate-fadeIn backdrop-blur-2xl">
            <a
              href="#features"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-white py-1"
            >
              Features
            </a>
            <a
              href="#metrics"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-white py-1"
            >
              Performance
            </a>
            <a
              href="#preview"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-white py-1"
            >
              Interactive Tools
            </a>
            <a
              href="#pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-white py-1"
            >
              Pricing
            </a>
            <Link
              to="/company"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-white py-1"
            >
              About Company
            </Link>
            <div className="pt-4 border-t border-slate-800 flex flex-col gap-2.5">
              <Link
                to="/login"
                className="w-full text-center py-2.5 rounded-xl bg-slate-900 text-slate-300 text-xs font-bold border border-slate-800"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="w-full text-center py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-lg shadow-blue-600/30"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO SECTION ── */}
      <section className="relative pt-32 sm:pt-44 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center flex flex-col items-center">
        {/* Top Product Hunt / Release Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 shadow-xl mb-8 backdrop-blur-md">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          <span className="text-xs font-semibold text-slate-300">
            Next-Gen Real-Time Collaboration & Team OS
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        </div>

        {/* Hero Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl leading-[1.1] mb-6">
          Everything Your Team Needs,{" "}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            Synchronized in One Place.
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-base sm:text-lg lg:text-xl text-slate-400 max-w-2xl leading-relaxed mb-10">
          Unite HD Video Conferencing, Real-time Whiteboard, Multilingual Chat, Team CRM, Figma Design Embeds, and Smart Calendar into a seamless workspace.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto justify-center mb-16">
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-extrabold text-sm shadow-xl shadow-blue-600/30 transition transform hover:scale-[1.03] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span>Launch Free Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#preview"
            className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-sm border border-slate-800 shadow-lg transition flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 text-blue-400" />
            <span>Explore Live Tools</span>
          </a>
        </div>

        {/* Feature Highlights Ticker with Animated Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 max-w-4xl mx-auto pt-8 border-t border-slate-900 text-left w-full">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-black text-white">
                &lt; <AnimatedCounter target={100} start={1} duration={1400} suffix="ms" />
              </div>
              <div className="text-[11px] text-slate-400">Real-Time Latency</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-black text-white">End-to-End</div>
              <div className="text-[11px] text-slate-400">Encrypted P2P Media</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-black text-white">
                <AnimatedCounter target={16} start={1} duration={1200} suffix="+ Languages" />
              </div>
              <div className="text-[11px] text-slate-400">Live AI Translation</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-black text-white">
                <AnimatedCounter target={100} start={1} duration={1500} suffix="% Pure Sync" />
              </div>
              <div className="text-[11px] text-slate-400">Socket.IO & WebRTC</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SCROLL-TRIGGERED STATS & METRICS PROOF BAR ── */}
      <section id="metrics" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-blue-950/40 via-slate-900/80 to-purple-950/40 border border-slate-800/90 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              Real-Time Platform Performance
            </span>
            <h3 className="text-xl sm:text-3xl font-black text-white mt-3">
              Powering High-Velocity Engineering & Design Teams
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center divide-y-2 sm:divide-y-0 sm:divide-x divide-slate-800/80">
            {/* Metric 1 */}
            <div className="pt-4 sm:pt-0 sm:px-4">
              <div className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 mb-1">
                <AnimatedCounter target={99.99} start={1} decimals={2} duration={2200} suffix="%" />
              </div>
              <div className="text-xs sm:text-sm font-bold text-white">Uptime Guarantee</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Continuous multi-region SLA</div>
            </div>

            {/* Metric 2 */}
            <div className="pt-4 sm:pt-0 sm:px-4">
              <div className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-300 mb-1">
                <AnimatedCounter target={50000} start={100} duration={2400} suffix="+" />
              </div>
              <div className="text-xs sm:text-sm font-bold text-white">Active Collaborators</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Engaged in daily calls & sprints</div>
            </div>

            {/* Metric 3 */}
            <div className="pt-4 sm:pt-0 sm:px-4">
              <div className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300 mb-1">
                <AnimatedCounter target={120} start={1} duration={2000} suffix="+" />
              </div>
              <div className="text-xs sm:text-sm font-bold text-white">Connected Countries</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Global edge signaling network</div>
            </div>

            {/* Metric 4 */}
            <div className="pt-4 sm:pt-0 sm:px-4">
              <div className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 mb-1">
                <AnimatedCounter target={45} start={1} duration={1800} suffix="ms" />
              </div>
              <div className="text-xs sm:text-sm font-bold text-white">Avg WebRTC Latency</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Direct peer-to-peer data mesh</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE PRODUCT PREVIEW ── */}
      <section id="preview" className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
            Interactive Workspace Experience
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white mt-4 mb-3 tracking-tight">
            Designed For Fluid Collaboration
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            Click across our synchronized core modules to see how Milapp eliminates context switching.
          </p>
        </div>

        {/* Preview Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8">
          {[
            { id: "video", label: "HD Video & Whiteboard", icon: <Video className="w-4 h-4" /> },
            { id: "chat", label: "Multilingual Chat", icon: <MessageSquare className="w-4 h-4" /> },
            { id: "crm", label: "Team CRM & Invoices", icon: <Briefcase className="w-4 h-4" /> },
            { id: "calendar", label: "Smart Calendar", icon: <Calendar className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 scale-105"
                  : "bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Dynamic Interactive Window */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-3 sm:p-6 shadow-2xl backdrop-blur-xl max-w-5xl mx-auto">
          {/* Mock Browser/Window Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
            </div>
            <div className="px-4 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400">
              milapp.app/room/instant-collaboration
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>LIVE P2P</span>
            </div>
          </div>

          {/* Tab Content Display */}
          <div className="min-h-[320px] sm:min-h-[420px] bg-slate-950 rounded-2xl border border-slate-900 p-4 sm:p-8 flex flex-col justify-center items-center text-center relative overflow-hidden">
            {activeTab === "video" && (
              <div className="w-full space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Participant 1 */}
                  <div className="relative aspect-video rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden group">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                      SP
                    </div>
                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>S.P. Singh (Host)</span>
                    </div>
                    <div className="absolute top-3 right-3 bg-blue-600/80 text-white text-[10px] px-2 py-0.5 rounded-md font-bold">
                      HD 1080p
                    </div>
                  </div>

                  {/* Synchronized Whiteboard Mock */}
                  <div className="relative aspect-video rounded-2xl bg-slate-900/90 border border-blue-500/40 p-3 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[11px] text-blue-400 font-bold border-b border-slate-800 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>🟢 Multi-User Live Whiteboard</span>
                      </div>
                      <span className="text-slate-400 font-normal">Opened by Host</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center space-y-1">
                        <div className="text-sm font-bold text-white">Real-Time Canvas Sync</div>
                        <div className="text-xs text-slate-400">Drawing, shapes, pens, live text & export</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-800 text-xs">
                      <span className="px-2 py-1 rounded bg-slate-800 text-slate-300">✏️ Pen</span>
                      <span className="px-2 py-1 rounded bg-slate-800 text-slate-300">⬛ Rectangle</span>
                      <span className="px-2 py-1 rounded bg-slate-800 text-slate-300">⭕ Circle</span>
                      <span className="px-2 py-1 rounded bg-blue-600 text-white">❤️ Live React</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "chat" && (
              <div className="w-full max-w-lg space-y-3 animate-fadeIn text-left">
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    JD
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">John Doe</span>
                      <span className="text-[10px] text-slate-500">10:42 AM</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Bonjour l'équipe! Le nouveau déploiement WebRTC est prêt pour les tests.
                    </p>
                    <div className="mt-1.5 p-2 rounded-lg bg-slate-950 border border-purple-500/30 text-[11px] text-purple-300 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span>Translated: "Hello team! The new WebRTC deployment is ready for testing."</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    AL
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">Alex Lee</span>
                      <span className="text-[10px] text-slate-500">10:44 AM</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Audio quality and latency are looking sub-50ms! Testing mobile screen share now.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "crm" && (
              <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fadeIn text-left">
                <div className="p-3.5 rounded-xl bg-slate-900 border border-indigo-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-400">
                    <span>Discovery Call (2)</span>
                    <span>₹1,50,000</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                    <div className="font-semibold text-white">Acme Corp Global</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">₹85,000 • Priority High</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-purple-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-400">
                    <span>Proposal Sent (1)</span>
                    <span>₹2,20,000</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                    <div className="font-semibold text-white">Starlight Fintech</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">₹2,20,000 • In Review</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                    <span>Closed Won (4)</span>
                    <span>₹5,40,000</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                    <div className="font-semibold text-white">Zenith Media Group</div>
                    <div className="text-[10px] text-emerald-400 mt-0.5">✅ Invoice Generated</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "calendar" && (
              <div className="w-full max-w-md space-y-2.5 animate-fadeIn text-left">
                <div className="p-3 rounded-xl bg-slate-900 border border-purple-500/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-xs border border-purple-500/30">
                      LIVE
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Product Sprint Standup</div>
                      <div className="text-[10px] text-purple-300">Today, 10:30 PM • Auto-Ringing @all Team</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-purple-600 text-white font-bold text-[10px] shadow-sm animate-pulse">
                    Join Room
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs">
                      ⌛
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-400 line-through">Client Discovery Call</div>
                      <div className="text-[10px] text-slate-500">Ended 2 hours ago</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-medium">
                    Meeting Ended
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── DETAILED FEATURES GRID ── */}
      <section id="features" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-900">
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
            Engineered For High-Velocity Teams
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white mt-4 mb-4 tracking-tight">
            Complete Suite of Collaborative Tools
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            Say goodbye to 10 disconnected subscriptions. Milapp brings all essential team operations under one modern interface.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {featureList.map((feat) => (
            <div
              key={feat.id}
              className={`p-6 sm:p-8 rounded-3xl bg-gradient-to-b ${feat.color} bg-slate-900 border backdrop-blur-xl shadow-xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl group`}
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    {feat.icon}
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-950/80 text-slate-300 border border-slate-800">
                    {feat.badge}
                  </span>
                </div>

                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {feat.category}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2.5">
                  {feat.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                  {feat.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 space-y-2">
                {feat.highlights.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── DYNAMIC PRICING PLANS SECTION (SYNCED WITH SUPER ADMIN) ── */}
      <section id="pricing" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-900">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
            Simple & Transparent Pricing
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white mt-4 mb-4 tracking-tight">
            Plans Built For Every Stage
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mb-8">
            Manage your entire company with clear, predictable tiers. Super admin controlled & customized for scale.
          </p>

          {/* Monthly / Annual Toggle */}
          <div className="inline-flex items-center gap-3 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <button
              onClick={() => setPricingCycle("monthly")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                pricingCycle === "monthly" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setPricingCycle("annual")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                pricingCycle === "annual" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-extrabold border border-emerald-500/30">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {plans.map((plan, idx) => {
            const rawPrice = pricingCycle === "monthly" ? plan.priceMonthly : plan.priceAnnual;
            const currency = plan.currency || "₹";
            const isZero = Number(rawPrice) === 0;

            return (
              <div
                key={plan._id || plan.key || idx}
                className={`p-6 sm:p-8 rounded-3xl flex flex-col justify-between relative transition-all duration-300 ${
                  plan.popular
                    ? "bg-slate-900 border-2 border-blue-500/80 shadow-2xl shadow-blue-500/20 scale-[1.02]"
                    : "bg-slate-900/60 border border-slate-800 shadow-xl hover:border-slate-700"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-[10px] uppercase tracking-wider shadow-lg shadow-blue-600/40 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>{plan.badge || "Most Popular for Teams"}</span>
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mb-6">{plan.tagline}</p>

                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-3xl sm:text-4xl font-black text-white">
                      {isZero ? (
                        `${currency}0`
                      ) : (
                        <AnimatedCounter
                          target={Number(rawPrice)}
                          start={1}
                          prefix={currency}
                          duration={1200}
                        />
                      )}
                    </span>
                    <span className="text-xs text-slate-400">/{plan.period || "per team / month"}</span>
                  </div>

                  <Link
                    to={plan.ctaLink || "/register"}
                    className={`w-full py-3 px-4 rounded-xl text-xs font-bold block text-center transition mb-8 shadow-sm ${
                      plan.buttonStyle ||
                      (plan.popular
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30"
                        : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700")
                    }`}
                  >
                    {plan.ctaText || "Get Started"}
                  </Link>

                  <div className="space-y-3 pt-6 border-t border-slate-800/80">
                    <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Included Features:
                    </div>
                    {(plan.features || []).map((f, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2.5 text-xs text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-base">
                M
              </div>
              <span className="text-lg font-bold text-white">Milapp</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              The real-time collaboration operating system built for modern distributed teams and enterprise organizations.
            </p>
            <div className="flex items-center gap-3 text-slate-400">
              <a href="https://github.com/SPSingh-1" target="_blank" rel="noreferrer" className="p-2 bg-slate-900 hover:text-white rounded-lg border border-slate-800 transition">
                <FaGithub className="w-4 h-4" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="p-2 bg-slate-900 hover:text-white rounded-lg border border-slate-800 transition">
                <FaTwitter className="w-4 h-4" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="p-2 bg-slate-900 hover:text-white rounded-lg border border-slate-800 transition">
                <FaLinkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links 1 */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Product</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#features" className="hover:text-blue-400 transition">HD Video Meetings</a></li>
              <li><a href="#features" className="hover:text-blue-400 transition">Collaborative Whiteboard</a></li>
              <li><a href="#features" className="hover:text-blue-400 transition">Multilingual AI Chat</a></li>
              <li><a href="#features" className="hover:text-blue-400 transition">Team CRM & Invoices</a></li>
              <li><a href="#features" className="hover:text-blue-400 transition">Smart Calendar</a></li>
            </ul>
          </div>

          {/* Links 2 */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Company</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/company" className="hover:text-blue-400 transition">About Our Vision</Link></li>
              <li><Link to="/company" className="hover:text-blue-400 transition">Careers & Engineering</Link></li>
              <li><Link to="/legal" className="hover:text-blue-400 transition">Security & Encryption</Link></li>
            </ul>
          </div>

          {/* Links 3 */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Legal & Privacy</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/legal" className="hover:text-blue-400 transition">Privacy Policy</Link></li>
              <li><Link to="/legal" className="hover:text-blue-400 transition">Terms of Service</Link></li>
              <li><Link to="/legal" className="hover:text-blue-400 transition">GDPR Compliance</Link></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Milapp Collaboration Inc. All rights reserved.</p>
          <p>Built with WebRTC, Socket.IO, React, & Node.js</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;