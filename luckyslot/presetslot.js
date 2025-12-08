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
        return;
    }

    const currentRound = appSettings.rounds[currentRoundIndex];
    currentRoundNameEl.textContent = currentRound.name;

    // 檢查該輪次是否已經抽完
    const currentResults = roundResults[currentRoundIndex] || [];
    const isRoundComplete = currentResults.length >= currentRound.count;

    if (isRoundComplete) {
        // 該輪已完成，準備進入下一輪
        // 如果還有下一輪，按鈕變成「進入下一輪」? 
        // 依照需求：「再次點擊就進行下一個輪次的抽獎」
        // 但這裡我們設計成：如果是 'Start' 按鈕，點擊就直接開始下一輪的抽獎動畫 (如果下一輪要抽的話)
        // 或是我們自動推進 Index? 

        // 邏輯調整：
        // 當下按下按鈕 -> 執行該輪次抽獎。 
        // 如果該輪次需要抽 5 個，現在只抽了 0 個，點按鈕 -> 抽 5 個。
        // 抽完後，該輪次結束。
        // 下一次再按 -> 執行下一輪次。

        // 所以如果 currentRoundIndex 指向的是一個「已完成」的輪次，我們應該要自動推進到下一個「未完成」的輪次嗎？
        // 這裡採取簡單作法：每次抽獎動作結束後，自動將 index + 1。
        // 所以理論上 updateMetaUI 呼叫時，currentRoundIndex 應該總是指向「準備要進行」的那一輪。

        // 但如果剛初始化，或者上一輪剛結束，我們會在這個函式被呼叫前把 index+1 存起來嗎？
        // 讓我們在 startRaffle 結束後處理 index 推進。
    }

    roundStatusEl.textContent = `本輪獎項：${currentRound.name} (抽取 ${currentRound.count} 位)`;
    startButton.textContent = "開始抽獎";
    startButton.disabled = false;
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
        <button class="remove-round-btn" style="background-color: #dc3545; padding: 5px 10px;">刪除</button>
    `;

    // 刪除按鈕功能
    const removeBtn = div.querySelector('.remove-round-btn');
    removeBtn.addEventListener('click', () => {
        div.remove();
    });

    roundsConfigList.appendChild(div);
}

addRoundBtn.addEventListener('click', () => {
    addRoundConfigRow('新輪次', 1);
});

saveSettingsButton.addEventListener('click', () => {
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

    // 重置遊戲狀態，因為設定變了可能會衝突
    if (confirm('儲存設定會重置目前的抽獎進度，確定嗎？')) {
        currentRoundIndex = 0;
        roundResults = {};
        takenNumbers = [];
        saveGameState();

        alert('設定已儲存！');
        initializeApp();

        // 切回主頁
        toggleViewButton.click();
    }
});

clearSettingsButton.addEventListener('click', () => {
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
startButton.addEventListener('click', async () => {
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

    // 執行動畫 (只顯示最後一個號碼的動畫，或者每個號碼都跑一次？)
    // 需求：「前端提供之抽獎按鈕每次按下的時候進行一個輪次的抽獎」
    // 通常這意味著一次啪啪啪把這輪都抽出來。
    // 為了效果，我們還是做最後一個號碼的動畫展示，或是簡單做個過場。
    // 這裡沿用 singleslot 邏輯：最後一個號碼做 Slot 動畫。

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

    // 解鎖
    // 注意: updateMetaUI 裡可能已經把 startButton disable 了 (如果結束了)
    if (currentRoundIndex < appSettings.rounds.length) {
        resetRoundButton.disabled = false;
        resetAllButton.disabled = false;
    } else {
        // 全劇終，給 reset 機會
        resetRoundButton.disabled = true; // 沒輪次可重置了
        resetAllButton.disabled = false;
    }
});


// ==========================================================
// 6. 重置邏輯
// ==========================================================

// 重置本輪 (退回上一輪狀態)
resetRoundButton.addEventListener('click', () => {
    // 邏輯思考：重置「該輪次」。如果是剛抽完 Round 1，User 想重來 Round 1。
    // 此時 currentRoundIndex 已經是 2 (準備 Round 2)。
    // 所以我們要退回 currentRoundIndex - 1，並把那輪的號碼吐回 availableNumbers，清除 results。

    // 如果 currentRoundIndex 是 0，代表還沒開始，無法重置。
    // 但是，如果使用者是在「准备抽 Round 2」的时候按下「重置本轮」，
    // 他的意图是「重置 Round 2 (还没抽)」还是「重置上一次抽的 Round 1」？
    // 依照直觀操作：「重置該輪次抽獎」通常指重置「剛剛發生的那個結果」。
    // 所以我們查看是否有「上一個已完成的輪次」。

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

    updateMetaUI();
    updateResultsUI();

    alert(`已重置 ${targetRoundName}。`);
});


// 全部重置
resetAllButton.addEventListener('click', () => {
    if (!confirm("確定要重置所有輪次的抽獎結果嗎？一切將從頭開始。")) return;

    currentRoundIndex = 0;
    roundResults = {};
    takenNumbers = [];

    saveGameState();
    rebuildAvailableNumbers();

    updateMetaUI();
    updateResultsUI();

    // Slot 歸零
    slotWheels.forEach(w => w.textContent = '0');
});


// ==========================================================
// 7. 頁面初始化與切換
// ==========================================================

toggleViewButton.addEventListener('click', () => {
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
