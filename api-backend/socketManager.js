const jwt = require('jsonwebtoken');
const User = require('./models/userModel');

const SECRET_KEY = process.env.JWT_SECRET;
let messageCount = {};
const SPAM_LIMIT = 10; // messages per 10 seconds
const BAD_WORDS = ["bite", "cul", "pute"];
const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes in ms

module.exports = (io) => {
  io.on('connection', async (socket) => {
    const token = socket.handshake.auth.token;
    console.log('Received token:', token); // Debug log

    if (!token) {
      console.log('No token provided. Disconnecting socket...');
      socket.disconnect();
      return;
    }

    let user;

    try {
      // Verify JWT token and get the user
      const decoded = jwt.verify(token, SECRET_KEY);
      user = await User.findById(decoded.userId);

      if (!user) {
        console.log('User not found. Disconnecting socket...');
        socket.disconnect();
        return;
      }

      // Add this socket ID to the user's socket list in the database
      user.sockets.push(socket.id);
      await user.save();

      console.log(`User ${user.username} connected with socket ID ${socket.id}`);

      // Emit updated user list to all clients
      io.emit('updateUserList', await getUserList());
      io.emit('userConnected', `${user.username} is connected`);
    } catch (err) {
      console.error('Invalid token:', err.message);
      socket.disconnect();
      return;
    }

    let inactivityTimer = setTimeout(() => {
      socket.disconnect();
    }, INACTIVITY_LIMIT);

    socket.on('message', async (message) => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        socket.disconnect();
      }, INACTIVITY_LIMIT);

      // Spam filter
      if (!messageCount[socket.id]) messageCount[socket.id] = [];
      const now = Date.now();
      messageCount[socket.id] = messageCount[socket.id].filter((timestamp) => now - timestamp < 10000);
      messageCount[socket.id].push(now);

      if (messageCount[socket.id].length > SPAM_LIMIT) {
        socket.emit('errorMessage', 'You are sending messages too quickly. Please slow down.');
        return;
      }

      // Bad words filter
      BAD_WORDS.forEach((word) => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        message.text = message.text.replace(regex, '*****');
      });

      console.log("Message: ", message);
      if (message.recipientId === 'All') {
        io.emit('message', message);
      } else {
        io.to(message.recipientId).emit('privateMessage', message);
        socket.emit('privateMessage', message);
      }
    });

    socket.on('typing', ({ recipientId, feedback }) => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        socket.disconnect();
      }, INACTIVITY_LIMIT);

      if (recipientId === 'All') {
        socket.broadcast.emit('typing', { recipientId, feedback });
      } else {
        socket.to(recipientId).emit('typing', { recipientId, feedback });
      }
    });

    socket.on('stopTyping', (recipientId) => {
      if (recipientId === 'All') {
        socket.broadcast.emit('typing', { recipientId, feedback: '' });
      } else {
        socket.to(recipientId).emit('typing', { recipientId, feedback: '' });
      }
    });

    io.emit('clientsTotal', (await getUserList()).length);

    socket.on('disconnect', async () => {
      console.log(`Client disconnected : ${socket.id}`);
      clearTimeout(inactivityTimer);

      if (user) {
        // Remove the disconnected socket from the user's sockets list
        user.sockets = user.sockets.filter((id) => id !== socket.id);
        await user.save();

        console.log(`User ${user.username} disconnected from socket ID ${socket.id}`);

        // Emit updated user list and disconnection notification
        io.emit('updateUserList', await getUserList());
        io.emit('clientsTotal', (await getUserList()).length);
        io.emit('userDisconnected', `${user.username} has disconnected`);
      }
    });
  });
};

// Helper function to fetch the active user list
const getUserList = async () => {
  const users = await User.find({ sockets: { $exists: true, $ne: [] } }).select('username sockets');
  return users.map(user => ({ id: user._id, username: user.username, sockets: user.sockets }));
};

// Clean inactive sockets
const cleanInactiveSockets = async (io) => {
  const users = await User.find();
  users.forEach(async (user) => {
    const activeSockets = user.sockets.filter((id) => io.sockets.sockets.get(id)); // Check active sockets
    if (activeSockets.length !== user.sockets.length) {
      user.sockets = activeSockets;
      await user.save();
    }
  });
};


// Run this cleanup periodically
setInterval(() => cleanInactiveSockets(io), 60000); // Every 1 minute
