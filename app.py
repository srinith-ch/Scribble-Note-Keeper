import os
import sqlite3
from flask import Flask, request, jsonify, render_template

app = Flask(__name__, template_folder='templates', static_folder='static')

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'notes.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            color TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes', methods=['GET'])
def get_notes():
    try:
        conn = get_db_connection()
        notes = conn.execute('SELECT * FROM notes ORDER BY id DESC').fetchall()
        conn.close()
        
        notes_list = []
        for note in notes:
            notes_list.append({
                'id': note['id'],
                'content': note['content'],
                'color': note['color'],
                'created_at': note['created_at']
            })
        return jsonify(notes_list)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notes', methods=['POST'])
def create_note():
    try:
        data = request.get_json() or {}
        content = data.get('content', '').strip()
        color = data.get('color', '#ffffff').strip()
        
        if not content:
            return jsonify({'error': 'Note content cannot be empty'}), 400
            
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO notes (content, color) VALUES (?, ?)',
            (content, color)
        )
        note_id = cursor.lastrowid
        conn.commit()
        
        # Fetch the newly created note to return
        note = conn.execute('SELECT * FROM notes WHERE id = ?', (note_id,)).fetchone()
        conn.close()
        
        return jsonify({
            'id': note['id'],
            'content': note['content'],
            'color': note['color'],
            'created_at': note['created_at']
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if note exists
        note = conn.execute('SELECT * FROM notes WHERE id = ?', (note_id,)).fetchone()
        if not note:
            conn.close()
            return jsonify({'error': 'Note not found'}), 404
            
        cursor.execute('DELETE FROM notes WHERE id = ?', (note_id,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Note deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    init_db()
    # Run on Port 5001
    app.run(host='127.0.0.1', port=5001, debug=True)
