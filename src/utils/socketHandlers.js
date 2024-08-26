const path = require('path');
const fs = require('fs').promises;
const GameSession = require('../models/gameSession');
const Prompt = require('../models/prompt');
const { analyzeDrawing, calculateSimilarityScore, generateEmbedding } = require('./awsUtils');
const ongoingGames = new Map();
const recentResults = [];

function emitLeaderboardUpdate(io) {
  io.emit('leaderboardUpdate', {
    ongoingGames: Array.from(ongoingGames.values()),
    recentResults
  });
}

async function syncGameSessions() {
  try {
    const activeSessions = await GameSession.find({ status: { $in: ['waiting', 'active'] } });
    ongoingGames.clear();
    for (const session of activeSessions) {
      ongoingGames.set(session._id.toString(), {
        id: session._id.toString(),
        players: session.players,
        status: session.status,
        prompt: session.prompt ? session.prompt.name : 'Not selected'
      });
    }
    return Array.from(ongoingGames.values());
  } catch (error) {
    console.error('Error syncing game sessions:', error);
    return [];
  }
}

async function endGame(io, session) {
  try {
    const updatedSession = await GameSession.findOneAndUpdate(
      { _id: session._id, status: 'active' },
      { 
        $set: { 
          status: 'ended',
          endTime: new Date()
        }
      },
      { new: true }
    );

    if (!updatedSession) {
      console.log('Game already ended or not found');
      return;
    }

    const results = updatedSession.submissions.map(sub => ({
      playerName: sub.playerName,
      score: sub.score
    }));
    
    // Emit to all players in the game session
    io.to(updatedSession._id.toString()).emit('gameEnded', { results, gameSessionId: updatedSession._id });
    
    // Emit to admin
    io.emit('adminGameEnded', { results, gameSessionId: updatedSession._id });

    // ... rest of the function ...
  } catch (error) {
    console.error('Error ending game:', error);
  }
}

module.exports = (io) => {
  let currentGameSessionId = null;
  syncGameSessions,
  function emitLeaderboardUpdate() {
    io.emit('leaderboardUpdate', {
      ongoingGames,
      recentResults
    });
  }

  io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('heartbeat', () => {
      socket.emit('heartbeat');
    });

    socket.on('getLeaderboardData', () => {
      socket.emit('leaderboardUpdate', {
        ongoingGames: Array.from(ongoingGames.values()),
        recentResults
      });
    });

    socket.on('endGame', async () => {
      try {
        const session = await GameSession.findById(currentGameSessionId);
        if (session) {
          console.log('Ending game for session:', session._id);
          await endGame(io, session);
          currentGameSessionId = null;
        } else {
          console.log('No active game session found to end');
        }
      } catch (error) {
        console.error('Error ending game:', error);
      }
    });

    socket.on('joinGame', async ({ playerName }) => {
      try {
        console.log(`Player ${playerName} trying to join the game`);
        let session = await GameSession.findOne({ status: 'waiting' });
        if (!session) {
          session = new GameSession({
            status: 'waiting',
            players: [],
            startTime: new Date()
          });
        }
        session.players.push(playerName);
        await session.save();
        currentGameSessionId = session._id;
        socket.join(session._id.toString());
        console.log(`Player ${playerName} joined. Current players:`, session.players);
        io.emit('playerJoined', { playerName, players: session.players, gameSessionId: session._id });
        io.to(session._id.toString()).emit('playerJoined', { playerName, players: session.players, gameSessionId: session._id });

        // Update ongoing games
        if (ongoingGames.has(session._id.toString())) {
          const game = ongoingGames.get(session._id.toString());
          game.players.push(playerName);
        } else {
          ongoingGames.set(session._id.toString(), {
            id: session._id.toString(),
            players: session.players,
            status: 'Waiting',
            prompt: 'Not selected'
          });
        }
        emitLeaderboardUpdate(io);
      } catch (error) {
        console.error('Error joining game:', error);
      }
    });


    socket.on('startGame', async ({ promptId }) => {
      try {
        console.log('Starting game with promptId:', promptId);
        let session = await GameSession.findById(currentGameSessionId);
        console.log('Found session:', session ? session._id : 'None');
        
        const prompt = await Prompt.findById(promptId);
        console.log('Found prompt:', prompt ? prompt._id : 'None');
        
        if (session && prompt) {
          session.status = 'active';
          session.prompt = {
            name: prompt.name,
            description: prompt.description,
            nameEmbedding: await generateEmbedding(prompt.name)
          };
          await session.save();
          
          io.emit('gameStarted', { 
            promptName: prompt.name, 
            promptDescription: prompt.description,
            gameSessionId: session._id
          });
          console.log('Game started with prompt:', prompt.name);

          // Update ongoing games
          const gameIndex = ongoingGames.findIndex(game => game.id === session._id.toString());
          if (gameIndex !== -1) {
            ongoingGames[gameIndex].status = 'Active';
            ongoingGames[gameIndex].prompt = prompt.name;
          }
          emitLeaderboardUpdate();
        } else {
          console.log('No waiting session or prompt not found');
        }
      } catch (error) {
        console.error('Error starting game:', error);
      }
    });

    socket.on('submitDrawing', async ({ playerName, filename, gameSessionId }, callback) => {
      console.log('Received drawing submission from', playerName);
      try {
        let session = await GameSession.findOne({ _id: gameSessionId, status: 'active' });
        console.log('Found active session:', session ? session._id : 'None');
        if (session && session.prompt && session.prompt.name) {
          console.log('Active session found:', session._id);
          console.log('Session prompt:', JSON.stringify({
            name: session.prompt.name,
            description: session.prompt.description,
            nameEmbedding: session.prompt.nameEmbedding ? 'Present' : 'Missing'
          }, null, 2));
          
          const imagePath = path.join(__dirname, '..', '..', 'public', 'uploads', filename);
          
          const { labels, isAppropriate } = await analyzeDrawing(imagePath);
          console.log('Analyzed drawing labels:', labels);
          console.log('Is drawing appropriate:', isAppropriate);
    
          if (!isAppropriate) {
            console.log('Drawing contains inappropriate content');
            callback({ success: false, error: 'Drawing contains inappropriate content' });
            return;
          }
    
          console.log('Calculating similarity score...');
          const score = await calculateSimilarityScore(labels, session.prompt.name, session.prompt.nameEmbedding);
          console.log('Calculated score:', score);
          
          const submission = {
            playerName,
            drawing: `/uploads/${filename}`,
            labels,
            score
          };
    
          // Use findOneAndUpdate to avoid concurrency issues
          const updatedSession = await GameSession.findOneAndUpdate(
            { _id: gameSessionId, status: 'active', 'submissions.playerName': { $ne: playerName } },
            { $push: { submissions: submission } },
            { new: true, runValidators: true }
          );
    
          if (!updatedSession) {
            console.log('Failed to update session or player has already submitted');
            callback({ success: false, error: 'Failed to submit drawing or player has already submitted' });
            return;
          }
          
          callback({ success: true, score, labels });
          socket.emit('drawingReceived', { score, labels });
          console.log(`Drawing received from ${playerName}, score: ${score}`);
          
          if (updatedSession.submissions.length === updatedSession.players.length) {
            console.log('All players have submitted. Checking game status...');
            const currentSession = await GameSession.findById(gameSessionId);
            if (currentSession.status === 'active') {
              console.log('Ending game...');
              await endGame(io, currentSession);
            } else {
              console.log('Game already ended. Not calling endGame again.');
            }
          }
        } else {
          console.log('No active game session found or missing prompt data');
          console.log('Session:', session);
          console.log('Prompt:', session ? session.prompt : 'No session');
          callback({ success: false, error: 'No active game session found or missing prompt data' });
        }
      } catch (error) {
        console.error('Error submitting drawing:', error);
        callback({ success: false, error: 'Server error while processing submission' });
      }
      emitLeaderboardUpdate(io);
    });
    
    socket.on('syncGameSessions', async () => {
      const updatedGames = await syncGameSessions();
      io.emit('gameSessionsUpdated', updatedGames);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });
};