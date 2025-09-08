// models/FigmaToken.js - Updated for Personal Access Tokens
import mongoose from 'mongoose';

const figmaTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  figmaUserId: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    default: null // Personal tokens don't have refresh tokens
  },
  expiresAt: {
    type: Date,
    default: null // Personal tokens don't expire unless revoked
  },
  figmaUserInfo: {
    type: Object,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tokenType: {
    type: String,
    enum: ['oauth', 'personal'],
    default: 'personal' // Now defaults to personal token
  }
}, {
  timestamps: true
});

// Index for faster queries
figmaTokenSchema.index({ userId: 1, isActive: 1 });
const FigmaToken = mongoose.model('FigmaToken', figmaTokenSchema);
export default FigmaToken;