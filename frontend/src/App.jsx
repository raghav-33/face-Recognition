import { useState, useRef, useEffect } from 'react';
import './App.css'; 

export default function App() {
  const [activeInterface, setActiveInterface] = useState('detect'); 
  const [status, setStatus] = useState({ message: '', type: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  // --- CAMERA REFS (For Interface 1) ---
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);

  // --- INTERFACE 1: REGISTER STATE ---
  const [registrationName, setRegistrationName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [regInputMethod, setRegInputMethod] = useState('upload'); 

  // --- INTERFACE 2: DETECT STATE ---
  const [liveStreamUrl, setLiveStreamUrl] = useState(null);
  const [isStreamLoading, setIsStreamLoading] = useState(false);

  // --- UNIVERSAL CAMERA CLEANUP ---
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  // Reset everything when changing tabs
  useEffect(() => {
    stopCamera();
    setLiveStreamUrl(null); 
    setIsStreamLoading(false);
    setStatus({ message: '', type: '' });
  }, [activeInterface]);

  // --- INTERFACE 1 SPECIFIC FUNCTIONS ---
  const startRegistrationCamera = async () => {
    try {
      stopCamera();
      setRegInputMethod('camera');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setCameraStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (error) {
      setStatus({ message: 'Camera access denied.', type: 'error' });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      canvasRef.current.toBlob((blob) => {
        setProfilePhoto(new File([blob], "live_capture.jpg", { type: "image/jpeg" }));
        stopCamera();
        setRegInputMethod('upload'); 
        setStatus({ message: 'Photo captured successfully!', type: 'success' });
      }, 'image/jpeg');
    }
  };

  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    if (!profilePhoto) return setStatus({ message: 'Please provide a photo.', type: 'error' });
    
    setIsProcessing(true);
    setStatus({ message: 'Extracting AI face embedding...', type: 'info' });

    const formData = new FormData();
    formData.append('name', registrationName);
    formData.append('profile_image', profilePhoto);

    try {
      const res = await fetch('http://127.0.0.1:8000/register', { method: 'POST', body: formData });
      const result = await res.json();
      if (res.ok) {
        setStatus({ message: `Success: ${result.message}`, type: 'success' });
        setRegistrationName('');
        setProfilePhoto(null);
      } else {
        setStatus({ message: `Error: ${result.detail}`, type: 'error' });
      }
    } catch (error) {
      setStatus({ message: 'Server connection failed.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // --- INTERFACE 2 SPECIFIC FUNCTIONS ---
  const startLiveBackendCamera = () => {
    setStatus({ message: 'Initializing camera hardware... Please wait.', type: 'info' });
    setIsStreamLoading(true);
    setLiveStreamUrl("http://127.0.0.1:8000/stream_camera");
  };

  const stopLiveBackendCamera = async () => {
    setLiveStreamUrl(null);
    setIsStreamLoading(false);
    setStatus({ message: 'Stream stopped successfully.', type: 'info' });
    
    try {
      // Tell the Python backend to release the hardware
      await fetch('http://127.0.0.1:8000/stop_camera');
    } catch (error) {
      console.error("Failed to stop backend camera.");
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus({ message: 'Uploading video...', type: 'info' });
    const formData = new FormData();
    formData.append('uploaded_video', file);

    try {
      const res = await fetch('http://127.0.0.1:8000/upload_video', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setStatus({ message: 'Streaming AI video results instantly...', type: 'success' });
        setIsStreamLoading(true); // Show spinner while video loads
        setLiveStreamUrl(`http://127.0.0.1:8000/stream_video/${data.filename}`);
      }
    } catch (error) {
      setStatus({ message: 'Failed to upload video.', type: 'error' });
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Identity Vision AI</h1>
      </header>

      <nav className="nav-tabs">
        <button className={activeInterface === 'detect' ? 'active' : ''} onClick={() => setActiveInterface('detect')}>
          📷 Live Recognition
        </button>
        <button className={activeInterface === 'register' ? 'active' : ''} onClick={() => setActiveInterface('register')}>
          ➕ Register New Face
        </button>
      </nav>

      <main className="content-area">
        {status.message && (
          <div className={`status-banner status-${status.type}`}>
            {status.message}
          </div>
        )}

        {/* --- INTERFACE 2: DETECT --- */}
        {activeInterface === 'detect' && (
          <div>
            <h2 className="section-title">Instant Scan & Identify</h2>
            
            <div className="media-card">
              <div className="btn-group">
                <button type="button" className="btn btn-outline" onClick={() => document.getElementById('videoUpload').click()}>
                  📁 Stream Video File
                </button>
                <input id="videoUpload" type="file" accept="video/mp4" style={{display: 'none'}} onChange={handleVideoUpload} />
                
                <button type="button" className="btn btn-primary" style={{width: 'auto'}} onClick={startLiveBackendCamera}>
                  🎥 Start Live Web Camera
                </button>
                
                <button type="button" className="btn btn-danger" onClick={stopLiveBackendCamera}>
                  🛑 Stop Stream
                </button>
              </div>
            </div>

            {liveStreamUrl && (
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                
                {/* Display the Spinner while loading */}
                {isStreamLoading && (
                  <div style={{ padding: '30px' }}>
                    <div className="spinner"></div>
                    <p style={{ color: '#4a5568', fontWeight: '500', marginTop: '10px' }}>
                      Waking up AI and Camera...
                    </p>
                  </div>
                )}

                {/* The Video Stream (Hidden until the first frame loads!) */}
                <div style={{ 
                  border: '4px solid #1a237e', 
                  borderRadius: '12px', 
                  overflow: 'hidden', 
                  display: isStreamLoading ? 'none' : 'inline-block', 
                  backgroundColor: '#000' 
                }}>
                  <img 
                    src={liveStreamUrl} 
                    alt="AI Live Feed" 
                    style={{ width: '100%', maxWidth: '700px', display: 'block' }} 
                    onLoad={() => {
                      setIsStreamLoading(false);
                      setStatus({ message: 'Live stream active!', type: 'success' });
                    }}
                    onError={() => {
                      setIsStreamLoading(false);
                      setStatus({ message: 'Stream ended or failed to connect.', type: 'error' });
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- INTERFACE 1: REGISTER --- */}
        {activeInterface === 'register' && (
          <div>
            <h2 className="section-title">Add to Database</h2>
            <form onSubmit={handleRegistrationSubmit}>
              <div className="form-group">
                <label>Employee / Person Name</label>
                <input type="text" className="text-input" value={registrationName} onChange={(e) => setRegistrationName(e.target.value)} required placeholder="e.g., Jane Smith" disabled={isProcessing} />
              </div>

              <div className="media-card">
                <label style={{ display: 'block', marginBottom: '15px', fontWeight: '600' }}>Reference Photo</label>
                
                <div className="btn-group">
                  <button type="button" className="btn btn-outline" onClick={() => { setRegInputMethod('upload'); stopCamera(); }}>📁 Upload Photo</button>
                  <button type="button" className="btn btn-outline" onClick={startRegistrationCamera}>📷 Take Photo</button>
                </div>

                {regInputMethod === 'upload' && (
                  <input type="file" className="file-input" accept="image/*" onChange={(e) => setProfilePhoto(e.target.files[0])} />
                )}

                {regInputMethod === 'camera' && (
                  <div>
                    <video ref={videoRef} autoPlay playsInline muted className="camera-preview" />
                    <br />
                    <button type="button" className="btn btn-outline" onClick={capturePhoto}>📸 Capture Now</button>
                  </div>
                )}

                {profilePhoto && regInputMethod === 'upload' && (
                  <div style={{ marginTop: '15px' }}>
                    <p style={{ color: '#2f855a', fontWeight: '500', marginBottom: '10px' }}>✅ Image Selected</p>
                    <img src={URL.createObjectURL(profilePhoto)} alt="Preview" style={{ width: '120px', borderRadius: '8px' }} />
                  </div>
                )}
                
                <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
              </div>

              <button type="submit" className="btn btn-primary" disabled={isProcessing || !profilePhoto}>
                {isProcessing ? 'Generating Vector...' : 'Register Person'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}