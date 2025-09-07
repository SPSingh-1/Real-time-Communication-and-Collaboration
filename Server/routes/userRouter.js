import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/User.js";

const router = express.Router();

// ✅ Configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage() });

// helper function: upload buffer to cloudinary
const uploadToCloudinary = (fileBuffer, folder, resourceType = "image") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(fileBuffer); // send buffer
  });
};

// ✅ Update profile API
router.put(
  "/update/:id",
  upload.fields([{ name: "photo" }, { name: "extraFile" }]),
  async (req, res) => {
    try {
      const { name, role } = req.body;
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      // update text fields
      if (name) user.name = name;
      if (role) user.role = role;

      // upload photo
      if (req.files?.photo?.[0]) {
        const uploadedPhoto = await uploadToCloudinary(
          req.files.photo[0].buffer,
          "profiles",
          "image"
        );
        user.photo = uploadedPhoto.secure_url;
      }
      // remove photo
      if (req.body.removePhoto === "true") {
        user.photo = "";
        }
      // upload extra file
      if (req.files?.extraFile?.[0]) {
        const uploadedExtra = await uploadToCloudinary(
          req.files.extraFile[0].buffer,
          "extraFiles",
          "auto"
        );
        user.moreDetails = uploadedExtra.secure_url;
      }

      user.updatedAt = new Date();
      await user.save();

      res.json(user);
    } catch (err) {
      console.error("Update Error:", err);
      res.status(500).json({ error: "Update failed", details: err.message });
    }
  }
);

export default router;
