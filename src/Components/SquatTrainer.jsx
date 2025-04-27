import React, { useEffect, useRef, useState } from 'react';
import ControlPanel from './ControlPanel';
import VideoCanvas from './VideoCanvas';
import StatsDisplay from './StatsDisplay';
import FormGuidelines from './FormGuidelines';
import PoseDetectionService from '../utils/PoseDetectionService';
import SquatAnalyzer from '../utils/SquatAnalyzer';

const SquatTrainer = () => {
  // State variables
  const [loading, setLoading] = useState(true);
  const [modelReady, setModelReady] = useState(false);
  const [squatCount, setSquatCount] = useState(0);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [squatQuality, setSquatQuality] = useState('');
  const [cameraActive, setCameraActive] = useState(false);

  // Refs for services and elements
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseServiceRef = useRef(null);
  const squatAnalyzerRef = useRef(null);
  const cameraRef = useRef(null);
  const videoPlayingRef = useRef(false);
  const canvasCtxRef = useRef(null);

  // First effect: Initialize services
  useEffect(() => {
    poseServiceRef.current = new PoseDetectionService();
    squatAnalyzerRef.current = new SquatAnalyzer();
    
    const initServices = async () => {
      const scriptsLoaded = await poseServiceRef.current.loadScripts();
      setScriptsLoaded(scriptsLoaded);
    };
    
    initServices();
    
    return () => {
      if (cameraRef.current && videoPlayingRef.current) {
        try {
          cameraRef.current.stop();
        } catch (e) {
          console.error('Error stopping camera:', e);
        }
      }
    };
  }, []);

  // Set up canvas and initialize pose model
  useEffect(() => {
    if (!scriptsLoaded) return;
    
    if (canvasRef.current) {
      canvasCtxRef.current = canvasRef.current.getContext('2d');
    }
    
    const initializePoseModel = async () => {
      const success = await poseServiceRef.current.initializePoseModel(onResults);
      if (success) {
        setModelReady(true);
        setLoading(false);
      } else {
        setLoading(false);
      }
    };
    
    initializePoseModel();
  }, [scriptsLoaded]);

  // Process pose results and update UI
  const onResults = (results) => {
    if (!canvasCtxRef.current || !canvasRef.current) return;

    const canvasCtx = canvasCtxRef.current;
    const canvasElement = canvasRef.current;

    // Clear the canvas and draw the video frame
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.poseLandmarks) {
      const { drawConnectors, drawLandmarks, POSE_CONNECTIONS } = window;

      // Draw pose landmarks and connections
      drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#4361ee', lineWidth: 4 });
      drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#f72585', lineWidth: 2 });

      // Process pose with analyzer
      const analyzerResults = squatAnalyzerRef.current.processPose(results.poseLandmarks);
      
      // Update states
      setCurrentAngle(analyzerResults.angle);
      setSquatCount(analyzerResults.count);
      setSquatQuality(analyzerResults.quality);

      // Display the angle and squat count on the canvas
      canvasCtx.font = "18px Poppins";
      canvasCtx.fillStyle = "#3a0ca3";
      canvasCtx.fillText(`Knee Angle: ${analyzerResults.angle}°`, 10, 30);

      canvasCtx.fillStyle = "#4361ee";
      canvasCtx.font = "bold 30px Poppins";
      canvasCtx.fillText(`Squats: ${analyzerResults.count}`, 10, 70);

      // Display form feedback
      const formFeedback = squatAnalyzerRef.current.getFormFeedback();
      if (formFeedback) {
        canvasCtx.font = "16px Poppins";
        canvasCtx.fillStyle = formFeedback.color;
        canvasCtx.fillText(formFeedback.message, 10, 100);
      }
    }

    canvasCtx.restore();
  };

  // Start camera button handler
  const handleStartCamera = async () => {
    if (!modelReady) {
      alert("Pose model is still loading...");
      return;
    }

    // Reset analyzer
    squatAnalyzerRef.current.reset();
    setSquatCount(0);
    setSquatQuality('');

    try {
      // Create frame processor function
      const onFrameCallback = async () => {
        if (videoRef.current) {
          await poseServiceRef.current.processFrame(videoRef.current);
        }
      };
      
      // Create and start camera
      cameraRef.current = poseServiceRef.current.createCamera(videoRef.current, onFrameCallback);
      
      if (!cameraRef.current) {
        alert("Failed to initialize camera");
        return;
      }
      
      // Ensure video element always stays hidden
      videoRef.current.style.display = 'none';
      cameraRef.current.start();
      videoPlayingRef.current = true;
      setCameraActive(true);
    } catch (error) {
      console.error('Error starting camera:', error);
      alert("Failed to start camera. See console for details.");
    }
  };

  // Stop camera button handler
  const handleStopCamera = () => {
    if (cameraRef.current && videoPlayingRef.current) {
      try {
        cameraRef.current.stop();
        videoPlayingRef.current = false;
        setCameraActive(false);
        
        if (canvasCtxRef.current && canvasRef.current) {
          canvasCtxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      } catch (error) {
        console.error('Error stopping camera:', error);
      }
    }
  };

  // Video upload handler
  const handleVideoUpload = async (event) => {
    if (!modelReady) {
      alert("Pose model is still loading...");
      return;
    }

    const file = event.target.files[0];
    if (!file) return;

    try {
      const fileURL = URL.createObjectURL(file);
      const videoElement = videoRef.current;
      
      if (!videoElement) return;
      
      if (cameraRef.current && videoPlayingRef.current) {
        cameraRef.current.stop();
        videoPlayingRef.current = false;
        setCameraActive(false);
      }
      
      // Reset analyzer
      squatAnalyzerRef.current.reset();
      setSquatCount(0);
      setSquatQuality('');
      
      videoElement.src = fileURL;
      // Ensure video element always stays hidden
      videoElement.style.display = 'none';
      videoElement.load();
      
      videoElement.onloadeddata = () => {
        videoElement.play();
        
        const processVideoFrame = () => {
          if (!videoElement || videoElement.paused || videoElement.ended) return;
          poseServiceRef.current.processFrame(videoElement);
          requestAnimationFrame(processVideoFrame);
        };
        
        requestAnimationFrame(processVideoFrame);
      };
    } catch (error) {
      console.error('Error processing video upload:', error);
      alert("Failed to process video. See console for details.");
    }
  };

  // Reset count button handler
  const handleResetCount = () => {
    // Reset analyzer
    squatAnalyzerRef.current.reset();
    setSquatCount(0);
    setCurrentAngle(0);
    setSquatQuality('');

    // Clear the canvas
    if (canvasCtxRef.current && canvasRef.current) {
      canvasCtxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    console.log("Squat count reset to 0!");
  };

  // Quality message getter
  const getQualityMessage = () => {
    if (!squatQuality) return '';
    return squatAnalyzerRef.current ? squatAnalyzerRef.current.getQualityMessage() : '';
  };

  return (
    <div className="main-content">
      {loading && (
        <div className="loader">
          Loading MediaPipe Pose...
        </div>
      )}

      <ControlPanel 
        modelReady={modelReady}
        cameraActive={cameraActive}
        onStartCamera={handleStartCamera}
        onStopCamera={handleStopCamera}
        onVideoUpload={handleVideoUpload}
        onResetCount={handleResetCount}
      />

      <div className="flex-container">
        <div className="flex-item">
          <VideoCanvas 
            videoRef={videoRef}
            canvasRef={canvasRef}
          />
          
          <StatsDisplay 
            currentAngle={currentAngle}
            count={squatCount}
            quality={squatQuality}
            qualityMessage={getQualityMessage()}
            exerciseType="squat"
          />
        </div>

        <div className="flex-item">
          <FormGuidelines exerciseType="squat" />
        </div>
      </div>
    </div>
  );
};

export default SquatTrainer;