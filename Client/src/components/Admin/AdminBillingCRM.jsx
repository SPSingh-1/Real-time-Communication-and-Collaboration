import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  DollarSign,
  Receipt,
  Search,
  RefreshCw,
  PlusCircle,
  History,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminBillingCRM = () => {
  const [overview, setOverview] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filters
  const [billingSearch, setBillingSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');

  // Modals
  const [selectedTeamForPayment, setSelectedTeamForPayment] = useState(null);
  const [selectedTeamForHistory, setSelectedTeamForHistory] = useState(null);

  // Payment Recording Form
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'upi',
    transactionId: '',
    invoiceNumber: '',
    nextDueDate: '',
    note: ''
  });
  const [recordingPayment, setRecordingPayment] = useState(false);

  const token = localStorage.getItem('token') || localStorage.getItem('auth-token');
  const headers = useMemo(() => ({ 'auth-token': token }), [token]);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [overviewRes, teamsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/admin/platform-overview`, { headers }),
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/admin/teams-usage`, { headers })
      ]);

      if (overviewRes.data.success) {
        setOverview(overviewRes.data.data);
      }
      if (teamsRes.data.success) {
        setTeams(teamsRes.data.teams || []);
      }
    } catch (err) {
      console.error('Failed to load billing CRM data:', err);
      toast.error(err.response?.data?.error || 'Failed to load billing CRM data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openPaymentModal = (team) => {
    setSelectedTeamForPayment(team);
    const billing = team.subscription?.billing || {};
    setPaymentForm({
      amount: billing.dueAmount > 0 ? billing.dueAmount : '',
      method: billing.paymentMethod || 'upi',
      transactionId: '',
      invoiceNumber: billing.invoiceNumber || `INV-${team._id.toString().slice(-6).toUpperCase()}`,
      nextDueDate: billing.nextDueDate
        ? new Date(billing.nextDueDate).toISOString().split('T')[0]
        : '',
      note: ''
    });
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedTeamForPayment) return;

    const amountNum = parseFloat(paymentForm.amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setRecordingPayment(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/team-billing/record-payment/${selectedTeamForPayment._id}`,
        paymentForm,
        { headers }
      );

      if (res.data.success) {
        toast.success(res.data.message || 'Payment recorded successfully!');
        setSelectedTeamForPayment(null);
        await fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  const filteredBillingTeams = useMemo(() => {
    return teams.filter((t) => {
      const search = billingSearch.toLowerCase().trim();
      const matchesSearch =
        !search ||
        t.teamName?.toLowerCase().includes(search) ||
        t.admin?.name?.toLowerCase().includes(search) ||
        t.admin?.email?.toLowerCase().includes(search) ||
        t.subscription?.billing?.invoiceNumber?.toLowerCase().includes(search);

      const pStatus = t.subscription?.billing?.paymentStatus || 'free_tier';
      const matchesStatus = paymentStatusFilter === 'all' || pStatus === paymentStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [teams, billingSearch, paymentStatusFilter]);

  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            Fully Paid
          </span>
        );
      case 'partial':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            Partial Paid
          </span>
        );
      case 'overdue':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
            Overdue
          </span>
        );
      case 'pending':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            Pending
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-700/40 text-slate-400 border border-slate-600/40">
            Free Tier
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-white">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading Billing & CRM Panel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Billing & CRM Ledger
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
              Monitor collections, track full/partial installment payments, record invoices, and manage dues.
            </p>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={refreshing}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── FINANCIAL KPI CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-medium">Total Billed Across Platform</span>
            <div className="text-2xl sm:text-3xl font-bold text-white mt-1">
              ${overview?.billingSummary?.totalInvoiced || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Sum of active subscription fees</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-800 text-slate-300">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-medium">Total Collected Cash / Online</span>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-1">
              ${overview?.billingSummary?.totalCollected || 0}
            </div>
            <div className="text-[11px] text-emerald-400/80 mt-1">Paid installments verified</div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-medium">Total Unpaid Balance Due</span>
            <div className="text-2xl sm:text-3xl font-bold text-amber-400 mt-1">
              ${overview?.billingSummary?.totalDue || 0}
            </div>
            <div className="text-[11px] text-amber-400/80 mt-1">Pending payment collection</div>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER ─────────────────────────────────────────────── */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search team or invoice number..."
            value={billingSearch}
            onChange={(e) => setBillingSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Filter Status:</span>
          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="bg-slate-800 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Fully Paid</option>
            <option value="partial">Partial Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="free_tier">Free Tier</option>
          </select>
        </div>
      </div>

      {/* ── CRM TABLE ───────────────────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Team & Admin</th>
                <th className="p-4">Invoice #</th>
                <th className="p-4">Total Bill</th>
                <th className="p-4">Paid Amount</th>
                <th className="p-4">Due Balance</th>
                <th className="p-4">Payment Status</th>
                <th className="p-4">Next Due Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredBillingTeams.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    No billing records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredBillingTeams.map((team) => {
                  const sub = team.subscription || {};
                  const billing = sub.billing || {};
                  const total = billing.totalAmount || sub.price || 0;
                  const paid = billing.paidAmount || 0;
                  const due =
                    billing.dueAmount !== undefined
                      ? billing.dueAmount
                      : Math.max(0, total - paid);

                  return (
                    <tr key={team._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-white text-sm">{team.teamName}</div>
                        <div className="text-[11px] text-slate-400">
                          {team.admin?.email || 'No admin assigned'}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-300">
                        {billing.invoiceNumber || 'INV-N/A'}
                      </td>
                      <td className="p-4 font-semibold text-white">${total}</td>
                      <td className="p-4 font-semibold text-emerald-400">${paid}</td>
                      <td className="p-4 font-semibold text-amber-400">${due}</td>
                      <td className="p-4">{getPaymentStatusBadge(billing.paymentStatus)}</td>
                      <td className="p-4 text-slate-400">
                        {billing.nextDueDate
                          ? new Date(billing.nextDueDate).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => openPaymentModal(team)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-colors"
                        >
                          + Record Payment
                        </button>
                        {billing.paymentHistory?.length > 0 && (
                          <button
                            onClick={() => setSelectedTeamForHistory(team)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors"
                            title="View Payment Ledger History"
                          >
                            <History className="w-3.5 h-3.5 inline" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── RECORD PAYMENT MODAL ────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedTeamForPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-400" />
                    <span>Record Payment: {selectedTeamForPayment.teamName}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Record full or partial payment installment for this team.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTeamForPayment(null)}
                  className="p-1.5 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Payment Amount ($ USD)
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="e.g. 50"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                      required
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Payment Method</label>
                    <select
                      value={paymentForm.method}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, method: e.target.value }))}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                    >
                      <option value="upi">UPI / GPay / PhonePe</option>
                      <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                      <option value="stripe">Stripe / Card</option>
                      <option value="cash">Cash / Direct</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Transaction / Ref ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UPI-987654321"
                      value={paymentForm.transactionId}
                      onChange={(e) =>
                        setPaymentForm((p) => ({ ...p, transactionId: e.target.value }))
                      }
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Invoice Number</label>
                    <input
                      type="text"
                      value={paymentForm.invoiceNumber}
                      onChange={(e) =>
                        setPaymentForm((p) => ({ ...p, invoiceNumber: e.target.value }))
                      }
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Next Due Date (If partial)
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={paymentForm.nextDueDate}
                    onChange={(e) =>
                      setPaymentForm((p) => ({ ...p, nextDueDate: e.target.value }))
                    }
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white [color-scheme:dark] cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Installment Note</label>
                  <textarea
                    rows="2"
                    placeholder="e.g. 1st installment received via UPI, remaining due on 15th."
                    value={paymentForm.note}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, note: e.target.value }))}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedTeamForPayment(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recordingPayment}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-1.5"
                  >
                    {recordingPayment ? 'Recording...' : 'Confirm & Save Payment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── PAYMENT HISTORY MODAL ───────────────────────────────────────── */}
      <AnimatePresence>
        {selectedTeamForHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-400" />
                    <span>Payment Ledger: {selectedTeamForHistory.teamName}</span>
                  </h3>
                  <p className="text-xs text-slate-400">Complete installment history and receipts.</p>
                </div>
                <button
                  onClick={() => setSelectedTeamForHistory(null)}
                  className="p-1.5 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {(selectedTeamForHistory.subscription?.billing?.paymentHistory || []).map(
                  (pay, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-emerald-400 text-sm">
                          +${pay.amount}{' '}
                          <span className="text-[11px] font-normal text-slate-400 uppercase">
                            via {pay.method}
                          </span>
                        </div>
                        {pay.transactionId && (
                          <div className="font-mono text-[11px] text-slate-400">
                            TxID: {pay.transactionId}
                          </div>
                        )}
                        {pay.note && <div className="text-slate-300 mt-1 italic">"{pay.note}"</div>}
                      </div>

                      <div className="text-right text-slate-500 text-[11px]">
                        <div>{new Date(pay.date).toLocaleDateString()}</div>
                        <div>By: {pay.recordedBy || 'Admin'}</div>
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={() => setSelectedTeamForHistory(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium text-xs"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminBillingCRM;
