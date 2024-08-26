const mongoose = require('mongoose');
const config = require('./config');
const app = require('./app');
const http = require('http');
const socketIo = require('socket.io');
const setupSocketHandlers = require('./utils/socketHandlers');

const server = http.createServer(app);
const io = socketIo(server);

mongoose.connect(config.mongodbUri + '/drawing_game', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

setupSocketHandlers(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));