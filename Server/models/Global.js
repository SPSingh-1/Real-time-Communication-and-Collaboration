import mongoose from 'mongoose';

const GlobalSchema = new mongoose.Schema({
  // Fixed global ID
  globalId: { type: String, required: true, unique: true, default: "Global123" },

  // Optional name for the global group
  name: { type: String, default: "Global Group" },

  // Members of the global group
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
}, { timestamps: true });

const Global = mongoose.model('Global', GlobalSchema);
export default Global;
