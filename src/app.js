const express = require('express');
const path = require('path');
const cors = require('cors');
const basicAuth = require('express-basic-auth');
const multer = require('multer');
const fs = require('fs-extra');
const config = require('./config');
const gameRoutes = require('./routes/gameRoutes');
const Prompt = require('./models/prompt');

const app = express();

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Basic authentication middleware
const adminAuth = basicAuth({
  users: { [process.env.ADMIN_USERNAME]: process.env.ADMIN_PASSWORD },
  challenge: true,
  realm: 'Admin Area',
});

// File upload setup
fs.ensureDirSync(path.join(__dirname, '../public/uploads'));
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads'))
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});
const upload = multer({ storage: storage });

// Routes
app.use('/api', gameRoutes);

app.post('/api/upload', upload.single('drawing'), (req, res) => {
  if (req.file) {
    res.json({ success: true, filename: req.file.filename });
  } else {
    res.status(400).json({ success: false, error: 'No file uploaded' });
  }
});

app.get('/admin', adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'admin.html'));
});

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

module.exports = app;