from flask import Flask, jsonify, request
import json
from typing import Any, Dict
import main
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

def load_settings(filepath: str = 'server_cfg.json') -> Dict[str, Any]:
    for cfg in (filepath, 'config.json'):
        try:
            with open(cfg, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            continue
    raise ValueError("Конфиг не найден или битый")

@app.route('/api/data', methods=['GET'])
def get_data():
    date_start = request.args.get('dateStart', '').replace('-', '.')
    date_end = request.args.get('dateEnd', '').replace('-', '.')
    try:
        df = main.generate(date_start, date_end)
        return jsonify(df.to_dict(orient='records'))
    except Exception as e:
        app.logger.error("get_data error", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/users', methods=['GET'])
def get_users():
    try:
        users = main.generate_users()
        return jsonify(users)
    except Exception as e:
        app.logger.error("get_users error", exc_info=True)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    settings = load_settings()
    app.run(
        host=settings.get("host", "127.0.0.1"),
        port=settings.get("port", 5000),
        debug=settings.get("debug", False)
    )
