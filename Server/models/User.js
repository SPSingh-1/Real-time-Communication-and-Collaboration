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
    figmaConnected: {
      type: Boolean,
      default: false
    },
    figmaUserId: {
      type: String,
      default: null
    },
    figmaOAuthState: {
      type: String,
      default: null
    },
    figmaOAuthStateExpiry: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Method to get query scope for reports based on user role
UserSchema.methods.getQueryScope = function() {
  let query = {};
  
  if (this.role === 'single') {
    // Single users can only see their own reports
    query.user = this._id;
  } else if (this.role === 'team') {
    // Team users can see their team's reports
    query.$or = [
      { user: this._id }, // Own reports
      { teamId: this.teamId, scope: 'team' } // Team reports
    ];
  } else if (this.role === 'global') {
    // Global users can see all reports with global scope
    query.$or = [
      { user: this._id }, // Own reports
      { globalId: this.globalId, scope: 'global' } // Global reports
    ];
  }
  
  return query;
};

const User = mongoose.model('user', UserSchema);
export default User;
