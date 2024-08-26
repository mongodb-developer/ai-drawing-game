currentInfoPanel = null;
const workflowStages = [
    {
        id: 'player-login',
        title: 'Player Login',
        description: 'Players enter their names to join the game.',
        learnMore: 'This step uses Socket.IO to establish a real-time, bidirectional connection between the player and the game server. Socket.IO allows for instant communication, enabling features like live updates and real-time player joining.',
        link: 'https://socket.io/docs/v4/'
    },
    {
        id: 'waiting-for-game',
        title: 'Waiting for Game Start',
        description: 'Players wait in a lobby for the game to begin.',
        learnMore: 'The game uses a waiting room mechanism implemented with Socket.IO rooms. This ensures all players are synchronized before the game starts. MongoDB is used to store the game session state, allowing for persistence across server restarts.',
        link: 'https://www.mongodb.com/docs/manual/core/databases-and-collections/'
    },
    {
        id: 'game-started',
        title: 'Game Started',
        description: 'The game begins and players receive their drawing prompt.',
        learnMore: 'Prompts are stored in MongoDB as documents in a collection. We use MongoDBs aggregation pipeline with the $sample stage to retrieve a random prompt for each game session, ensuring variety in gameplay.',
        link: 'https://www.mongodb.com/docs/manual/reference/operator/aggregation/sample/'
    },
    {
        id: 'player-draws',
        title: 'Player Draws',
        description: 'Players use the canvas to create their drawings.',
        learnMore: 'The drawing interface uses the HTML5 Canvas API, providing a responsive and interactive drawing experience. The Canvas API allows for real-time rendering of user input, creating a smooth drawing process.',
        link: 'https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API'    
    },
    {
        id: 'player-submits',
        title: 'Player Submits Drawing',
        description: 'Players submit their completed drawings.',
        learnMore: 'Drawings are converted to base64 encoding using the Canvas APIs toDataURL method. This allows the image data to be easily transmitted to the server as a string, which is then decoded and processed for analysis.',
        link: 'https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL'    
    },
    {
        id: 'rekognition-analysis',
        title: 'AWS Rekognition Analysis',
        description: 'The drawing is analyzed by AWS Rekognition.',
        learnMore: 'AWS Rekognition uses deep learning models to detect and label objects, scenes, and activities in images. In this game, its used to identify elements in the players drawing, providing a set of labels that describe the content.',
        link: 'https://docs.aws.amazon.com/rekognition/latest/dg/what-is.html'
    },
    {
        id: 'vector-comparison',
        title: 'Vector Comparison and Scoring',
        description: 'The drawing is scored based on similarity to the prompt.',
        learnMore: 'MongoDB Atlas Vector Search is used to compare the drawing labels to the prompt embeddings. This involves converting text (labels and prompts) into high-dimensional vectors and calculating their similarity. The resulting similarity score determines how well the drawing matches the given prompt.',
        link: 'https://www.mongodb.com/docs/atlas/atlas-search/vector-search/'
    }
];

function createWorkflowCards(container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'workflow-cards-wrapper';

    workflowStages.forEach((stage, index) => {
        const card = document.createElement('div');
        card.className = 'workflow-card';
        card.id = `workflow-${stage.id}`;
        card.innerHTML = `
            <div class="card-content">
                <h3>${stage.title}</h3>
                <p>${stage.description}</p>
                <button class="learn-more-btn" data-stage="${stage.id}">Learn More</button>
            </div>
        `;
        
        if (index < workflowStages.length - 1) {
            const connector = document.createElement('div');
            connector.className = 'workflow-connector';
            wrapper.appendChild(connector);
        }
        
        wrapper.appendChild(card);
    });

    container.appendChild(wrapper);

    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('learn-more-btn')) {
            const stageId = e.target.getAttribute('data-stage');
            const stage = workflowStages.find(s => s.id === stageId);
            showInfoPanel(stage);
        }
    });
}

function showInfoPanel(stage) {
    if (currentInfoPanel) {
        document.body.removeChild(currentInfoPanel);
    }

    const infoPanel = document.createElement('div');
    infoPanel.className = 'info-panel modal';
    infoPanel.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h3>${stage.title}</h3>
            <p>${stage.learnMore}</p>
            ${stage.link ? `<a href="${stage.link}" target="_blank" class="learn-more-link">Learn More About ${stage.title}</a>` : ''}
        </div>
    `;
    document.body.appendChild(infoPanel);

    const closeBtn = infoPanel.querySelector('.close');
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(infoPanel);
        currentInfoPanel = null;
    });

    currentInfoPanel = infoPanel;

    // Close the modal when clicking outside of it
    window.onclick = function(event) {
        if (event.target == infoPanel) {
            document.body.removeChild(infoPanel);
            currentInfoPanel = null;
        }
    }
}

function updateWorkflowStage(stageId) {
    workflowStages.forEach(stage => {
        const card = document.getElementById(`workflow-${stage.id}`);
        if (card) {
            card.classList.toggle('active', stage.id === stageId);
        }
    });
}

window.createWorkflowCards = createWorkflowCards;
window.updateWorkflowStage = updateWorkflowStage;