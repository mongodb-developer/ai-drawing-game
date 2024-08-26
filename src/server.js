const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs-extra');
const config = require('./config');
const gameRoutes = require('./routes/gameRoutes');
const setupSocketHandlers = require('./utils/socketHandlers');
const Prompt = require('./models/prompt'); 
const dotenv = require('dotenv');
dotenv.config();
console.log('Admin password from env:', process.env.ADMIN_PASSWORD);
const basicAuth = require('express-basic-auth');

const ongoingGames = new Map();
const recentResults = [];
const activeGames = new Map();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Basic authentication middleware
const adminAuth = basicAuth({
  users: { [process.env.ADMIN_USERNAME]: process.env.ADMIN_PASSWORD },
  challenge: true,
  realm: 'Admin Area',
});


app.use('/admin', adminAuth);

fs.ensureDirSync(path.join(__dirname, '../public/uploads'));

// Set up multer for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads'))
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

mongoose.connect(config.mongodbUri + '/drawing_game', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api', gameRoutes);

app.post('/api/upload', upload.single('drawing'), (req, res) => {
  if (req.file) {
    res.json({ success: true, filename: req.file.filename });
  } else {
    res.status(400).json({ success: false, error: 'No file uploaded' });
  }
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'admin.html'));
});

// Add this route to fetch prompts
app.get('/api/prompts', async (req, res) => {
  try {
      const prompts = await Prompt.find({});
      res.json(prompts);
  } catch (error) {
      console.error('Error fetching prompts:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/leaderboard', adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/leaderboard.html'));
});

setupSocketHandlers(io);

server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});