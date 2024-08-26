const socket = io();

const playerList = document.getElementById('player-list');
const startGameButton = document.getElementById('start-game');
const promptSelect = document.getElementById('prompt-select');
const activeGame = document.getElementById('active-game');
const currentPrompt = document.getElementById('current-prompt');
const endGameButton = document.getElementById('end-game');
const gameResults = document.getElementById('game-results');
const resultsList = document.getElementById('results-list');
const leaderboardLink = document.getElementById('leaderboard-link');

let selectedPrompt = null;
const syncButton = document.getElementById('sync-button');

syncButton.addEventListener('click', () => {
  socket.emit('syncGameSessions');
});

socket.on('gameSessionsUpdated', (updatedGames) => {
  updateOngoingGames(updatedGames);
});

function updateOngoingGames(games) {
    const ongoingGamesElement = document.getElementById('ongoing-games');
    ongoingGamesElement.innerHTML = games.map(game => `
      <div class="game-item">
        <h3>Game #${game.id}</h3>
        <p>Players: ${game.players.join(', ')}</p>
        <p>Prompt: ${game.prompt}</p>
        <p>Status: ${game.status}</p>
      </div>
    `).join('');
  }

async function fetchPrompts() {
    try {
        const response = await fetch(`/api/prompts`);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Response data:', data);
        
        displayPrompts(data);
        populatePromptSelect(data);
    } catch (error) {
        console.error('Error fetching prompts:', error);
        alert(`Failed to fetch prompts: ${error.message}`);
    }
}

function displayPrompts(prompts) {
    const container = document.getElementById('prompts-container');
    if (container) {
        container.innerHTML = prompts.map(prompt => `
            <div>
                <h3>${prompt.name}</h3>
                <p>${prompt.description}</p>
            </div>
        `).join('');
    } else {
        console.error('Prompts container not found');
    }
}

async function endGame(io, session) {
    try {
      session.status = 'ended';
      session.endTime = new Date();
      
      const results = session.submissions.map(sub => ({
        playerName: sub.playerName,
        score: sub.score
      }));
      
      await session.save();
      
      io.to(session._id.toString()).emit('gameEnded', { results, gameSessionId: session._id });
      io.emit('adminGameEnded', { results, gameSessionId: session._id });
  
      ongoingGames.delete(session._id.toString());
      
      recentResults.unshift({
        id: session._id.toString(),
        prompt: session.prompt.name,
        players: results
      });
      if (recentResults.length > 5) recentResults.pop();
  
      emitLeaderboardUpdate(io);
  
      // Sync game sessions after ending a game
      const updatedGames = await syncGameSessions();
      io.emit('gameSessionsUpdated', updatedGames);
    } catch (error) {
      console.error('Error ending game:', error);
    }
  }

function populatePromptSelect(prompts) {
    promptSelect.innerHTML = '<option value="">Select a prompt</option>'; 
    prompts.forEach(prompt => {
        const option = document.createElement('option');
        option.value = prompt._id;
        option.textContent = prompt.name;
        promptSelect.appendChild(option);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    fetchPrompts();
    const workflowCardsContainer = document.getElementById('workflow-cards-container');
    createWorkflowCards(workflowCardsContainer);
    updateWorkflowStage('player-login');
});

promptSelect.addEventListener('change', (e) => {
    selectedPrompt = e.target.value;
    startGameButton.disabled = !selectedPrompt;
});

socket.on('playerJoined', ({ players }) => {
    playerList.innerHTML = players.map(player => `<li>${player}</li>`).join('');
    updateWorkflowStage('waiting-for-game');
});

socket.on('drawingAnalyzed', ({ playerName }) => {
    console.log(`Drawing from ${playerName} analyzed`);
    updateWorkflowStage('rekognition-analysis');
});

socket.on('drawingReceived', ({ playerName }) => {
    console.log(`Drawing received from ${playerName}`);
    updateWorkflowStage('player-submits');
});

socket.on('adminGameEnded', ({ results, gameSessionId }) => {
    const recentResultsElement = document.getElementById('recent-results');
    recentResultsElement.innerHTML = `
      <h3>Most Recent Game Results (Game #${gameSessionId}):</h3>
      <ol>
        ${results.map(result => `<li>${result.playerName}: ${result.score} points</li>`).join('')}
      </ol>
    `;
  });

startGameButton.addEventListener('click', () => {
    if (selectedPrompt) {
        socket.emit('startGame', { promptId: selectedPrompt });
        activeGame.style.display = 'block';
        currentPrompt.textContent = `Current Prompt: ${promptSelect.options[promptSelect.selectedIndex].text}`;
        startGameButton.disabled = true;
        promptSelect.disabled = true;
        console.log('Starting game with prompt ID:', selectedPrompt); 
        updateWorkflowStage('game-started');
    }
});

endGameButton.addEventListener('click', () => {
    socket.emit('endGame');
    activeGame.style.display = 'none';
    gameResults.style.display = 'block';
    startGameButton.disabled = false;
    promptSelect.disabled = false;
    leaderboardLink.style.display = 'block'; // Show the leaderboard link
});

socket.on('gameEnded', (results) => {
    resultsList.innerHTML = results.map(result => 
        `<li>${result.playerName}: ${result.score} points</li>`
    ).join('');
    gameResults.style.display = 'block';
    activeGame.style.display = 'none';
    updateWorkflowStage('vector-comparison');
});

socket.on('newGameSession', () => {
    gameResults.style.display = 'none';
    resultsList.innerHTML = '';
    promptSelect.value = '';
    selectedPrompt = null;
});