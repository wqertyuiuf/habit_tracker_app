// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.hide();

// Эмуляция данных (для демонстрации, пока нет бэкенда)
let habits = [];

// DOM элементы
const habitsList = document.getElementById('habitsList');
const statsContent = document.getElementById('statsContent');
const modal = document.getElementById('modal');
const habitNameInput = document.getElementById('habitNameInput');
const addHabitBtn = document.getElementById('addHabitBtn');
const saveHabitBtn = document.getElementById('saveHabitBtn');
const closeModalSpan = document.querySelector('.close');

// Функция отправки данных боту (в реальности бот получит через web_app_data)
function sendToBot(action, data) {
    if (tg.initDataUnsafe?.user) {
        const payload = JSON.stringify({ action, ...data });
        tg.sendData(payload);
        console.log("Отправлено боту:", payload);
    } else {
        console.log("Не в Telegram, демо режим");
    }
}

// Рендер списка привычек
function renderHabits() {
    if (!habits.length) {
        habitsList.innerHTML = '<div class="empty-state">Добавьте первую привычку</div>';
        statsContent.innerHTML = 'Нет привычек';
        return;
    }
    let html = '';
    habits.forEach((habit, idx) => {
        const completedToday = habit.completedDates && habit.completedDates.includes(getToday());
        html += `
            <div class="habit-card" data-idx="${idx}">
                <div class="habit-info">
                    <div class="habit-name">${escapeHtml(habit.name)}</div>
                    <div class="habit-streak">🔥 ${habit.streak || 0} дней</div>
                </div>
                <div class="habit-actions">
                    <button class="complete-btn ${completedToday ? 'completed' : ''}" data-idx="${idx}">
                        ${completedToday ? '✓' : '✔ Отметить'}
                    </button>
                    <button class="delete-btn" data-idx="${idx}">🗑️</button>
                </div>
            </div>
        `;
    });
    habitsList.innerHTML = html;
    
    // Статистика
    const total = habits.length;
    const completedTodayCount = habits.filter(h => h.completedDates?.includes(getToday())).length;
    statsContent.innerHTML = `Всего привычек: ${total}<br>Выполнено сегодня: ${completedTodayCount}`;
}

function getToday() {
    return new Date().toISOString().split('T')[0];
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Добавление привычки
function addHabit(name) {
    if (!name.trim()) return;
    const newHabit = {
        id: Date.now(),
        name: name.trim(),
        completedDates: [],
        streak: 0
    };
    habits.push(newHabit);
    renderHabits();
    sendToBot('add_habit', { habit_name: name.trim() });
    // Сохраняем в localStorage для демо
    localStorage.setItem('habits', JSON.stringify(habits));
}

// Отметка выполнения
function toggleComplete(idx) {
    const habit = habits[idx];
    const today = getToday();
    if (habit.completedDates.includes(today)) {
        // убираем отметку
        habit.completedDates = habit.completedDates.filter(d => d !== today);
    } else {
        habit.completedDates.push(today);
    }
    // Пересчитываем streak (просто для красоты)
    habit.streak = habit.completedDates.length;
    renderHabits();
    sendToBot('toggle_habit', { habit_name: habit.name, date: today });
    localStorage.setItem('habits', JSON.stringify(habits));
}

// Удаление
function deleteHabit(idx) {
    if (confirm('Удалить привычку?')) {
        const deleted = habits.splice(idx, 1);
        renderHabits();
        sendToBot('delete_habit', { habit_name: deleted[0].name });
        localStorage.setItem('habits', JSON.stringify(habits));
    }
}

// Обработчики событий
addHabitBtn.onclick = () => {
    modal.style.display = 'flex';
};
closeModalSpan.onclick = () => {
    modal.style.display = 'none';
    habitNameInput.value = '';
};
window.onclick = (e) => {
    if (e.target === modal) modal.style.display = 'none';
};
saveHabitBtn.onclick = () => {
    const name = habitNameInput.value.trim();
    if (name) {
        addHabit(name);
        modal.style.display = 'none';
        habitNameInput.value = '';
    } else {
        alert('Введите название привычки');
    }
};

// Делегирование событий на динамические кнопки
habitsList.addEventListener('click', (e) => {
    const btn = e.target.closest('.complete-btn');
    if (btn) {
        const idx = parseInt(btn.dataset.idx);
        if (!isNaN(idx)) toggleComplete(idx);
        return;
    }
    const delBtn = e.target.closest('.delete-btn');
    if (delBtn) {
        const idx = parseInt(delBtn.dataset.idx);
        if (!isNaN(idx)) deleteHabit(idx);
    }
});

// Загрузка сохранённых привычек из localStorage (для демо)
const saved = localStorage.getItem('habits');
if (saved) {
    try {
        habits = JSON.parse(saved);
    } catch(e) {}
}
renderHabits();

// Уведомляем Telegram, что приложение готово
tg.ready();
