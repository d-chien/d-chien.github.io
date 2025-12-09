// ==========================================================
// 1. 取得 DOM 元素
// ==========================================================

// 主頁面元素
const mainPage = document.getElementById('main-page');
const settingsPage = document.getElementById('settings-page');
const toggleViewButton = document.getElementById('toggle-view');
const currentRoundNameEl = document.getElementById('current-round-name');
const roundStatusEl = document.getElementById('round-status');
const roundResultsContainer = document.getElementById('round-results-container');

const slotWheels = [
    document.getElementById('wheel-1'),
    document.getElementById('wheel-2'),
    document.getElementById('wheel-3')
];
const startButton = document.getElementById('start-button');
const resetRoundButton = document.getElementById('reset-round-button');
const resetAllButton = document.getElementById('reset-all-button');
const goCompareBtn = document.getElementById('go-compare-btn');

// 後台頁面元素
const rangeStartInput = document.getElementById('range-start');
const rangeEndInput = document.getElementById('range-end');
const excludeNumbersInput = document.getElementById('exclude-numbers');
const roundsConfigList = document.getElementById('rounds-config-list');
const addRoundBtn = document.getElementById('add-round-btn');
const saveSettingsButton = document.getElementById('save-settings');
const clearSettingsButton = document.getElementById('clear-settings');


// ==========================================================
// 2. 狀態變數
// ==========================================================
let availableNumbers = [];
let takenNumbers = []; // 所有輪次已經抽出的號碼總集 (避免跨輪次重複)
let currentRoundIndex = 0;

// 設定檔結構預設值
let appSettings = {
    rangeStart: 1,
    rangeEnd: 999,
    excludeNumbers: [],
    rounds: [] // Array of { name: "頭獎", count: 1 }
};

// 儲存每個輪次的抽獎結果
// 結構: { roundIndex: 0, numbers: [] }
let roundResults = {};

// ==========================================================
// 3. 初始化與功能函式
// ==========================================================

function initializeApp() {
    // 1. 讀取設定
    const savedSettings = sessionStorage.getItem('presetRaffleSettings');
    if (savedSettings) {
        appSettings = JSON.parse(savedSettings);
    } else {
        // 預設一筆輪次資料方便測試
        appSettings.rounds = [{ name: '第一輪', count: 1 }];
    }

    // 2. 讀取目前的遊戲狀態 (例如已進行到哪一輪，結果為何)
    const savedState = sessionStorage.getItem('presetRaffleState');
    if (savedState) {
        const state = JSON.parse(savedState);
        currentRoundIndex = state.currentRoundIndex;
        roundResults = state.roundResults;
        takenNumbers = state.takenNumbers || [];
    } else {
        currentRoundIndex = 0;
        roundResults = {};
        takenNumbers = [];
    }

    // 3. 重建號碼池 (Available Numbers)
    // 邏輯： 全域範圍 - 排除號碼 - 已抽出號碼
    rebuildAvailableNumbers();

    // 4. 更新 UI
    updateMetaUI();
    updateResultsUI();
    renderSettingsUI();
}

function rebuildAvailableNumbers() {
    availableNumbers = [];
    for (let i = appSettings.rangeStart; i <= appSettings.rangeEnd; i++) {
        // 排除號碼
        if (appSettings.excludeNumbers.includes(i)) continue;
        // 已被抽走的號碼
        if (takenNumbers.includes(i)) continue;

        availableNumbers.push(i);
    }
}

function saveGameState() {
    const state = {
        currentRoundIndex: currentRoundIndex,
        roundResults: roundResults,
        takenNumbers: takenNumbers
    };
    sessionStorage.setItem('presetRaffleState', JSON.stringify(state));
}

// 更新主畫面的標題、按鈕狀態
function updateMetaUI() {
    // 如果沒有設定任何輪次
    if (!appSettings.rounds || appSettings.rounds.length === 0) {
        currentRoundNameEl.textContent = "尚未設定輪次";
        roundStatusEl.textContent = "請至後台新增輪次";
        startButton.disabled = true;
        return;
    }

    // 檢查是否所有輪次都已結束
    if (currentRoundIndex >= appSettings.rounds.length) {
        currentRoundNameEl.textContent = "抽獎結束";
        roundStatusEl.textContent = "所有獎項皆已抽出";
        startButton.disabled = true;
        startButton.textContent = "已完成";

        // 確保重置按鈕狀態 logical
        resetRoundButton.disabled = true;
        resetAllButton.disabled = false;

        // 顯示前往比大小按鈕
        if (goCompareBtn) goCompareBtn.style.display = 'inline-block';

        return;
    }

    // 隱藏前往比大小按鈕 (若未結束)
    if (goCompareBtn) goCompareBtn.style.display = 'none';

    const currentRound = appSettings.rounds[currentRoundIndex];
    currentRoundNameEl.textContent = currentRound.name;

    // 檢查該輪次是否已經抽完
    const currentResults = roundResults[currentRoundIndex] || [];
    const isRoundComplete = currentResults.length >= currentRound.count;

    roundStatusEl.textContent = `本輪獎項：${currentRound.name} (抽取 ${currentRound.count} 位)`;
    startButton.textContent = "開始抽獎";
    startButton.disabled = false;

    // 如果當前輪次大於 0 (即有上一輪)，或者是已經執行過 (但 index 沒推進因為邏輯?)
    // 這裡我們只判斷是否可重置：只要剛抽完一輪 (index 會+1)，所以 index > 0 就可以重置上一輪。
    // 如果 index == 0，代表第一輪還沒開始，不能重置。
    resetRoundButton.disabled = (currentRoundIndex === 0);
    resetAllButton.disabled = false;
}

function updateResultsUI() {
    roundResultsContainer.innerHTML = '';

    // 遍歷所有輪次 (包含已結束的)
    appSettings.rounds.forEach((round, index) => {
        // 如果該輪有結果才顯示，或是為了版面也可顯示空標題
        const results = roundResults[index] || [];

        const resultSection = document.createElement('div');
        resultSection.style.marginBottom = '20px';

        const title = document.createElement('h4');
        title.textContent = round.name;
        title.style.margin = '5px 0';
        title.style.color = '#555';

        const ul = document.createElement('ul');
        ul.id = 'drawn-numbers'; // reuse style
        ul.style.marginTop = '5px';

        if (results.length === 0) {
            const li = document.createElement('li');
            li.textContent = "尚未抽出";
            li.style.background = 'transparent';
            li.style.color = '#999';
            ul.appendChild(li);
        } else {
            results.forEach(num => {
                const li = document.createElement('li');
                li.textContent = num;
                ul.appendChild(li);
            });
        }

        resultSection.appendChild(title);
        resultSection.appendChild(ul);
        roundResultsContainer.appendChild(resultSection);
    });
}


// ==========================================================
// 4. 設定頁面邏輯
// ==========================================================

function renderSettingsUI() {
    // 基礎設定回填
    rangeStartInput.value = appSettings.rangeStart;
    rangeEndInput.value = appSettings.rangeEnd;
    excludeNumbersInput.value = appSettings.excludeNumbers.join(', ');

    // 輪次列表回填
    roundsConfigList.innerHTML = '';
    appSettings.rounds.forEach((round, index) => {
        addRoundConfigRow(round.name, round.count, index);
    });
}

function addRoundConfigRow(name = '', count = 1, index = null) {
    const div = document.createElement('div');
    div.className = 'round-control-group';

    div.innerHTML = `
        <label>名稱：</label>
        <input type="text" class="round-name" value="${name}" placeholder="獎項名稱">
        <label>數量：</label>
        <input type="number" class="round-count" value="${count}" min="1" style="width: 60px;">
        <button type="button" class="remove-round-btn" style="background-color: #dc3545; padding: 5px 10px;">刪除</button>
    `;

    // 刪除按鈕功能
    const removeBtn = div.querySelector('.remove-round-btn');
    removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        div.remove();
    });

    roundsConfigList.appendChild(div);
}

addRoundBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addRoundConfigRow('新輪次', 1);
});

saveSettingsButton.addEventListener('click', (e) => {
    e.preventDefault();

    // Double Check
    if (!confirm('儲存設定會重置目前的抽獎進度，確定嗎？')) {
        return;
    }

    const start = parseInt(rangeStartInput.value);
    const end = parseInt(rangeEndInput.value);

    const excludeStr = excludeNumbersInput.value;
    const excludeArr = excludeStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));

    // 蒐集輪次設定
    const roundRows = roundsConfigList.querySelectorAll('.round-control-group');
    const newRounds = [];
    roundRows.forEach(row => {
        const name = row.querySelector('.round-name').value;
        const count = parseInt(row.querySelector('.round-count').value);
        if (name && count > 0) {
            newRounds.push({ name, count });
        }
    });

    appSettings = {
        rangeStart: start,
        rangeEnd: end,
        excludeNumbers: excludeArr,
        rounds: newRounds
    };

    sessionStorage.setItem('presetRaffleSettings', JSON.stringify(appSettings));

    // 重置遊戲狀態
    currentRoundIndex = 0;
    roundResults = {};
    takenNumbers = [];
    saveGameState();

    // 先切換視圖，再更新 UI
    if (mainPage.style.display === 'none') {
        toggleViewButton.click();
    }

    initializeApp(); // 這裡會呼叫 updateMetaUI，確保標題顯示新設定的第一輪名稱

    // 最後再 Alert，確保 UI 已經就緒
    setTimeout(() => {
        alert('設定已儲存！');
    }, 50);
});

clearSettingsButton.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('確定清除所有設定與進度？')) {
        sessionStorage.removeItem('presetRaffleSettings');
        sessionStorage.removeItem('presetRaffleState');
        alert('已清除，回到預設狀態。');
        location.reload();
    }
});


// ==========================================================
// 5. 核心抽獎邏輯
// ==========================================================

function drawSingleNumber() {
    if (availableNumbers.length === 0) return null;
    const idx = Math.floor(Math.random() * availableNumbers.length);
    const num = availableNumbers.splice(idx, 1)[0];
    return num;
}

// 數字輪動畫 (沿用 singleslot)
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

// 開始本輪抽獎
startButton.addEventListener('click', async (e) => {
    e.preventDefault();

    // 再次確認狀態
    if (currentRoundIndex >= appSettings.rounds.length) return;

    const currentRound = appSettings.rounds[currentRoundIndex];
    const countNeeded = currentRound.count;

    if (availableNumbers.length < countNeeded) {
        alert(`號碼不足！本輪需要 ${countNeeded} 個，目前只剩 ${availableNumbers.length} 個。`);
        return;
    }

    //鎖定 UI
    startButton.disabled = true;
    resetRoundButton.disabled = true;
    resetAllButton.disabled = true;

    // 抽出號碼
    const thisDrawResults = [];
    for (let i = 0; i < countNeeded; i++) {
        const num = drawSingleNumber();
        if (num !== null) {
            thisDrawResults.push(num);
            takenNumbers.push(num);
        }
    }

    // 執行動畫 - 顯示最後一個號碼
    const lastNum = thisDrawResults[thisDrawResults.length - 1];
    const numStr = lastNum.toString().padStart(3, '0');
    const digits = numStr.split('').map(Number);

    // 清空轉輪
    slotWheels.forEach(w => w.textContent = '');

    // 依序轉動
    for (let i = 0; i < 3; i++) {
        await spinWheel(slotWheels[i], digits[i], 1000);
    }

    // 紀錄結果
    roundResults[currentRoundIndex] = thisDrawResults;

    // 推進輪次 (User Requirement: 再次點擊就進行下一個輪次的抽獎)
    currentRoundIndex++;

    // 儲存並更新
    saveGameState();
    updateResultsUI();
    updateMetaUI();
});


// ==========================================================
// 6. 重置邏輯
// ==========================================================

// 重置本輪 (退回上一輪狀態)
resetRoundButton.addEventListener('click', (e) => {
    e.preventDefault();

    if (currentRoundIndex === 0) {
        alert("尚無抽獎紀錄可重置。");
        return;
    }

    // 目標重置的 index
    const targetIndex = currentRoundIndex - 1;
    const targetRoundName = appSettings.rounds[targetIndex].name;

    if (!confirm(`確定要重置「${targetRoundName}」的抽獎結果嗎？抽出的號碼將會放回號碼池。`)) {
        return;
    }

    // 1. 拿回號碼
    const numbersToReturn = roundResults[targetIndex] || [];
    // 從 takenNumbers 移除
    takenNumbers = takenNumbers.filter(n => !numbersToReturn.includes(n));
    // 從 results 移除
    delete roundResults[targetIndex];

    // 2. 退回 index
    currentRoundIndex = targetIndex;

    // 3. 重建 available
    saveGameState();
    rebuildAvailableNumbers();

    // 4. 清除視覺上的號碼 (避免誤會)
    slotWheels.forEach(w => w.textContent = '0');

    updateMetaUI();
    updateResultsUI();

    setTimeout(() => {
        alert(`已重置 ${targetRoundName}。`);
    }, 50);
});


// 全部重置
resetAllButton.addEventListener('click', (e) => {
    e.preventDefault();
    if (!confirm("確定要重置所有輪次的抽獎結果嗎？一切將從頭開始。")) return;

    currentRoundIndex = 0;
    roundResults = {};
    takenNumbers = [];

    saveGameState();
    rebuildAvailableNumbers();

    // Slot 歸零
    slotWheels.forEach(w => w.textContent = '0');

    updateMetaUI();
    updateResultsUI();

    setTimeout(() => {
        alert("所有輪次已重置。");
    }, 50);
});

if (goCompareBtn) {
    goCompareBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'compareslot.html';
    });
}


// ==========================================================
// 7. 頁面初始化與切換
// ==========================================================

toggleViewButton.addEventListener('click', (e) => {
    // 這裡通常不需要 preventDefault 因為它不是 submit，但加了保險
    // e.preventDefault(); // 但如果我是手動 .click() 觸發的，可能傳不進來e?
    // 當手動呼叫 toggleViewButton.click() 時，e 會是 undefined 或者合成事件?
    // 為了安全，檢查 e 是否存在
    if (e && e.preventDefault) e.preventDefault();

    if (mainPage.style.display === 'none') {
        mainPage.style.display = 'block';
        settingsPage.style.display = 'none';
        toggleViewButton.textContent = '切換至後台';
    } else {
        mainPage.style.display = 'none';
        settingsPage.style.display = 'block';
        toggleViewButton.textContent = '切換至主頁';
        renderSettingsUI(); // 確保後台顯示最新
    }
});

// Run
initializeApp();
