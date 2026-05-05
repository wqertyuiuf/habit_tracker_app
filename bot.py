import telebot
import sqlite3
import threading
import time
import datetime
import pytz

TOKEN = '8428169135:AAHr4HybGwAoHSfKE8zaglv7OpqJ3aTRro4'
WEBAPP_URL = 'https://wqertyuiuf.github.io/habit_tracker_app/?v=5'  # если добавляли ?v=4, укажите здесь

bot = telebot.TeleBot(TOKEN)

# ----- База данных для пользователей -----
def init_db():
    conn = sqlite3.connect('habits.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY)''')
    conn.commit()
    conn.close()

def add_user(user_id):
    conn = sqlite3.connect('habits.db')
    c = conn.cursor()
    c.execute('INSERT OR IGNORE INTO users (user_id) VALUES (?)', (user_id,))
    conn.commit()
    conn.close()

def get_all_users():
    conn = sqlite3.connect('habits.db')
    c = conn.cursor()
    c.execute('SELECT user_id FROM users')
    users = [row[0] for row in c.fetchall()]
    conn.close()
    return users

# ----- Команда /start -----
@bot.message_handler(commands=['start'])
def send_welcome(message):
    user_id = message.chat.id
    add_user(user_id)   # сохраняем пользователя
    markup = telebot.types.ReplyKeyboardMarkup(resize_keyboard=True)
    btn = telebot.types.KeyboardButton(
        text="📊 Открыть трекер привычек",
        web_app=telebot.types.WebAppInfo(url=WEBAPP_URL)
    )
    markup.add(btn)
    bot.send_message(
        user_id,
        "Привет! Я буду напоминать о привычках каждый день в 21:00 МСК.\n"
        "Нажми на кнопку, чтобы открыть трекер:",
        reply_markup=markup
    )

# ----- Функция отправки напоминаний всем пользователям -----
def send_reminders():
    now = datetime.datetime.now(pytz.timezone('Europe/Moscow'))
    # Отправляем только если сейчас 21:00 (в пределах минуты)
    if now.hour == 21 and now.minute == 0:
        users = get_all_users()
        for uid in users:
            try:
                markup = telebot.types.InlineKeyboardMarkup()
                btn = telebot.types.InlineKeyboardButton(
                    text="📝 Открыть трекер",
                    web_app=telebot.types.WebAppInfo(url=WEBAPP_URL)
                )
                markup.add(btn)
                bot.send_message(
                    uid,
                    "🔔 Напоминание: не забудьте отметить свои привычки за сегодня!",
                    reply_markup=markup
                )
            except Exception as e:
                print(f"Не удалось отправить пользователю {uid}: {e}")
    # Запланировать следующий вызов через 60 секунд
    threading.Timer(60, send_reminders).start()

# ----- Запуск планировщика (проверка каждый час) -----
def start_scheduler():
    # Сначала вычислить, когда будет следующее 21:00 по Москве
    tz = pytz.timezone('Europe/Moscow')
    now = datetime.datetime.now(tz)
    target = now.replace(hour=21, minute=0, second=0, microsecond=0)
    if now >= target:
        target += datetime.timedelta(days=1)
    delay = (target - now).total_seconds()
    print(f"Первое напоминание через {delay//3600:.0f} ч {delay%3600//60:.0f} мин")
    threading.Timer(delay, send_reminders).start()

# ----- Обработка данных из Mini App (опционально) -----
@bot.message_handler(content_types=['web_app_data'])
def handle_web_app(message):
    # Здесь можно обрабатывать данные, которые присылает мини-приложение
    bot.reply_to(message, "Спасибо! Данные получены.")

if __name__ == "__main__":
    init_db()
    start_scheduler()
    print("Бот запущен и будет напоминать в 21:00 МСК")
    bot.infinity_polling()