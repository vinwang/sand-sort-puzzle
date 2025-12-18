// web/main.js — Optimized Canvas Rendering & Interaction
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameState = {
  level: 1,
  bottles: [],
  capacity: 4,
  selected: null,
  history: [],
  win: false,
  bottlePositions: [],
  animating: false
};

// --- Rendering Configuration ---
const CONFIG = {
  bottleBaseWidth: 60,
  bottleBaseHeight: 240,
  gapBase: 30,
  maxRowWidth: 800, // Max width of bottles area
};

function resizeCanvas() {
  const container = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = 500 * dpr; // Fixed height area

  canvas.style.width = rect.width + 'px';
  canvas.style.height = '500px';

  ctx.scale(dpr, dpr);

  calculateLayout(rect.width, 500);
  render();
}

function calculateLayout(width, height) {
  const count = gameState.bottles.length;
  // Auto-scale specific bottle size to fit width
  // Formula: count * (w + gap) = width
  // if width is small, shrink w.

  // Default size
  let bW = CONFIG.bottleBaseWidth;
  let bH = CONFIG.bottleBaseHeight;
  let gap = CONFIG.gapBase;

  const requiredWidth = count * bW + (count - 1) * gap;
  const availableWidth = width - 40; // padding

  // Scale down if needed
  if (requiredWidth > availableWidth) {
    const scale = availableWidth / requiredWidth;
    bW *= scale;
    // Keep height proportional or fixed? Fixed height is better for liquid, 
    // but maybe shrink slightly to look proportional
    // Let's keep height fixed unless extreme
  }

  // Center it
  const totalW = count * bW + (count - 1) * gap;
  const startX = (width - totalW) / 2;
  const startY = (height - bH) / 2 + 20;

  gameState.bottlePositions = [];
  for (let i = 0; i < count; i++) {
    gameState.bottlePositions.push({
      x: startX + i * (bW + gap),
      y: startY,
      w: bW,
      h: bH
    });
  }
}

// --- Drawing ---
function drawBottle(pos, isSelected) {
  const { x, y, w, h } = pos;
  const actualY = isSelected ? y - 20 : y;

  // Glass Background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(x, actualY);
  ctx.lineTo(x, actualY + h - w / 3);
  ctx.quadraticCurveTo(x, actualY + h, x + w / 2, actualY + h);
  ctx.quadraticCurveTo(x + w, actualY + h, x + w, actualY + h - w / 3);
  ctx.lineTo(x + w, actualY);
  ctx.stroke();
  ctx.fill();

  // Rim
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, actualY);
  ctx.lineTo(x + w, actualY);
  ctx.stroke();
  ctx.restore();
}

function drawLiquid(pos, bottle, isSelected) {
  const { x, y, w, h } = pos;
  const actualY = isSelected ? y - 20 : y;

  if (bottle.length === 0) return;

  // We draw from bottom to top
  // Total liquid height = eg. 80% of bottle
  const unitHeight = (h - 20) / gameState.capacity; // -20 for padding/bottom curve

  let currentY = actualY + h - 5; // Start near bottom

  // Clip to bottle shape
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, actualY);
  ctx.lineTo(x, actualY + h - w / 3);
  ctx.quadraticCurveTo(x, actualY + h, x + w / 2, actualY + h);
  ctx.quadraticCurveTo(x + w, actualY + h, x + w, actualY + h - w / 3);
  ctx.lineTo(x + w, actualY);
  ctx.clip();

  for (let i = 0; i < bottle.length; i++) {
    const color = bottle[i];
    const lh = unitHeight + 1; // +1 overlap

    ctx.fillStyle = color;
    ctx.fillRect(x, currentY - lh, w, lh);

    // Highlights logic
    // ...

    currentY -= unitHeight;
  }

  ctx.restore();

  // Draw Surface Meniscus for Top Layer
  // Using currentY which is now at the top of the liquid stack
  // (Actually currentY goes up. Loop ends after decrementing. So currentY is Top Y)

  const topY = currentY;

  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, topY, w / 2 - 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  gameState.bottles.forEach((bottle, i) => {
    const pos = gameState.bottlePositions[i];
    if (!pos) return;

    const isSelected = gameState.selected === i;

    // Draw Liquid First (inside clip roughly)
    drawLiquid(pos, bottle, isSelected);
    // Draw Bottle Over
    drawBottle(pos, isSelected);
  });

  if (gameState.win) {
    // Could draw overlay on canvas or use DOM
  }
}

// --- Interaction ---
function initLevel() {
  const data = SandSortGame.generateLevel(gameState.level);
  gameState.bottles = data.bottles;
  gameState.capacity = data.capacity;
  gameState.history = [];
  gameState.win = false;
  gameState.selected = null;

  document.getElementById('level').innerText = gameState.level;
  document.getElementById('winOverlay').style.display = 'none';

  resizeCanvas();
}

canvas.addEventListener('mousedown', handleClick);
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  handleClick(e.touches[0]);
}, { passive: false });

function handleClick(e) {
  if (gameState.win) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width; // dpr included in width? No. canvas.width is pixel width.
  // getBoundingClientRect is css pixels. e.clientX is viewport pixels.
  const x = (e.clientX - rect.left); // CSS X relative to canvas
  const y = (e.clientY - rect.top);

  // Check hit
  // bottlePositions are in CSS pixels? Wait.
  // resizeCanvas: canvas.width = rect.width * dpr. ctx.scale(dpr).
  // So drawing coords are CSS pixels.

  const idx = gameState.bottlePositions.findIndex(p => {
    return x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h;
  });

  if (idx === -1) {
    if (gameState.selected !== null) {
      gameState.selected = null;
      render();
    }
    return;
  }

  handleBottleAction(idx);
}

function handleBottleAction(idx) {
  if (gameState.selected === null) {
    if (gameState.bottles[idx].length > 0) {
      gameState.selected = idx;
      render();
    }
  } else {
    if (gameState.selected === idx) {
      gameState.selected = null;
    } else {
      // Move
      const move = SandSortGame.pour(gameState.selected, idx, gameState.bottles, gameState.capacity);
      if (move) {
        // Success
        gameState.history.push(move);
        gameState.selected = null;
        if (SandSortGame.isWin(gameState.bottles, gameState.capacity)) {
          gameState.win = true;
          document.getElementById('winOverlay').style.display = 'flex';
        }
      } else {
        // Fail
        gameState.selected = null;
      }
    }
    render();
  }
}

// Buttons
document.getElementById('undoBtn').onclick = () => {
  if (SandSortGame.undo(gameState.bottles, gameState.history)) render();
};
document.getElementById('resetBtn').onclick = () => {
  initLevel();
};
document.getElementById('nextBtn').onclick = () => {
  gameState.level++;
  initLevel();
};

window.addEventListener('resize', resizeCanvas);
window.onload = initLevel;