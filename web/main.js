let gameState = {
  level: 1,
  bottles: [],
  capacity: 4,
  selected: null,
  history: [],
  win: false
};

function render() {
  const bottlesEl = document.getElementById('bottles');
  bottlesEl.innerHTML = '';

  gameState.bottles.forEach((bottle, idx) => {
    const bottleEl = document.createElement('div');
    bottleEl.className = `bottle ${gameState.selected === idx ? 'selected' : ''}`;
    bottleEl.dataset.index = idx;

    const tubeEl = document.createElement('div');
    tubeEl.className = 'tube';

    for (let i = 0; i < bottle.length; i++) {
      const liquidEl = document.createElement('div');
      liquidEl.className = 'liquid';
      liquidEl.style.backgroundColor = bottle[i];
      liquidEl.style.height = `${100 / gameState.capacity}%`;
      liquidEl.style.bottom = `${i * (100 / gameState.capacity)}%`;
      tubeEl.appendChild(liquidEl);
    }

    bottleEl.appendChild(tubeEl);
    bottlesEl.appendChild(bottleEl);

    bottleEl.addEventListener('click', () => selectBottle(idx));
  });

  document.getElementById('level').textContent = gameState.level;
  document.getElementById('winOverlay').classList.toggle('hidden', !gameState.win);
}

function initLevel() {
  const data = SandSortGame.generateLevel(gameState.level);
  gameState.bottles = data.bottles;
  gameState.capacity = data.capacity;
  gameState.selected = null;
  gameState.history = [];
  gameState.win = false;
  render();
}

function selectBottle(idx) {
  if (gameState.win) return;

  if (gameState.selected === null) {
    if (gameState.bottles[idx].length > 0) {
      gameState.selected = idx;
      render();
    }
  } else {
    const from = gameState.selected;
    const to = idx;

    if (from === to) {
      gameState.selected = null;
      render();
      return;
    }

    const bottlesCopy = JSON.parse(JSON.stringify(gameState.bottles));
    const move = SandSortGame.pour(from, to, bottlesCopy, gameState.capacity);

    if (move) {
      gameState.bottles = bottlesCopy;
      gameState.history.push(move);
      gameState.selected = null;

      if (SandSortGame.isWin(gameState.bottles, gameState.capacity)) {
        gameState.win = true;
      }
      render();
    } else {
      alert('无法倒入');
      gameState.selected = null;
      render();
    }
  }
}

document.getElementById('undoBtn').addEventListener('click', () => {
  if (SandSortGame.undo(gameState.bottles, gameState.history)) {
    gameState.selected = null;
    render();
  }
});

document.getElementById('resetBtn').addEventListener('click', () => {
  SandSortGame.resetLevel(gameState);
  initLevel();
});

document.getElementById('nextBtn').addEventListener('click', () => {
  gameState.level++;
  initLevel();
});

initLevel();