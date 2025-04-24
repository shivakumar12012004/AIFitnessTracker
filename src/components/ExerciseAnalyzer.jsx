// src/components/ExerciseAnalyzer.js
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';
import React, { useEffect, useRef, useState } from 'react';
import './ExerciseAnalyzer.css';

const ExerciseAnalyzer = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [model, setModel] = useState(null);
  const [exerciseType, setExerciseType] = useState('pushup'); // 'pushup' or 'squat'
  const [count, setCount] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isDown, setIsDown] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [inputMethod, setInputMethod] = useState('camera'); // 'camera' or 'video'
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [stats, setStats] = useState({
    totalPushups: 0,
    totalSquats: 0,
    lastWorkoutDate: null,
  });

  // Load pose detection model
  useEffect(() => {
    async function setupTensorFlow() {
      try {
        // Explicitly set and initialize the backend
        await tf.setBackend('webgl');
        await tf.ready();
        console.log('TensorFlow.js backend initialized:', tf.getBackend());
        
        // Now load the pose detection model
        const detectorConfig = {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true,
        };
        
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          detectorConfig
        );
        
        setModel(detector);
        setModelLoading(false);
        console.log('Model loaded successfully');
      } catch (error) {
        console.error('Failed to load model:', error);
        setFeedback('Error loading the model. Please try refreshing the page.');
        setModelLoading(false);
      }
    }
    
    setupTensorFlow();
    
    return () => {
      // Cleanup
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // Handle video upload
  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const videoURL = URL.createObjectURL(file);
      setUploadedVideo(videoURL);
      // Reset count when new video is uploaded
      setCount(0);
      setFeedback('Video uploaded. Press Start to analyze.');
    }
  };

  // Start camera
  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setFeedback('Cannot access camera. Please check permissions.');
    }
  };

  // Setup uploaded video
  const setupUploadedVideo = () => {
    if (videoRef.current && uploadedVideo) {
      videoRef.current.src = uploadedVideo;
      videoRef.current.load();
      
      // Play the video after it's loaded
      videoRef.current.onloadeddata = () => {
        videoRef.current.play().then(() => {
          setIsVideoPlaying(true);
        }).catch(err => {
          console.error('Error playing video:', err);
        });
      };
    }
  };

  // Start exercise analysis
  const startAnalysis = () => {
    if (!model) {
      setFeedback('Model not loaded yet. Please wait...');
      return;
    }
    
    setIsAnalyzing(true);
    setCount(0);
    setFeedback('');
    
    if (inputMethod === 'camera') {
      startCamera();
    } else {
      setupUploadedVideo();
    }
    
    detectPose();
  };

  // Stop exercise analysis
  const stopAnalysis = () => {
    setIsAnalyzing(false);
    
    if (inputMethod === 'camera' && videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    } else if (inputMethod === 'video' && videoRef.current) {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    }
    
    // Update stats
    setStats(prev => ({
      ...prev,
      [exerciseType === 'pushup' ? 'totalPushups' : 'totalSquats']: 
        prev[exerciseType === 'pushup' ? 'totalPushups' : 'totalSquats'] + count,
      lastWorkoutDate: new Date().toLocaleDateString()
    }));
  };

  // Handle video ended event
  const handleVideoEnded = () => {
    if (isAnalyzing) {
      stopAnalysis();
      setFeedback('Video analysis complete.');
    }
  };

  // Detect poses from video feed
  const detectPose = async () => {
    if (!model || !videoRef.current || !canvasRef.current || !isAnalyzing) return;
    
    if (videoRef.current.readyState === 4) {
      const video = videoRef.current;
      try {
        const poses = await model.estimatePoses(video);
        
        if (poses.length > 0) {
          const keypoints = poses[0].keypoints;
          drawPose(keypoints);
          
          if (exerciseType === 'pushup') {
            analyzePushup(keypoints);
          } else {
            analyzeSquat(keypoints);
          }
        }
      } catch (error) {
        console.error('Error estimating poses:', error);
      }
    }
    
    if (isAnalyzing) {
      requestAnimationFrame(detectPose);
    }
  };

  // Draw detected pose on canvas
  const drawPose = (keypoints) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const videoWidth = videoRef.current.videoWidth;
    const videoHeight = videoRef.current.videoHeight;
    
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    
    ctx.clearRect(0, 0, videoWidth, videoHeight);
    
    // Draw keypoints
    for (let i = 0; i < keypoints.length; i++) {
      const keypoint = keypoints[i];
      if (keypoint.score > 0.5) {
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
      }
    }
    
    // Draw connections between keypoints (skeleton)
    const connections = [
      [5, 7], [7, 9], // Left arm
      [6, 8], [8, 10], // Right arm
      [5, 6], [5, 11], [6, 12], // Shoulders to hips
      [11, 13], [13, 15], // Left leg
      [12, 14], [14, 16], // Right leg
      [11, 12] // Hips
    ];
    
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;
    
    for (const connection of connections) {
      const [p1, p2] = connection;
      if (keypoints[p1] && keypoints[p2] && 
          keypoints[p1].score > 0.5 && keypoints[p2].score > 0.5) {
        ctx.beginPath();
        ctx.moveTo(keypoints[p1].x, keypoints[p1].y);
        ctx.lineTo(keypoints[p2].x, keypoints[p2].y);
        ctx.stroke();
      }
    }
  };

  // Analyze push-up form
  const analyzePushup = (keypoints) => {
    // Get relevant keypoints
    const shoulder = keypoints.find(kp => kp.name === 'right_shoulder');
    const elbow = keypoints.find(kp => kp.name === 'right_elbow');
    const wrist = keypoints.find(kp => kp.name === 'right_wrist');
    const hip = keypoints.find(kp => kp.name === 'right_hip');
    
    if (shoulder && elbow && wrist && hip && 
        shoulder.score > 0.5 && elbow.score > 0.5 && 
        wrist.score > 0.5 && hip.score > 0.5) {
      
      // Calculate elbow angle
      const elbowAngle = calculateAngle(
        [shoulder.x, shoulder.y],
        [elbow.x, elbow.y],
        [wrist.x, wrist.y]
      );
      
      // Calculate body angle (hip to shoulder)
      const bodyAngle = calculateAngle(
        [hip.x, hip.y],
        [shoulder.x, shoulder.y],
        [shoulder.x + 10, shoulder.y] // Horizontal reference
      );
      
      // Check if user is in "down" position of push-up
      if (elbowAngle < 90 && !isDown) {
        setIsDown(true);
        setFeedback('Good! Now push up.');
      }
      
      // Check if user has completed the push-up
      else if (elbowAngle > 160 && isDown) {
        setIsDown(false);
        setCount(prevCount => prevCount + 1);
        setFeedback('Great! Push-up complete.');
      }
      
      // Form feedback
      if (bodyAngle < 160) {
        setFeedback('Keep your body straight.');
      }
    }
  };

  // Analyze squat form
  const analyzeSquat = (keypoints) => {
    // Get relevant keypoints
    const hip = keypoints.find(kp => kp.name === 'right_hip');
    const knee = keypoints.find(kp => kp.name === 'right_knee');
    const ankle = keypoints.find(kp => kp.name === 'right_ankle');
    
    if (hip && knee && ankle && 
        hip.score > 0.5 && knee.score > 0.5 && ankle.score > 0.5) {
      
      // Calculate knee angle
      const kneeAngle = calculateAngle(
        [hip.x, hip.y],
        [knee.x, knee.y],
        [ankle.x, ankle.y]
      );
      
      // Check if user is in "down" position of squat
      if (kneeAngle < 110 && !isDown) {
        setIsDown(true);
        setFeedback('Good! Now stand up.');
      }
      
      // Check if user has completed the squat
      else if (kneeAngle > 160 && isDown) {
        setIsDown(false);
        setCount(prevCount => prevCount + 1);
        setFeedback('Great! Squat complete.');
      }
      
      // Form feedback
      if (kneeAngle < 90) {
        setFeedback('Warning: Don\'t go too deep on squats.');
      }
    }
  };

  // Helper function to calculate angle between three points
  const calculateAngle = (a, b, c) => {
    const ab = Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2));
    const bc = Math.sqrt(Math.pow(b[0] - c[0], 2) + Math.pow(b[1] - c[1], 2));
    const ac = Math.sqrt(Math.pow(c[0] - a[0], 2) + Math.pow(c[1] - a[1], 2));
    
    return Math.acos((ab * ab + bc * bc - ac * ac) / (2 * ab * bc)) * (180 / Math.PI);
  };

  return (
    <div className="exercise-analyzer">
      <h2>Exercise Form Analyzer</h2>
      
      <div className="controls-section">
        <div className="exercise-selector">
          <h3>Select Exercise</h3>
          <div className="button-group">
            <button 
              className={exerciseType === 'pushup' ? 'active' : ''}
              onClick={() => setExerciseType('pushup')}
            >
              Push-ups
            </button>
            <button 
              className={exerciseType === 'squat' ? 'active' : ''}
              onClick={() => setExerciseType('squat')}
            >
              Squats
            </button>
          </div>
        </div>
        
        <div className="input-selector">
          <h3>Input Method</h3>
          <div className="button-group">
            <button 
              className={inputMethod === 'camera' ? 'active' : ''}
              onClick={() => setInputMethod('camera')}
            >
              Use Camera
            </button>
            <button 
              className={inputMethod === 'video' ? 'active' : ''}
              onClick={() => setInputMethod('video')}
            >
              Upload Video
            </button>
          </div>
          
          {inputMethod === 'video' && (
            <div className="video-upload">
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="file-input"
                id="video-upload"
              />
              <label htmlFor="video-upload" className="file-label">
                {uploadedVideo ? 'Change Video' : 'Select Video File'}
              </label>
            </div>
          )}
        </div>
        
        <div className="action-controls">
          {isAnalyzing ? (
            <button className="stop-btn" onClick={stopAnalysis}>Stop</button>
          ) : (
            <button 
              className="start-btn" 
              onClick={startAnalysis}
              disabled={modelLoading || (inputMethod === 'video' && !uploadedVideo)}
            >
              {modelLoading ? 'Loading Model...' : 'Start'}
            </button>
          )}
        </div>
      </div>
      
      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay={inputMethod === 'camera'}
          playsInline
          muted
          style={{ display: isAnalyzing ? 'block' : 'none' }}
          onEnded={handleVideoEnded}
        />
        <canvas
          ref={canvasRef}
          className="pose-canvas"
          style={{ display: isAnalyzing ? 'block' : 'none' }}
        />
        {!isAnalyzing && (
          <div className="placeholder">
            {modelLoading ? (
              <p>Loading exercise detection model...</p>
            ) : inputMethod === 'video' && !uploadedVideo ? (
              <p>Please upload a video file</p>
            ) : (
              <p>Press Start to begin exercise analysis</p>
            )}
          </div>
        )}
      </div>
      
      <div className="analysis-results">
        <div className="count-display">
          <h3>{exerciseType === 'pushup' ? 'Push-ups' : 'Squats'}: {count}</h3>
        </div>
        <div className="feedback-display">
          <p>{feedback}</p>
        </div>
      </div>
      
      <div className="stats">
        <h3>Your Stats</h3>
        <p>Total Push-ups: {stats.totalPushups}</p>
        <p>Total Squats: {stats.totalSquats}</p>
        {stats.lastWorkoutDate && <p>Last Workout: {stats.lastWorkoutDate}</p>}
      </div>
    </div>
  );
};

export default ExerciseAnalyzer;

