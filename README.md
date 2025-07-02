## Установка

1. Склонируйте репозиторий:
   ```bash
   git clone https://github.com/Unravelx/bitrix24_visual_tasks.git
   cd <project-folder>
   ```

2. Установите зависимости:
   ```bash
   pip install -r requirements.txt
   ```

3. Создайте файл `.env` в корне проекта со следующими переменными:
   ```
   URL=<base-url-for-tasks-api>
   USERS_URL=<base-url-for-users-api>
   ```

## Использование

### Запуск сервера
```bash
python server.py
```

Сервер запустится на порту, указанном в `server_cfg.json` (по умолчанию 5000).

### API Endpoints

- `GET /api/data` - Получить данные о задачах
  - Параметры:
    - `dateStart` - начальная дата в формате "YYYY.MM.DD"
    - `dateEnd` - конечная дата в формате "YYYY.MM.DD"

- `GET /api/users` - Получить список пользователей

### Конфигурация

Основные настройки проекта находятся в файлах:
- `config.json` - настройки экспорта и формата данных
- `server_cfg.json` - настройки сервера

#### Параметры config.json:
- `export` - формат экспорта:
  - `0` - JSON
  - `1` - Excel
- `availability_status` - формат представления задач:
  - `0` - только названия задач
  - `1` - названия задач с их статусами
  - `3` - полная информация о задачах (ID, название, статус, даты)
- `start_date`, `end_date` - диапазон дат по умолчанию

## Структура проекта

- `main.py` - основной скрипт для обработки данных
- `logic.py` - логика обработки и преобразования данных
- `export.py` - функции для экспорта в Excel
- `server.py` - REST API сервер
- `config.json` - конфигурация приложения
- `server_cfg.json` - конфигурация сервера
- `requirements.txt` - зависимости проекта

## Примеры использования

### Генерация отчета через скрипт
```python
from main import generate

# Генерация отчета за указанный период
report = generate("2025.05.01", "2025.06.01")

# Сохранение в JSON
report.to_json('report.json', orient='records', force_ascii=False, indent=2)

# Или экспорт в Excel
from export import export_to_excel
export_to_excel(report, "report.xlsx")
```

### Получение данных через API
```bash
curl "http://localhost:5000/api/data?dateStart=2025.05.01&dateEnd=2025.06.01"
```

## Требования

- Python 3.8+
- Указанные в requirements.txt пакеты
