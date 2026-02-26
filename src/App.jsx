import { useState, useCallback } from "react";
import CameraFeed from "./components/CameraFeed";
import DocumentDetector from "./components/DocumentDetector";
import { performOCR } from "./services/ocr";
import "./App.css";
import FaceDetector from "./components/FaceDetector";

function App() {
  const [videoElement, setVideoElement] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrText, setOcrText] = useState("Scanning...");
  const [debugImage, setDebugImage] = useState(null);
  const [detectionType, setDetectionType] = useState("face"); // face or document

  // Camera state
  const [facingMode, setFacingMode] = useState("user");
  const [devices, setDevices] = useState([]);
  const [currentDeviceId, setCurrentDeviceId] = useState(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  /* ---------- ENUMERATE CAMERAS AFTER PERMISSION ---------- */
  const enumerateCameras = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter((d) => d.kind === "videoinput");
      setDevices(videoDevices);
      setHasMultipleCameras(videoDevices.length > 1);
    } catch (err) {
      console.error("Could not enumerate devices:", err);
    }
  }, []);

  const handleVideoReady = useCallback(
    (video) => {
      setVideoElement(video);
      enumerateCameras(); // enumerate after permission is granted
    },
    [enumerateCameras],
  );

  /* ---------- SWITCH CAMERA ---------- */
  const switchCamera = useCallback(() => {
    // if (devices.length > 1 && currentDeviceId) {
    //   // Cycle by deviceId — more reliable on Android (multiple back cameras)
    //   const currentIndex = devices.findIndex(
    //     (d) => d.deviceId === currentDeviceId,
    //   );
    //   const nextIndex = (currentIndex + 1) % devices.length;
    //   setCurrentDeviceId(devices[nextIndex].deviceId);
    // } else {
      // Toggle facingMode — reliable on iOS
      setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
      setCurrentDeviceId(null);
    // }
  }, [devices, currentDeviceId]);

  const handleCapture = async (imageData) => {
    setCapturedImage(imageData);
    setIsProcessing(true);
    setOcrText("");
    setDebugImage(null);

    console.log("Image captured! Starting OCR...");
    const { text, debugImage } = await performOCR(imageData);
    setOcrText(text);
    if (debugImage) {
      setDebugImage(debugImage);
    }
    setIsProcessing(false);
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setOcrText("");
    setDebugImage(null);
    setIsProcessing(false);
  };

  return (
    <div className="app-container">
      <header>
        <h1>Document Detector Tensorflow</h1>
        <p>{capturedImage ? "Review Capture" : "Align your document within the frame"}</p>
      </header>

      <main>
        {!capturedImage ? (
          <>
            <div>
              <button
                type="button"
                style={{ margin: "4px", backgroundColor: detectionType === "face" && "#10b981" }}
                onClick={() => setDetectionType("face")}
              >
                Face Detection
              </button>
              <button
                type="button"
                style={{ margin: "4px", backgroundColor: detectionType === "document" && "#10b981" }}
                onClick={() => setDetectionType("document")}
              >
                Document Detection
              </button>
            </div>

            <div className="camera-wrapper">
              <CameraFeed
                onVideoReady={handleVideoReady}
                facingMode={facingMode}
                deviceId={currentDeviceId}
              />

              {videoElement && detectionType === "document" && (
                <DocumentDetector
                  videoElement={videoElement}
                  onCapture={handleCapture}
                />
              )}

              {videoElement && detectionType === "face" && (
                <FaceDetector
                  videoElement={videoElement}
                  onCapture={handleCapture}
                />
              )}
            </div>

            {/* Switch Camera Button — only shown if multiple cameras found */}
            {hasMultipleCameras && (
              <button
                type="button"
                onClick={switchCamera}
                style={{margin:"4px"}}
              >
                Switch camera
              </button>
            )}
          </>
        ) : (
          <div className="preview-container">
            <div className="images-row">
              <div className="image-col">
                <h3>Original</h3>
                <img src={capturedImage} alt="Captured Document" className="captured-image" />
              </div>
              {debugImage && (
                <div className="image-col">
                  <h3>Preprocessed (OCR Input)</h3>
                  <img src={debugImage} alt="Debug Preprocessed" className="captured-image debug-image" />
                </div>
              )}
            </div>

            <div className="ocr-results">
              <h2>Extracted Text</h2>
              {isProcessing ? (
                <p className="processing-text">
                  Processing OCR... (this may take a moment)
                </p>
              ) : (
                <div className="text-output">
                  {ocrText ? <pre>{ocrText}</pre> : <p>No text found.</p>}
                </div>
              )}
            </div>

            <div className="actions">
                <button className="action-button" onClick={resetCapture}>Retake</button>
              <a
                href={capturedImage}
                download="captured_document.jpg"
                className="action-button download-button"
                  style={{ marginLeft: '10px', textDecoration: 'none', display: 'inline-block' }}
              >
                Download
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
