// routes/fileUploadRoute.js (assuming this is your main upload route file)
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import FileModel from '../models/File.js'; // Ensure correct path
import fetchUser from '../middleware/fetchUser.js'; // Ensure correct path to your middleware


const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Apply fetchUser middleware to secure this route and populate req.user
router.post('/', fetchUser, upload.single('file'), async (req, res) => {
    try {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        const file = req.file;

        // Extract user info from req.user, populated by fetchUser middleware
        const uploadedBy = req.user.name; // User's name (e.g., "Shashi")
        const uploadedById = req.user.id; // User's MongoDB _id

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        // No need to check for username in req.body anymore, as it comes from the token
        if (!uploadedBy || !uploadedById) {
            // This should ideally be caught by fetchUser, but as a safeguard
            console.error('User name or ID missing from token after fetchUser middleware.');
            return res.status(401).json({ error: 'User authentication failed: Name or ID missing.' });
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
        else if (
            type.includes("javascript") ||
            type.includes("json") ||
            type.includes("html") ||
            type.includes("css") ||
            type.includes("python") || // e.g., text/x-python
            file.originalname.endsWith('.js') ||
            file.originalname.endsWith('.jsx') ||
            file.originalname.endsWith('.ts') ||
            file.originalname.endsWith('.tsx') ||
            file.originalname.endsWith('.py') ||
            file.originalname.endsWith('.java') ||
            file.originalname.endsWith('.c') ||
            file.originalname.endsWith('.cpp') ||
            file.originalname.endsWith('.php')
        ) type = "code";
        else type = "other";

        console.log('Creating new FileModel instance...');
        const newFile = new FileModel({
            fileUrl: result.secure_url,
            filename: file.originalname,
            type,
            uploadedBy: uploadedBy,     // Use the name from the token
            uploadedById: uploadedById, // Use the ID from the token
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