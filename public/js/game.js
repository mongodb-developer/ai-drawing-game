const socket = io();

let playerName = localStorage.getItem('playerName') || '';

// Function to safely get DOM elements
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id '${id}' not found`);
    }
    return element;
}

const loginScreen = getElement('login-screen');
const waitingRoom = getElement('waiting-room');
const gameScreen = getElement('game-screen');
const resultsScreen = getElement('results-screen');
const playerNameInput = getElement('player-name');
const joinGameButton = getElement('join-game');
const playerList = getElement('player-list');
const promptElement = getElement('prompt');
const canvas = getElement('drawing-canvas');
const submitDrawingButton = getElement('submit-drawing');
const undoButton = getElement('undo-button');
const clearButton = getElement('clear-button');
const ctx = canvas.getContext('2d');

const infoButton = getElement('info-button');
const infoModal = getElement('info-modal');
const closeModal = infoModal ? infoModal.querySelector('.close') : null;

let isDrawing = false;
let drawingActions = [];
let currentAction = [];
let currentGameSessionId = null;

document.addEventListener('DOMContentLoaded', () => {
    const workflowCardsContainer = document.getElementById('workflow-cards-container');
    createWorkflowCards(workflowCardsContainer);
    updateWorkflowStage('player-login');
});

// Info modal functionality
if (infoButton && infoModal) {
    infoButton.onclick = function() {
        infoModal.style.display = "block";
    }
}

if (closeModal) {
    closeModal.onclick = function() {
        infoModal.style.display = "none";
    }
}

window.onclick = function(event) {
    if (event.target == infoModal) {
        infoModal.style.display = "none";
    }
}

function resizeCanvas() {
    const containerWidth = canvas.parentElement.clientWidth;
    canvas.width = containerWidth;
    canvas.height = containerWidth;
    redrawCanvas();
}

function initCanvas() {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
}

setInterval(() => {
    socket.emit('heartbeat');
}, 30000); // every 30 seconds

socket.on('heartbeat', () => {
    console.log('Heartbeat received from server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server. Attempting to reconnect...');
});

socket.on('reconnect', () => {
    console.log('Reconnected to server');
    if (currentGameSessionId) {
        socket.emit('rejoinGame', { playerName, gameSessionId: currentGameSessionId });
    }
});

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
initCanvas();

if (joinGameButton) {
    joinGameButton.addEventListener('click', () => {
        if (!playerNameInput) return;
        playerName = playerNameInput.value.trim();
        if (playerName) {
            localStorage.setItem('playerName', playerName); // Store the player name
            socket.emit('joinGame', { playerName });
            if (loginScreen) loginScreen.style.display = 'none';
            if (waitingRoom) waitingRoom.style.display = 'block';
            updateWorkflowStage('waiting-for-game');
        }
    });
}

socket.on('playerJoined', ({ playerName, players, gameSessionId }) => {
    playerList.innerHTML = players.map(player => `<li>${player}</li>`).join('');
    currentGameSessionId = gameSessionId;
});

socket.on('gameStarted', ({ promptName, promptDescription, gameSessionId }) => {
    waitingRoom.style.display = 'none';
    gameScreen.style.display = 'block';
    promptElement.innerHTML = `<strong>Draw:</strong> ${promptName}<br><em>${promptDescription}</em>`;
    resizeCanvas();
    initCanvas();
    drawingActions = [];
    currentGameSessionId = gameSessionId;
    updateWorkflowStage('game-started');

});

function getPosition(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (event.touches && event.touches[0]) {
        return {
            x: (event.touches[0].clientX - rect.left) * scaleX,
            y: (event.touches[0].clientY - rect.top) * scaleY
        };
    }

    return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY
    };
}

function startDrawing(event) {
    isDrawing = true;
    const { x, y } = getPosition(event);
    currentAction = [{ x, y }];
    draw(event);
    updateWorkflowStage('player-draws');

}

function draw(event) {
    if (!isDrawing) return;

    event.preventDefault();

    const { x, y } = getPosition(event);

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    currentAction.push({ x, y });
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    ctx.beginPath();
    if (currentAction.length > 1) {
        drawingActions.push(currentAction);
        currentAction = [];
    }
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

canvas.addEventListener('touchstart', startDrawing);
canvas.addEventListener('touchmove', draw);
canvas.addEventListener('touchend', stopDrawing);

function undo() {
    if (drawingActions.length === 0) return;
    drawingActions.pop();
    redrawCanvas();
}

function clearCanvas() {
    drawingActions = [];
    redrawCanvas();
}

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    initCanvas();
    drawingActions.forEach(action => {
        ctx.beginPath();
        ctx.moveTo(action[0].x, action[0].y);
        action.forEach(point => {
            ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
    });
}

undoButton.addEventListener('click', undo);
clearButton.addEventListener('click', clearCanvas);

submitDrawingButton.addEventListener('click', async () => {
    const drawing = canvas.toDataURL('image/png');
    const blob = await (await fetch(drawing)).blob();
    const file = new File([blob], "drawing.png", { type: "image/png" });

    const formData = new FormData();
    formData.append('drawing', file);
    updateWorkflowStage('player-submits');

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        if (data.success) {
            socket.emit('submitDrawing', { playerName, filename: data.filename, gameSessionId: currentGameSessionId }, (response) => {
                if (response.success) {
                    console.log('Drawing submitted successfully');
                    console.log('Labels:', response.labels);
                    console.log('Score:', response.score);
                    submitDrawingButton.disabled = true;
                    submitDrawingButton.textContent = 'Drawing Submitted!';
                } else {
                    console.error('Failed to submit drawing:', response.error);
                    alert('Failed to submit drawing. Please try again.');
                }
            });
        } else {
            console.error('Failed to upload drawing:', data.error);
            alert('Failed to upload drawing. Please try again.');
        }
    } catch (error) {
        console.error('Error uploading drawing:', error);
        alert('Error uploading drawing. Please try again.');
    }
});

socket.on('drawingReceived', ({ score, labels }) => {
    console.log('Drawing received by server. Score:', score);
    console.log('Detected labels:', labels);
    
    const labelsDisplay = document.createElement('div');
    labelsDisplay.innerHTML = `
        <h3>Detected Labels:</h3>
        <ul>
            ${labels.map(label => `<li>${label}</li>`).join('')}
        </ul>
        <p>Your drawing has been submitted. Please wait for the game to end.</p>
    `;
    updateWorkflowStage('rekognition-analysis');

    const resultsElement = document.getElementById('results');
    resultsElement.innerHTML = '';
    resultsElement.appendChild(labelsDisplay);
    
    alert(`Your drawing has been received! Please wait for the game to end.`);
});

socket.on('gameEnded', ({ results, gameSessionId }) => {
    console.log('Game ended. Results:', results);
    
    // Hide game screen and show results screen
    if (gameScreen) gameScreen.style.display = 'none';
    if (resultsScreen) resultsScreen.style.display = 'block';
    
    const resultsElement = getElement('results');
    if (resultsElement) {
        // Find this player's score
        const playerResult = results.find(result => result.playerName === playerName);
        let resultHTML = `<h2>Game Over!</h2>`;
        
        if (playerResult) {
            resultHTML += `<h3>Your Score: ${playerResult.score} points</h3>`;
        } else {
            resultHTML += `<h3>Your Score: N/A</h3>`;
        }
        
        // Display all results
        resultHTML += '<h4>All Scores:</h4>';
        resultHTML += '<ul>' + results.map(result => 
            `<li>${result.playerName}: ${result.score} points</li>`
        ).join('') + '</ul>';
        
        resultsElement.innerHTML = resultHTML;
    }
    
    updateWorkflowStage('vector-comparison');

    currentGameSessionId = null;

    // Notify the player that the game has ended and show their score
    const playerResult = results.find(result => result.playerName === playerName);
    if (playerResult) {
        alert(`The game has ended! Your score: ${playerResult.score} points. Check the results screen for all scores.`);
    } else {
        alert(`The game has ended! Check the results screen for all scores.`);
    }
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    alert('There was an error connecting to the game server. Please try again later.');
});

socket.on('connect_timeout', (timeout) => {
    console.error('Connection timeout:', timeout);
    alert('The connection to the game server timed out. Please check your internet connection and try again.');
});