// Game setup
const SIZE = 4; // Kept as 4x4 grid
const TOTAL_TILES = SIZE * SIZE - 1; // 15 tiles + 1 empty (16 total)
let tiles = [];
let moves = 0;
let emptyIndex = TOTAL_TILES; // Empty space starts at last position
let touchStartX = 0;
let touchStartY = 0;
let startTime = null; // Start time will be set on Start button
let timerInterval = null;
let gameStarted = false; // Track if game has started
let isShuffled = false; // Track if puzzle has been shuffled
let leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || []; // Initialize or load leaderboard
const currentDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }); // 09:10 PM IST, October 24, 2025

// Display username
function displayUsername() {
    const username = localStorage.getItem('username') || 'Guest';
    document.getElementById('username-display').textContent = `${username}`;
}

// Update and display stats
function updateStats() {
    const movesBtn = document.getElementById('moves-btn');
    const timeBtn = document.getElementById('time-btn');
    let timeDisplay = '00:00';
    if (startTime && gameStarted) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        timeDisplay = `${minutes}:${seconds}`;
    }
    movesBtn.textContent = `Moves: ${moves}`;
    timeBtn.textContent = `Time: ${timeDisplay}`;
    console.log(`Stats updated - Moves: ${moves}, Time: ${timeDisplay}`);
}

// Start timer
function startTimer() {
    if (!timerInterval && isShuffled && !gameStarted) {
        startTime = Date.now();
        timerInterval = setInterval(updateStats, 1000);
        gameStarted = true;
        updateStats(); // Initial update
        console.log('Timer started');
    } else {
        console.warn('Timer not started - Check if shuffled and not already started');
    }
}

// Stop timer
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        if (startTime) {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            startTime = null;
            gameStarted = false; // Reset game state
            console.log(`Timer stopped, elapsed: ${elapsed} seconds`);
            return elapsed;
        }
    }
    console.warn('No active timer to stop');
    return 0;
}

// Update leaderboard with only the best score per user
function updateLeaderboard() {
    const username = localStorage.getItem('username') || 'Guest';
    const time = stopTimer(); // Stop timer and get elapsed time
    const entry = { name: username, moves: moves || 0, time: time || 0 };

    console.log(`Attempting to update leaderboard with entry:`, entry);

    // Validate entry (only update if puzzle is completed)
    if (moves <= 0 || time <= 0) {
        console.log(`Invalid score for ${username}: moves=${moves}, time=${time}`);
        return;
    }

    // Find existing entry for this player
    const existingIndex = leaderboard.findIndex(item => item.name === username);
    if (existingIndex !== -1) {
        const currentBest = leaderboard[existingIndex];
        if (entry.moves < currentBest.moves || (entry.moves === currentBest.moves && entry.time < currentBest.time)) {
            leaderboard[existingIndex] = { ...entry }; // Update with better score
            console.log(`Updated best score for ${username}:`, entry);
        } else {
            console.log(`New score for ${username} not better than existing:`, currentBest);
        }
    } else {
        leaderboard.push(entry); // Add new entry if no prior score
        console.log(`Added new best score for ${username}:`, entry);
    }

    // Keep only unique users with their best scores
    const uniqueLeaderboard = [];
    const seenUsers = new Set();
    leaderboard.forEach(entry => {
        if (!seenUsers.has(entry.name)) {
            seenUsers.add(entry.name);
            uniqueLeaderboard.push(entry);
        } else {
            const existingEntry = uniqueLeaderboard.find(item => item.name === entry.name);
            if (entry.moves < existingEntry.moves || (entry.moves === existingEntry.moves && entry.time < existingEntry.time)) {
                uniqueLeaderboard[uniqueLeaderboard.indexOf(existingEntry)] = entry;
            }
        }
    });
    leaderboard = uniqueLeaderboard;

    // Sort by moves, then time
    leaderboard.sort((a, b) => {
        if (a.moves !== b.moves) return a.moves - b.moves;
        return a.time - b.time;
    });

    localStorage.setItem('leaderboard', JSON.stringify(leaderboard)); // Save updated leaderboard
    displayLeaderboard(leaderboard); // Display all unique best scores
    console.log('Leaderboard updated and saved with unique best scores:', leaderboard);
}

// Display leaderboard with only best scores
function displayLeaderboard(entries) {
    const list = document.getElementById('leaderboard-body');
    if (!list) {
        console.error('Leaderboard body element not found!');
        return;
    }
    list.innerHTML = '';
    const username = localStorage.getItem('username') || 'Guest';
    const userEntry = leaderboard.find(entry => entry.name === username);
    const userRank = userEntry ? leaderboard.findIndex(entry => entry.name === username) + 1 : -1;

    if (!Array.isArray(entries) || entries.length === 0) {
        list.innerHTML = '<tr><td colspan="4">No scores yet</td></tr>';
        console.log('No leaderboard data to display');
        return;
    }

    entries.forEach((entry, index) => {
        if (!entry || typeof entry !== 'object') {
            console.warn('Invalid leaderboard entry skipped:', entry);
            return;
        }
        const tr = document.createElement('tr');
        const minutes = Math.floor((entry.time || 0) / 60).toString().padStart(2, '0');
        const seconds = ((entry.time || 0) % 60).toString().padStart(2, '0');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${entry.name || 'Unknown'}</td>
            <td>${entry.moves || 0}</td>
            <td>${minutes}:${seconds}</td>
        `;
        list.appendChild(tr);
    });

    console.log('Leaderboard displayed with', entries.length, 'unique best scores, user rank:', userRank);
}

// Create puzzle board
function createBoard() {
    const board = document.getElementById('puzzle-board');
    if (!board) {
        console.error('Puzzle board element not found!');
        return;
    }
    board.innerHTML = '';
    
    for (let i = 0; i < SIZE * SIZE; i++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.index = i;
        
        if (i < TOTAL_TILES) {
            const row = Math.floor(i / SIZE);
            const col = i % SIZE;
            tile.style.backgroundPosition = `${-col * 100}px ${-row * 100}px`;
        } else {
            tile.classList.add('empty');
        }
        
        tile.addEventListener('click', handleTileClick);
        tile.addEventListener('touchstart', handleTouchStart);
        tile.addEventListener('touchmove', handleTouchMove);
        tile.addEventListener('touchend', handleTouchEnd);
        board.appendChild(tile);
        tiles[i] = tile;
    }
    console.log('Puzzle board created successfully');
}

// Handle tile clicks
function handleTileClick(e) {
    if (!gameStarted) return;
    const clickedIndex = parseInt(e.target.dataset.index);
    const rowClicked = Math.floor(clickedIndex / SIZE);
    const colClicked = clickedIndex % SIZE;
    const rowEmpty = Math.floor(emptyIndex / SIZE);
    const colEmpty = emptyIndex % SIZE;

    if (isAdjacent(rowClicked, colClicked, rowEmpty, colEmpty)) {
        swapTiles(clickedIndex, emptyIndex);
    }
}

// Check if two positions are adjacent
function isAdjacent(row1, col1, row2, col2) {
    const rowDiff = Math.abs(row1 - row2);
    const colDiff = Math.abs(col1 - col2);
    
    if (rowDiff + colDiff !== 1) return false;
    if (row1 < 0 || row1 >= SIZE || col1 < 0 || col1 >= SIZE) return false;
    if (row2 < 0 || row2 >= SIZE || col2 < 0 || col2 >= SIZE) return false;
    
    return true;
}

// Handle touch events
function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}

function handleTouchMove(e) {
    e.preventDefault();
}

function handleTouchEnd(e) {
    if (!gameStarted) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const clickedIndex = parseInt(e.target.dataset.index);
    const rowClicked = Math.floor(clickedIndex / SIZE);
    const colClicked = clickedIndex % SIZE;
    const rowEmpty = Math.floor(emptyIndex / SIZE);
    const colEmpty = emptyIndex % SIZE;

    const minSwipeDistance = 50;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > minSwipeDistance && colClicked < SIZE - 1 && clickedIndex + 1 === emptyIndex && isAdjacent(rowClicked, colClicked + 1, rowEmpty, colEmpty)) {
            swapTiles(clickedIndex, emptyIndex);
        } else if (deltaX < -minSwipeDistance && colClicked > 0 && clickedIndex - 1 === emptyIndex && isAdjacent(rowClicked, colClicked - 1, rowEmpty, colEmpty)) {
            swapTiles(clickedIndex, emptyIndex);
        }
    } else {
        if (deltaY > minSwipeDistance && rowClicked < SIZE - 1 && clickedIndex + SIZE === emptyIndex && isAdjacent(rowClicked + 1, colClicked, rowEmpty, colEmpty)) {
            swapTiles(clickedIndex, emptyIndex);
        } else if (deltaY < -minSwipeDistance && rowClicked > 0 && clickedIndex - SIZE === emptyIndex && isAdjacent(rowClicked - 1, colClicked, rowEmpty, colEmpty)) {
            swapTiles(clickedIndex, emptyIndex);
        }
    }
}

// Swap two tiles
function swapTiles(index1, index2) {
    const temp = tiles[index1].style.backgroundPosition;
    tiles[index1].style.backgroundPosition = tiles[index2].style.backgroundPosition;
    tiles[index2].style.backgroundPosition = temp;
    
    if (tiles[index1].classList.contains('empty')) {
        tiles[index1].classList.remove('empty');
        tiles[index2].classList.add('empty');
        tiles[index1].style.backgroundImage = `url('knight.jpg')`;
    } else {
        tiles[index2].classList.remove('empty');
        tiles[index1].classList.add('empty');
        tiles[index2].style.backgroundImage = `url('knight.jpg')`;
    }
    
    emptyIndex = index1;
    moves++;
    updateStats();
    
    if (isSolved()) {
        updateLeaderboard();
    }
}

// Check if puzzle is solved
function isSolved() {
    for (let i = 0; i < TOTAL_TILES; i++) {
        const expectedX = -(i % SIZE * 100);
        const expectedY = -(Math.floor(i / SIZE) * 100);
        const actual = tiles[i].style.backgroundPosition;
        if (actual !== `${expectedX}px ${expectedY}px`) {
            return false;
        }
    }
    return true;
}

// Shuffle puzzle
function shuffle() {
    if (gameStarted) return;
    for (let i = 0; i < 1000; i++) {
        const possibleMoves = [];
        const rowEmpty = Math.floor(emptyIndex / SIZE);
        const colEmpty = emptyIndex % SIZE;
        
        const left = colEmpty > 0 ? emptyIndex - 1 : -1;
        const right = colEmpty < SIZE - 1 ? emptyIndex + 1 : -1;
        const up = rowEmpty > 0 ? emptyIndex - SIZE : -1;
        const down = rowEmpty < SIZE - 1 ? emptyIndex + SIZE : -1;
        
        if (left !== -1) possibleMoves.push(left);
        if (right !== -1) possibleMoves.push(right);
        if (up !== -1) possibleMoves.push(up);
        if (down !== -1) possibleMoves.push(down);
        
        const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        if (randomMove !== undefined) {
            swapTiles(randomMove, emptyIndex);
        }
    }
    moves = 0;
    isShuffled = true;
    document.getElementById('start-btn').disabled = false;
    updateStats();
    console.log('Puzzle shuffled, Start button enabled');
}

// Start game
function startGame() {
    if (isShuffled && !gameStarted) {
        startTimer();
        console.log('Game started');
    } else {
        console.warn('Cannot start game - Check if shuffled and not already started');
    }
}

// Reset game
function resetGame() {
    if (timerInterval) {
        stopTimer();
    }
    moves = 0;
    gameStarted = false;
    isShuffled = false;
    startTime = null;
    document.getElementById('start-btn').disabled = true;
    createBoard();
    updateStats();
    displayLeaderboard(leaderboard); // Initial display with unique best scores
    console.log('Game reset');
}

// Button listeners
document.getElementById('shuffle-btn').addEventListener('click', shuffle);
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('reset-btn').addEventListener('click', resetGame);

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    displayUsername();
    createBoard();
    // Validate and clean leaderboard data on load
    if (leaderboard && !Array.isArray(leaderboard)) {
        console.warn('Invalid leaderboard data, resetting to empty array');
        leaderboard = [];
        localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
    }
    displayLeaderboard(leaderboard); // Initial display with unique best scores
    updateStats();
    console.log('Game initialized, leaderboard loaded:', leaderboard);
});