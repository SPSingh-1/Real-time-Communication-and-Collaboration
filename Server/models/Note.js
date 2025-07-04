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
  time: { type: Date, default: Date.now }
});

export default mongoose.model('Note', noteSchema);