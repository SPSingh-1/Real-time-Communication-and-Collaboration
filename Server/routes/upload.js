import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config(); // ✅ Always call dotenv at the top
console.log('✅ ENV Loaded:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  key: process.env.CLOUDINARY_API_KEY,
  secret: process.env.CLOUDINARY_API_SECRET ? 'loaded' : 'missing',
});

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // ✅ In-memory upload

router.post('/', upload.single('file'), async (req, res) => {
  try {
    // ✅ CONFIGURE cloudinary only when needed (not on top level)
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const file = req.file;

    const base64String = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    const result = await cloudinary.uploader.upload(base64String, {
      folder: 'chat_uploads',
      resource_type: 'auto',
      transformation: [{ width: 800, crop: 'limit' }],
    });

    return res.json({ fileUrl: result.secure_url });
  } catch (err) {
    console.error('❌ Cloudinary upload error:', err.message);
    return res.status(500).json({ error: 'Cloudinary upload failed' });
  }
});

export default router;
