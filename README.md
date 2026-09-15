# Identity Vision AI — Face Recognition & Identification System

Identity Vision AI is a full-stack real-time face detection, recognition, and identity matching system. It combines a FastAPI backend with a React (Vite) frontend, using YOLOv8 for face detection and ArcFace (DeepFace) for vector embedding generation.

---

## ✨ Features

- **Real-Time Detection:** Fast face bounding box generation using YOLOv8.
- **Accurate Recognition:** High-accuracy facial feature representation using ArcFace.
- **Hardware Management:** Includes a dedicated endpoint to cleanly start and stop camera hardware access.
- **Modern Interface:** Dual-tab React UI supporting live camera scanning and identity registration.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, Custom CSS3 animations, Canvas API.
- **Backend:** Python 3.10+, FastAPI, Uvicorn, OpenCV (`cv2`).
- **AI / Computer Vision:** Ultralytics YOLOv8, DeepFace (ArcFace backend), NumPy.
- **Storage:** SQLite (vector store and relational user metadata).

---

## 📁 Project Structure

```text
face-identification-ai/
│
├── backend/
│   ├── main.py                  # FastAPI application routes & streaming endpoints
│   ├── face_recognizer.py       # YOLOv8 detection & ArcFace embedding extraction logic
│   ├── vector_store.py          # SQLite database schema, persistence & cosine comparison
│   ├── requirements.txt         # Backend Python dependencies
│   ├── yolov8n-face.pt          # Custom YOLO face detection weights
│   └── uploads/                 # Temporary scratch directory for incoming streams
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Dual-mode UI (Live Recognition & User Registration)
│   │   ├── App.css              # Custom styling, responsive cards, and loading animations
│   │   └── main.jsx             # React DOM entry point
│   ├── package.json             # Frontend packages & Vite configurations
│   └── vite.config.js
│
├── .gitignore                   # Ignores heavy models, weights, venv, and DB files
└── README.md                    # Project documentation
```

---

## 🚀 Getting Started

### 1. Backend Setup

Navigate to the backend directory, create and activate a virtual environment:

```bash
cd backend
python -m venv venv
```

Activate the virtual environment:

- **Windows:** `venv\Scripts\activate`
- **Linux / macOS:** `source venv/bin/activate`

Install dependencies and start the FastAPI server:

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

> If `requirements.txt` is not available, install dependencies manually:
> ```bash
> pip install fastapi uvicorn opencv-python ultralytics deepface
> ```

The backend server starts at: `http://127.0.0.1:8000`
You can verify the API documentation at: `http://127.0.0.1:8000/docs`

### 2. Frontend Setup

Open a separate terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at: `http://localhost:5173`

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/register` | Registers a new name and face photo into SQLite. |
| `POST` | `/upload_video` | Uploads a video file to scan. |
| `GET` | `/stream_camera` | Live stream feed with facial identification bounding boxes. |
| `GET` | `/stream_video/{filename}` | Video stream feed for uploaded files. |
| `GET` | `/stop_camera` | Stops the camera capture loop. |

---
