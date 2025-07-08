import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  fileUrl: { type: String, required: true },
  filename: { type: String, required: true },
  uploadedBy: { type: String, required: true },
  type: { type: String, required: true },
}, { timestamps: true });

const File = mongoose.model('File', fileSchema);
export default File;
