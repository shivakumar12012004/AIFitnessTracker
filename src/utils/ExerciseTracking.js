import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import PoseVisualizer from './PoseVisualizer';
import ExerciseGuide from './ExerciseGuide';

const ExerciseTracker = ({ selectedExercise }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);
  const threeContainerRef = useRef(null);
  
  const [isTracking, setIsTracking] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [isBreak, setIsBreak] = useState(false);
  const [breakTime, setBreakTime] = useState(60);
  const [isWarmup, setIsWarmup] = useState(false);
  const [warmupTime, setWarmupTime] = useState(30);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [milestone, setMilestone] = useState(null);
  
  // Exercise state tracking
  const [exerciseState, setExerciseState] = useState('ready'); // ready, up, down
  const stateRef = useRef('ready');
  const lastPoseRef = useRef(null);
  const timerRef = useRef(null);
  const warmupTimerRef = useRef(null);
  const breakTimerRef = useRef(null);
  const elapsedTimerRef = useRef(null);

  // Exercise-specific angle thresholds
  const thresholds = {
    situp: { 
      up: 160, // Nearly straight back
      down: 120  // Bent spine
    },
    pushup: {
      up: 160, // Arms nearly straight
      down: 90  // Arms bent
    },
    squat: {
      up: 170, // Legs nearly straight
      down: 110 // Legs bent
    }
  };

  // Calculate calories per rep based on exercise type
  const caloriesPerRep = {
    situp: 0.3,
    pushup: 0.6,
    squat: 0.45
  };

  // Initialize pose detector
  useEffect(() => {
    const initializeDetector = async () => {
      const model = poseDetection.SupportedModels.BlazePose;
      const detectorConfig = {
        runtime: 'tfjs',
        modelType: 'full',
        enableSmoothing: true
      };
      detectorRef.current = await poseDetection.createDetector(model, detectorConfig);
    };

    initializeDetector();

    return () => {
      // Clean up any resources
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warmupTimerRef.current) clearInterval(warmupTimerRef.current);
      if (breakTimerRef.current) clearInterval(breakTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, []);

  // Handle exercise selection changes
  useEffect(() => {
    setExerciseState('ready');
    stateRef.current = 'ready';
    // Keep other stats if changing exercise during a session
  }, [selectedExercise]);

  // Start video stream
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  // Start tracking
  const startTracking = async () => {
    if (!videoRef.current || !detectorRef.current) {
      await startCamera();
      setIsTracking(true);
      detectPoses();
      startElapsedTimer();
      return;
    }
    
    setIsTracking(true);
    detectPoses();
    startElapsedTimer();
  };

  // Pause tracking
  const pauseTracking = () => {
    setIsTracking(false);
    clearInterval(elapsedTimerRef.current);
  };

  // Reset tracking
  const resetTracking = () => {
    setIsTracking(false);
    setRepCount(0);
    setCaloriesBurned(0);
    setElapsedTime(0);
    setExerciseState('ready');
    stateRef.current = 'ready';
    clearInterval(elapsedTimerRef.current);
  };

  // Start warmup
  const startWarmup = () => {
    setIsWarmup(true);
    setWarmupTime(30);
    
    warmupTimerRef.current = setInterval(() => {
      setWarmupTime(prev => {
        if (prev <= 1) {
          clearInterval(warmupTimerRef.current);
          setIsWarmup(false);
          startTracking();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Start break
  const startBreak = () => {
    setIsBreak(true);
    setBreakTime(60);
    pauseTracking();
    
    breakTimerRef.current = setInterval(() => {
      setBreakTime(prev => {
        if (prev <= 1) {
          clearInterval(breakTimerRef.current);
          setIsBreak(false);
          startTracking();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Track elapsed time
  const startElapsedTimer = () => {
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    
    elapsedTimerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
  };

  // Detect poses and count reps
  const detectPoses = async () => {
    if (!detectorRef.current || !videoRef.current || !canvasRef.current || !isTracking) return;

    try {
      const poses = await detectorRef.current.estimatePoses(videoRef.current);
      
      if (poses.length > 0) {
        const pose = poses[0];
        lastPoseRef.current = pose;
        
        // Draw pose on canvas
        drawPose(pose);
        
        // Count reps based on exercise type
        if (selectedExercise === 'situp') {
          countSitups(pose);
        } else if (selectedExercise === 'pushup') {
          countPushups(pose);
        } else if (selectedExercise === 'squat') {
          countSquats(pose);
        }
      }
      
      // Continue detecting poses
      if (isTracking) {
        timerRef.current = requestAnimationFrame(detectPoses);
      }
    } catch (error) {
      console.error('Error detecting poses:', error);
    }
  };

  // Draw pose on canvas
  const drawPose = (pose) => {
    const ctx = canvasRef.current.getContext('2d');
    const videoWidth = videoRef.current.videoWidth;
    const videoHeight = videoRef.current.videoHeight;
    
    // Set canvas dimensions to match video
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, videoWidth, videoHeight);
    
    // Draw keypoints
    ctx.fillStyle = '#00FF00';
    pose.keypoints.forEach(keypoint => {
      if (keypoint.score > 0.3) {
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
    
    // Draw skeleton
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    
    const pairs = [
      // Torso
      ['left_shoulder', 'right_shoulder'],
      ['left_shoulder', 'left_hip'],
      ['right_shoulder', 'right_hip'],
      ['left_hip', 'right_hip'],
      
      // Arms
      ['left_shoulder', 'left_elbow'],
      ['left_elbow', 'left_wrist'],
      ['right_shoulder', 'right_elbow'],
      ['right_elbow', 'right_wrist'],
      
      // Legs
      ['left_hip', 'left_knee'],
      ['left_knee', 'left_ankle'],
      ['right_hip', 'right_knee'],
      ['right_knee', 'right_ankle']
    ];
    
    pairs.forEach(pair => {
      const kp1 = pose.keypoints.find(kp => kp.name === pair[0]);
      const kp2 = pose.keypoints.find(kp => kp.name === pair[1]);
      
      if (kp1 && kp2 && kp1.score > 0.3 && kp2.score > 0.3) {
        ctx.beginPath();
        ctx.moveTo(kp1.x, kp1.y);
        ctx.lineTo(kp2.x, kp2.y);
        ctx.stroke();
      }
    });
    
    // Draw exercise state
    ctx.font = '20px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`State: ${exerciseState}`, 10, 30);
    ctx.fillText(`Reps: ${repCount}`, 10, 60);
  };

  // Calculate angle between three points
  const calculateAngle = (pointA, pointB, pointC) => {
    if (!pointA || !pointB || !pointC) return 0;
    
    const vectorAB = {
      x: pointB.x - pointA.x,
      y: pointB.y - pointA.y
    };
    
    const vectorCB = {
      x: pointB.x - pointC.x,
      y: pointB.y - pointC.y
    };
    
    // Calculate dot product
    const dotProduct = (vectorAB.x * vectorCB.x) + (vectorAB.y * vectorCB.y);
    
    // Calculate magnitudes
    const magnitudeAB = Math.sqrt(vectorAB.x * vectorAB.x + vectorAB.y * vectorAB.y);
    const magnitudeCB = Math.sqrt(vectorCB.x * vectorCB.x + vectorCB.y * vectorCB.y);
    
    // Calculate angle in radians
    const angleRadians = Math.acos(dotProduct / (magnitudeAB * magnitudeCB));
    
    // Convert to degrees
    const angleDegrees = angleRadians * (180 / Math.PI);
    
    return angleDegrees;
  };

  // Count situps
  const countSitups = (pose) => {
    const currentState = stateRef.current;
    
    // Get keypoints for hip, shoulder, and knee
    const hip = pose.keypoints.find(kp => kp.name === 'left_hip');
    const shoulder = pose.keypoints.find(kp => kp.name === 'left_shoulder');
    const knee = pose.keypoints.find(kp => kp.name === 'left_knee');
    
    if (!hip || !shoulder || !knee) return;
    
    // Calculate spine angle (hip-shoulder-knee)
    const spineAngle = calculateAngle(knee, hip, shoulder);
    
    // State machine for counting
    if (currentState === 'ready' || currentState === 'up') {
      if (spineAngle < thresholds.situp.down) {
        stateRef.current = 'down';
        setExerciseState('down');
      }
    } else if (currentState === 'down') {
      if (spineAngle > thresholds.situp.up) {
        stateRef.current = 'up';
        setExerciseState('up');
        setRepCount(prev => {
          const newCount = prev + 1;
          
          // Update calories burned
          setCaloriesBurned(prevCal => prevCal + caloriesPerRep.situp);
          
          // Check for milestones
          checkMilestone(newCount);
          
          return newCount;
        });
      }
    }
  };

  // Count pushups
  const countPushups = (pose) => {
    const currentState = stateRef.current;
    
    // Get keypoints for shoulder, elbow, and wrist
    const shoulder = pose.keypoints.find(kp => kp.name === 'left_shoulder');
    const elbow = pose.keypoints.find(kp => kp.name === 'left_elbow');
    const wrist = pose.keypoints.find(kp => kp.name === 'left_wrist');
    
    if (!shoulder || !elbow || !wrist) return;
    
    // Calculate arm angle (shoulder-elbow-wrist)
    const armAngle = calculateAngle(shoulder, elbow, wrist);
    
    // State machine for counting
    if (currentState === 'ready' || currentState === 'up') {
      if (armAngle < thresholds.pushup.down) {
        stateRef.current = 'down';
        setExerciseState('down');
      }
    } else if (currentState === 'down') {
      if (armAngle > thresholds.pushup.up) {
        stateRef.current = 'up';
        setExerciseState('up');
        setRepCount(prev => {
          const newCount = prev + 1;
          
          // Update calories burned
          setCaloriesBurned(prevCal => prevCal + caloriesPerRep.pushup);
          
          // Check for milestones
          checkMilestone(newCount);
          
          return newCount;
        });
      }
    }
  };

  // Count squats
  const countSquats = (pose) => {
    const currentState = stateRef.current;
    
    // Get keypoints for hip, knee, and ankle
    const hip = pose.keypoints.find(kp => kp.name === 'left_hip');
    const knee = pose.keypoints.find(kp => kp.name === 'left_knee');
    const ankle = pose.keypoints.find(kp => kp.name === 'left_ankle');
    
    if (!hip || !knee || !ankle) return;
    
    // Calculate leg angle (hip-knee-ankle)
    const legAngle = calculateAngle(hip, knee, ankle);
    
    // State machine for counting
    if (currentState === 'ready' || currentState === 'up') {
      if (legAngle < thresholds.squat.down) {
        stateRef.current = 'down';
        setExerciseState('down');
      }
    } else if (currentState === 'down') {
      if (legAngle > thresholds.squat.up) {
        stateRef.current = 'up';
        setExerciseState('up');
        setRepCount(prev => {
          const newCount = prev + 1;
          
          // Update calories burned
          setCaloriesBurned(prevCal => prevCal + caloriesPerRep.squat);
          
          // Check for milestones
          checkMilestone(newCount);
          
          return newCount;
        });
      }
    }
  };

  // Check for rep milestones
  const checkMilestone = (count) => {
    if (count % 5 === 0) { // Every 5 reps
      setMilestone(`${count} ${selectedExercise}s completed! Keep going!`);
      setTimeout(() => setMilestone(null), 3000);
    }
  };

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="exercise-tracker">
      <div className="video-container">
        <div className="video-canvas-container">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline
            style={{ transform: 'scaleX(-1)' }} // Mirror view
          />
          <canvas 
            ref={canvasRef}
            style={{ transform: 'scaleX(-1)' }} // Mirror view
          />
          {milestone && <div className="milestone">{milestone}</div>}
          {isBreak && (
            <div className="break-mode">
              <div className="break-time">{formatTime(breakTime)}</div>
              <div className="break-message">Take a break! Rest and hydrate.</div>
              <button 
                className="control-btn start-btn"
                onClick={() => {
                  clearInterval(breakTimerRef.current);
                  setIsBreak(false);
                  startTracking();
                }}
              >
                Skip Break
              </button>
            </div>
          )}
          {isWarmup && (
                  <div className="warmup-mode">
                    <div className="warmup-timer">{warmupTime}</div>
                    <div className="warmup-instruction">
                      {selectedExercise === 'situp' && "Stretch your core and back muscles. Prepare for situps."}
                      {selectedExercise === 'pushup' && "Stretch your chest, shoulders and arms. Prepare for pushups."}
                      {selectedExercise === 'squat' && "Stretch your legs and lower back. Prepare for squats."}
                    </div>
                    <button 
                      className="control-btn start-btn"
                      onClick={() => {
                        clearInterval(warmupTimerRef.current);
                        setIsWarmup(false);
                        startTracking();
                      }}
                    >
                      Skip Warmup
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="controls">
              <div className="stats-container">
                <div className="stat-card">
                  <div className="stat-value">{repCount}</div>
                  <div className="stat-label">Reps</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{caloriesBurned.toFixed(1)}</div>
                  <div className="stat-label">Calories</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{formatTime(elapsedTime)}</div>
                  <div className="stat-label">Time</div>
                </div>
              </div>
              
              <div className="button-container">
                {!isTracking ? (
                  <button className="control-btn start-btn" onClick={startTracking}>
                    Start
                  </button>
                ) : (
                  <button className="control-btn pause-btn" onClick={pauseTracking}>
                    Pause
                  </button>
                )}
                <button className="control-btn reset-btn" onClick={resetTracking}>
                  Reset
                </button>
                <button className="control-btn warmup-btn" onClick={startWarmup}>
                  Warmup
                </button>
                <button className="control-btn pause-btn" onClick={startBreak}>
                  Break
                </button>
              </div>
            </div>
            
            <div className="visualization-container" ref={threeContainerRef}>
              <PoseVisualizer pose={lastPoseRef.current} exerciseType={selectedExercise} />
            </div>
            
            <ExerciseGuide exerciseType={selectedExercise} />
          </div>
        );
      };

export default ExerciseTracker;
