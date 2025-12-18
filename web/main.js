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
  const container = canvas; // Canvas itself is flex-item now
  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();

  // Use actual displayed size
  const width = rect.width;
  const height = rect.height;

  // Set internal resolution match display size
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  // No need to set style.width/height if controlled by CSS (flex), 
  // but usually good to force it to avoid some canvas scaling quirks?
  // Actually, if we rely on CSS flex, we just read rect.
  // But setting width/height attribute clears canvas, which is fine.

  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';

  ctx.resetTransform(); // clear old scale
  ctx.scale(dpr, dpr);

  calculateLayout(width, height);
  render();
}

function calculateLayout(width, height) {
  const count = gameState.bottles.length;

  // Config
  const bW_Base = CONFIG.bottleBaseWidth;
  const bH_Base = CONFIG.bottleBaseHeight;
  const gap_Base = CONFIG.gapBase;

  // Check if we need 2 rows?
  // Threshold: If single row width > available width * 0.9, OR simple count check.
  // For mobile, > 6-7 bottles usually needs 2 rows.
  // Let's say if count > 7, we use 2 rows.

  const useTwoRows = count > 7;

  if (!useTwoRows) {
    // --- Single Row Logic ---
    let bW = bW_Base;
    let gap = gap_Base;
    const totalW = count * bW + (count - 1) * gap;

    // Scale down if needed
    const maxW = width - 40;
    let scale = 1;
    if (totalW > maxW) {
      scale = maxW / totalW;
    }

    bW *= scale;
    gap *= scale;
    // const bH = bH_Base * scale; // Optional: Scale height too?
    // Usually keeping height tall is fine unless it hits top/bottom.
    // Let's scale height slightly to match
    let bH = bH_Base * Math.min(1, scale * 1.2);

    const rowW = count * bW + (count - 1) * gap;
    const startX = (width - rowW) / 2;
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
  } else {
    // --- Double Row Logic ---
    const row1Count = Math.ceil(count / 2);
    const row2Count = Math.floor(count / 2);

    // Calculate Scale based on wider row (Row 1)
    let bW = bW_Base;
    let gap = gap_Base;
    const row1WidthVal = row1Count * bW + (row1Count - 1) * gap;

    const maxW = width - 40;
    let scale = 1;
    if (row1WidthVal > maxW) {
      scale = maxW / row1WidthVal;
    }

    // Apply Scale
    bW *= scale;
    gap *= scale;
    let bH = bH_Base * scale; // Must scale height for 2 rows to fit vertically

    // Check Vertical Fit
    // We need 2 * bH + vertical gap.
    // Available Height ~ 500 - padding.
    const vGap = 40 * scale;
    const totalH = 2 * bH + vGap;
    if (totalH > (height - 60)) {
      // Shrink further if height doesn't fit
      const hScale = (height - 60) / totalH;
      bW *= hScale;
      bH *= hScale;
      gap *= hScale;
    }

    // Row 1 Y and Row 2 Y
    // Center the block of 2 rows
    const blockH = 2 * bH + vGap;
    const startY = (height - blockH) / 2 + 10;

    gameState.bottlePositions = [];

    // Row 1
    const row1W = row1Count * bW + (row1Count - 1) * gap;
    const r1StartX = (width - row1W) / 2;
    for (let i = 0; i < row1Count; i++) {
      gameState.bottlePositions.push({
        x: r1StartX + i * (bW + gap),
        y: startY,
        w: bW,
        h: bH
      });
    }

    // Row 2
    const row2W = row2Count * bW + (row2Count - 1) * gap;
    const r2StartX = (width - row2W) / 2;
    for (let i = 0; i < row2Count; i++) {
      gameState.bottlePositions.push({
        x: r2StartX + i * (bW + gap),
        y: startY + bH + vGap,
        w: bW,
        h: bH
      });
    }
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

document.getElementById('hintBtn').onclick = () => {
  // Show Loading?
  const hintBtn = document.getElementById('hintBtn');
  hintBtn.innerText = '计算中...';

  setTimeout(() => {
    const solutionStep = SandSortGame.solve(gameState.bottles, gameState.capacity);

    if (solutionStep) {
      // Visual feedback
      const fromPos = gameState.bottlePositions[solutionStep.from];
      const toPos = gameState.bottlePositions[solutionStep.to];

      // Draw arrow or Flash bottles?
      // Simple: Select the From bottle automatically
      gameState.selected = solutionStep.from;
      render();

      // Hint Toast
      showToast(`提示: 将瓶子 ${solutionStep.from + 1} 倒入 ${solutionStep.to + 1}`);
    } else {
      showToast("暂无解或太复杂");
    }
    hintBtn.innerText = '💡提示';
  }, 50); // Small delay to let UI render text
};

function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8); color: white; padding: 15px 25px;
            border-radius: 25px; pointer-events: none; z-index: 2000;
        `;
    document.body.appendChild(toast);
  }
  toast.innerText = msg;
  setTimeout(() => toast.remove(), 2000);
}

window.addEventListener('resize', resizeCanvas);
window.onload = initLevel;