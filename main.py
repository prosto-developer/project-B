import json
import os
from typing import Any, Dict
import urllib.error
import urllib.request

import pandas as pd
import requests

from dotenv import load_dotenv

import logic
import export


load_dotenv()

BASE_URL = os.getenv('URL')
URL = (
    f"{BASE_URL}/tasks.task.list?"
    "&select[]=ID&select[]=TITLE&select[]=STATUS&select[]=DEADLINE"
    "&select[]=START_DATE_PLAN&select[]=CREATED_DATE&select[]=RESPONSIBLE_ID"
)

BASE_USERS_URL = os.getenv('USERS_URL')
USERS_URL = (
    f"{BASE_USERS_URL}/user.get.json"
)


def load_data(url: str) -> Dict[str, Any]:
    """Загружает данные по URL."""
    try:
        # Отключаем проверку SSL (аналог первого способа)
        response = requests.get(url, verify=False)
        return response.json()
    except requests.RequestException as e:
        raise ConnectionError(f"Ошибка при загрузке данных: {e}")


def load_settings(filepath: str = 'config.json') -> Dict[str, Any]:
    """Загружает настройки из JSON файла."""
    try:
        with open(filepath, 'r', encoding='utf-8') as file:
            return json.load(file)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        raise ValueError(f"Ошибка загрузки конфига: {e}")

# Загрузка данных по URL

def generate(date_start=None, date_end=None) -> pd.DataFrame:
    settings = load_settings()
    if date_start is None and date_end is None:
        date_start = settings["start_date"]
        date_end = settings["end_date"]
    data = load_data(URL + f"&filter[>DEADLINE]={date_start}")

    output_data = logic.generate_dates(date_start, date_end)

    if settings["availability_status"] == 0:
        output_data = logic.tasks_to_df_no_status(
            output_data, data['result']['tasks']
        )
    elif settings["availability_status"] == 3:
        output_data = logic.add_tasks_with_id_to_df(
            output_data, data['result']['tasks']
        )
    elif settings["availability_status"] == 1:
        output_data = logic.tasks_to_df_with_status(
            output_data, data['result']['tasks']
        )
    else:
        raise ValueError(
                "availability_status должен быть 0 или 1, получено: "
                f"{settings['availability_status']}"
            )
    return output_data

def generate_users():
    data = load_data(USERS_URL)
    return logic.extract_user_fields(data)

def main():
    data = load_data(URL)
    settings = load_settings()

    output_data = logic.generate_dates(settings["start_date"], settings["end_date"])

    if settings["availability_status"] == 0:
        output_data = logic.tasks_to_df_no_status(
            output_data, data['result']['tasks']
        )
    elif settings["availability_status"] == 1:
        output_data = logic.tasks_to_df_with_status(
            output_data, data['result']['tasks']
        )
    elif settings["availability_status"] == 3:
        output_data = logic.add_tasks_with_id_to_df(
            output_data, data['result']['tasks']
        )
    else:
        raise ValueError(
                "availability_status должен быть 0 или 1, получено: "
                f"{settings['availability_status']}"
            )

    if settings["export"] == 0:
        output_data.to_json('tasks.json',
                            orient='records',  # Формат записи
                            force_ascii=False,  # Поддержка кириллицы
                            indent=2)
        print("Файл успешно сохранен: tasks.json")
    elif settings["export"] == 1:
        export.export_to_excel(output_data, "tasks_rep.xlsx")
    else:
        raise ValueError(
            "export должен быть 0 или 1, получено: "
            f"{settings['export']}"
        )


if __name__ == "__main__":
    main()

