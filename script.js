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
let playerMove = false; // Flag to track player-initiated moves
const currentDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }); // 09:44 PM IST, October 27, 2025

// Firebase configuration (provided by you)
const firebaseConfig = {
  apiKey: "AIzaSyCVWGY6kKJLY6bOtBBEWB6RCy1G-lYAju8",
  authDomain: "bulkpuzzlegame.firebaseapp.com",
  databaseURL: "https://bulkpuzzlegame-default-rtdb.firebaseio.com",
  projectId: "bulkpuzzlegame",
  storageBucket: "bulkpuzzlegame.firebasestorage.app",
  messagingSenderId: "1025824950502",
  appId: "1:1025824950502:web:504710f7a5797ee141d327",
  measurementId: "G-EC84K1VGCZ"
};

// Initialize Firebase
var app = firebase.initializeApp(firebaseConfig);
var database = firebase.database();

// Sync leaderboard with Firebase
function syncLeaderboard() {
  var dbRef = database.ref('leaderboard');
  dbRef.on('value', (snapshot) => {
    const onlineData = snapshot.val() || {};
    leaderboard = Object.values(onlineData).sort((a, b) => {
      if (a.moves !== b.moves) return a.moves - b.moves;
      return a.time - b.time;
    });
    localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
    displayLeaderboard(leaderboard); // Updated to reflect top 10 logic
    console.log('Leaderboard synced from Firebase:', leaderboard);
  }, (error) => {
    console.error('Error syncing leaderboard:', error);
  });
}

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
  let isBetter = true;
  if (existingIndex !== -1) {
    const currentBest = leaderboard[existingIndex];
    isBetter = entry.moves < currentBest.moves || (entry.moves === currentBest.moves && entry.time < currentBest.time);
  }

  if (isBetter) {
    // Update or add to Firebase
    var dbRef = database.ref('leaderboard/' + username);
    dbRef.set(entry).then(() => {
      console.log('Score saved to Firebase');
      syncLeaderboard(); // Sync to update display
    }).catch((error) => {
      console.error('Error saving score:', error);
    });
  } else {
    console.log(`New score for ${username} not better than existing`);
  }
}

// Display leaderboard with only top 10 players and rank summary for others
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

  // Display top 10 entries
  const top10 = entries.slice(0, 10); // Limit to top 10
  top10.forEach((entry, index) => {
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

  // Handle users ranked 11th and beyond
  const remainingCount = entries.length - 10;
  if (remainingCount > 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td colspan="4">11th+ ${remainingCount} user${remainingCount > 1 ? 's' : ''}</td>
    `;
    list.appendChild(tr);
  }

  console.log('Leaderboard displayed with top 10, remaining:', remainingCount, 'users, user rank:', userRank);
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
      tile.style.backgroundPosition = `${-col * 90}px ${-row * 90}px`; // Updated to 90px to match CSS
      tile.style.backgroundImage = `url('knight.jpg')`; // Explicit for non-empty
      // Debug: Check if image loads
      const img = new Image();
      img.src = 'knight.jpg';
      img.onload = () => console.log('Image loaded successfully for tile', i);
      img.onerror = () => console.error('Image failed to load for tile', i);
    } else {
      tile.classList.add('empty');
      tile.style.backgroundImage = 'none'; // Explicit for empty
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
  playerMove = true; // Mark as player-initiated
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
  playerMove = true; // Mark as player-initiated
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
    tiles[index1].style.backgroundImage = `url('knight.jpg')`; // Reset image
    tiles[index2].style.backgroundImage = 'none';
  } else {
    tiles[index2].classList.remove('empty');
    tiles[index1].classList.add('empty');
    tiles[index2].style.backgroundImage = `url('knight.jpg')`; // Reset image
    tiles[index1].style.backgroundImage = 'none';
  }
  
  emptyIndex = index1;
  moves++;
  updateStats();
  
  // Only check for completion on player moves
  if (playerMove && isSolved()) {
    // Fill the empty tile with the correct portion of the image
    const emptyTile = tiles[emptyIndex];
    const rowEmpty = Math.floor(emptyIndex / SIZE);
    const colEmpty = emptyIndex % SIZE;
    const correctX = -colEmpty * 90; // e.g., -270px for col 3
    const correctY = -rowEmpty * 90; // e.g., -270px for row 3
    emptyTile.classList.remove('empty');
    emptyTile.style.backgroundImage = `url('knight.jpg')`;
    emptyTile.style.backgroundPosition = `${correctX}px ${correctY}px`; // Set to match the missing piece
    emptyTile.style.backgroundSize = '360px 360px'; // Ensure full image fits

    // Show completed animation
    let completedMsg = document.getElementById('completed-message');
    if (!completedMsg) {
      completedMsg = document.createElement('div');
      completedMsg.id = 'completed-message';
      completedMsg.textContent = 'Completed!';
      document.body.appendChild(completedMsg);
    }
    completedMsg.style.display = 'block'; // Show the message
    setTimeout(() => {
      completedMsg.style.display = 'none'; // Hide after 2 seconds
    }, 2000);

    updateLeaderboard();
    playerMove = false; // Reset flag after completion
  } else {
    playerMove = false; // Reset flag for non-completion moves
  }
}

// Check if puzzle is solved
function isSolved() {
  for (let i = 0; i < TOTAL_TILES; i++) {
    const expectedX = -(i % SIZE * 90); // Updated to 90px
    const expectedY = -(Math.floor(i / SIZE) * 90); // Updated to 90px
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
  playerMove = false; // Disable completion check during shuffle
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
  console.log('Puzzle board shuffled, Start button enabled');
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

// Button listeners
document.getElementById('shuffle-btn').addEventListener('click', shuffle);
document.getElementById('start-btn').addEventListener('click', startGame);

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
  syncLeaderboard(); // Start syncing online leaderboard
  displayLeaderboard(leaderboard); // Initial display with top 10 logic
  updateStats();
  console.log('Game initialized, leaderboard loaded:', leaderboard);
});