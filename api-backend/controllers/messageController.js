const Message = require('../models/messageModel');
const Conversation = require('../models/conversationModel');

exports.sendMessage = async (req, res) => {
  const { senderId, recipientId, text, conversationId } = req.body;

  try {
    // Create and save the message
    const message = new Message({
      sender: senderId,
      recipient: recipientId,
      text,
      conversationId,
    });
    await message.save();

    // Update the last message in the conversation
    const conversation = await Conversation.findById(conversationId);
    if (conversation) {
      conversation.lastMessage = message._id;
      await conversation.save();
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

exports.getMessages = async (req, res) => {
  const { conversationId } = req.params;

  try {
    const messages = await Message.find({ conversationId }).sort('timestamp');
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};
