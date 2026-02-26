import React, { useRef, useEffect } from "react";

const CameraFeed = ({ onVideoReady, facingMode = "user", deviceId = null }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    let stream = null;

    const setupCamera = async () => {
      try {
        // Stop any existing stream first
        if (videoRef.current?.srcObject) {
          videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
          videoRef.current.srcObject = null;
        }

        // Build constraints — deviceId takes priority over facingMode
        // because on some Android/iOS devices facingMode alone doesn't switch correctly
        const videoConstraints = deviceId
          ? {
              deviceId: { exact: deviceId },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            }
          : {
              facingMode: { exact: facingMode },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            };

        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            onVideoReady(videoRef.current);
          };
        }
      } catch (err) {
        // Fallback: if exact facingMode fails (common on iOS), try without exact
        if (!deviceId) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              },
              audio: false,
            });
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.onloadedmetadata = () =>
                onVideoReady(videoRef.current);
            }
          } catch (fallbackErr) {
            console.error("Camera access failed:", fallbackErr);
          }
        } else {
          console.error("Camera access failed:", err);
        }
      }
    };

    setupCamera();

    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [facingMode, deviceId, onVideoReady]); // Re-runs when camera switches

  return (
    <div className="camera-container">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="webcam-video"
      />
    </div>
  );
};

export default CameraFeed;
