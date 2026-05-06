const LEVELS = [
    { rows: 5,  cols: 5,  mines: 3  },
    { rows: 7,  cols: 7,  mines: 7  },
    { rows: 9,  cols: 9,  mines: 12 },
    { rows: 10, cols: 10, mines: 18 },
    { rows: 12, cols: 12, mines: 25 },
    { rows: 12, cols: 12, mines: 30 },
    { rows: 14, cols: 14, mines: 35 },
    { rows: 14, cols: 14, mines: 42 },
    { rows: 16, cols: 16, mines: 50 },
    { rows: 16, cols: 16, mines: 60 },
];

class Minesweeper {
    constructor() {
        this.boardEl = document.getElementById('board');
        this.levelDisplay = document.getElementById('level-display');
        this.minesDisplay = document.getElementById('mines-display');
        this.timerDisplay = document.getElementById('timer-display');
        this.flagsDisplay = document.getElementById('flags-display');
        this.overlay = document.getElementById('overlay');
        this.overlayTitle = document.getElementById('overlay-title');
        this.overlayMessage = document.getElementById('overlay-message');
        this.btnNext = document.getElementById('btn-next');
        this.btnRetry = document.getElementById('btn-retry');
        this.btnReset = document.getElementById('btn-reset');
        this.btnMenu = document.getElementById('btn-menu');
        this.levelSelect = document.getElementById('level-select');
        this.levelGrid = document.getElementById('level-grid');
        this.btnCloseMenu = document.getElementById('btn-close-menu');
        this.btnMode = document.getElementById('btn-mode');

        this.currentLevel = this.loadProgress();
        this.highestUnlocked = this.currentLevel;
        this.grid = [];
        this.revealed = [];
        this.flagged = [];
        this.gameOver = false;
        this.firstClick = true;
        this.timer = null;
        this.seconds = 0;
        this.flagCount = 0;
        this.mode = 'dig';

        this.bindEvents();
        this.startLevel(this.currentLevel);
    }

    bindEvents() {
        this.btnNext.addEventListener('click', () => {
            this.overlay.classList.add('hidden');
            this.startLevel(this.currentLevel + 1);
        });

        this.btnRetry.addEventListener('click', () => {
            this.overlay.classList.add('hidden');
            this.startLevel(this.currentLevel);
        });

        this.btnReset.addEventListener('click', () => {
            this.startLevel(this.currentLevel);
        });

        this.btnMenu.addEventListener('click', () => {
            this.showLevelSelect();
        });

        this.btnCloseMenu.addEventListener('click', () => {
            this.levelSelect.classList.add('hidden');
        });

        this.btnMode.addEventListener('click', () => {
            this.toggleMode();
        });
    }

    toggleMode() {
        this.mode = this.mode === 'dig' ? 'flag' : 'dig';
        if (this.mode === 'dig') {
            this.btnMode.textContent = '⛏️ Dig';
            this.btnMode.classList.remove('flag-mode');
        } else {
            this.btnMode.textContent = '🚩 Flag';
            this.btnMode.classList.add('flag-mode');
        }
    }

    getLevelConfig(level) {
        if (level < LEVELS.length) return LEVELS[level];
        const base = LEVELS[LEVELS.length - 1];
        const extra = level - LEVELS.length + 1;
        return {
            rows: Math.min(base.rows + extra, 20),
            cols: Math.min(base.cols + extra, 20),
            mines: base.mines + extra * 5,
        };
    }

    startLevel(level) {
        this.currentLevel = level;
        if (level > this.highestUnlocked) this.highestUnlocked = level;
        this.saveProgress();

        const config = this.getLevelConfig(level);
        this.rows = config.rows;
        this.cols = config.cols;
        this.totalMines = config.mines;
        this.gameOver = false;
        this.firstClick = true;
        this.flagCount = 0;
        this.seconds = 0;
        this.mode = 'dig';
        this.btnMode.textContent = '⛏️ Dig';
        this.btnMode.classList.remove('flag-mode');

        if (this.timer) clearInterval(this.timer);
        this.timer = null;

        this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
        this.revealed = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
        this.flagged = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));

        this.updateHUD();
        this.renderBoard();
    }

    placeMines(safeRow, safeCol) {
        let placed = 0;
        while (placed < this.totalMines) {
            const r = Math.floor(Math.random() * this.rows);
            const c = Math.floor(Math.random() * this.cols);

            if (this.grid[r][c] === -1) continue;
            if (Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1) continue;

            this.grid[r][c] = -1;
            placed++;
        }

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] === -1) continue;
                this.grid[r][c] = this.countAdjacentMines(r, c);
            }
        }
    }

    countAdjacentMines(row, col) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = row + dr;
                const nc = col + dc;
                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                    if (this.grid[nr][nc] === -1) count++;
                }
            }
        }
        return count;
    }

    renderBoard() {
        this.boardEl.innerHTML = '';
        this.boardEl.style.gridTemplateColumns = `repeat(${this.cols}, 36px)`;
        this.boardEl.oncontextmenu = (e) => e.preventDefault();

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = r;
                cell.dataset.col = c;

                cell.addEventListener('click', () => this.handleClick(r, c));

                this.boardEl.appendChild(cell);
            }
        }

        this.adjustCellSize();
    }

    adjustCellSize() {
        const maxWidth = Math.min(window.innerWidth - 48, 560);
        const cellSize = Math.min(36, Math.floor((maxWidth - (this.cols - 1) * 2) / this.cols));
        this.boardEl.style.gridTemplateColumns = `repeat(${this.cols}, ${cellSize}px)`;

        const cells = this.boardEl.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;
            cell.style.fontSize = `${Math.max(0.6, cellSize / 42)}rem`;
        });
    }

    handleClick(row, col) {
        if (this.gameOver) return;
        if (this.revealed[row][col]) return;

        if (this.mode === 'flag') {
            this.handleFlag(row, col);
            return;
        }

        if (this.flagged[row][col]) return;

        if (this.firstClick) {
            this.firstClick = false;
            this.placeMines(row, col);
            this.startTimer();
        }

        if (this.grid[row][col] === -1) {
            this.revealMine(row, col);
            return;
        }

        this.reveal(row, col);
        this.checkWin();
    }

    handleFlag(row, col) {
        this.flagged[row][col] = !this.flagged[row][col];
        this.flagCount += this.flagged[row][col] ? 1 : -1;

        const cell = this.getCell(row, col);
        if (this.flagged[row][col]) {
            cell.classList.add('flagged');
            cell.textContent = '🚩';
        } else {
            cell.classList.remove('flagged');
            cell.textContent = '';
        }

        this.updateHUD();
    }

    reveal(row, col) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
        if (this.revealed[row][col]) return;
        if (this.flagged[row][col]) return;

        this.revealed[row][col] = true;
        const cell = this.getCell(row, col);
        cell.classList.add('revealed');

        const value = this.grid[row][col];
        if (value > 0) {
            cell.textContent = value;
            cell.dataset.count = value;
        } else if (value === 0) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    this.reveal(row + dr, col + dc);
                }
            }
        }
    }

    revealMine(row, col) {
        this.gameOver = true;
        this.stopTimer();

        const hitCell = this.getCell(row, col);
        hitCell.classList.add('mine-hit');
        hitCell.textContent = '💣';

        setTimeout(() => {
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    if (this.grid[r][c] === -1 && !(r === row && c === col)) {
                        const cell = this.getCell(r, c);
                        cell.classList.add('mine-shown');
                        cell.textContent = '💣';
                    }
                }
            }
            this.showOverlay('Game Over', `You hit a mine! Level ${this.currentLevel + 1}`, false);
        }, 400);
    }

    checkWin() {
        let unrevealed = 0;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.revealed[r][c] && this.grid[r][c] !== -1) unrevealed++;
            }
        }

        if (unrevealed === 0) {
            this.gameOver = true;
            this.stopTimer();
            const time = this.formatTime(this.seconds);
            this.showOverlay(
                'Level Complete!',
                `Cleared level ${this.currentLevel + 1} in ${time}`,
                true
            );
        }
    }

    showOverlay(title, message, isWin) {
        this.overlayTitle.textContent = title;
        this.overlayMessage.textContent = message;
        this.overlay.classList.remove('hidden');

        if (isWin) {
            this.btnNext.classList.remove('hidden');
            this.overlayTitle.style.color = 'var(--success)';
        } else {
            this.btnNext.classList.add('hidden');
            this.overlayTitle.style.color = 'var(--primary)';
        }
    }

    showLevelSelect() {
        this.levelGrid.innerHTML = '';
        const totalLevels = Math.max(LEVELS.length, this.highestUnlocked + 1);

        for (let i = 0; i < totalLevels; i++) {
            const btn = document.createElement('button');
            btn.className = 'level-btn';
            btn.textContent = i + 1;

            if (i === this.currentLevel) {
                btn.classList.add('current');
            } else if (i <= this.highestUnlocked) {
                btn.classList.add('unlocked');
            } else {
                btn.classList.add('locked');
            }

            if (i <= this.highestUnlocked) {
                btn.addEventListener('click', () => {
                    this.levelSelect.classList.add('hidden');
                    this.startLevel(i);
                });
            }

            this.levelGrid.appendChild(btn);
        }

        this.levelSelect.classList.remove('hidden');
    }

    getCell(row, col) {
        return this.boardEl.children[row * this.cols + col];
    }

    startTimer() {
        this.timer = setInterval(() => {
            this.seconds++;
            this.timerDisplay.textContent = this.formatTime(this.seconds);
        }, 1000);
    }

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    formatTime(s) {
        const min = Math.floor(s / 60);
        const sec = s % 60;
        return `${min}:${sec.toString().padStart(2, '0')}`;
    }

    updateHUD() {
        this.levelDisplay.textContent = this.currentLevel + 1;
        this.minesDisplay.textContent = this.totalMines;
        this.timerDisplay.textContent = this.formatTime(this.seconds);
        this.flagsDisplay.textContent = `${this.flagCount}/${this.totalMines}`;
    }

    saveProgress() {
        localStorage.setItem('minesweeper_level', this.highestUnlocked.toString());
    }

    loadProgress() {
        const saved = localStorage.getItem('minesweeper_level');
        return saved ? parseInt(saved, 10) : 0;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new Minesweeper();
});

window.addEventListener('resize', () => {
    const board = document.getElementById('board');
    if (board && board.children.length > 0) {
        const game = window._game;
        if (game) game.adjustCellSize();
    }
});
