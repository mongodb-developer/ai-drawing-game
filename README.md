# Multiplayer Drawing Game

## Overview
This project is a real-time multiplayer drawing game that leverages advanced technologies like MongoDB Vector Search and AWS Rekognition. Players join a game session, receive a prompt, draw their interpretation, and have their drawings analyzed and scored based on similarity to the prompt.

## Features
- Real-time multiplayer gameplay using Socket.IO
- Drawing interface with undo and clear functionality
- Image analysis using AWS Rekognition
- Similarity scoring using MongoDB Vector Search
- Admin panel for game management
- Leaderboard system

## Technologies Used
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: MongoDB
- Real-time Communication: Socket.IO
- Image Analysis: AWS Rekognition
- Vector Search: MongoDB Atlas Search
- Cloud Platform: AWS (for hosting Rekognition)

## Prerequisites
- Node.js (v14 or later)
- MongoDB Atlas account
- AWS account with Rekognition access
- Git

## Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/multiplayer-drawing-game.git
cd multiplayer-drawing-game
```
2. Install dependencies:
```
npm install
```
3. Set up environment variables:
Create a `.env` file in the root directory and add the following:
```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
ADMIN_PASSWORD=your_admin_password
```

4. Start the server:
```
npm start
```

## Usage

### Player Interface
1. Open a web browser and navigate to `http://localhost:5000`
2. Enter your name and join a game
3. Wait for the game to start
4. Draw based on the given prompt
5. Submit your drawing and wait for results

### Admin Interface
1. Navigate to `http://localhost:5000/admin`
2. Enter the admin password
3. Manage game sessions, start games, and end games

## Project Structure
- `public/` - Static files (HTML, CSS, client-side JS)
- `src/` - Server-side source code
- `models/` - MongoDB models
- `routes/` - Express routes
- `utils/` - Utility functions and Socket.IO handlers
- `app.js` - Main application file
- `config.js` - Configuration file

## API Endpoints
- POST `/api/upload` - Upload a drawing
- GET `/api/prompts` - Get all prompts (admin only)
- POST `/api/saveScore` - Save a game score

## Socket.IO Events
- `joinGame` - Player joins a game
- `startGame` - Admin starts a game
- `submitDrawing` - Player submits a drawing
- `gameEnded` - Game ends, results are sent

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgements
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) for database and vector search capabilities
- [AWS Rekognition](https://aws.amazon.com/rekognition/) for image analysis
- [Socket.IO](https://socket.io/) for real-time communication
