import sqlite3
import json
import numpy as np

DB_FILE = "faces_database.db"

def init_db():
    """Sets up the SQLite database to store names and vector embeddings."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS registered_faces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            embedding TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

# Initialize when the file is loaded
init_db()

def save_embedding(name: str, embedding: list[float]):
    """Converts the face vector to JSON and saves it."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO registered_faces (name, embedding)
        VALUES (?, ?)
        ON CONFLICT(name) DO UPDATE SET embedding = excluded.embedding
    """, (name, json.dumps(embedding)))
    
    conn.commit()
    conn.close()

def find_matching_face(embedding: list[float], threshold: float = 0.55) -> str | None:
    """
    Pulls all vectors into memory and uses NumPy to find the closest Cosine Distance.
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT name, embedding FROM registered_faces")
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return None

    query_vec = np.array(embedding, dtype=np.float32)
    query_norm = np.linalg.norm(query_vec)
    
    if query_norm == 0:
        return None

    best_match = None
    min_distance = float("inf")

    for name, emb_json in rows:
        stored_vec = np.array(json.loads(emb_json), dtype=np.float32)
        stored_norm = np.linalg.norm(stored_vec)
        
        if stored_norm == 0:
            continue

        cosine_sim = np.dot(query_vec, stored_vec) / (query_norm * stored_norm)
        cosine_dist = 1.0 - float(cosine_sim)

        if cosine_dist < min_distance:
            min_distance = cosine_dist
            best_match = name

    if min_distance <= threshold:
        return best_match

    return None