import express from 'express';
import crypto from 'crypto';
import { TeamClient, TeamPipelineStage } from '../models/TeamCRM.js';
import fetchUser from '../middleware/fetchUser.js';

const router = express.Router();

// Default pipeline stages for any team
const DEFAULT_STAGES = [
  { stageId: 'lead', label: 'New Lead', color: '#6366f1', order: 0 },
  { stageId: 'discovery', label: 'Discovery Call', color: '#3b82f6', order: 1 },
  { stageId: 'proposal', label: 'Proposal Sent', color: '#a855f7', order: 2 },
  { stageId: 'in_progress', label: 'In Progress', color: '#eab308', order: 3 },
  { stageId: 'won', label: 'Closed Won', color: '#22c55e', order: 4 },
  { stageId: 'lost', label: 'Closed Lost', color: '#ef4444', order: 5 }
];

// Helper to get effective teamId
function getTeamId(req) {
  return req.user?.teamId || req.user?.id || req.user?._id;
}

// GET all pipeline stages for team
router.get('/stages', fetchUser, async (req, res) => {
  try {
    const teamId = getTeamId(req);
    let stages = await TeamPipelineStage.find({ teamId }).sort({ order: 1 });

    if (!stages || stages.length === 0) {
      const seeded = DEFAULT_STAGES.map((s) => ({ ...s, teamId }));
      stages = await TeamPipelineStage.insertMany(seeded);
    }

    return res.json({ success: true, stages });
  } catch (error) {
    console.error('Error fetching CRM stages:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST update/create pipeline stages for team
router.post('/stages', fetchUser, async (req, res) => {
  try {
    const teamId = getTeamId(req);
    const { stages } = req.body;

    if (!Array.isArray(stages) || stages.length === 0) {
      return res.status(400).json({ success: false, error: 'Valid stages array required' });
    }

    await TeamPipelineStage.deleteMany({ teamId });
    const newStages = stages.map((s, index) => ({
      teamId,
      stageId: s.stageId || `stage_${Date.now()}_${index}`,
      label: s.label || 'Stage',
      color: s.color || '#8b5cf6',
      order: index
    }));

    const saved = await TeamPipelineStage.insertMany(newStages);
    return res.json({ success: true, stages: saved });
  } catch (error) {
    console.error('Error saving CRM stages:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET all clients/deals for team
router.get('/clients', fetchUser, async (req, res) => {
  try {
    const teamId = getTeamId(req);
    const clients = await TeamClient.find({ teamId }).sort({ updatedAt: -1 });

    return res.json({ success: true, clients });
  } catch (error) {
    console.error('Error fetching CRM clients:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Helper to build safe query for Client ID
function buildClientQuery(id, body = {}) {
  const conditions = [];
  if (id && mongoose.Types.ObjectId.isValid(id)) {
    conditions.push({ _id: id });
  }
  if (id) {
    conditions.push({ portalToken: id });
  }
  if (body.portalToken) {
    conditions.push({ portalToken: body.portalToken });
  }
  if (body.name) {
    conditions.push({ name: body.name });
  }
  if (conditions.length === 0) {
    return { _id: id };
  }
  return { $or: conditions };
}

// POST create a new client/deal
router.post('/clients', fetchUser, async (req, res) => {
  try {
    const teamId = getTeamId(req);
    const userId = req.user.id || req.user._id;
    const {
      name,
      company,
      email,
      phone,
      dealValue,
      currency,
      stageId,
      priority,
      assignedTo,
      notes,
      tags,
      linkedFigmaUrl,
      customFields,
      portalToken: existingToken
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Client or Lead name is required' });
    }

    const portalToken = existingToken || crypto.randomBytes(16).toString('hex');

    const client = await TeamClient.create({
      teamId,
      createdBy: userId,
      name: name.trim(),
      company: company ? company.trim() : '',
      email: email ? email.trim() : '',
      phone: phone ? phone.trim() : '',
      dealValue: Number(dealValue) || 0,
      currency: currency || 'INR',
      stageId: stageId || 'lead',
      priority: priority || 'medium',
      assignedTo: assignedTo || { id: userId, name: req.user.name, email: req.user.email },
      notes: notes || '',
      tags: Array.isArray(tags) ? tags : [],
      linkedFigmaUrl: linkedFigmaUrl || '',
      customFields: customFields || {},
      portalToken
    });

    return res.status(201).json({ success: true, client });
  } catch (error) {
    console.error('Error creating CRM client:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT update client/deal (or move stage)
router.put('/clients/:id', fetchUser, async (req, res) => {
  try {
    const { id } = req.params;
    const teamId = getTeamId(req);
    const userId = req.user.id || req.user._id;
    const query = buildClientQuery(id, req.body);

    const updatePayload = { ...req.body };
    delete updatePayload._id; // prevent modifying immutable _id

    let client = await TeamClient.findOneAndUpdate(
      query,
      { $set: updatePayload },
      { new: true }
    );

    // If client was not found in DB (e.g. temporary ID from offline), create it in DB
    if (!client) {
      const portalToken = updatePayload.portalToken || crypto.randomBytes(16).toString('hex');
      client = await TeamClient.create({
        ...updatePayload,
        teamId,
        createdBy: userId,
        portalToken
      });
    }

    return res.json({ success: true, client });
  } catch (error) {
    console.error('Error updating CRM client:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE a client/deal
router.delete('/clients/:id', fetchUser, async (req, res) => {
  try {
    const { id } = req.params;
    const query = buildClientQuery(id);

    const client = await TeamClient.findOneAndDelete(query);
    if (!client) {
      return res.json({ success: true, message: 'Client already removed or not found' });
    }

    return res.json({ success: true, message: 'Client removed successfully' });
  } catch (error) {
    console.error('Error deleting CRM client:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST add invoice to deal
router.post('/clients/:id/invoices', fetchUser, async (req, res) => {
  try {
    const { id } = req.params;
    const query = buildClientQuery(id, req.body);
    const { title, amount, currency, dueDate, paymentLink } = req.body;

    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    const newInvoice = {
      invoiceNumber,
      title: title || 'Milestone Invoice',
      amount: Number(amount) || 0,
      currency: currency || 'INR',
      status: 'Pending',
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      paymentLink: paymentLink || ''
    };

    const client = await TeamClient.findOneAndUpdate(
      query,
      { $push: { invoices: newInvoice } },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    return res.status(201).json({ success: true, client, invoice: newInvoice });
  } catch (error) {
    console.error('Error adding invoice:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH update invoice status
router.patch('/clients/:id/invoices/:invoiceId', fetchUser, async (req, res) => {
  try {
    const { id, invoiceId } = req.params;
    const query = buildClientQuery(id, req.body);
    const { status, paymentLink } = req.body;

    const client = await TeamClient.findOne(query);
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const invoice = client.invoices.find((i) => String(i._id) === String(invoiceId) || i.invoiceNumber === invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    if (status) {
      invoice.status = status;
      if (status === 'Paid') invoice.paidAt = new Date();
    }
    if (paymentLink !== undefined) invoice.paymentLink = paymentLink;

    await client.save();
    return res.json({ success: true, client, invoice });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUBLIC GUEST PORTAL API: GET client portal data by portalToken
router.get('/portal/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const client = await TeamClient.findOne({ portalToken: token });

    if (!client) {
      return res.status(404).json({ success: false, error: 'Invalid or expired client portal link' });
    }

    return res.json({
      success: true,
      portal: {
        clientName: client.name,
        company: client.company,
        stageId: client.stageId,
        dealValue: client.dealValue,
        currency: client.currency,
        linkedFigmaUrl: client.linkedFigmaUrl,
        invoices: client.invoices,
        notes: client.notes,
        updatedAt: client.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching public client portal:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
