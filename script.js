// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.hide();

// Структура привычки:
// {
//   id: number,
//   name: string,
//   type: 'simple' | 'counter',
//   completedDates: [],      // строки YYYY-MM-DD для обычных (отметка выполнено)
//   counterDates: [],        // для счетчика – массив дат, когда нажали "день без срыва"
//   streak: number           // текущий непрерывный счётчик (только для типа counter)
// }

let habits = [];

// DOM элементы
const habitsList = document.getElementById('habitsList');
const statsContent = document.getElementById('statsContent');
const modal = document.getElementById('modal');
const habitNameInput = document.getElementById('habitNameInput');
const addHabitBtn = document.getElementById('addHabitBtn');
const saveHabitBtn = document.getElementById('saveHabitBtn');
const closeModalSpan = document.querySelector('.close');

// Получить сегодняшнюю дату в формате YYYY-MM-DD
function getToday() {
    return new Date().toISOString().split('T')[0];
}

// Вычисление непрерывного счётчика для counter-привычки
// Возвращает количество дней подряд (включая сегодня, если есть отметка)
function calculateStreak(dates) {
    if (!dates.length) return 0;
    // Сортируем по убыванию
    const sorted = [...dates].sort().reverse();
    const today = getToday();
    // Если сегодня нет отметки – streak = 0
    if (!sorted.includes(today)) return 0;
    
    let streak = 1;
    let expectedDate = new Date(today);
    for (let i = 1; i < sorted.length; i++) {
        const prevDate = new Date(sorted[i-1]);
        const currDate = new Date(sorted[i]);
        const diffDays = (prevDate - currDate) / (1000 * 60 * 60 * 24);
        if (diffDays === 1) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

// Сохранить привычки в localStorage и отправить боту (опционально)
function saveHabits() {
    localStorage.setItem('habits', JSON.stringify(habits));
    renderHabits();
    // Можно также отправить данные боту для синхронизации (но необязательно)
    // sendToBot('sync', { habits: habits });
}

// Отправка данных боту (сохраняется для совместимости)
function sendToBot(action, data) {
    if (tg.initDataUnsafe?.user) {
        const payload = JSON.stringify({ action, ...data });
        tg.sendData(payload);
        console.log("Отправлено боту:", payload);
    }
}

// Рендер списка привычек
function renderHabits() {
    if (!habits.length) {
        habitsList.innerHTML = '<div class="empty-state">➕ Добавьте первую привычку</div>';
        updateStats();
        return;
    }
    
    let html = '';
    habits.forEach((habit, idx) => {
        const today = getToday();
        let rightContent = '';
        
        if (habit.type === 'simple') {
            const completedToday = habit.completedDates && habit.completedDates.includes(today);
            rightContent = `
                <button class="complete-btn ${completedToday ? 'completed' : ''}" data-idx="${idx}">
                    ${completedToday ? '✓ Выполнено' : '✔ Отметить'}
                </button>
            `;
        } 
        else if (habit.type === 'counter') {
            // Для счетчика – показываем текущий streak и кнопку "+1 день"
            const alreadyMarkedToday = habit.counterDates?.includes(today);
            const streak = habit.streak || 0;
            rightContent = `
                <div class="habit-streak" style="margin-right: 12px;">
                    🔥 <span class="streak-value">${streak}</span> дней
                </div>
                <button class="counter-btn" data-idx="${idx}" ${alreadyMarkedToday ? 'disabled style="opacity:0.5;"' : ''}>
                    ${alreadyMarkedToday ? '✅ Отмечено' : '+1 день без срыва'}
                </button>
            `;
        }
        
        html += `
            <div class="habit-card" data-idx="${idx}">
                <div class="habit-info">
                    <div class="habit-name">
                        ${escapeHtml(habit.name)}
                        ${habit.type === 'counter' ? '<span style="font-size:12px; margin-left:8px;">🔥</span>' : ''}
                    </div>
                </div>
                <div class="habit-actions">
                    ${rightContent}
                    <button class="delete-btn" data-idx="${idx}">🗑️</button>
                </div>
            </div>
        `;
    });
    habitsList.innerHTML = html;
    updateStats();
}

// Обновить общую статистику
function updateStats() {
    const total = habits.length;
    const simpleCount = habits.filter(h => h.type === 'simple').length;
    const counterCount = habits.filter(h => h.type === 'counter').length;
    const todayMarkedSimple = habits.filter(h => h.type === 'simple' && h.completedDates?.includes(getToday())).length;
    const totalCounterStreak = habits.filter(h => h.type === 'counter').reduce((sum, h) => sum + (h.streak || 0), 0);
    
    statsContent.innerHTML = `
        📊 Всего привычек: ${total}<br>
        ✅ Обычных: ${simpleCount} (выполнено сегодня: ${todayMarkedSimple})<br>
        🔥 Со счётчиком: ${counterCount} (всего дней без срыва: ${totalCounterStreak})
    `;
}

// Экранирование HTML
function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Добавление привычки
function addHabit(name, type) {
    if (!name.trim()) return;
    const newHabit = {
        id: Date.now(),
        name: name.trim(),
        type: type,               // 'simple' или 'counter'
        completedDates: [],
        counterDates: [],
        streak: 0
    };
    habits.push(newHabit);
    saveHabits();
    sendToBot('add_habit', { habit_name: name, habit_type: type });
}

// Обработка отметки для простой привычки (переключение)
function toggleSimpleComplete(idx) {
    const habit = habits[idx];
    if (habit.type !== 'simple') return;
    const today = getToday();
    if (!habit.completedDates) habit.completedDates = [];
    if (habit.completedDates.includes(today)) {
        habit.completedDates = habit.completedDates.filter(d => d !== today);
    } else {
        habit.completedDates.push(today);
    }
    saveHabits();
    sendToBot('toggle_simple', { habit_name: habit.name, date: today });
}

// Обработка отметки дня для счетчика (добавление даты)
function markCounterDay(idx) {
    const habit = habits[idx];
    if (habit.type !== 'counter') return;
    const today = getToday();
    if (!habit.counterDates) habit.counterDates = [];
    if (habit.counterDates.includes(today)) return; // уже отмечали сегодня
    
    habit.counterDates.push(today);
    // Пересчитываем streak
    habit.streak = calculateStreak(habit.counterDates);
    saveHabits();
    sendToBot('counter_day', { habit_name: habit.name, date: today, streak: habit.streak });
}

// Удаление привычки
function deleteHabit(idx) {
    if (confirm('Удалить привычку?')) {
        const deleted = habits.splice(idx, 1);
        saveHabits();
        sendToBot('delete_habit', { habit_name: deleted[0].name });
    }
}

// Обработчики событий
addHabitBtn.onclick = () => {
    habitNameInput.value = '';
    document.querySelector('input[name="habitType"][value="simple"]').checked = true;
    modal.style.display = 'flex';
};
closeModalSpan.onclick = () => {
    modal.style.display = 'none';
};
window.onclick = (e) => {
    if (e.target === modal) modal.style.display = 'none';
};
saveHabitBtn.onclick = () => {
    const name = habitNameInput.value.trim();
    if (!name) {
        alert('Введите название привычки');
        return;
    }
    const type = document.querySelector('input[name="habitType"]:checked').value;
    addHabit(name, type);
    modal.style.display = 'none';
};

// Делегирование событий на динамические кнопки
habitsList.addEventListener('click', (e) => {
    const btn = e.target.closest('.complete-btn');
    if (btn) {
        const idx = parseInt(btn.dataset.idx);
        if (!isNaN(idx)) toggleSimpleComplete(idx);
        return;
    }
    const counterBtn = e.target.closest('.counter-btn');
    if (counterBtn) {
        const idx = parseInt(counterBtn.dataset.idx);
        if (!isNaN(idx)) markCounterDay(idx);
        return;
    }
    const delBtn = e.target.closest('.delete-btn');
    if (delBtn) {
        const idx = parseInt(delBtn.dataset.idx);
        if (!isNaN(idx)) deleteHabit(idx);
        return;
    }
});

// Загрузка сохранённых привычек из localStorage (миграция старых)
const saved = localStorage.getItem('habits');
if (saved) {
    try {
        let loaded = JSON.parse(saved);
        // Миграция: у старых привычек нет type – добавим 'simple', и для них completedDates уже есть
        loaded = loaded.map(h => {
            if (!h.type) {
                h.type = 'simple';
            }
            if (h.type === 'counter' && !h.counterDates) {
                h.counterDates = h.completedDates ? [...h.completedDates] : [];
                h.streak = calculateStreak(h.counterDates);
            }
            if (h.type === 'counter' && h.streak === undefined) {
                h.streak = calculateStreak(h.counterDates || []);
            }
            if (h.type === 'simple' && !h.completedDates) h.completedDates = [];
            return h;
        });
        habits = loaded;
    } catch(e) { console.error(e); }
}
// Также для каждой counter-привычки пересчитаем streak при загрузке
habits.forEach(h => {
    if (h.type === 'counter') {
        h.streak = calculateStreak(h.counterDates || []);
    }
});
saveHabits(); // пересохраняем с корректными streak

// Сообщаем Telegram, что приложение готово
tg.ready();
