// models/File.js
import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
    fileUrl: { type: String, required: true },
    filename: { type: String, required: true }, // Field for original file name
    uploadedBy: { type: String, required: true }, // Stores the user's name (e.g., "Shashi")
    uploadedById: { // Stores the user's MongoDB _id
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user', // IMPORTANT: This should match the name of your User model (lowercase 'u' as you've been using)
        required: true,
    },
    type: { type: String, required: true }, // Field for the classified file type (image, video, etc.)
}, { timestamps: true });

const File = mongoose.model('File', fileSchema);
export default File;