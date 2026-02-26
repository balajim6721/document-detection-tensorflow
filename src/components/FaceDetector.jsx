import React, { useRef, useEffect, useState } from "react";
import * as blazeface from "@tensorflow-models/blazeface";
import * as tf from "@tensorflow/tfjs";

const STABILITY_THRESHOLD = 20;
const RELATIVE_MOVEMENT_LIMIT = 0.02;
const EMA_ALPHA = 0.3;

const FaceDetector = ({ videoElement, onCapture }) => {
  const canvasRef = useRef(null);
  const lastDetectionRef = useRef(null);
  const smoothedCenterRef = useRef(null);

  const [model, setModel] = useState(null);
  const [status, setStatus] = useState("Loading face model...");
  const [stabilityCounter, setStabilityCounter] = useState(0);
  const [isDetected, setIsDetected] = useState(false);

  /* ----------------- LOAD MODEL ----------------- */
  useEffect(() => {
    const loadModel = async () => {
      try {
        const loadedModel = await blazeface.load();
        setModel(loadedModel);
        setStatus("Align face within frame");
      } catch (err) {
        console.error(err);
        setStatus("Model loading failed");
      }
    };

    loadModel();
  }, []);

  /* ----------------- DETECTION LOOP -----------------*/
  useEffect(() => {
    let animationId;
    let mounted = true;

    const detectFrame = async () => {
      if (!model || !videoElement || !canvasRef.current) {
        animationId = requestAnimationFrame(detectFrame);
        return;
      }

      if (videoElement.readyState !== 4) {
        animationId = requestAnimationFrame(detectFrame);
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const { videoWidth, videoHeight } = videoElement;
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      /* ---------- FACE DETECTION ----------------- */
      const predictions = await model.estimateFaces(videoElement, false);

      let faceDetected = false;
      let bestFace = null;

      if (predictions.length > 0) {
        const face = predictions[0];

        const [x1, y1] = face.topLeft;
        const [x2, y2] = face.bottomRight;

        const width = x2 - x1;
        const height = y2 - y1;

        const area = width * height;
        const frameArea = videoWidth * videoHeight;

        const centerX = x1 + width / 2;
        const centerY = y1 + height / 2;

        const isLargeEnough = area > frameArea * 0.12;

        const isCentered =
          centerX > videoWidth * 0.25 &&
          centerX < videoWidth * 0.75 &&
          centerY > videoHeight * 0.25 &&
          centerY < videoHeight * 0.75;

        if (isLargeEnough && isCentered) {
          bestFace = [x1, y1, width, height];
          faceDetected = true;
        }
      }

      /* ----------- DRAW BOX --------------- */
      if (bestFace) {
        const [x, y, width, height] = bestFace;

        lastDetectionRef.current = bestFace;

        const currentCenter = {
          x: x + width / 2,
          y: y + height / 2,
        };

        if (!smoothedCenterRef.current) {
          smoothedCenterRef.current = currentCenter;
        } else {
          smoothedCenterRef.current = {
            x:
              smoothedCenterRef.current.x * (1 - EMA_ALPHA) +
              currentCenter.x * EMA_ALPHA,
            y:
              smoothedCenterRef.current.y * (1 - EMA_ALPHA) +
              currentCenter.y * EMA_ALPHA,
          };
        }

        ctx.strokeStyle = "rgba(34,197,94,0.9)";
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, width, height);
      }

      if (mounted) setIsDetected(faceDetected);

      /* ---------- STABILITY CHECK --------------- */
      if (faceDetected && lastDetectionRef.current) {
        const moveLimit = videoWidth * RELATIVE_MOVEMENT_LIMIT;

        const [x, y, w, h] = lastDetectionRef.current;

        const dx = smoothedCenterRef.current.x - (x + w / 2);
        const dy = smoothedCenterRef.current.y - (y + h / 2);

        const distance = Math.sqrt(dx * dx + dy * dy);

        setStabilityCounter((prev) => {
          if (distance > moveLimit) {
            return Math.max(0, prev - 2);
          }

          const newCount = prev + 1;

          /* ---------- AUTO CAPTURE ---------- */
          if (newCount >= STABILITY_THRESHOLD) {
            const captureCanvas = document.createElement("canvas");

            const padding = 40;

            const sx = Math.max(0, x - padding);
            const sy = Math.max(0, y - padding);
            const sw = Math.min(videoWidth - sx, w + padding * 2);
            const sh = Math.min(videoHeight - sy, h + padding * 2);

            captureCanvas.width = sw;
            captureCanvas.height = sh;

            captureCanvas
              .getContext("2d", { willReadFrequently: true })
              .drawImage(videoElement, sx, sy, sw, sh, 0, 0, sw, sh);

            onCapture(captureCanvas.toDataURL("image/jpeg", 0.9));

            return 0;
          }

          return newCount;
        });
      } else {
        setStabilityCounter((prev) => Math.max(0, prev - 1));
        smoothedCenterRef.current = null;
      }

      animationId = requestAnimationFrame(detectFrame);
    };

    if (model && videoElement) detectFrame();

    return () => {
      mounted = false;
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [model, videoElement, onCapture]);


  // Update status text based on state
  useEffect(() => {
    if (stabilityCounter > 0) {
      const progress = Math.round(
        (stabilityCounter / STABILITY_THRESHOLD) * 100,
      );
      setStatus(`Hold steady... ${progress}%`);
    } else if (isDetected) {
      setStatus("Hold steady to capture");
    } else if (model) {
      setStatus("Align face within frame");
    }
  }, [stabilityCounter, isDetected, model]);

  return (
    <>
      <canvas ref={canvasRef} className="detection-canvas" />

      <div
        className={`document-overlay ${isDetected ? "active" : ""} ${
          stabilityCounter > 0 ? "scanning" : ""
        }`}
      >
        <div className="scan-line" />
      </div>

      <div className="status-badge">{status}</div>
    </>
  );
};

export default FaceDetector;
