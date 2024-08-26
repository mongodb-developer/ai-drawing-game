const socket = io();

const ongoingGamesElement = document.getElementById('ongoing-games');
const recentResultsElement = document.getElementById('recent-results');

function updateOngoingGames(games) {
    ongoingGamesElement.innerHTML = games.map(game => `
        <div class="game-item">
            <h3>Game #${game.id}</h3>
            <p>Players: ${game.players.join(', ')}</p>
            <p>Prompt: ${game.prompt}</p>
            <p>Status: ${game.status}</p>
        </div>
    `).join('');
}

function updateRecentResults(results) {
    recentResultsElement.innerHTML = results.map(result => `
        <div class="result-item">
            <h3>Game #${result.id}</h3>
            <p>Prompt: ${result.prompt}</p>
            <ol>
                ${result.players.map(player => `
                    <li>${player.playerName}: ${player.score} points</li>
                `).join('')}
            </ol>
        </div>
    `).join('');

    // Highlight the most recent game
    if (results.length > 0) {
        const mostRecentGame = recentResultsElement.firstElementChild;
        mostRecentGame.style.border = '2px solid green';
        mostRecentGame.style.backgroundColor = '#e6ffe6';
    }
}

// Request initial data
socket.emit('getLeaderboardData');

// Listen for updates
socket.on('leaderboardUpdate', (data) => {
    updateOngoingGames(data.ongoingGames);
    updateRecentResults(data.recentResults);
});