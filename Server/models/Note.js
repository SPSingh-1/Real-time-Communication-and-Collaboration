import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  content: { type: String, required: true },
  type: {
    type: String,
    enum: ['quote', 'comment', 'important'],
    default: 'comment'
  },
  date: { type: Date, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
  time: { type: Date, default: Date.now },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  scope: { type: String, enum: ['single', 'team', 'global'], default: 'single' }
});

export default mongoose.model('Note', noteSchema);