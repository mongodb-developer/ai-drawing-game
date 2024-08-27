const socket = io({
    transports: ['polling']
});

const playerList = document.getElementById('player-list');
const startGameButton = document.getElementById('start-game');
const promptSelect = document.getElementById('prompt-select');
const activeGame = document.getElementById('active-game');
const currentPrompt = document.getElementById('current-prompt');
const endGameButton = document.getElementById('end-game');
const gameResults = document.getElementById('game-results');
const resultsList = document.getElementById('results-list');
const leaderboardLink = document.getElementById('leaderboard-link');
const syncButton = document.getElementById('sync-button');

let selectedPrompt = null;

if (syncButton) {
    syncButton.addEventListener('click', () => {
        socket.emit('syncGameSessions');
    });
}

socket.on('gameSessionsUpdated', (updatedGames) => {
    updateOngoingGames(updatedGames);
});

function updateOngoingGames(games) {
    const ongoingGamesElement = document.getElementById('ongoing-games');
    if (!ongoingGamesElement) return;
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

function populatePromptSelect(prompts) {
    if (!promptSelect) return;
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
    if (workflowCardsContainer && typeof createWorkflowCards === 'function') {
        createWorkflowCards(workflowCardsContainer);
    }
    if (typeof updateWorkflowStage === 'function') {
        updateWorkflowStage('player-login');
    }
});

if (promptSelect) {
    promptSelect.addEventListener('change', (e) => {
        selectedPrompt = e.target.value;
        if (startGameButton) startGameButton.disabled = !selectedPrompt;
    });
}

socket.on('playerJoined', ({ players }) => {
    if (playerList) {
        playerList.innerHTML = players.map(player => `<li>${player}</li>`).join('');
    }
    if (typeof updateWorkflowStage === 'function') {
        updateWorkflowStage('waiting-for-game');
    }
});

socket.on('drawingAnalyzed', ({ playerName }) => {
    console.log(`Drawing from ${playerName} analyzed`);
    if (typeof updateWorkflowStage === 'function') {
        updateWorkflowStage('rekognition-analysis');
    }
});

socket.on('drawingReceived', ({ playerName }) => {
    console.log(`Drawing received from ${playerName}`);
    if (typeof updateWorkflowStage === 'function') {
        updateWorkflowStage('player-submits');
    }
});

socket.on('adminGameEnded', ({ results, gameSessionId }) => {
    const recentResultsElement = document.getElementById('recent-results');
    if (recentResultsElement) {
        recentResultsElement.innerHTML = `
          <h3>Most Recent Game Results (Game #${gameSessionId}):</h3>
          <ol>
            ${results.map(result => `<li>${result.playerName}: ${result.score} points</li>`).join('')}
          </ol>
        `;
    }
});

if (startGameButton) {
    startGameButton.addEventListener('click', () => {
        if (selectedPrompt) {
            socket.emit('startGame', { promptId: selectedPrompt });
            if (activeGame) activeGame.style.display = 'block';
            if (currentPrompt && promptSelect) {
                currentPrompt.textContent = `Current Prompt: ${promptSelect.options[promptSelect.selectedIndex].text}`;
            }
            if (startGameButton) startGameButton.disabled = true;
            if (promptSelect) promptSelect.disabled = true;
            console.log('Starting game with prompt ID:', selectedPrompt); 
            if (typeof updateWorkflowStage === 'function') {
                updateWorkflowStage('game-started');
            }
        }
    });
}

if (endGameButton) {
    endGameButton.addEventListener('click', () => {
        socket.emit('endGame');
        if (activeGame) activeGame.style.display = 'none';
        if (gameResults) gameResults.style.display = 'block';
        if (startGameButton) startGameButton.disabled = false;
        if (promptSelect) promptSelect.disabled = false;
        if (leaderboardLink) leaderboardLink.style.display = 'block';
    });
}

socket.on('gameEnded', (results) => {
    if (resultsList) {
        resultsList.innerHTML = results.map(result => 
            `<li>${result.playerName}: ${result.score} points</li>`
        ).join('');
    }
    if (gameResults) gameResults.style.display = 'block';
    if (activeGame) activeGame.style.display = 'none';
    if (typeof updateWorkflowStage === 'function') {
        updateWorkflowStage('vector-comparison');
    }
});

socket.on('newGameSession', () => {
    if (gameResults) gameResults.style.display = 'none';
    if (resultsList) resultsList.innerHTML = '';
    if (promptSelect) promptSelect.value = '';
    selectedPrompt = null;
});