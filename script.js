// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand(); // Растягиваем приложение на весь экран
tg.MainButton.hide(); // Скрываем главную кнопку

let userHabits = [];

// Функции для работы с модальным окном
function showAddHabitModal() {
    document.getElementById('addHabitModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('addHabitModal').style.display = 'none';
    document.getElementById('habitName').value = '';
}

// Добавление новой привычки
function addNewHabit() {
    const habitName = document.getElementById('habitName').value.trim();
    if (!habitName) {
        alert('Введите название привычки');
        return;
    }
    
    // Отправляем данные боту
    tg.sendData(JSON.stringify({
        action: 'add_habit',
        habit_name: habitName
    }));
    
    closeModal();
    loadHabits(); // Перезагружаем список привычек
}

// Отметка выполнения привычки
function markComplete(habitName) {
    const today = new Date().toISOString().split('T')[0];
    tg.sendData(JSON.stringify({
        action: 'update_habit',
        habit_name: habitName,
        date: today,
        completed: 1
    }));
    
    loadHabits(); // Обновляем список
}

// Удаление привычки
function deleteHabit(habitId) {
    if (confirm('Вы уверены?')) {
        tg.sendData(JSON.stringify({
            action: 'delete_habit',
            habit_id: habitId
        }));
        loadHabits();
    }
}

// Получение статистики
function getStatistics() {
    tg.sendData(JSON.stringify({
        action: 'get_stats'
    }));
}

// Загрузка привычек (здесь должна быть логика получения с бэкенда)
// Для демонстрации — заглушка
function loadHabits() {
    alert('Для полной работы потребуется настроить получение данных.');
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadHabits();
});