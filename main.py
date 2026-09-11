import os
import uvicorn
import shutil
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from vector_store import save_embedding
from face_recognizer import extract_single_embedding, generate_live_frames,stop_stream

# Initialize the FastAPI application
app = FastAPI(title="Face Identification System")

# Allow the React frontend to communicate with this backend API securely
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define and create temporary directories for handling file uploads
UPLOAD_DIRECTORY = "./uploads"
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)

# Endpoint 1 : User Registration
@app.post("/register")
async def register_new_user(name: str = Form(...), profile_image: UploadFile = File(...)):
    """
    Receives a name and a photo, extracts the face embedding, 
    and saves it to the SQLite database.
    """
    temporary_image_path = os.path.join(UPLOAD_DIRECTORY, f"reg_{profile_image.filename}")
    
    with open(temporary_image_path, "wb") as buffer:
        shutil.copyfileobj(profile_image.file, buffer)

    try:
        face_embedding = extract_single_embedding(temporary_image_path)
        save_embedding(name=name.strip(), embedding=face_embedding)
        return {"status": "success", "message": f"User '{name}' has been registered successfully."}
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail="No face detected in the uploaded image. Please try a clearer photo.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")
        
    finally:
        if os.path.exists(temporary_image_path):
            os.remove(temporary_image_path)


#  LIVE STREAMING ENDPOINTS 

@app.post("/upload_video")
async def upload_video_for_stream(uploaded_video: UploadFile = File(...)):
    """
    Saves the uploaded video quickly and returns the filename 
    so React can immediately start streaming it.
    """
    filepath = os.path.join(UPLOAD_DIRECTORY, uploaded_video.filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(uploaded_video.file, buffer)
    return {"filename": uploaded_video.filename}


@app.get("/stream_video/{filename}")
async def stream_video_file(filename: str):
    """
    Streams a pre-recorded video back to the browser instantly, frame-by-frame.
    """
    filepath = os.path.join(UPLOAD_DIRECTORY, filename)
    return StreamingResponse(
        generate_live_frames(filepath), 
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@app.get("/stream_camera")
async def stream_live_camera():
    """
    Connects to the laptop's web camera (source 0) and streams it live to the browser.
    """
    # 0 is the default ID for your laptop's built-in webcam
    return StreamingResponse(
        generate_live_frames(0), 
        media_type="multipart/x-mixed-replace; boundary=frame"
    )
    
@app.get("/stop_camera")
async def stop_camera():
    """Instantly turns off the camera hardware."""
    stop_stream()
    return {"status": "Camera turned off."}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)