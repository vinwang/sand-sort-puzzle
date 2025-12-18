// core/game.js — Optimized Core Logic
const SandSortGame = (function () {

  const PALETTE = [
    '#FF3838', '#17c0eb', '#ffb8b8', '#FFC312', '#C4E538',
    '#12CBC4', '#FDA7DF', '#c7ecee', '#9980FA', '#ff9f43',
    '#54a0ff', '#5f27cd', '#2e86de', '#ee5253'
  ];

  function generateLevel(level) {
    // Logic: 3 colors at level 1, +1 color every 5 levels.
    // Cap colors at 12 (Palette size - 2 or similar limit)
    let colorCount = 3 + Math.floor((level - 1) / 5);
    if (colorCount > PALETTE.length) colorCount = PALETTE.length;

    // Bottles: Colors + 2 Buffers
    const totalBottles = colorCount + 2;
    const capacity = 4;

    // Select Colors
    const usedColors = PALETTE.slice(0, colorCount);

    // Create Ball Array
    let balls = [];
    usedColors.forEach(color => {
      for (let i = 0; i < capacity; i++) balls.push(color);
    });

    // Shuffle
    for (let i = balls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [balls[i], balls[j]] = [balls[j], balls[i]];
    }

    // Fill Bottles
    const bottles = Array(totalBottles).fill().map(() => []);
    const fillCount = totalBottles - 2;

    let ballIdx = 0;
    for (let i = 0; i < fillCount; i++) {
      for (let k = 0; k < capacity; k++) {
        if (ballIdx < balls.length) {
          bottles[i].push(balls[ballIdx++]);
        }
      }
    }

    return {
      level,
      colorCount,
      totalBottles,
      capacity,
      bottles,
      history: []
    };
  }

  function isWin(bottles, capacity) {
    return bottles.every(bottle => {
      if (bottle.length === 0) return true;
      if (bottle.length !== capacity) return false;
      const first = bottle[0];
      return bottle.every(c => c === first);
    });
  }

  function pour(fromIdx, toIdx, bottles, capacity) {
    const from = bottles[fromIdx];
    const to = bottles[toIdx];

    if (from.length === 0 || to.length === capacity) return null;

    const sandColor = from[from.length - 1];

    // Rule: Target must be empty OR top matches
    if (to.length > 0 && to[to.length - 1] !== sandColor) return null;

    // Move Logic
    // Move ALL contiguous segments of same color? 
    // Standard rule: Usually one unit at a time OR all units capable?
    // Let's implement: Move as many as possible validly.

    const moveLog = {
      from: fromIdx,
      to: toIdx,
      added: []
    };

    // How many to move?
    // 1. Count same colored segments on top of Source
    let countToMove = 0;
    for (let i = from.length - 1; i >= 0; i--) {
      if (from[i] === sandColor) countToMove++;
      else break;
    }

    // 2. Count space in Target
    const space = capacity - to.length;

    // 3. Actual move amount
    const actualMove = Math.min(countToMove, space);

    if (actualMove === 0) return null;

    for (let k = 0; k < actualMove; k++) {
      const val = from.pop();
      to.push(val);
      moveLog.added.push(val);
    }

    return moveLog;
  }

  function undo(bottles, history) {
    if (history.length === 0) return false;
    const lastMove = history.pop(); // {from, to, added: [...]}

    // Reverse move: pop from 'to', push to 'from'
    const fromBottle = bottles[lastMove.from];
    const toBottle = bottles[lastMove.to];

    // specific amount moved
    const amount = lastMove.added.length;
    for (let k = 0; k < amount; k++) {
      const val = toBottle.pop();
      fromBottle.push(val);
    }
    return true;
  }

  return { generateLevel, isWin, pour, undo };
})();

if (typeof module !== 'undefined') module.exports = SandSortGame;