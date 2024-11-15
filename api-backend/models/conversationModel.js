const mongoose = require('mongoose');

const conversationSchema = mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    type: { type: String, enum: ['private', 'group'], default: 'private' },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    groupName: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', conversationSchema);
