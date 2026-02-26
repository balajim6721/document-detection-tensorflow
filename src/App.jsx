import { useState } from 'react';
import CameraFeed from './components/CameraFeed';
import DocumentDetector from './components/DocumentDetector';
import { performOCR } from './services/ocr';
import './App.css';
import FaceDetector from './components/FaceDetector';

function App() {
  const [videoElement, setVideoElement] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrText, setOcrText] = useState("Scanning...");
  const [debugImage, setDebugImage] = useState(null);
  const [detectionType, setDetectionType] = useState("face"); // face or document

  const handleVideoReady = (video) => {
    setVideoElement(video);
  };

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
              <CameraFeed onVideoReady={handleVideoReady} />
              
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
