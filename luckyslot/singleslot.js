// ==========================================================
// 1. 取得所有需要的 HTML 元素
// ==========================================================

// 主頁面元素
const mainPage = document.getElementById('main-page');
const settingsPage = document.getElementById('settings-page');
const toggleViewButton = document.getElementById('toggle-view');

const slotWheels = [
    document.getElementById('wheel-1'),
    document.getElementById('wheel-2'),
    document.getElementById('wheel-3')
];
const drawCountInput = document.getElementById('draw-count-input');
const startButton = document.getElementById('start-button');
const resetButton = document.getElementById('reset-button');
const drawnNumbersList = document.getElementById('drawn-numbers');

// 後台頁面元素
const rangeStartInput = document.getElementById('range-start');
const rangeEndInput = document.getElementById('range-end');
const excludeNumbersInput = document.getElementById('exclude-numbers');
const saveSettingsButton = document.getElementById('save-settings');
const clearSettingsButton = document.getElementById('clear-settings');

// ==========================================================
// 2. 宣告儲存資料的變數
// ==========================================================

// 可抽取的號碼清單，將會根據後台設定動態生成
let availableNumbers = [];

// 已抽取的號碼清單
let drawnNumbers = [];

// ==========================================================
// 3. 頁面切換功能
// ==========================================================
toggleViewButton.addEventListener('click', () => {
    // 當主頁面隱藏，點選後台按鈕，顯示主頁面，隱藏後台頁面
    if (mainPage.style.display === 'none') {
        mainPage.style.display = 'block';
        settingsPage.style.display = 'none';
        toggleViewButton.textContent = '切換至後台';
    } else {
        // 當主頁面顯示，點選主頁按鈕，隱藏主頁面，顯示後台頁面
        mainPage.style.display = 'none';
        settingsPage.style.display = 'block';
        toggleViewButton.textContent = '切換至主頁';
    }
});

// ==========================================================
// 4. 初始化應用程式與號碼池
// ==========================================================
// 這個函式負責載入設定，並建立可抽取的號碼清單
function initializeApp() {
    // 確保號碼清單在每次初始化前都被清空
    availableNumbers = [];

    // 檢查 sessionStorage 中是否有設定資料，並預先定義一個setting預設值
    const savedSettings = sessionStorage.getItem('raffleSettings');
    let settings = {
        rangeStart: 1,
        rangeEnd: 999,
        excludeNumbers: []
    };

    // 如果有，就使用已儲存的設定
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
    }

    // 更新後台頁面的輸入框顯示
    rangeStartInput.value = settings.rangeStart;
    rangeEndInput.value = settings.rangeEnd;
    // 將排除號碼Array轉換成逗號分隔的字串
    excludeNumbersInput.value = settings.excludeNumbers.join(', ');

    // 根據設定建立可抽取的號碼清單
    for (let i = settings.rangeStart; i <= settings.rangeEnd; i++) {
        // 如果號碼不在排除清單中，就加入可用清單
        if (!settings.excludeNumbers.includes(i)) {
            availableNumbers.push(i);
        }
    }
}

// 函式：更新已抽取的號碼顯示
function updateDrawnNumbersDisplay() {
    drawnNumbersList.innerHTML = ''; // 先清空列表
    drawnNumbers.forEach(number => {
        const li = document.createElement('li');
        li.textContent = number;
        drawnNumbersList.appendChild(li);
    });
}

// ==========================================================
// 5. 程式開始執行
// ==========================================================
// 程式載入時，呼叫這個函式來初始化
initializeApp();

// ==========================================================
// 6. 後台設定功能
// ==========================================================

// 儲存設定按鈕的事件監聽器
saveSettingsButton.addEventListener('click', () => {
    // 取得使用者輸入的數字範圍
    const start = parseInt(rangeStartInput.value);
    const end = parseInt(rangeEndInput.value);

    // 取得排除號碼清單，並處理成數字陣列
    const excludeNumbersString = excludeNumbersInput.value;
    const excludeNumbersArray = excludeNumbersString
        .split(',')
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n));

    // 建立一個物件來儲存所有設定
    const settings = {
        rangeStart: start,
        rangeEnd: end,
        excludeNumbers: excludeNumbersArray
    };

    // 將設定物件轉換成 JSON 字串並儲存到 sessionStorage
    sessionStorage.setItem('raffleSettings', JSON.stringify(settings));

    alert('設定已儲存！');

    // 重新初始化應用程式，讓新設定生效
    initializeApp();
});

// 清除設定按鈕的事件監聽器
clearSettingsButton.addEventListener('click', () => {
    // 從 sessionStorage 移除設定資料
    sessionStorage.removeItem('raffleSettings');

    alert('設定已清除！頁面將重置。');

    // 重新初始化應用程式，回到預設設定
    initializeApp();
});

// ==========================================================
// 7. 核心拉霸功能
// ==========================================================

// 函式：從號碼池中隨機抽取一個號碼
function drawSingleNumber() {
    if (availableNumbers.length === 0) {
        alert('沒有可抽取的號碼了！');
        return null;
    }

    // 隨機選取一個索引
    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    // 使用 splice() 移除並取得該號碼
    const drawnNumber = availableNumbers.splice(randomIndex, 1)[0];

    return drawnNumber;
}

// 函式：執行拉霸抽取
async function startRaffle() {
    const drawCount = parseInt(drawCountInput.value);

    // 檢查抽獎數量是否有效
    if (isNaN(drawCount) || drawCount <= 0) {
        alert('請輸入有效的抽獎數量。');
        return;
    }

    // 檢查號碼池是否足夠
    if (drawCount > availableNumbers.length) {
        alert(`可抽取號碼不足！目前剩下 ${availableNumbers.length} 個號碼。`);
        return;
    }

    // 鎖定按鈕，避免在動畫進行中重複點擊
    startButton.disabled = true;
    resetButton.disabled = true;

    // 依據抽獎數量執行抽取
    for (let i = 0; i < drawCount; i++) {
        const number = drawSingleNumber();
        if (number !== null) {
            drawnNumbers.push(number);
        }
    }

    // 將最後一組抽到的號碼拆解成三位數字
    const lastDrawnNumber = drawnNumbers[drawnNumbers.length - 1];
    const numStr = lastDrawnNumber.toString().padStart(3, '0');
    const digits = numStr.split('').map(Number);

    // 讓三個數字輪依序開始滾動並停止在最終號碼上
    const spinDuration = 1000; // 動畫持續時間 (1秒)

    // 開轉前清空
    for (let i = 0; i < 3; i++) {
        slotWheels[i].textContent = ''
    }

    for (let i = 0; i < 3; i++) {
        // 等待上一個數字輪停止後，再開始下一個
        await new Promise(resolve => {
            spinWheel(slotWheels[i], digits[i], spinDuration);
            setTimeout(resolve, spinDuration + 100); // 確保上一個動畫完成
        });
    }

    // 動畫結束後，更新顯示
    updateDrawnNumbersDisplay();

    // 解鎖按鈕
    startButton.disabled = false;
    resetButton.disabled = false;
}

// 開始按鈕的事件監聽器
startButton.addEventListener('click', (e) => {
    e.preventDefault();
    startRaffle();
});

// ==========================================================
// 8. 重置功能
// ==========================================================
resetButton.addEventListener('click', (e) => {
    e.preventDefault();
    // 顯示警示框確認是否重置
    const confirmReset = window.confirm('確定要重置嗎？所有已抽取的號碼都會被清除。');

    // 如果使用者按下確定
    if (confirmReset) {
        // 清空已抽取的號碼清單
        drawnNumbers = [];

        // 重新初始化應用程式，重建可抽取的號碼清單
        initializeApp();

        // 更新畫面顯示
        updateDrawnNumbersDisplay();

        // 視覺歸零
        slotWheels.forEach(w => w.textContent = '0');

        alert('已重置！現在可以重新抽取號碼。');
    }
});

// ==========================================================
// 9. 數字輪動畫
// ==========================================================

// 函式：執行單一數字輪的滾動動畫
function spinWheel(wheelElement, finalNumber, duration) {
    const startTime = Date.now();
    const interval = 50; // 每 50 毫秒更新一次數字
    let counter = 0;

    // 定時器，每隔一段時間更新數字
    const timer = setInterval(() => {
        const elapsedTime = Date.now() - startTime;

        // 如果時間到了或已達最大圈數，則停止動畫
        if (elapsedTime >= duration) {
            clearInterval(timer); // 停止定時器
            // 顯示最終號碼
            wheelElement.textContent = finalNumber;
            return;
        }

        // 隨機顯示一個數字來模擬滾動效果
        const randomNumber = Math.floor(Math.random() * 10);
        wheelElement.textContent = randomNumber;

    }, interval);
}