// ==========================================================
// 1. 取得 DOM 元素
// ==========================================================

const mainPage = document.getElementById('main-page');
const settingsPage = document.getElementById('settings-page');
const toggleViewButton = document.getElementById('toggle-view');

const slotWheels = [
    document.getElementById('wheel-1'),
    document.getElementById('wheel-2'),
    document.getElementById('wheel-3')
];

// Panels
const setupPanel = document.getElementById('setup-panel');
const playPanel = document.getElementById('play-panel');
const gameStatus = document.getElementById('game-status');

// Controls
const playerCountInput = document.getElementById('player-count');
const initGameBtn = document.getElementById('init-game-btn');
const currentPlayerInfo = document.getElementById('current-player-info');
const drawBtn = document.getElementById('draw-btn');
const resetGameBtn = document.getElementById('reset-game-btn');

// Results
const drawnNumbersList = document.getElementById('drawn-numbers');
const finalVerdict = document.getElementById('final-verdict');

// Settings
const rangeStartInput = document.getElementById('range-start');
const rangeEndInput = document.getElementById('range-end');
const excludeNumbersInput = document.getElementById('exclude-numbers');
const saveSettingsButton = document.getElementById('save-settings');
const clearSettingsButton = document.getElementById('clear-settings');

// ==========================================================
// 2. 狀態變數
// ==========================================================

let availableNumbers = [];
let totalPlayers = 0;
let currentPlayer = 1;
let playerResults = []; // [{ player: 1, number: 123 }, ...]
let isGameActive = false;
let currentWinCondition = 'big'; // 'big' or 'small'

// Settings
let settings = {
    rangeStart: 1,
    rangeEnd: 999,
    excludeNumbers: []
};


// ==========================================================
// 3. 初始化與設定
// ==========================================================

function initializeApp() {
    // Load Settings
    const savedSettings = sessionStorage.getItem('compareRaffleSettings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
    }

    // UI update
    rangeStartInput.value = settings.rangeStart;
    rangeEndInput.value = settings.rangeEnd;
    excludeNumbersInput.value = settings.excludeNumbers.join(', ');

    // Not rebuilding number pool here because we build it when game starts
}

function buildAvailableNumbers() {
    availableNumbers = [];
    for (let i = settings.rangeStart; i <= settings.rangeEnd; i++) {
        if (!settings.excludeNumbers.includes(i)) {
            availableNumbers.push(i);
        }
    }
}

// Settings Events
saveSettingsButton.addEventListener('click', () => {
    const start = parseInt(rangeStartInput.value);
    const end = parseInt(rangeEndInput.value);
    const excludeArr = excludeNumbersInput.value
        .split(',')
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n));

    settings = {
        rangeStart: start,
        rangeEnd: end,
        excludeNumbers: excludeArr
    };

    sessionStorage.setItem('compareRaffleSettings', JSON.stringify(settings));
    alert('設定已儲存！');

    // Only re-init if not in middle of game, or just let next game start use it
    if (isGameActive) {
        alert('注意：新設定將在下一局遊戲生效。');
    }
});

clearSettingsButton.addEventListener('click', () => {
    sessionStorage.removeItem('compareRaffleSettings');
    alert('設定已清除！');
    location.reload();
});

toggleViewButton.addEventListener('click', () => {
    if (mainPage.style.display === 'none') {
        mainPage.style.display = 'block';
        settingsPage.style.display = 'none';
        toggleViewButton.textContent = '切換至後台';
    } else {
        mainPage.style.display = 'none';
        settingsPage.style.display = 'block';
        toggleViewButton.textContent = '切換至主頁';
    }
});

// ==========================================================
// 4. 遊戲邏輯
// ==========================================================

// Start Game Flow
initGameBtn.addEventListener('click', () => {
    const count = parseInt(playerCountInput.value);
    if (isNaN(count) || count < 2) {
        alert("請輸入至少 2 位參與者");
        return;
    }

    // Build pool
    buildAvailableNumbers();
    if (availableNumbers.length < count) {
        alert(`號碼不足！共有 ${count} 位玩家，但只有 ${availableNumbers.length} 個號碼可抽。`);
        return;
    }

    // Get Win Condition
    const conditionRadios = document.getElementsByName('win-condition');
    currentWinCondition = 'big'; // default
    for (const radio of conditionRadios) {
        if (radio.checked) {
            currentWinCondition = radio.value;
            break;
        }
    }

    // Init State
    totalPlayers = count;
    currentPlayer = 1;
    playerResults = [];
    isGameActive = true;

    // Update UI
    setupPanel.style.display = 'none';
    playPanel.style.display = 'block';

    const modeText = currentWinCondition === 'big' ? "比大 (最大者勝)" : "比小 (最小者勝)";
    gameStatus.textContent = `遊戲進行中 - 共 ${totalPlayers} 人 [${modeText}]`;

    updateGameUI();

    // Clear previous results
    drawnNumbersList.innerHTML = '';
    finalVerdict.textContent = '';
    slotWheels.forEach(w => w.textContent = '0');
});

// Reset Game
resetGameBtn.addEventListener('click', () => {
    if (!confirm("確定要重置遊戲嗎？目前的進度將會消失。")) return;
    resetGame();
});

function resetGame() {
    isGameActive = false;
    setupPanel.style.display = 'block';
    playPanel.style.display = 'none';
    gameStatus.textContent = "設定人數並開始";
    playerResults = [];
    drawnNumbersList.innerHTML = '';
    finalVerdict.textContent = '';
    slotWheels.forEach(w => w.textContent = '0');
    drawBtn.disabled = false;
    drawBtn.textContent = "抽號碼";
}

function updateGameUI() {
    if (currentPlayer > totalPlayers) {
        currentPlayerInfo.textContent = "所有玩家已抽完！";
        drawBtn.disabled = true;
        drawBtn.textContent = "遊戲結束";
        showFinalResult();
    } else {
        currentPlayerInfo.textContent = `請 第 ${currentPlayer} 位 玩家抽獎`;
        drawBtn.disabled = false;
    }
}

// Draw Action
drawBtn.addEventListener('click', async () => {
    if (!isGameActive) return;

    if (availableNumbers.length === 0) {
        alert("沒有號碼了！");
        return;
    }

    // Lock
    drawBtn.disabled = true;

    // Pick number
    const randIdx = Math.floor(Math.random() * availableNumbers.length);
    const drawnNum = availableNumbers.splice(randIdx, 1)[0];

    // Animate
    const numStr = drawnNum.toString().padStart(3, '0');
    const digits = numStr.split('').map(Number);

    slotWheels.forEach(w => w.textContent = '');

    for (let i = 0; i < 3; i++) {
        await spinWheel(slotWheels[i], digits[i], 1000);
    }

    // Store Result
    playerResults.push({
        player: currentPlayer,
        number: drawnNum
    });

    // Show in list
    addResultToList(currentPlayer, drawnNum);

    // Next
    currentPlayer++;
    updateGameUI();
});

function addResultToList(playerIdx, number) {
    const li = document.createElement('li');
    li.textContent = `第 ${playerIdx} 位: ${number}`;
    drawnNumbersList.appendChild(li);
}

function showFinalResult() {
    // Determine sort based on condition
    const sorted = [...playerResults].sort((a, b) => {
        if (currentWinCondition === 'small') {
            return a.number - b.number; // Ascending for Small
        }
        return b.number - a.number; // Descending for Big
    });

    const winner = sorted[0];

    // Handle Ties (Multiple winners)
    const winners = sorted.filter(p => p.number === winner.number);

    let text = "";
    const conditionText = currentWinCondition === 'big' ? "最大" : "最小";

    if (winners.length === 1) {
        text = `🏆 獲勝者 (${conditionText})：第 ${winner.player} 位 (號碼 ${winner.number})`;
    } else {
        const winnerNames = winners.map(w => `第 ${w.player} 位`).join(' & ');
        text = `🏆 平手 (${conditionText})：${winnerNames} (號碼 ${winner.number})`;
    }

    finalVerdict.textContent = text;

    // Highlight in list
    const items = drawnNumbersList.querySelectorAll('li');
    winners.forEach(w => {
        // Find list item corresponding to this player. 
        // Note: The list is appended in order 1..N, so index matches (player - 1)
        if (items[w.player - 1]) {
            items[w.player - 1].style.backgroundColor = '#ffc107'; // Goldish
            items[w.player - 1].style.fontWeight = 'bold';
        }
    });
}


// Animation Util
function spinWheel(wheelElement, finalNumber, duration) {
    const startTime = Date.now();
    const interval = 50;

    return new Promise(resolve => {
        const timer = setInterval(() => {
            const elapsedTime = Date.now() - startTime;
            if (elapsedTime >= duration) {
                clearInterval(timer);
                wheelElement.textContent = finalNumber;
                resolve();
                return;
            }
            wheelElement.textContent = Math.floor(Math.random() * 10);
        }, interval);
    });
}

// Init
initializeApp();
