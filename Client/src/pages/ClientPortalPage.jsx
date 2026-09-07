// src/pages/ClientPortalPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Briefcase,
  Building2,
  Receipt,
  ExternalLink,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  CreditCard,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}`;

const ClientPortalPage = () => {
  const { portalToken } = useParams();
  const [loading, setLoading] = useState(true);
  const [portalData, setPortalData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPortalData();
  }, [portalToken]);

  const fetchPortalData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Always fetch fresh real-time data from backend first
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/team-crm/portal/${portalToken}?_nocache=${Date.now()}`,
          { timeout: 6000 }
        );
        if (res.data.success && res.data.portal) {
          setPortalData(res.data.portal);
          return;
        }
      } catch (netErr) {
        console.warn('Backend portal fetch:', netErr);
      }

      // Offline / Local cache fallback
      const localClients = JSON.parse(localStorage.getItem('team_crm_clients') || '[]');
      const foundLocal = localClients.find((c) => c.portalToken === portalToken);

      if (foundLocal) {
        setPortalData({
          clientName: foundLocal.name,
          company: foundLocal.company,
          stageId: foundLocal.stageId,
          dealValue: foundLocal.dealValue,
          currency: foundLocal.currency,
          linkedFigmaUrl: foundLocal.linkedFigmaUrl,
          invoices: foundLocal.invoices || [],
          notes: foundLocal.notes,
          updatedAt: foundLocal.updatedAt
        });
        return;
      }

      setError('Invalid or expired client portal link');
    } catch (err) {
      console.error('Error loading client portal:', err);
      setError(err.response?.data?.error || 'Invalid or expired client portal link');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400 font-medium">Loading your client project portal...</p>
        </div>
      </div>
    );
  }

  if (error || !portalData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Access Link Expired</h2>
          <p className="text-xs text-slate-400">
            {error || 'This client portal link is no longer valid. Please contact your project lead.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Brand Top Header */}
      <header className="bg-slate-900/90 border-b border-slate-800/80 sticky top-0 z-30 backdrop-blur-xl px-4 sm:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-600/30">
              C
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-white">Client Project Portal</h1>
              <p className="text-[11px] text-slate-400">
                Client: <span className="text-indigo-400 font-semibold">{portalData.clientName}</span>
                {portalData.company ? ` • ${portalData.company}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Guest Access</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Welcome & Project Overview Card */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">
                Project Milestone Status
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                {portalData.company || portalData.clientName} Deliverables
              </h2>
            </div>

            <span className="px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase">
              Stage: {portalData.stageId}
            </span>
          </div>

          {portalData.notes && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
              <span className="font-bold text-white block mb-1">Project Scope & Summary:</span>
              {portalData.notes}
            </div>
          )}
        </div>

        {/* Live Interactive Figma Design Section (If available) */}
        {portalData.linkedFigmaUrl && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Live Interactive Figma Prototypes & Designs</span>
              </h3>
              <a
                href={portalData.linkedFigmaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Figma</span>
              </a>
            </div>

            {/* Embedded Live Interactive Canvas */}
            <div className="w-full h-[550px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-inner">
              <iframe
                src={`https://www.figma.com/embed?embed_host=astra&url=${encodeURIComponent(portalData.linkedFigmaUrl)}`}
                title="Client Project Figma Design"
                className="w-full h-full border-0"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* Invoices & Payment Section */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-400" />
            <span>Invoices & Milestone Payments ({portalData.invoices?.length || 0})</span>
          </h3>

          {(!portalData.invoices || portalData.invoices.length === 0) ? (
            <p className="text-xs text-slate-400 py-4 text-center bg-slate-950 rounded-2xl border border-slate-800">
              No outstanding invoices for this project.
            </p>
          ) : (
            <div className="space-y-3">
              {portalData.invoices.map((inv) => (
                <div
                  key={inv._id}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{inv.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          inv.status === 'Paid'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Invoice ID: {inv.invoiceNumber}
                      {inv.dueDate ? ` • Due: ${new Date(inv.dueDate).toLocaleDateString()}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="text-base font-bold font-mono text-emerald-400">
                      ₹{Number(inv.amount).toLocaleString()}
                    </span>

                    {inv.paymentLink && inv.status !== 'Paid' ? (
                      <a
                        href={inv.paymentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition transform hover:scale-105"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay Now</span>
                      </a>
                    ) : inv.status === 'Paid' ? (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Paid & Cleared</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ClientPortalPage;
