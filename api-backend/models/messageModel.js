const mongoose = require('mongoose');

const messageSchema = mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Null for group messages
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' }, // Null for private messages
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
