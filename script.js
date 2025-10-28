// Game setup
const SIZE = 3; // 3x3 grid
const TOTAL_TILES = SIZE * SIZE - 1; // 8 tiles + 1 empty
let tiles = [];
let moves = 0;
let emptyIndex = TOTAL_TILES; // Empty starts at bottom-right (index 8)
let touchStartX = 0;
let touchStartY = 0;
let startTime = null;
let timerInterval = null;
let gameStarted = false;
let isShuffled = false;
let leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
let playerMove = false;

// Firebase config (your real one)
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

var app = firebase.initializeApp(firebaseConfig);
var database = firebase.database();

// === LEADERBOARD SYNC ===
function syncLeaderboard() {
  database.ref('leaderboard').on('value', (snapshot) => {
    const data = snapshot.val() || {};
    leaderboard = Object.values(data).sort((a, b) => a.moves - b.moves || a.time - b.time);
    localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
    displayLeaderboard(leaderboard);
  });
}

// === DISPLAY USERNAME ===
function displayUsername() {
  const username = localStorage.getItem('username') || 'Guest';
  document.getElementById('username-display').textContent = username;
}

// === UPDATE STATS (Moves & Time) ===
function updateStats() {
  const movesBtn = document.getElementById('moves-btn');
  const timeBtn = document.getElementById('time-btn');
  let timeDisplay = '00:00';
  if (startTime && gameStarted) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const seconds = String(elapsed % 60).padStart(2, '0');
    timeDisplay = `${minutes}:${seconds}`;
  }
  movesBtn.textContent = `Moves: ${moves}`;
  timeBtn.textContent = `Time: ${timeDisplay}`;
}

// === START TIMER ===
function startTimer() {
  if (!timerInterval && isShuffled && !gameStarted) {
    startTime = Date.now();
    timerInterval = setInterval(updateStats, 1000);
    gameStarted = true;
    updateStats();
  }
}

// === STOP TIMER ===
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    if (startTime) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      startTime = null;
      gameStarted = false;
      return elapsed;
    }
  }
  return 0;
}

// === UPDATE LEADERBOARD ===
function updateLeaderboard() {
  const username = localStorage.getItem('username') || 'Guest';
  const time = stopTimer();
  const entry = { name: username, moves: moves || 0, time: time || 0 };

  if (moves <= 0 || time <= 0) return;

  const existing = leaderboard.findIndex(e => e.name === username);
  const isBetter = existing === -1 ||
    entry.moves < leaderboard[existing].moves ||
    (entry.moves === leaderboard[existing].moves && entry.time < leaderboard[existing].time);

  if (isBetter) {
    database.ref('leaderboard/' + username).set(entry).then(() => {
      syncLeaderboard();
    });
  }
}

// === DISPLAY LEADERBOARD ===
function displayLeaderboard(entries) {
  const list = document.getElementById('leaderboard-body');
  if (!list) return;
  list.innerHTML = '';
  const top10 = entries.slice(0, 10);
  top10.forEach((entry, i) => {
    const tr = document.createElement('tr');
    const mins = String(Math.floor(entry.time / 60)).padStart(2, '0');
    const secs = String(entry.time % 60).padStart(2, '0');
    tr.innerHTML = `<td>${i+1}</td><td>${entry.name}</td><td>${entry.moves}</td><td>${mins}:${secs}</td>`;
    list.appendChild(tr);
  });
  if (entries.length > 10) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="4">11th+ ${entries.length - 10} users</td>`;
    list.appendChild(tr);
  }
}

// === CREATE 3x3 BOARD ===
function createBoard() {
  const board = document.getElementById('puzzle-board');
  if (!board) return console.error('Board not found!');
  board.innerHTML = '';
  tiles = [];

  for (let i = 0; i < SIZE * SIZE; i++) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.dataset.index = i;

    if (i < TOTAL_TILES) {
      const row = Math.floor(i / SIZE);
      const col = i % SIZE;
      tile.style.backgroundPosition = `${-col * 100}px ${-row * 100}px`;
      tile.style.backgroundImage = `url('knight.jpg')`;
    } else {
      tile.classList.add('empty');
      tile.style.backgroundImage = 'none';
    }

    tile.addEventListener('click', handleTileClick);
    tile.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    });
    tile.addEventListener('touchmove', e => e.preventDefault());
    tile.addEventListener('touchend', handleTouchEnd);
    board.appendChild(tile);
    tiles[i] = tile;
  }
}

// === SWAP TILES ===
function swapTiles(i1, i2) {
  const temp = tiles[i1].style.backgroundPosition;
  tiles[i1].style.backgroundPosition = tiles[i2].style.backgroundPosition;
  tiles[i2].style.backgroundPosition = temp;

  if (tiles[i1].classList.contains('empty')) {
    tiles[i1].classList.remove('empty');
    tiles[i2].classList.add('empty');
    tiles[i1].style.backgroundImage = `url('knight.jpg')`;
    tiles[i2].style.backgroundImage = 'none';
  } else {
    tiles[i2].classList.remove('empty');
    tiles[i1].classList.add('empty');
    tiles[i2].style.backgroundImage = `url('knight.jpg')`;
    tiles[i1].style.backgroundImage = 'none';
  }

  emptyIndex = i1;
  moves++;
  updateStats();

  // Only check completion on player move
  if (playerMove && isSolved()) {
    const row = Math.floor(emptyIndex / SIZE);
    const col = emptyIndex % SIZE;
    const emptyTile = tiles[emptyIndex];
    emptyTile.classList.remove('empty');
    emptyTile.style.backgroundImage = `url('knight.jpg')`;
    emptyTile.style.backgroundPosition = `${-col * 100}px ${-row * 100}px`;

    // Show "Completed!" animation
    let msg = document.getElementById('completed-message');
    if (!msg) {
      msg = document.createElement('div');
      msg.id = 'completed-message';
      msg.textContent = 'Uwu💋';
      document.body.appendChild(msg);
    }
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 2000);

    updateLeaderboard();
    playerMove = false;
  } else {
    playerMove = false;
  }
}

// === IS SOLVED? ===
function isSolved() {
  for (let i = 0; i < TOTAL_TILES; i++) {
    const x = -(i % SIZE * 100);
    const y = -(Math.floor(i / SIZE) * 100);
    if (tiles[i].style.backgroundPosition !== `${x}px ${y}px`) return false;
  }
  return true;
}

// === SHUFFLE ===
function shuffle() {
  if (gameStarted) return;
  playerMove = false;
  for (let i = 0; i < 500; i++) {
    const row = Math.floor(emptyIndex / SIZE);
    const col = emptyIndex % SIZE;
    const possible = [];
    if (col > 0) possible.push(emptyIndex - 1);
    if (col < SIZE - 1) possible.push(emptyIndex + 1);
    if (row > 0) possible.push(emptyIndex - SIZE);
    if (row < SIZE - 1) possible.push(emptyIndex + SIZE);
    const move = possible[Math.floor(Math.random() * possible.length)];
    if (move !== undefined) swapTiles(move, emptyIndex);
  }
  moves = 0;
  isShuffled = true;
  document.getElementById('start-btn').disabled = false;
  updateStats();
}

// === CLICK HANDLER ===
function handleTileClick(e) {
  if (!gameStarted) return;
  playerMove = true;
  const idx = parseInt(e.target.dataset.index);
  if (isAdjacent(idx, emptyIndex)) swapTiles(idx, emptyIndex);
}

// === TOUCH SWIPE HANDLER ===
function handleTouchEnd(e) {
  if (!gameStarted) return;
  playerMove = true;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  const idx = parseInt(e.target.dataset.index);
  let target = null;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 50 && idx % SIZE < SIZE - 1) target = idx + 1;
    else if (dx < -50 && idx % SIZE > 0) target = idx - 1;
  } else {
    if (dy > 50 && Math.floor(idx / SIZE) < SIZE - 1) target = idx + SIZE;
    else if (dy < -50 && Math.floor(idx / SIZE) > 0) target = idx - SIZE;
  }

  if (target === emptyIndex) swapTiles(idx, emptyIndex);
}

// === CHECK IF TILES ARE ADJACENT ===
function isAdjacent(a, b) {
  const ra = Math.floor(a / SIZE), ca = a % SIZE;
  const rb = Math.floor(b / SIZE), cb = b % SIZE;
  return Math.abs(ra - rb) + Math.abs(ca - cb) === 1;
}

// === START GAME ===
function startGame() {
  if (isShuffled && !gameStarted) {
    startTimer();
  }
}

// === BUTTONS ===
document.getElementById('shuffle-btn').addEventListener('click', shuffle);
document.getElementById('start-btn').addEventListener('click', startGame);

// === INITIALIZE ===
document.addEventListener('DOMContentLoaded', () => {
  displayUsername();
  createBoard();
  syncLeaderboard();
  displayLeaderboard(leaderboard);
  updateStats();
});