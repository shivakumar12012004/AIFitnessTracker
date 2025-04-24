// hooks/usePoseDetection.js
import { useState, useRef, useEffect, useCallback } from 'react';
import { PHASE, ANGLE_THRESHOLDS, HISTORY_LENGTH, KEY_LANDMARK_INDICES, VISIBILITY_THRESHOLD } from '../constants/poseConstants';
import { 
  getMidpoint, 
  calculateAngle, 
  areKeyLandmarksVisible, 
  checkTorsoAlignment, 
  checkShouldersLevel 
} from '../utils/poseUtils';

const usePoseDetection = (setCameraActive, setStatusMessage) => {
  // Refs for DOM elements
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  
  // State for tracking
  const [isTracking, setIsTracking] = useState(false);
  const [situpCount, setSitupCount] = useState(0);
  const [formScore, setFormScore] = useState(0);
  const [formFeedback, setFormFeedback] = useState('Position yourself so your full upper body is visible');
  const [currentPhase, setCurrentPhase] = useState(PHASE.UNKNOWN);
  
  // Refs for tracking (to avoid recreation in effects)
  const cameraRef = useRef(null);
  const poseRef = useRef(null);
  const lastPoseTimeRef = useRef(0);
  const previousAnglesRef = useRef([]);
  const formScoreHistoryRef = useRef([]);
  const goodFormCountRef = useRef(0);
  const totalChecksRef = useRef(0);

  // Function to adjust canvas size
  const adjustCanvasSize = useCallback(() => {
    const webcam = webcamRef.current;
    const canvas = canvasRef.current;
    
    if (webcam && webcam.videoWidth && canvas) {
      canvas.width = webcam.videoWidth;
      canvas.height = webcam.videoHeight;
    }
  }, []);

  // Function to draw pose landmarks on canvas
  const drawPoseLandmarks = useCallback((results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!results || !results.poseLandmarks) {
      setCurrentPhase('No pose detected');
      return;
    }
    
    const { drawConnectors, drawLandmarks, POSE_CONNECTIONS } = window;
    
    // Draw the pose landmarks
    drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, 
                  { color: '#00FF00', lineWidth: 4 });
    
    drawLandmarks(ctx, results.poseLandmarks, 
                 { color: '#FF0000', lineWidth: 2, radius: 6 });
    
    // Highlight key points for sit-up detection
    const keyPoints = [
      // Shoulders
      results.poseLandmarks[11], 
      results.poseLandmarks[12],
      // Hips
      results.poseLandmarks[23], 
      results.poseLandmarks[24],
      // Knees
      results.poseLandmarks[25], 
      results.poseLandmarks[26]
    ];
    
    // Draw highlighted key points
    drawLandmarks(ctx, keyPoints, 
                 { color: '#FFFF00', lineWidth: 2, radius: 10 });
    
    // Draw sit-up angle if tracking
    if (isTracking) {
      drawSitUpAngle(ctx, results.poseLandmarks, canvas);
    }
  }, [isTracking]);

  // Function to draw the sit-up angle on the canvas
  const drawSitUpAngle = useCallback((ctx, landmarks, canvas) => {
    // Calculate midpoints for shoulder, hip, and knee
    const shoulderMid = getMidpoint(landmarks[11], landmarks[12]);
    const hipMid = getMidpoint(landmarks[23], landmarks[24]);
    const kneeMid = getMidpoint(landmarks[25], landmarks[26]);
    
    // Draw connecting line from shoulder to hip to knee
    ctx.beginPath();
    ctx.moveTo(shoulderMid.x * canvas.width, shoulderMid.y * canvas.height);
    ctx.lineTo(hipMid.x * canvas.width, hipMid.y * canvas.height);
    ctx.lineTo(kneeMid.x * canvas.width, kneeMid.y * canvas.height);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#FF9000';
    ctx.stroke();
    
    // Calculate and display the angle
    const angle = calculateAngle(shoulderMid, hipMid, kneeMid);
    const angleTxt = Math.round(angle) + '°';
    
    // Display the angle near the hip point
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeText(angleTxt, hipMid.x * canvas.width + 20, hipMid.y * canvas.height);
    ctx.fillText(angleTxt, hipMid.x * canvas.width + 20, hipMid.y * canvas.height);
  }, []);

  // Function to detect sit-up movement
  const detectSitUp = useCallback((landmarks) => {
    // Check if key landmarks are visible
    if (!areKeyLandmarksVisible(landmarks, KEY_LANDMARK_INDICES, VISIBILITY_THRESHOLD)) {
      setFormFeedback('Cannot detect full body. Please adjust position.');
      setCurrentPhase('Partial detection');
      return;
    }
    
    // Calculate the torso angle (shoulder-hip-knee)
    const shoulderMid = getMidpoint(landmarks[11], landmarks[12]);
    const hipMid = getMidpoint(landmarks[23], landmarks[24]);
    const kneeMid = getMidpoint(landmarks[25], landmarks[26]);
    
    // Calculate the current angle
    const currentAngle = calculateAngle(shoulderMid, hipMid, kneeMid);
    
    // Add to history for smoothing
    previousAnglesRef.current.push(currentAngle);
    if (previousAnglesRef.current.length > HISTORY_LENGTH) {
      previousAnglesRef.current.shift();
    }
    
    // Calculate smoothed angle
    const smoothedAngle = previousAnglesRef.current.reduce((sum, angle) => sum + angle, 0) / previousAnglesRef.current.length;
    
    // Determine phase based on angle
    determinePhase(smoothedAngle);
    
    // Check form during the movement
    if (currentPhase === PHASE.TRANSITION_DOWN || currentPhase === PHASE.TRANSITION_UP) {
      checkForm(landmarks);
    }
  }, [currentPhase]);

  // Determine the current phase of the sit-up
  const determinePhase = useCallback((angle) => {
    setCurrentPhase(prevPhase => {
      let newPhase = prevPhase;
      
      // Use hysteresis to prevent oscillation between states
      switch (prevPhase) {
        case PHASE.UNKNOWN:
          // Initial state determination
          if (angle >= ANGLE_THRESHOLDS.UP_MIN) {
            newPhase = PHASE.UP;
            setFormFeedback('Starting position good. Begin your sit-up.');
          } else if (angle <= ANGLE_THRESHOLDS.DOWN_MAX) {
            newPhase = PHASE.DOWN;
            setFormFeedback('Starting in down position. Sit up to begin.');
          } else {
            setFormFeedback('Move to either up or down position to start.');
          }
          break;
          
        case PHASE.UP:
          // From up position, user starts going down
          if (angle < ANGLE_THRESHOLDS.UP_MIN - ANGLE_THRESHOLDS.THRESHOLD_BUFFER) {
            newPhase = PHASE.TRANSITION_DOWN;
            setFormFeedback('Going down - keep your form!');
          }
          break;
          
        case PHASE.TRANSITION_DOWN:
          // While going down, check if reached bottom
          if (angle <= ANGLE_THRESHOLDS.DOWN_MAX) {
            newPhase = PHASE.DOWN;
            setFormFeedback('Good depth! Now come back up smoothly.');
          } else if (angle >= ANGLE_THRESHOLDS.UP_MIN) {
            // Went back up without completing rep
            newPhase = PHASE.UP;
            setFormFeedback('Incomplete rep - try to go lower.');
          }
          break;
          
        case PHASE.DOWN:
          // From down position, user starts coming up
          if (angle > ANGLE_THRESHOLDS.DOWN_MAX + ANGLE_THRESHOLDS.THRESHOLD_BUFFER) {
            newPhase = PHASE.TRANSITION_UP;
            setFormFeedback('Coming up - engage your core!');
          }
          break;
          
        case PHASE.TRANSITION_UP:
          // While coming up, check if reached top
          if (angle >= ANGLE_THRESHOLDS.UP_MIN) {
            newPhase = PHASE.UP;
            // Complete the rep when returning to the up position
            setSitupCount(prevCount => prevCount + 1);
            
            // Calculate and update form score
            updateFormScore();
          } else if (angle <= ANGLE_THRESHOLDS.DOWN_MAX) {
            // Went back down without completing rep
            newPhase = PHASE.DOWN;
            setFormFeedback('Try again - push all the way up.');
          }
          break;
      }
      
      // Debug log when phase changes
      if (prevPhase !== newPhase) {
        console.log(`Phase changed: ${prevPhase} -> ${newPhase}, Angle: ${angle.toFixed(1)}°`);
      }
      
      return newPhase;
    });
  }, []);

  // Check form during the movement
  const checkForm = useCallback((landmarks) => {
    totalChecksRef.current++;
    
    // Check if torso is aligned properly during the movement
    const isAligned = checkTorsoAlignment(landmarks);
    if (isAligned) {
      goodFormCountRef.current++;
    }
    
    // Check if shoulders are level (not twisted)
    const shouldersLevel = checkShouldersLevel(landmarks);
    
    // Provide specific feedback based on form issues
    if (!isAligned && !shouldersLevel) {
      setFormFeedback('Keep your back straighter and avoid twisting');
    } else if (!isAligned) {
      setFormFeedback('Try to keep your back straighter');
    } else if (!shouldersLevel) {
      setFormFeedback('Avoid twisting - keep shoulders level');
    } else {
      setFormFeedback('Good form! Keep your core engaged');
    }
  }, []);

  // Update form score after completing a rep
  const updateFormScore = useCallback(() => {
    if (totalChecksRef.current > 0) {
      // Calculate form score as percentage
      const newFormScore = Math.round((goodFormCountRef.current / totalChecksRef.current) * 100);
      setFormScore(newFormScore);
      formScoreHistoryRef.current.push(newFormScore);
      
      // Provide feedback based on form score
      if (newFormScore >= 90) {
        setFormFeedback('Excellent form! Perfect sit-up.');
      } else if (newFormScore >= 75) {
        setFormFeedback('Good form! Try to maintain consistent motion.');
      } else if (newFormScore >= 50) {
        setFormFeedback('Decent sit-up. Focus on keeping your back straight.');
      } else {
        setFormFeedback('Try to maintain better form throughout the movement.');
      }
      
      // Reset form tracking for next rep
      goodFormCountRef.current = 0;
      totalChecksRef.current = 0;
    }
  }, []);

  // Handler for pose detection results
  const onPoseResults = useCallback((results) => {
    drawPoseLandmarks(results);
    
    // Count sit-ups if tracking is active
    if (isTracking && results.poseLandmarks) {
      detectSitUp(results.poseLandmarks);
    }
  }, [drawPoseLandmarks, detectSitUp, isTracking]);

  // Function to start the camera
  const startCamera = useCallback(async () => {
    try {
      setStatusMessage({
        type: 'ready',
        message: 'Starting camera...'
      });
      
      // Try to get the camera stream
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream;
        
        // Wait for the video to be ready
        await new Promise((resolve) => {
          webcamRef.current.onloadedmetadata = () => {
            resolve();
          };
        });
        
        // Adjust canvas size based on actual video dimensions
        adjustCanvasSize();
        
        // Initialize pose detection if not already done
        if (!poseRef.current) {
          const { Pose } = window;
          
          poseRef.current = new Pose({
            locateFile: (file) => {
              return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1635988162/${file}`;
            }
          });

          poseRef.current.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            minDetectionConfidence: 0.6,
            minTrackingConfidence: 0.5,
            enableSegmentation: false
          });

          poseRef.current.onResults(onPoseResults);
        }
        
        // Create camera object that will help us get the pose
        const { Camera } = window;
        
        cameraRef.current = new Camera(webcamRef.current, {
          onFrame: async () => {
            // Process frames at a reasonable rate to avoid performance issues
            if (Date.now() - lastPoseTimeRef.current > 30) { // ~30fps
              await poseRef.current.send({ image: webcamRef.current });
              lastPoseTimeRef.current = Date.now();
            }
          },
          width: webcamRef.current.videoWidth,
          height: webcamRef.current.videoHeight
        });
        
        cameraRef.current.start();
        
        // Update state
        setCameraActive(true);
        setStatusMessage({
          type: 'active',
          message: 'Camera started! Click "Start Tracking" to count sit-ups'
        });
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      setStatusMessage({
        type: 'error',
        message: 'Error accessing camera. Please check permissions and try again.'
      });
    }
  }, [adjustCanvasSize, onPoseResults, setCameraActive]);

  // Function to stop the camera
  const stopCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    
    if (webcamRef.current && webcamRef.current.srcObject) {
      webcamRef.current.srcObject.getTracks().forEach(track => track.stop());
      webcamRef.current.srcObject = null;
    }
    
    // Clear the canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    
    // Update state
    setCameraActive(false);
    if (isTracking) {
      setIsTracking(false);
    }
    
    setStatusMessage({
      type: 'ready',
      message: 'Camera stopped. Click "Start Camera" to begin again'
    });
    setCurrentPhase('Ready');
  }, [setCameraActive, isTracking]);

  // Function to toggle tracking on/off
  const toggleTracking = useCallback(() => {
    setIsTracking(prevIsTracking => {
      const newIsTracking = !prevIsTracking;
      
      if (newIsTracking) {
        setStatusMessage({
          type: 'active',
          message: 'Tracking active - perform sit-ups slowly with good form'
        });
      } else {
        setStatusMessage({
          type: 'ready',
          message: 'Tracking paused. Click "Start Tracking" to resume'
        });
      }
      
      return newIsTracking;
    });
  }, []);

  // Function to reset the counter
  const resetCounter = useCallback(() => {
    setSitupCount(0);
    setFormScore(0);
    formScoreHistoryRef.current = [];
    goodFormCountRef.current = 0;
    totalChecksRef.current = 0;
    previousAnglesRef.current = [];
    setCurrentPhase(PHASE.UNKNOWN);
    
    setFormFeedback('Position yourself so your full upper body is visible');
    
    setStatusMessage({
      type: isTracking ? 'active' : 'ready',
      message: isTracking 
        ? 'Counter reset. Continue with your sit-ups!' 
        : 'Counter reset. Click "Start Tracking" when ready'
    });
  }, [isTracking]);

  // Handle window resize
  useEffect(() => {
    window.addEventListener('resize', adjustCanvasSize);
    
    return () => {
      window.removeEventListener('resize', adjustCanvasSize);
    };
  }, [adjustCanvasSize]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      
      if (webcamRef.current && webcamRef.current.srcObject) {
        webcamRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    webcamRef,
    canvasRef,
    isTracking,
    situpCount,
    formScore,
    formFeedback,
    currentPhase,
    startCamera,
    stopCamera,
    toggleTracking,
    resetCounter
  };
};

export default usePoseDetection;

