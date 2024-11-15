const jwt = require('jsonwebtoken');

let users = {};
let messageCount = {};
const SPAM_LIMIT = 10; // messages per 10 seconds
const BAD_WORDS = ["bite", "cul", "pute"];
const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes in ms

module.exports = (io) => {
    let socketsConnected = new Set();

    io.on('connection', (socket) => {
        console.log(`New client connected : ${socket.id}`);
        socketsConnected.add(socket.id);

        let inactivityTimer = setTimeout(() => {
            socket.disconnect();
        }, INACTIVITY_LIMIT);

        socket.on('setUsername', (username) => {
            users[socket.id] = username;
            console.log("User list: ", users);
            io.emit('updateUserList', users);
            io.emit('userConnected', `${username} is connected`);
        });

        socket.on('message', (message) => {
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

        io.emit('clientsTotal', socketsConnected.size);

        socket.on('disconnect', () => {
            console.log(`Client disconnected : ${socket.id}`);
            clearTimeout(inactivityTimer);
            socketsConnected.delete(socket.id);
            const username = users[socket.id];
            delete users[socket.id];
            io.emit('updateUserList', users);
            io.emit('clientsTotal', socketsConnected.size);
            io.emit('userDisconnected', `${username} has disconnected`);
        });
    });
};
