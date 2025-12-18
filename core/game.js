// core/game.js — 兼容浏览器的 IIFE 模块
const SandSortGame = (function () {

  function generateLevel(level) {
    const colorCount = Math.min(3 + Math.floor((level - 1) / 5), 12);
    const totalBottles = colorCount + 2;
    const capacity = 4;

    const availableColors = [
      '#FF3838', '#17c0eb', '#ffb8b8',
      '#FFC312', '#C4E538', '#12CBC4', '#FDA7DF'
    ];
    const usedColors = availableColors.slice(0, colorCount);

    let balls = [];
    usedColors.forEach(color => {
      for (let i = 0; i < capacity; i++) {
        balls.push(color);
      }
    });

    // Fisher-Yates shuffle
    for (let i = balls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [balls[i], balls[j]] = [balls[j], balls[i]];
    }

    const bottles = Array(totalBottles).fill().map(() => []);
    for (let i = 0; i < balls.length; i++) {
      const bottleIndex = i % (totalBottles - 2);
      bottles[bottleIndex].push(balls[i]);
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

    if (from.length === 0 || to.length === capacity) return false;
    if (to.length > 0 && to[to.length - 1] !== from[from.length - 1]) return false;

    const move = {
      from: fromIdx,
      to: toIdx,
      fromColor: [...from],
      toColor: [...to]
    };

    while (from.length > 0 && to.length < capacity) {
      if (to.length === 0 || to[to.length - 1] === from[from.length - 1]) {
        to.push(from.pop());
      } else {
        break;
      }
    }

    return move;
  }

  function undo(bottles, history) {
    if (history.length === 0) return false;
    const lastMove = history.pop();
    bottles[lastMove.from] = lastMove.fromColor;
    bottles[lastMove.to] = lastMove.toColor;
    return true;
  }

  function resetLevel(levelData) {
    const newLevel = generateLevel(levelData.level);
    levelData.bottles = newLevel.bottles;
    levelData.history = [];
  }

  return {
    generateLevel,
    isWin,
    pour,
    undo,
    resetLevel
  };
})();