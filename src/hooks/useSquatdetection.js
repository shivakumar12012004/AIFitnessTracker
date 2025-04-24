// hooks/useSquatDetection.js
import { useCallback, useEffect, useRef, useState } from 'react';
import { HISTORY_LENGTH, VISIBILITY_THRESHOLD } from '../constants/poseConstants';

// Constants specific to squat detection
const SQUAT_PHASE = {
  UNKNOWN: 'unknown',
  STANDING: 'standing',
  TRANSITION_DOWN: 'squatting_down',
  SQUAT: 'deep_squat',
  TRANSITION_UP: 'standing_up'
};

const SQUAT_ANGLE_THRESHOLDS = {
  STANDING_MIN: 160, // Minimum angle for standing position (knees slightly bent)
  SQUAT_MAX: 100,    // Maximum angle for squat position (deeper squat = lower angle)
  THRESHOLD_BUFFER: 10 // Buffer to prevent oscillation between states
};

// Key landmarks for squat detection
const SQUAT_KEY_LANDMARK_INDICES = [
  23, 24, // Hip points
  25, 26, // Knee points
  27, 28  // Ankle points
];

const useSquatDetection = (setCameraActive, setStatusMessage) => {
  // Refs for DOM elements
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  
  // State for tracking
  const [isTracking, setIsTracking] = useState(false);
  const [squatCount, setSquatCount] = useState(0);
  const [formScore, setFormScore] = useState(0);
  const [formFeedback, setFormFeedback] = useState('Position yourself so your full lower body is visible');
  const [currentPhase, setCurrentPhase] = useState(SQUAT_PHASE.UNKNOWN);
  
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
    
    // Highlight key points for squat detection
    const keyPoints = [
      // Hips
      results.poseLandmarks[23], 
      results.poseLandmarks[24],
      // Knees
      results.poseLandmarks[25], 
      results.poseLandmarks[26],
      // Ankles
      results.poseLandmarks[27], 
      results.poseLandmarks[28]
    ];
    
    // Draw highlighted key points
    drawLandmarks(ctx, keyPoints, 
                 { color: '#FFFF00', lineWidth: 2, radius: 10 });
    
    // Draw squat angles if tracking
    if (isTracking) {
      drawSquatAngles(ctx, results.poseLandmarks, canvas);
    }
  }, [isTracking]);

  // Function to draw the squat angles on the canvas
  const drawSquatAngles = useCallback((ctx, landmarks, canvas) => {
    // Draw both left and right leg angles
    
    // Left leg angle (hip-knee-ankle)
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];
    
    ctx.beginPath();
    ctx.moveTo(leftHip.x * canvas.width, leftHip.y * canvas.height);
    ctx.lineTo(leftKnee.x * canvas.width, leftKnee.y * canvas.height);
    ctx.lineTo(leftAnkle.x * canvas.width, leftAnkle.y * canvas.height);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#FF9000';
    ctx.stroke();
    
    // Calculate left knee angle
    const leftAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const leftAngleTxt = Math.round(leftAngle) + '°';
    
    // Display the angle near the knee point
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeText(leftAngleTxt, leftKnee.x * canvas.width + 20, leftKnee.y * canvas.height);
    ctx.fillText(leftAngleTxt, leftKnee.x * canvas.width + 20, leftKnee.y * canvas.height);
    
    // Right leg angle (hip-knee-ankle)
    const rightHip = landmarks[24];
    const rightKnee = landmarks[26];
    const rightAnkle = landmarks[28];
    
    ctx.beginPath();
    ctx.moveTo(rightHip.x * canvas.width, rightHip.y * canvas.height);
    ctx.lineTo(rightKnee.x * canvas.width, rightKnee.y * canvas.height);
    ctx.lineTo(rightAnkle.x * canvas.width, rightAnkle.y * canvas.height);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#FF9000';
    ctx.stroke();
    
    // Calculate right knee angle
    const rightAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    const rightAngleTxt = Math.round(rightAngle) + '°';
    
    // Display the angle near the knee point
    ctx.strokeText(rightAngleTxt, rightKnee.x * canvas.width - 60, rightKnee.y * canvas.height);
    ctx.fillText(rightAngleTxt, rightKnee.x * canvas.width - 60, rightKnee.y * canvas.height);
  }, []);

  // Calculate angle between three points
  const calculateAngle = (a, b, c) => {
    // Convert to vectors
    const ab = { x: b.x - a.x, y: b.y - a.y };
    const bc = { x: c.x - b.x, y: c.y - b.y };
    
    // Calculate dot product
    const dotProduct = ab.x * bc.x + ab.y * bc.y;
    
    // Calculate magnitudes
    const magAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y);
    const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);
    
    // Calculate angle in radians and convert to degrees
    const angleRad = Math.acos(dotProduct / (magAB * magBC));
    return 180 - (angleRad * 180 / Math.PI); // 180 - angle to get the knee angle
  };

  // Check if key landmarks are visible
  const areKeyLandmarksVisible = useCallback((landmarks, indices, threshold) => {
    for (const idx of indices) {
      if (!landmarks[idx] || landmarks[idx].visibility < threshold) {
        return false;
      }
    }
    return true;
  }, []);

  // Function to detect squat movement
  const detectSquat = useCallback((landmarks) => {
    // Check if key landmarks are visible
    if (!areKeyLandmarksVisible(landmarks, SQUAT_KEY_LANDMARK_INDICES, VISIBILITY_THRESHOLD)) {
      setFormFeedback('Cannot detect full lower body. Please adjust position.');
      setCurrentPhase('Partial detection');
      return;
    }
    
    // Calculate the knee angles (average of left and right)
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];
    
    const rightHip = landmarks[24];
    const rightKnee = landmarks[26];
    const rightAnkle = landmarks[28];
    
    const leftAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    
    // Average knee angle (use the smaller of the two if there's a big difference)
    const currentAngle = Math.min(leftAngle, rightAngle);
    
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
    if (currentPhase === SQUAT_PHASE.TRANSITION_DOWN || currentPhase === SQUAT_PHASE.TRANSITION_UP) {
      checkForm(landmarks);
    }
  }, [currentPhase, areKeyLandmarksVisible]);

  // Determine the current phase of the squat
  const determinePhase = useCallback((angle) => {
    setCurrentPhase(prevPhase => {
      let newPhase = prevPhase;
      
      // Use hysteresis to prevent oscillation between states
      switch (prevPhase) {
        case SQUAT_PHASE.UNKNOWN:
          // Initial state determination
          if (angle >= SQUAT_ANGLE_THRESHOLDS.STANDING_MIN) {
            newPhase = SQUAT_PHASE.STANDING;
            setFormFeedback('Standing position detected. Begin your squat.');
          } else if (angle <= SQUAT_ANGLE_THRESHOLDS.SQUAT_MAX) {
            newPhase = SQUAT_PHASE.SQUAT;
            setFormFeedback('Starting in squat position. Stand up to begin.');
          } else {
            setFormFeedback('Move to either standing or squat position to start.');
          }
          break;
          
        case SQUAT_PHASE.STANDING:
          // From standing position, user starts going down
          if (angle < SQUAT_ANGLE_THRESHOLDS.STANDING_MIN - SQUAT_ANGLE_THRESHOLDS.THRESHOLD_BUFFER) {
            newPhase = SQUAT_PHASE.TRANSITION_DOWN;
            setFormFeedback('Going down - keep heels on ground!');
          }
          break;
          
        case SQUAT_PHASE.TRANSITION_DOWN:
          // While going down, check if reached bottom
          if (angle <= SQUAT_ANGLE_THRESHOLDS.SQUAT_MAX) {
            newPhase = SQUAT_PHASE.SQUAT;
            setFormFeedback('Good depth! Now push back up.');
          } else if (angle >= SQUAT_ANGLE_THRESHOLDS.STANDING_MIN) {
            // Went back up without completing rep
            newPhase = SQUAT_PHASE.STANDING;
            setFormFeedback('Incomplete rep - try to go lower.');
          }
          break;
          
        case SQUAT_PHASE.SQUAT:
          // From squat position, user starts coming up
          if (angle > SQUAT_ANGLE_THRESHOLDS.SQUAT_MAX + SQUAT_ANGLE_THRESHOLDS.THRESHOLD_BUFFER) {
            newPhase = SQUAT_PHASE.TRANSITION_UP;
            setFormFeedback('Coming up - keep chest up!');
          }
          break;
          
        case SQUAT_PHASE.TRANSITION_UP:
          // While coming up, check if reached top
          if (angle >= SQUAT_ANGLE_THRESHOLDS.STANDING_MIN) {
            newPhase = SQUAT_PHASE.STANDING;
            // Complete the rep when returning to the standing position
            setSquatCount(prevCount => prevCount + 1);
            
            // Calculate and update form score
            updateFormScore();
          } else if (angle <= SQUAT_ANGLE_THRESHOLDS.SQUAT_MAX) {
            // Went back down without completing rep
            newPhase = SQUAT_PHASE.SQUAT;
            setFormFeedback('Try again - stand all the way up.');
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

  // Check form during the squat
  const checkForm = useCallback((landmarks) => {
    totalChecksRef.current++;
    let formIssues = 0;
    let feedbackMessage = '';
    
    // Check 1: Are the knees aligned with feet? (not caving in)
    const kneeAligned = checkKneeAlignment(landmarks);
    if (!kneeAligned) {
      formIssues++;
      feedbackMessage = 'Keep knees aligned with feet, don\'t let them cave in';
    }
    
    // Check 2: Is the back relatively straight?
    const backStraight = checkBackAngle(landmarks);
    if (!backStraight) {
      formIssues++;
      feedbackMessage = feedbackMessage ? 
        'Watch your knees and keep your back straight' : 
        'Try to keep your back more upright';
    }
    
    // Check 3: Are feet flat on ground? (approximated by ankle angle)
    const feetFlat = checkAnkleAngle(landmarks);
    if (!feetFlat) {
      formIssues++;
      feedbackMessage = feedbackMessage ? 
        feedbackMessage + ', keep heels down' : 
        'Keep your heels down on the ground';
    }
    
    // Calculate good form percentage
    const formQuality = formIssues === 0 ? 1 : 
                        formIssues === 1 ? 0.7 : 
                        formIssues === 2 ? 0.3 : 0;
    
    // Update good form count
    goodFormCountRef.current += formQuality;
    
    // Provide feedback based on issues
    if (formIssues === 0) {
      setFormFeedback('Great form! Keep it up.');
    } else {
      setFormFeedback(feedbackMessage);
    }
  }, []);

  // Check knee alignment (prevent knee valgus)
  const checkKneeAlignment = (landmarks) => {
    // Compare x-coordinates of knees relative to ankles
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];
    const rightKnee = landmarks[26];
    const rightAnkle = landmarks[28];
    
    // Check if knees are caving in relative to ankles
    const leftAligned = leftKnee.x >= leftAnkle.x - 0.05;
    const rightAligned = rightKnee.x <= rightAnkle.x + 0.05;
    
    return leftAligned && rightAligned;
  };

  // Check back angle (should be relatively upright)
  const checkBackAngle = (landmarks) => {
    // Use spine and shoulders to determine back angle
    const hip = getMidpoint(landmarks[23], landmarks[24]);
    const shoulder = getMidpoint(landmarks[11], landmarks[12]);
    const neck = landmarks[0]; // Using nose as reference
    
    // Calculate angle of back relative to vertical
    const backVector = {
      x: shoulder.x - hip.x,
      y: shoulder.y - hip.y
    };
    
    // Vertical vector pointing up
    const verticalVector = {
      x: 0,
      y: -1
    };
    
    // Calculate dot product
    const dotProduct = backVector.x * verticalVector.x + backVector.y * verticalVector.y;
    
    // Calculate magnitudes
    const magBack = Math.sqrt(backVector.x * backVector.x + backVector.y * backVector.y);
    const magVert = Math.sqrt(verticalVector.x * verticalVector.x + verticalVector.y * verticalVector.y);
    
    // Calculate angle in radians and convert to degrees
    const angleRad = Math.acos(dotProduct / (magBack * magVert));
    const angleDeg = angleRad * 180 / Math.PI;
    
    // Back should be within 30 degrees of vertical for good form
    return angleDeg < 30;
  };

  // Get midpoint between two landmarks
  const getMidpoint = (pointA, pointB) => {
    return {
      x: (pointA.x + pointB.x) / 2,
      y: (pointA.y + pointB.y) / 2,
      z: (pointA.z + pointB.z) / 2,
      visibility: Math.min(pointA.visibility, pointB.visibility)
    };
  };

  // Check ankle angle (for heel position)
  const checkAnkleAngle = (landmarks) => {
    // This is approximate since we can't directly see if heels are raised
    // Instead, we look at relative positions of ankles and knees
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];
    const rightKnee = landmarks[26];
    const rightAnkle = landmarks[28];
    
    // Check if ankles are significantly in front of knees (may indicate heel raise)
    const leftAnklePosition = leftAnkle.z - leftKnee.z;
    const rightAnklePosition = rightAnkle.z - rightKnee.z;
    
    // Negative values indicate ankles are behind knees (good)
    // Threshold depends on calibration
    return leftAnklePosition < 0.1 && rightAnklePosition < 0.1;
  };

  // Update form score after completing a rep
  const updateFormScore = useCallback(() => {
    if (totalChecksRef.current > 0) {
      // Calculate form score as percentage
      const newFormScore = Math.round((goodFormCountRef.current / totalChecksRef.current) * 100);
      setFormScore(newFormScore);
      formScoreHistoryRef.current.push(newFormScore);
      
      // Provide feedback based on form score
      if (newFormScore >= 90) {
        setFormFeedback('Excellent form! Perfect squat.');
      } else if (newFormScore >= 75) {
        setFormFeedback('Good form! Try to maintain consistent depth.');
      } else if (newFormScore >= 50) {
        setFormFeedback('Decent squat. Focus on keeping knees aligned with feet.');
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
    
    // Count squats if tracking is active
    if (isTracking && results.poseLandmarks) {
      detectSquat(results.poseLandmarks);
    }
  }, [drawPoseLandmarks, detectSquat, isTracking]);

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
          message: 'Camera started! Click "Start Tracking" to count squats'
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
          message: 'Tracking active - perform squats with controlled movement'
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
    setSquatCount(0);
    setFormScore(0);
    formScoreHistoryRef.current = [];
    goodFormCountRef.current = 0;
    totalChecksRef.current = 0;
    previousAnglesRef.current = [];
    setCurrentPhase(SQUAT_PHASE.UNKNOWN);
    
    setFormFeedback('Position yourself so your full lower body is visible');
    
    setStatusMessage({
      type: isTracking ? 'active' : 'ready',
      message: isTracking 
        ? 'Counter reset. Continue with your squats!' 
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
    exerciseCount: squatCount,
    formScore,
    formFeedback,
    currentPhase,
    startCamera,
    stopCamera,
    toggleTracking,
    resetCounter
  };
};

export default useSquatDetection;