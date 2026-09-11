import cv2
from ultralytics import YOLO
from deepface import DeepFace
from vector_store import find_matching_face

# Load Yolo model for blazing fast face detection
try:
    yolo_detector = YOLO("yolov8n-face.pt")
except Exception as e:
    print("WARNING: Yolo Model is not Loaded ")
    raise e

streaming_active = False

def stop_stream():
    """A kill-switch to instantly release the webcam hardware."""
    global streaming_active
    streaming_active = False

def extract_single_embedding(image_path: str) -> list[float]:
    """ Generates a Math Embedding for the initial registration photo. """
    
    detection_results = DeepFace.represent(
        img_path=image_path,
        model_name="ArcFace",
        detector_backend="retinaface",
        enforce_detection=True  # Ensure Img Actually has Face
    )
    
    # Extracting Embedding From result
    first_face_data = detection_results[0]
    face_embedding = first_face_data["embedding"]
    return face_embedding

def generate_live_frames(video_source):
    """
    Takes a webcam  or a video file path, processes it frame-by-frame.
    Uses YOLO for fast detection, DeepFace for math Embeddings, and streams instantly.
    """
    global streaming_active
    streaming_active = True
    video_capture = cv2.VideoCapture(video_source)
    
    try:
        while streaming_active:
            is_frame_read_successful, current_frame = video_capture.read()
            if not is_frame_read_successful:
                break 

            frame_height, frame_width = current_frame.shape[:2]

            try:
                # Step 1: Fast face detection using your downloaded YOLO model
                yolo_results = yolo_detector(current_frame, verbose=False)
                detected_boxes = yolo_results[0].boxes  
                
                for box in detected_boxes:
                    # Extract coordinates and convert them to readable integers
                    coordinates = box.xyxy[0].tolist()
                    x_start = max(0, int(coordinates[0]))
                    y_start = max(0, int(coordinates[1]))
                    x_end = min(frame_width, int(coordinates[2]))
                    y_end = min(frame_height, int(coordinates[3]))

                    # Step 2: Crop the face from the frame using the validated coordinates
                    face_crop = current_frame[y_start:y_end, x_start:x_end]

                    # Failsafe if the crop goes out of bounds
                    if face_crop.size == 0:
                        continue

                    # Step 3: Create the mathematical embedding of the cropped face
                    recognition_results = DeepFace.represent(
                        img_path=face_crop,
                        model_name="ArcFace",
                        detector_backend="skip", 
                        enforce_detection=False
                    )
                    
                    current_face_embedding = recognition_results[0]["embedding"]

                    # Step 4: Compare this embedding against our SQLite database
                    registered_name = find_matching_face(current_face_embedding)

                    if registered_name:
                        # Draw a Green box and write the recognized name
                        cv2.rectangle(current_frame, (x_start, y_start), (x_end, y_end), (0, 255, 0), 2)
                        cv2.putText(current_frame, registered_name, (x_start, y_start - 10), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                    else:
                        # Draw a Gray box for unrecognized people
                        cv2.rectangle(current_frame, (x_start, y_start), (x_end, y_end), (150, 150, 150), 1)

            except Exception:
                # Fallback validation: If the face crop is corrupted or unreadable, skip it safely
                pass

            # Step 5: Encode the processed frame as a JPEG and yield it to the browser stream
            ret, buffer = cv2.imencode('.jpg', current_frame)
            if ret:
                frame_bytes = buffer.tobytes()
                # This yields the image byte-by-byte to FastAPI so React can show it live
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    finally:
        # Always safely release the camera when the user closes the page
        video_capture.release()