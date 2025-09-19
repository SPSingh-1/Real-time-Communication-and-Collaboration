import mongoose from 'mongoose';

const personalMessageSchema = new mongoose.Schema({
  text: { type: String, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  conversationId: { type: String, required: true, index: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'PersonalMessage' },
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    emoji: String
  }],
  isRead: { type: Boolean, default: false },
  readAt: Date,
  isFileMessage: { type: Boolean, default: false },
  fileUrl: String,
  fileName: String,
  fileType: String,
  fileRef: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
  scope: { type: String, enum: ['team', 'global'], default: 'team' },
  isStarred: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Static method to create conversation ID
personalMessageSchema.statics.createConversationId = function(user1Id, user2Id) {
  const sortedIds = [user1Id.toString(), user2Id.toString()].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
};

export default mongoose.model('PersonalMessage', personalMessageSchema);