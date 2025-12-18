// core/game.js — Optimized Core Logic with Solver
const SandSortGame = (function () {

  const PALETTE = [
    '#FF3838', '#17c0eb', '#ffb8b8', '#FFC312', '#C4E538',
    '#12CBC4', '#FDA7DF', '#c7ecee', '#9980FA', '#ff9f43',
    '#54a0ff', '#5f27cd', '#2e86de', '#ee5253'
  ];

  function generateLevel(level) {
    // Optimal Progression System (UX Friendly)
    // Infinite bottles = Bad UX (too small).
    // Solution: Cap at 14 bottles (12 Colors + 2 Buffers or 13 Colors + 1 Buffer).
    // Difficulty comes from:
    // 1. More Colors (up to Cap).
    // 2. Less Buffers (Toggle 2->1).
    // 3. More Scramble Steps (Deeper puzzle).

    const MAX_COLORS = 12; // Keeps bottles <= 14, fits on screen

    // Colors: Slowly add up to MAX.
    // L1-2: 3 colors. L3-4: 4... 
    let colorCount = 3 + Math.floor((level - 1) / 2);
    if (colorCount > MAX_COLORS) colorCount = MAX_COLORS;

    // Buffer: L1=2 (Easy). L2+=1 (Hard).
    // Maybe giving 2 buffers every 5th level as a "Relief Level"?
    // Let's stick to user's "Harder" request -> 1 Buffer generally.
    // But for very high colors (10+), 1 buffer is extremely hard. 
    // Let's keep 1 buffer standard for challenge.
    const buffer = (level === 1) ? 2 : 1;

    const totalBottles = colorCount + buffer;
    const capacity = 4;

    // 1. Create Solved State
    let bottles = Array(totalBottles).fill().map(() => []);
    const usedColors = PALETTE.slice(0, colorCount);

    usedColors.forEach((c, idx) => {
      for (let i = 0; i < capacity; i++) bottles[idx].push(c);
    });

    // 2. Scramble
    // To create a puzzle, we randomly move balls around.
    // Unrestricted moves: Placed any color on any color.
    // This creates the "Mixed" state the player has to solve.

    // 10 steps base, +3 per level. 
    // L1: 13 moves. L2: 16 moves.
    const steps = 10 + (level * 3); // Increase scramble chaos
    let lastTo = -1;

    for (let s = 0; s < steps; s++) {
      let candidates = [];
      for (let i = 0; i < totalBottles; i++) {
        if (bottles[i].length === 0) continue;

        for (let j = 0; j < totalBottles; j++) {
          if (i === j) continue;

          // Simple constraint: Target not full
          if (bottles[j].length < capacity) {
            // Avoid immediate undo (ping-pong)
            if (i !== lastTo) {
              candidates.push({ from: i, to: j });
            }
          }
        }
      }

      if (candidates.length === 0) break;

      const move = candidates[Math.floor(Math.random() * candidates.length)];

      const val = bottles[move.from].pop();
      bottles[move.to].push(val);

      lastTo = move.to;
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

    if (!from || !to) return null;
    if (from.length === 0 || to.length === capacity) return null;

    const sandColor = from[from.length - 1];
    if (to.length > 0 && to[to.length - 1] !== sandColor) return null;

    // Stack Pour Logic
    const moveLog = {
      from: fromIdx,
      to: toIdx,
      added: []
    };

    let countToMove = 0;
    for (let i = from.length - 1; i >= 0; i--) {
      if (from[i] === sandColor) countToMove++;
      else break;
    }
    const space = capacity - to.length;
    const actualMove = Math.min(countToMove, space);

    if (actualMove === 0) return null;

    for (let k = 0; k < actualMove; k++) {
      moveLog.added.push(from.pop());
      to.push(sandColor);
    }

    return moveLog;
  }

  function undo(bottles, history) {
    if (history.length === 0) return false;
    const lastMove = history.pop();
    const fromBottle = bottles[lastMove.from];
    const toBottle = bottles[lastMove.to];

    const amount = lastMove.added.length;
    for (let k = 0; k < amount; k++) {
      toBottle.pop();
      fromBottle.push(lastMove.added[0]); // Color is same
    }
    return true;
  }

  // Optimized Solver
  function solve(bottles, capacity) {
    // Fast Hash
    const getHash = (b) => {
      let s = "";
      for (let i = 0; i < b.length; i++) {
        s += i + ":" + b[i].join('') + "|";
      }
      return s;
    };

    // Deep clone for search
    const deepClone = (b) => b.map(arr => [...arr]);
    const startState = deepClone(bottles);

    // Queue: { state, firstMove }
    const queue = [{ state: startState, firstMove: null }];
    const visited = new Set();
    visited.add(getHash(startState));

    let checks = 0;
    const LIMIT = 50000; // Increased Limit
    const startTime = Date.now();
    const TIME_LIMIT = 1500; // 1.5s Max

    while (queue.length > 0) {
      if (checks++ > LIMIT) return null;
      if ((checks % 500 === 0) && (Date.now() - startTime > TIME_LIMIT)) return null;

      const curr = queue.shift();

      if (isWin(curr.state, capacity)) {
        return curr.firstMove;
      }

      // Generate Moves
      for (let i = 0; i < curr.state.length; i++) {
        if (curr.state[i].length === 0) continue;

        // Optimization: Don't move from solved bottle (full & same color)
        const src = curr.state[i];
        if (src.length === capacity && src.every(c => c === src[0])) continue;

        for (let j = 0; j < curr.state.length; j++) {
          if (i === j) continue;

          // Sort of "Virtual Pour"
          const dst = curr.state[j];

          if (dst.length === capacity) continue;
          if (dst.length > 0 && dst[dst.length - 1] !== src[src.length - 1]) continue;

          // Execute Virtual Pour
          const nextState = deepClone(curr.state);
          const res = pourUIFree(i, j, nextState, capacity);

          if (res) {
            const key = getHash(nextState);
            if (!visited.has(key)) {
              visited.add(key);
              queue.push({
                state: nextState,
                firstMove: curr.firstMove || { from: i, to: j }
              });
            }
          }
        }
      }
    }
    return null;
  }

  // Helper for Solver (simplified pour that modifies array in place)
  function pourUIFree(fromIdx, toIdx, bottles, capacity) {
    const from = bottles[fromIdx];
    const to = bottles[toIdx];
    const color = from[from.length - 1];

    let count = 0;
    for (let i = from.length - 1; i >= 0; i--) {
      if (from[i] === color) count++; else break;
    }
    const space = capacity - to.length;
    const real = Math.min(count, space);
    if (real === 0) return false;

    for (let k = 0; k < real; k++) {
      from.pop();
      to.push(color);
    }
    return true;
  }

  return { generateLevel, isWin, pour, undo, solve };
})();

if (typeof module !== 'undefined') module.exports = SandSortGame;