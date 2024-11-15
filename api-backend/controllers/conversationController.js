const Conversation = require('../models/conversationModel');
const Message = require('../models/messageModel');

exports.getConversations = async (req, res) => {
  const { userId } = req.params;

  try {
    const conversations = await Conversation.find({ participants: userId })
      .populate('lastMessage')
      .populate('participants', 'username');
    res.status(200).json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

exports.createConversation = async (req, res) => {
  const { participants, type, groupName } = req.body;

  try {
    const conversation = new Conversation({ participants, type, groupName });
    await conversation.save();
    res.status(201).json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
};
