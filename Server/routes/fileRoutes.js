// routes/fileRoutes.js (assuming this is where your GET and DELETE routes are)

import express from 'express';
import FileModel from '../models/File.js'; // Ensure correct path
import fetchUser from '../middleware/fetchUser.js'; // Ensure correct path to your middleware
import { v2 as cloudinary } from 'cloudinary'; // If you also want to delete from Cloudinary

const router = express.Router();

// GET all files (no authentication needed if public)
router.get('/', async (req, res) => {
    try {
        const files = await FileModel.find().sort({ createdAt: -1 });
        res.json(files);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Fetch failed' });
    }
});

// DELETE a file (requires authentication and authorization)
router.delete('/:id', fetchUser, async (req, res) => { // <-- Apply fetchUser here
    try {
        const fileId = req.params.id;
        const userId = req.user.id; // Get user ID from the authenticated request

        const file = await FileModel.findById(fileId);

        if (!file) {
            return res.status(404).json({ message: 'File not found.' });
        }

        // IMPORTANT: Ensure the current user is the one who uploaded the file
        // Convert both to string for comparison if one is ObjectId and other is string
        if (file.uploadedById.toString() !== userId) {
            return res.status(403).json({ message: 'You are not authorized to delete this file.' });
        }

        // Optional: Delete from Cloudinary as well
        // You'll need to extract the public_id from the Cloudinary URL
        // Example: https://res.cloudinary.com/your_cloud_name/image/upload/v12345/folder/public_id.jpg
        // The public_id would be 'folder/public_id'
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        // Regex to extract public ID from Cloudinary URL
        const publicIdMatch = file.fileUrl.match(/\/upload\/(?:v\d+\/)?([^\/]+)\.([a-zA-Z0-9]+)$/);
        if (publicIdMatch && publicIdMatch[1]) {
            const publicId = publicIdMatch[1];
            try {
                // If it's a raw file (not an image/video transformed), specify resource_type: 'raw'
                // Or you can try to determine based on file.type
                await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
                console.log(`Cloudinary file ${publicId} deleted.`);
            } catch (cloudinaryErr) {
                console.error(`Error deleting file from Cloudinary (${publicId}):`, cloudinaryErr);
                // Decide if you want to stop deletion or proceed with DB deletion
                // For now, we'll log and proceed to delete from DB
            }
        } else {
            console.warn(`Could not extract public ID from URL: ${file.fileUrl}`);
        }


        await FileModel.findByIdAndDelete(fileId);
        console.log(`File ${fileId} deleted from MongoDB.`);
        res.status(204).json({ message: 'File deleted successfully' }); // 204 No Content for successful delete
    } catch (err) {
        console.error('❌ Delete failed:', err);
        res.status(500).json({ error: 'Delete failed', details: err.message });
    }
});

export default router;