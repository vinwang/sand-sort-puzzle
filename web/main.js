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

    // 从底向上渲染液体
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

    // 拖拽事件
    bottleEl.draggable = true;
    bottleEl.addEventListener('dragstart', handleDragStart);
    bottleEl.addEventListener('dragover', handleDragOver);
    bottleEl.addEventListener('drop', (e) => handleDrop(e, idx));
    bottleEl.addEventListener('click', () => handleClick(idx));
  });

  document.getElementById('level').textContent = gameState.level;
  document.getElementById('winOverlay').classList.toggle('hidden', !gameState.win);
}

function handleDragStart(e) {
  const idx = parseInt(e.target.dataset.index);
  if (gameState.bottles[idx].length === 0) {
    e.preventDefault();
    return;
  }
  e.dataTransfer.setData('text/plain', idx);
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e, toIdx) {
  e.preventDefault();
  const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
  if (isNaN(fromIdx) || fromIdx === toIdx) return;

  performPour(fromIdx, toIdx);
}

function handleClick(idx) {
  if (gameState.win) return;

  if (gameState.selected === null) {
    if (gameState.bottles[idx].length > 0) {
      gameState.selected = idx;
      render();
    }
  } else {
    if (gameState.selected !== idx) {
      performPour(gameState.selected, idx);
    } else {
      gameState.selected = null;
      render();
    }
  }
}

function performPour(from, to) {
  const bottlesCopy = JSON.parse(JSON.stringify(gameState.bottles));
  const move = SandSortGame.pour(from, to, bottlesCopy, gameState.capacity);

  if (move) {
    // 触觉反馈（Web）
    if (navigator.vibrate) navigator.vibrate(20);

    gameState.bottles = bottlesCopy;
    gameState.history.push(move);
    gameState.selected = null;

    if (SandSortGame.isWin(gameState.bottles, gameState.capacity)) {
      gameState.win = true;
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
    }
    render();
  } else {
    // 失败反馈
    if (navigator.vibrate) navigator.vibrate(50);
    alert('无法倒入');
    gameState.selected = null;
    render();
  }
}

// 按钮事件
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

function initLevel() {
  const data = SandSortGame.generateLevel(gameState.level);
  gameState.bottles = data.bottles;
  gameState.capacity = data.capacity;
  gameState.selected = null;
  gameState.history = [];
  gameState.win = false;
  render();
}

initLevel();