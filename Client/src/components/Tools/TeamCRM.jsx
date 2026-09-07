// src/components/Tools/TeamCRM.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Briefcase,
  Users,
  Plus,
  Search,
  Filter,
  DollarSign,
  Kanban,
  Table as TableIcon,
  Phone,
  Mail,
  Building2,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Settings2,
  Receipt,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Trash2,
  Pencil,
  Copy,
  Check,
  Globe,
  Share2,
  Layers
} from 'lucide-react';
import { toast } from 'react-toastify';

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}`;

const DEFAULT_STAGES = [
  { stageId: 'lead', label: 'New Lead', color: '#6366f1', order: 0 },
  { stageId: 'discovery', label: 'Discovery Call', color: '#3b82f6', order: 1 },
  { stageId: 'proposal', label: 'Proposal Sent', color: '#a855f7', order: 2 },
  { stageId: 'in_progress', label: 'In Progress', color: '#eab308', order: 3 },
  { stageId: 'won', label: 'Closed Won', color: '#22c55e', order: 4 },
  { stageId: 'lost', label: 'Closed Lost', color: '#ef4444', order: 5 }
];

const TeamCRM = ({ user }) => {
  const [stages, setStages] = useState(DEFAULT_STAGES);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState('all');

  // Modals
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [showStagesModal, setShowStagesModal] = useState(false);
  const [activeInvoiceClient, setActiveInvoiceClient] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // New Client Form
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    dealValue: '',
    currency: 'INR',
    stageId: 'lead',
    priority: 'medium',
    notes: '',
    linkedFigmaUrl: '',
    tags: ''
  });

  // Invoice Form
  const [invoiceForm, setInvoiceForm] = useState({
    title: '',
    amount: '',
    currency: 'INR',
    dueDate: '',
    paymentLink: ''
  });

  // Stage editing form
  const [customStages, setCustomStages] = useState(DEFAULT_STAGES);

  useEffect(() => {
    fetchCrmData();
  }, []);

  const fetchCrmData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const [stagesRes, clientsRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/api/team-crm/stages`, { headers: { 'auth-token': token }, timeout: 6000 }),
            axios.get(`${API_BASE_URL}/api/team-crm/clients`, { headers: { 'auth-token': token }, timeout: 6000 })
          ]);

          if (stagesRes.data.success && stagesRes.data.stages?.length > 0) {
            setStages(stagesRes.data.stages);
            setCustomStages(stagesRes.data.stages);
          }
          if (clientsRes.data.success && clientsRes.data.clients) {
            setClients(clientsRes.data.clients);
            localStorage.setItem('team_crm_clients', JSON.stringify(clientsRes.data.clients));
            return;
          }
        } catch (netErr) {
          console.warn('Backend CRM fetch fallback to local:', netErr);
        }
      }

      const localCached = JSON.parse(localStorage.getItem('team_crm_clients') || '[]');
      setClients(localCached);
    } catch (error) {
      console.error('Error fetching CRM data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.warn('Please enter client or deal name');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      company: formData.company?.trim() || '',
      email: formData.email?.trim() || '',
      phone: formData.phone?.trim() || '',
      dealValue: Number(formData.dealValue) || 0,
      currency: formData.currency || 'INR',
      stageId: formData.stageId || 'lead',
      priority: formData.priority || 'medium',
      notes: formData.notes || '',
      linkedFigmaUrl: formData.linkedFigmaUrl || '',
      tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      ...(editingClient?.portalToken ? { portalToken: editingClient.portalToken } : {})
    };

    const token = localStorage.getItem('token');

    try {
      if (editingClient) {
        let updatedClient = { ...editingClient, ...payload };
        if (token) {
          try {
            const res = await axios.put(
              `${API_BASE_URL}/api/team-crm/clients/${editingClient._id}`,
              payload,
              { headers: { 'auth-token': token } }
            );
            if (res.data.success && res.data.client) {
              updatedClient = res.data.client;
            }
          } catch (apiErr) {
            console.warn('Backend client update sync fallback:', apiErr);
          }
        }
        const updatedList = clients.map((c) =>
          c._id === editingClient._id || (c.portalToken && c.portalToken === editingClient.portalToken)
            ? updatedClient
            : c
        );
        setClients(updatedList);
        localStorage.setItem('team_crm_clients', JSON.stringify(updatedList));
        toast.success('Deal / Client updated! 🎉');
        setShowClientModal(false);
        setEditingClient(null);
        resetForm();
        return;
      } else {
        let createdClient = null;
        if (token) {
          try {
            const res = await axios.post(`${API_BASE_URL}/api/team-crm/clients`, payload, {
              headers: { 'auth-token': token }
            });
            if (res.data.success && res.data.client) {
              createdClient = res.data.client;
            }
          } catch (apiErr) {
            console.warn('Backend client create sync fallback:', apiErr);
          }
        }

        if (!createdClient) {
          createdClient = {
            ...payload,
            _id: `client_${Date.now()}`,
            invoices: [],
            portalToken: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            createdAt: new Date()
          };
        }

        const updatedList = [createdClient, ...clients];
        setClients(updatedList);
        localStorage.setItem('team_crm_clients', JSON.stringify(updatedList));
        toast.success('New client deal added to CRM! 💼');
        setShowClientModal(false);
        setEditingClient(null);
        resetForm();
      }
    } catch (err) {
      console.error('Error saving client deal:', err);
      toast.error('Failed to save client deal');
    }
  };

  const handleDeleteClient = async (clientId) => {
    const updated = clients.filter(
      (c) => String(c._id) !== String(clientId) && String(c.portalToken) !== String(clientId)
    );
    setClients(updated);
    localStorage.setItem('team_crm_clients', JSON.stringify(updated));
    toast.info('Client deal removed 🗑️');

    try {
      const token = localStorage.getItem('token');
      if (token) {
        axios
          .delete(`${API_BASE_URL}/api/team-crm/clients/${clientId}`, {
            headers: { 'auth-token': token }
          })
          .catch((e) => console.warn('Delete sync:', e));
      }
    } catch (error) {}
  };

  const handleMoveStage = async (clientId, targetStageId) => {
    const targetClient = clients.find((c) => c._id === clientId || c.portalToken === clientId);
    const updated = clients.map((c) =>
      c._id === clientId || c.portalToken === clientId ? { ...c, stageId: targetStageId } : c
    );
    setClients(updated);
    localStorage.setItem('team_crm_clients', JSON.stringify(updated));
    toast.success('Deal moved to next stage! ⚡');

    try {
      const token = localStorage.getItem('token');
      if (token) {
        const res = await axios.put(
          `${API_BASE_URL}/api/team-crm/clients/${clientId}`,
          {
            stageId: targetStageId,
            portalToken: targetClient?.portalToken,
            name: targetClient?.name
          },
          { headers: { 'auth-token': token } }
        );
        if (res.data.success && res.data.client) {
          const synced = clients.map((c) =>
            c._id === clientId || c.portalToken === clientId ? res.data.client : c
          );
          setClients(synced);
          localStorage.setItem('team_crm_clients', JSON.stringify(synced));
        }
      }
    } catch (error) {
      console.warn('Error moving stage:', error);
    }
  };

  const handleAddInvoice = async (e) => {
    e.preventDefault();
    if (!activeInvoiceClient || !invoiceForm.amount) {
      toast.warn('Please specify amount for the invoice');
      return;
    }

    const newInvoiceObj = {
      _id: `inv_${Date.now()}`,
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      title: invoiceForm.title?.trim() || 'Milestone Invoice',
      amount: Number(invoiceForm.amount) || 0,
      currency: invoiceForm.currency || 'INR',
      status: 'Pending',
      dueDate: invoiceForm.dueDate ? new Date(invoiceForm.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      paymentLink: invoiceForm.paymentLink?.trim() || '',
      createdAt: new Date()
    };

    // Instant optimistic update
    const updatedInvoices = [...(activeInvoiceClient.invoices || []), newInvoiceObj];
    const updatedClient = { ...activeInvoiceClient, invoices: updatedInvoices };
    setActiveInvoiceClient(updatedClient);

    const updatedClientsList = clients.map((c) =>
      c._id === activeInvoiceClient._id || c.portalToken === activeInvoiceClient.portalToken
        ? updatedClient
        : c
    );
    setClients(updatedClientsList);
    localStorage.setItem('team_crm_clients', JSON.stringify(updatedClientsList));

    toast.success('Invoice created! 📄');
    setInvoiceForm({ title: '', amount: '', currency: 'INR', dueDate: '', paymentLink: '' });

    // Sync to backend
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const res = await axios.post(
          `${API_BASE_URL}/api/team-crm/clients/${activeInvoiceClient._id}/invoices`,
          {
            ...invoiceForm,
            portalToken: activeInvoiceClient.portalToken
          },
          { headers: { 'auth-token': token } }
        );
        if (res.data.success && res.data.client) {
          setActiveInvoiceClient(res.data.client);
          const syncedList = clients.map((c) =>
            c._id === res.data.client._id || c.portalToken === res.data.client.portalToken
              ? res.data.client
              : c
          );
          setClients(syncedList);
          localStorage.setItem('team_crm_clients', JSON.stringify(syncedList));
        }
      }
    } catch (error) {
      console.warn('Invoice backend sync:', error);
    }
  };

  const handleUpdateInvoiceStatus = async (clientId, invoiceId, nextStatus) => {
    // Instant optimistic update
    const updatedInvoices = (activeInvoiceClient.invoices || []).map((inv) =>
      inv._id === invoiceId || inv.invoiceNumber === invoiceId
        ? { ...inv, status: nextStatus, paidAt: new Date() }
        : inv
    );
    const updatedClient = { ...activeInvoiceClient, invoices: updatedInvoices };
    setActiveInvoiceClient(updatedClient);

    const updatedClientsList = clients.map((c) =>
      c._id === activeInvoiceClient._id || c.portalToken === activeInvoiceClient.portalToken
        ? updatedClient
        : c
    );
    setClients(updatedClientsList);
    localStorage.setItem('team_crm_clients', JSON.stringify(updatedClientsList));
    toast.success(`Invoice marked as ${nextStatus}! ✅`);

    try {
      const token = localStorage.getItem('token');
      if (token) {
        axios
          .patch(
            `${API_BASE_URL}/api/team-crm/clients/${clientId}/invoices/${invoiceId}`,
            { status: nextStatus, portalToken: activeInvoiceClient.portalToken },
            { headers: { 'auth-token': token } }
          )
          .catch((e) => console.warn('Invoice status sync:', e));
      }
    } catch (error) {
      console.warn('Error updating invoice status:', error);
    }
  };

  const handleSaveCustomStages = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_BASE_URL}/api/team-crm/stages`,
        { stages: customStages },
        { headers: { 'auth-token': token } }
      );

      if (res.data.success) {
        toast.success('Pipeline stages updated successfully!');
        setStages(res.data.stages);
        setShowStagesModal(false);
      }
    } catch (error) {
      toast.error('Failed to update stages');
    }
  };

  const copyClientPortalLink = (portalToken) => {
    if (!portalToken) return;
    const url = `${window.location.origin}/portal/${portalToken}`;
    navigator.clipboard.writeText(url);
    toast.success('Client Portal link copied! Share this with your client 🌐');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      company: '',
      email: '',
      phone: '',
      dealValue: '',
      currency: 'INR',
      stageId: stages[0]?.stageId || 'lead',
      priority: 'medium',
      notes: '',
      linkedFigmaUrl: '',
      tags: ''
    });
  };

  const openEditModal = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      company: client.company || '',
      email: client.email || '',
      phone: client.phone || '',
      dealValue: client.dealValue || '',
      currency: client.currency || 'INR',
      stageId: client.stageId || 'lead',
      priority: client.priority || 'medium',
      notes: client.notes || '',
      linkedFigmaUrl: client.linkedFigmaUrl || '',
      tags: Array.isArray(client.tags) ? client.tags.join(', ') : ''
    });
    setShowClientModal(true);
  };

  // Metrics
  const totalPipelineValue = clients.reduce((acc, c) => acc + (Number(c.dealValue) || 0), 0);
  const wonDealsCount = clients.filter((c) => c.stageId === 'won').length;

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = selectedStageFilter === 'all' || c.stageId === selectedStageFilter;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics Bar */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <Briefcase className="w-6 h-6 text-indigo-400" />
              <span>Team Client CRM & Deals</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage client pipelines, deals, invoices, and share live client portals.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto">
            <button
              onClick={() => setShowStagesModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Customize Stages</span>
            </button>

            <button
              onClick={() => {
                setEditingClient(null);
                resetForm();
                setShowClientModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition transform hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Client / Deal</span>
            </button>
          </div>
        </div>

        {/* CRM Quick Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-5">
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <p className="text-[11px] text-slate-400 font-medium">Total Deals</p>
            <p className="text-lg sm:text-xl font-bold text-white mt-0.5">{clients.length}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <p className="text-[11px] text-slate-400 font-medium">Pipeline Value</p>
            <p className="text-lg sm:text-xl font-bold text-indigo-400 mt-0.5">
              ₹{totalPipelineValue.toLocaleString()}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <p className="text-[11px] text-slate-400 font-medium">Closed Won</p>
            <p className="text-lg sm:text-xl font-bold text-emerald-400 mt-0.5">{wonDealsCount} Deals</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <p className="text-[11px] text-slate-400 font-medium">Active Stages</p>
            <p className="text-lg sm:text-xl font-bold text-purple-400 mt-0.5">{stages.length} Stages</p>
          </div>
        </div>
      </div>

      {/* Toolbar (Search, Filter, View Mode Switcher) */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search clients by name, company, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'kanban' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'table' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main CRM Content View */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-400">Loading team CRM workspace...</p>
        </div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar items-start">
          {stages.map((stage) => {
            const stageClients = filteredClients.filter((c) => c.stageId === stage.stageId);
            const stageSum = stageClients.reduce((sum, c) => sum + (Number(c.dealValue) || 0), 0);

            return (
              <div
                key={stage.stageId}
                className="w-80 flex-shrink-0 bg-slate-900/70 border border-slate-800 rounded-3xl p-4 flex flex-col space-y-3.5"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: stage.color || '#6366f1' }}
                    ></span>
                    <h3 className="text-xs font-bold text-white">{stage.label}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
                      {stageClients.length}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    ₹{stageSum.toLocaleString()}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 min-h-[300px]">
                  {stageClients.length === 0 ? (
                    <div className="py-10 text-center text-[11px] text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                      No deals in this stage
                    </div>
                  ) : (
                    stageClients.map((client) => (
                      <KanbanCard
                        key={client._id}
                        client={client}
                        stages={stages}
                        onMoveStage={handleMoveStage}
                        onEdit={() => openEditModal(client)}
                        onDelete={() => setDeleteTarget(client)}
                        onOpenInvoices={() => setActiveInvoiceClient(client)}
                        onCopyPortal={() => copyClientPortalLink(client.portalToken)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">Client / Company</th>
                  <th className="px-5 py-4">Stage</th>
                  <th className="px-5 py-4">Deal Value</th>
                  <th className="px-5 py-4">Priority</th>
                  <th className="px-5 py-4">Contact</th>
                  <th className="px-5 py-4">Invoices</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredClients.map((client) => {
                  const currentStage = stages.find((s) => s.stageId === client.stageId);
                  return (
                    <tr key={client._id} className="hover:bg-slate-850/50 transition">
                      <td className="px-5 py-4">
                        <div className="font-bold text-white">{client.name}</div>
                        <div className="text-[11px] text-slate-400">{client.company || 'Direct Client'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                          style={{
                            backgroundColor: `${currentStage?.color || '#6366f1'}25`,
                            color: currentStage?.color || '#6366f1'
                          }}
                        >
                          {currentStage?.label || client.stageId}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-emerald-400">
                        ₹{(Number(client.dealValue) || 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            client.priority === 'urgent'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : client.priority === 'high'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {client.priority}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[11px]">
                        <div>{client.email || '-'}</div>
                        <div className="text-slate-500">{client.phone || ''}</div>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setActiveInvoiceClient(client)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1 transition"
                        >
                          <Receipt className="w-3 h-3 text-indigo-400" />
                          <span>{client.invoices?.length || 0} Invoices</span>
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => copyClientPortalLink(client.portalToken)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-900 text-indigo-300 transition"
                            title="Copy Client Portal Link"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(client)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-900 text-blue-300 transition"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(client)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900 text-red-300 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete Client Deal?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to remove <span className="text-white font-semibold">"{deleteTarget.name}"</span>? This will also remove associated invoices and portal links.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteClient(deleteTarget._id);
                  setDeleteTarget(null);
                }}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition transform hover:scale-105"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Client Modal */}
      {showClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                <span>{editingClient ? 'Edit Client Deal' : 'Add New Client / Deal'}</span>
              </h3>
              <button
                onClick={() => setShowClientModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Company</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="client@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Deal Value (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="50000"
                    value={formData.dealValue}
                    onChange={(e) => setFormData({ ...formData, dealValue: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Stage</label>
                  <select
                    value={formData.stageId}
                    onChange={(e) => setFormData({ ...formData, stageId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {stages.map((s) => (
                      <option key={s.stageId} value={s.stageId}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Linked Figma Design URL
                </label>
                <input
                  type="url"
                  placeholder="https://www.figma.com/design/..."
                  value={formData.linkedFigmaUrl}
                  onChange={(e) => setFormData({ ...formData, linkedFigmaUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="UI Design, High Value, React App"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Notes & Project Scope
                </label>
                <textarea
                  rows={2}
                  placeholder="Project requirements, discussion highlights..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowClientModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
                >
                  {editingClient ? 'Save Changes' : 'Create Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice & Client Portal Modal */}
      {activeInvoiceClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>Invoices & Client Portal: {activeInvoiceClient.name}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Company: {activeInvoiceClient.company || 'Direct'}
                </p>
              </div>
              <button
                onClick={() => setActiveInvoiceClient(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* 1-Click Client Portal Share Banner */}
            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Client-Facing Portal Link</span>
                </p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  Clients can view prototypes & invoices without login.
                </p>
              </div>
              <button
                onClick={() => copyClientPortalLink(activeInvoiceClient.portalToken)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 shadow-md transition"
              >
                <Copy className="w-3 h-3" />
                <span>Copy Link</span>
              </button>
            </div>

            {/* Add Invoice Form */}
            <form onSubmit={handleAddInvoice} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Create Milestone Invoice</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  placeholder="Invoice Title (e.g. 50% Upfront Advance)"
                  value={invoiceForm.title}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="number"
                  required
                  placeholder="Amount (₹)"
                  value={invoiceForm.amount}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="date"
                  value={invoiceForm.dueDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 [color-scheme:dark] cursor-pointer"
                />
                <input
                  type="url"
                  placeholder="Payment Link (Razorpay/Stripe/UPI)"
                  value={invoiceForm.paymentLink}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, paymentLink: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-600/30"
              >
                + Add Invoice
              </button>
            </form>

            {/* Existing Invoices List */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-300">
                Invoices History ({activeInvoiceClient.invoices?.length || 0})
              </h4>
              {(!activeInvoiceClient.invoices || activeInvoiceClient.invoices.length === 0) ? (
                <p className="text-xs text-slate-500 py-3 text-center">No invoices generated yet</p>
              ) : (
                activeInvoiceClient.invoices.map((inv) => (
                  <div
                    key={inv._id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{inv.title}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {inv.invoiceNumber} • ₹{Number(inv.amount).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          inv.status === 'Paid'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {inv.status}
                      </span>

                      {inv.status !== 'Paid' && (
                        <button
                          onClick={() => handleUpdateInvoiceStatus(activeInvoiceClient._id, inv._id, 'Paid')}
                          className="px-2 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-semibold hover:bg-emerald-900"
                        >
                          Mark Paid
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customize Stages Modal */}
      {showStagesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-purple-400" />
                <span>Customize Team Pipeline Stages</span>
              </h3>
              <button onClick={() => setShowStagesModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto custom-scrollbar">
              {customStages.map((st, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={st.color || '#6366f1'}
                    onChange={(e) => {
                      const updated = [...customStages];
                      updated[idx].color = e.target.value;
                      setCustomStages(updated);
                    }}
                    className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={st.label}
                    onChange={(e) => {
                      const updated = [...customStages];
                      updated[idx].label = e.target.value;
                      setCustomStages(updated);
                    }}
                    className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => {
                      if (customStages.length <= 2) {
                        toast.warn('At least 2 stages required');
                        return;
                      }
                      setCustomStages(customStages.filter((_, i) => i !== idx));
                    }}
                    className="p-1 text-slate-500 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setCustomStages([
                  ...customStages,
                  { stageId: `stage_${Date.now()}`, label: 'New Custom Stage', color: '#8b5cf6', order: customStages.length }
                ]);
              }}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              + Add Stage Column
            </button>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowStagesModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomStages}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30"
              >
                Save Pipeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component: Kanban Card
const KanbanCard = ({ client, stages, onMoveStage, onEdit, onDelete, onOpenInvoices, onCopyPortal }) => {
  const currentStageIdx = stages.findIndex((s) => s.stageId === client.stageId);

  return (
    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 hover:border-slate-700 transition shadow-sm space-y-3 group">
      {/* Top row with Company and Priority */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-xs sm:text-sm font-bold text-white truncate" title={client.name}>
            {client.name}
          </h4>
          <p className="text-[11px] text-slate-400 truncate">{client.company || 'Direct Client'}</p>
        </div>

        <span
          className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold flex-shrink-0 ${
            client.priority === 'urgent'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : client.priority === 'high'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          {client.priority}
        </span>
      </div>

      {/* Deal Value */}
      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
        <span className="text-[11px] text-slate-400">Deal Value:</span>
        <span className="font-mono font-bold text-emerald-400">
          ₹{(Number(client.dealValue) || 0).toLocaleString()}
        </span>
      </div>

      {/* Linked Figma or Contact Badge */}
      <div className="flex items-center gap-2 flex-wrap text-[10px]">
        {client.linkedFigmaUrl && (
          <a
            href={client.linkedFigmaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-0.5 rounded-md bg-purple-950/60 border border-purple-800/40 text-purple-300 hover:text-white flex items-center gap-1 font-semibold transition"
          >
            <Layers className="w-3 h-3" />
            <span>Figma Design</span>
          </a>
        )}

        <button
          onClick={onOpenInvoices}
          className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1 font-medium transition"
        >
          <Receipt className="w-3 h-3 text-emerald-400" />
          <span>{client.invoices?.length || 0} Invoices</span>
        </button>
      </div>

      {/* Bottom Action Footer & Stage Advancement */}
      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={onCopyPortal}
            className="p-1 rounded bg-slate-900 hover:bg-indigo-950 text-indigo-400 text-xs transition"
            title="Copy Client Portal Link"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onEdit}
            className="p-1 rounded bg-slate-900 hover:bg-blue-950 text-blue-400 text-xs transition"
            title="Edit Deal"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded bg-slate-900 hover:bg-red-950 text-slate-500 hover:text-red-400 text-xs transition"
            title="Delete Deal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Stage Shift Arrows */}
        <div className="flex items-center gap-1">
          {currentStageIdx > 0 && (
            <button
              onClick={() => onMoveStage(client._id, stages[currentStageIdx - 1].stageId)}
              className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 transition"
              title="Move to Previous Stage"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          {currentStageIdx < stages.length - 1 && (
            <button
              onClick={() => onMoveStage(client._id, stages[currentStageIdx + 1].stageId)}
              className="px-2 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[10px] font-bold flex items-center gap-0.5 transition"
              title="Move to Next Stage"
            >
              <span>Next</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamCRM;
