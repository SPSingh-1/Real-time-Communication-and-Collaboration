import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneno: { type: String, required: true },
    password: { type: String, required: true },

    role: { type: String, enum: ['single', 'team', 'global'], default: 'single' },

    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },

    globalId: { type: String, default: 'Global123' },

    // ✅ New fields
    photo: { type: String, default: '' }, // Cloudinary URL of profile picture
    moreDetails: { type: String, default: '' }, // Cloudinary URL of uploaded file (doc/pdf/etc.)
  },
  { timestamps: true }
);

const User = mongoose.model('user', UserSchema);
export default User;
