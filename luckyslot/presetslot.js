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
const supplementButton = document.getElementById('supplement-button');
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
        appSettings.rounds = [{ name: '第一輪', count: 1, allowSupplement: false }];
    }

    // 當剛載入時，確保按鈕隱藏（防呆）
    if (supplementButton) supplementButton.style.display = 'none';

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

    // 檢查該輪次是否已經抽完 (基本數量)
    const currentResults = roundResults[currentRoundIndex] || [];
    const isRoundComplete = currentResults.length >= currentRound.count;

    roundStatusEl.textContent = `本輪獎項：${currentRound.name} (抽取 ${currentRound.count} 位)`;

    // 判斷按鈕狀態
    if (isRoundComplete) {
        // 如果已經抽完基本數量
        if (currentRound.allowSupplement) {
            // 啟用遞補模式
            startButton.textContent = "進入下一輪";
            startButton.disabled = false;
            // 顯示遞補按鈕
            if (supplementButton) {
                supplementButton.style.display = 'inline-block';
                supplementButton.disabled = false;
            }
        } else {
            // 不能遞補，且已經抽完 -> 這裡理論上在自動跳轉時應該就被擋掉了，
            // 但如果剛好在該狀態 (例如重新整理)，就顯示已完成等待進入下一輪 (或自動跳轉?)
            // 照原本邏輯，不可遞補的輪次，抽完當下就會跳下一輪。
            // 但如果是讀取存檔剛好卡在這個狀態? (例如手動修改 storage)
            // 就讓它顯示進入下一輪
            startButton.textContent = "進入下一輪";
            startButton.disabled = false;
            if (supplementButton) supplementButton.style.display = 'none';
        }
    } else {
        // 還沒抽完
        startButton.textContent = "開始抽獎";
        startButton.disabled = false;
        if (supplementButton) supplementButton.style.display = 'none';
    }

    // 重置按鈕邏輯
    resetRoundButton.disabled = (currentRoundIndex === 0 && currentResults.length === 0);
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
            results.forEach((num, idx) => {
                const li = document.createElement('li');
                li.textContent = num;
                // 如果 index 超過 count，標記為遞補
                if (idx >= round.count) {
                    li.classList.add('supplementary-number');
                    li.title = '遞補號碼';
                }
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
        addRoundConfigRow(round.name, round.count, round.allowSupplement);
    });
}

function addRoundConfigRow(name = '', count = 1, allowSupplement = false) {
    const div = document.createElement('div');
    div.className = 'round-control-group';

    // 產生唯一 ID 給 checkbox
    const chkId = 'chk-' + Date.now() + Math.random().toString().substr(2, 5);

    div.innerHTML = `
        <label>名稱：</label>
        <input type="text" class="round-name" value="${name}" placeholder="獎項名稱">
        <label>數量：</label>
        <input type="number" class="round-count" value="${count}" min="1" style="width: 60px;">
        
        <div style="display: flex; align-items: center; margin-left: 10px; margin-right: 10px;">
            <input type="checkbox" id="${chkId}" class="round-supplement" ${allowSupplement ? 'checked' : ''}>
            <label for="${chkId}" style="margin: 0; font-size: 0.9em;">可遞補</label>
        </div>

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
    addRoundConfigRow('新輪次', 1, false);
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
        const allowSupplement = row.querySelector('.round-supplement').checked;

        if (name && count > 0) {
            newRounds.push({ name, count, allowSupplement });
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

    // 檢查目前是否已經完成本輪（判定是否為「進入下一輪」按鈕）
    const currentResults = roundResults[currentRoundIndex] || [];
    if (currentResults.length >= countNeeded) {
        // 使用者點擊了「進入下一輪」
        currentRoundIndex++;
        saveGameState();
        updateResultsUI();
        updateMetaUI();
        return;
    }

    if (availableNumbers.length < countNeeded) {
        alert(`號碼不足！本輪需要 ${countNeeded} 個，目前只剩 ${availableNumbers.length} 個。`);
        return;
    }

    //鎖定 UI
    startButton.disabled = true;
    resetRoundButton.disabled = true;
    resetAllButton.disabled = true;
    if (supplementButton) supplementButton.disabled = true;

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

    // 判斷是否要推進輪次
    if (currentRound.allowSupplement) {
        // 如果允許遞補，則停留在本輪，等待使用者後續操作（遞補或點擊下一輪）
        // 不做 currentRoundIndex++
        saveGameState();
        updateResultsUI();
        updateMetaUI(); // 這裡會把按鈕變成 "進入下一輪"，並顯示遞補按鈕
    } else {
        // 不允許遞補，直接進入下一輪
        currentRoundIndex++;
        saveGameState();
        updateResultsUI();
        updateMetaUI();
    }
});

// 遞補按鈕事件
if (supplementButton) {
    supplementButton.addEventListener('click', async (e) => {
        e.preventDefault();

        if (currentRoundIndex >= appSettings.rounds.length) return;

        if (availableNumbers.length < 1) {
            alert("號碼池已空，無法遞補！");
            return;
        }

        // 鎖定 UI
        startButton.disabled = true;
        supplementButton.disabled = true;
        resetRoundButton.disabled = true;
        resetAllButton.disabled = true;

        // 抽 1 個
        const num = drawSingleNumber();
        takenNumbers.push(num);

        // 加入結果
        if (!roundResults[currentRoundIndex]) {
            roundResults[currentRoundIndex] = [];
        }
        roundResults[currentRoundIndex].push(num);

        // 動畫
        const numStr = num.toString().padStart(3, '0');
        const digits = numStr.split('').map(Number);

        slotWheels.forEach(w => w.textContent = '');
        for (let i = 0; i < 3; i++) {
            await spinWheel(slotWheels[i], digits[i], 1000);
        }

        // 儲存並更新
        saveGameState();
        updateResultsUI();
        updateMetaUI(); // 按鈕狀態恢復
    });
}


// ==========================================================
// 6. 重置邏輯
// ==========================================================

// 重置本輪 (退回上一輪狀態)
resetRoundButton.addEventListener('click', (e) => {
    e.preventDefault();

    const currentResults = roundResults[currentRoundIndex] || [];
    let targetIndex;

    // 判斷重置目標：
    // 如果當前輪次已有結果（代表處於遞補階段，或剛抽完還沒按下一輪），則重置當前輪次
    // 如果當前輪次無結果，則重置上一輪
    if (currentResults.length > 0) {
        targetIndex = currentRoundIndex;
    } else {
        targetIndex = currentRoundIndex - 1;
    }

    if (targetIndex < 0) {
        alert("尚無抽獎紀錄可重置。");
        return;
    }

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

    // 2. 退回 index (如果是重置上一輪，index 要退回；如果是重置當前，index 不變)
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
