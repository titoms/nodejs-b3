const express = require('express');
const { getConversations, createConversation } = require('../controllers/conversationController');
const router = express.Router();

router.get('/:userId', getConversations);
router.post('/', createConversation);

module.exports = router;
