import mongoose from 'mongoose';

const TeamSchema = new mongoose.Schema({
  teamId: { 
    type: String, 
    required: true, 
    unique: true, 
    match: /^[A-Za-z0-9_@]{5}$/ // 5 chars only
  },
  admin: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'user', // should match User model name
    required: false 
  },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }]
}, { timestamps: true });

const Team = mongoose.model('Team', TeamSchema);
export default Team;
