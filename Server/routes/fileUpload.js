import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import FileModel from '../models/File.js';

dotenv.config();

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('file'), async (req, res) => {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const file = req.file;
    const { username } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const base64String = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    console.log('Attempting Cloudinary upload...');
    const result = await cloudinary.uploader.upload(base64String, {
      folder: 'collab_uploads',
      resource_type: 'auto',
      transformation: [{ width: 800, crop: 'limit' }],
    });
    console.log('Cloudinary upload successful. Result:', result.secure_url);


    let type = file.mimetype;
    if (type.startsWith("image")) type = "image";
    else if (type.startsWith("video")) type = "video";
    else if (type.startsWith("audio")) type = "audio";
    else if (type.includes("pdf") || type.includes("msword") || type.includes("officedocument")) type = "document";
    else if (type.includes(".jsx") || type.includes(".html") || type.includes("python")) type = "code";
    else type = "other";

    console.log('Creating new FileModel instance...');
    const newFile = new FileModel({
      fileUrl: result.secure_url,
      filename: file.originalname,
      type,
      uploadedBy: username,
    });
    console.log('FileModel instance created:', newFile);

    console.log('Attempting to save to MongoDB...');
    const saved = await newFile.save();
    console.log('✅ File saved to MongoDB successfully:', saved);
    res.json(saved);
  } catch (err) {
    console.error('❌ Upload error:', err); // Log the full error object
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});

export default router;

