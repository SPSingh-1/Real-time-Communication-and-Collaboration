// models/Attendee.js
import mongoose from 'mongoose';

const attendeeSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  status: {
    type: String,
    enum: ['going', 'maybe', 'declined', 'busy'],
    default: 'going'
  },
  reason: {
    type: String,
  },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  scope: { type: String, enum: ['single', 'team', 'global'], default: 'single' }
}, { timestamps: true });

const Attendee = mongoose.model('Attendee', attendeeSchema);
export default Attendee;