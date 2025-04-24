// Create a single object that contains all the exercise tracking logic
// This avoids export issues when importing in your project

const ExerciseTracking = {
    // Constants
    PUSHUP_PHASE: {
      UNKNOWN: 'unknown',
      UP: 'up',
      DOWN: 'down',
      TRANSITION_DOWN: 'transitioning_down',
      TRANSITION_UP: 'transitioning_up'
    },
  
    PUSHUP_ANGLE_THRESHOLDS: {
      UP_MIN: 150, // Minimum elbow angle in up position
      DOWN_MAX: 100, // Maximum elbow angle in down position
      THRESHOLD_BUFFER: 10 // Buffer to prevent oscillation
    },
  
    SQUAT_PHASE: {
      UNKNOWN: 'unknown',
      UP: 'standing',
      DOWN: 'squat',
      TRANSITION_DOWN: 'squatting_down',
      TRANSITION_UP: 'standing_up'
    },
  
    SQUAT_ANGLE_THRESHOLDS: {
      UP_MIN: 160, // Minimum knee angle in standing position
      DOWN_MAX: 110, // Maximum knee angle in squat position
      THRESHOLD_BUFFER: 10 // Buffer to prevent oscillation
    },
  
    // Utility functions
    getMidpoint: (point1, point2) => {
      return {
        x: (point1.x + point2.x) / 2,
        y: (point1.y + point2.y) / 2,
        z: (point1.z + point2.z) / 2,
        visibility: Math.min(point1.visibility, point2.visibility)
      };
    },
  
    calculateAngle: (p1, p2, p3) => {
      // Vector 1 (p1 to p2)
      const a = {
        x: p1.x - p2.x,
        y: p1.y - p2.y
      };
      
      // Vector 2 (p3 to p2)
      const b = {
        x: p3.x - p2.x,
        y: p3.y - p2.y
      };
      
      // Calculate dot product
      const dotProduct = a.x * b.x + a.y * b.y;
      
      // Calculate magnitudes
      const magnitudeA = Math.sqrt(a.x * a.x + a.y * a.y);
      const magnitudeB = Math.sqrt(b.x * b.x + b.y * b.y);
      
      // Calculate the angle in degrees
      const angle = Math.acos(dotProduct / (magnitudeA * magnitudeB)) * (180 / Math.PI);
      
      return angle;
    },
  
    areKeyLandmarksVisible: (landmarks, indices, threshold) => {
      return indices.every(i => landmarks[i] && landmarks[i].visibility > threshold);
    },
  
    // Pushup-specific utilities
    checkElbowAngle: (landmarks) => {
      // Calculate angle at elbow (shoulder-elbow-wrist)
      const leftElbowAngle = ExerciseTracking.calculateAngle(
        landmarks[11], // left shoulder
        landmarks[13], // left elbow
        landmarks[15]  // left wrist
      );
      
      const rightElbowAngle = ExerciseTracking.calculateAngle(
        landmarks[12], // right shoulder
        landmarks[14], // right elbow
        landmarks[16]  // right wrist
      );
      
      // Average of both arms
      const avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;
      
      // Check if elbow angle is in proper range (around 90° at bottom position)
      const isProperDepth = avgElbowAngle >= 80 && avgElbowAngle <= 110;
      
      return { angle: avgElbowAngle, isProperDepth };
    },
  
    checkPushupBodyAlignment: (landmarks) => {
      // Check if body is in a straight line (neck, back, hips)
      const shoulders = ExerciseTracking.getMidpoint(landmarks[11], landmarks[12]);
      const hips = ExerciseTracking.getMidpoint(landmarks[23], landmarks[24]);
      const ankles = ExerciseTracking.getMidpoint(landmarks[27], landmarks[28]);
      
      // Calculate body line angle (ideally should be close to 180°)
      const bodyLineAngle = ExerciseTracking.calculateAngle(shoulders, hips, ankles);
  
      // Body should be straight (close to 180°)
      const isAligned = Math.abs(180 - bodyLineAngle) < 15;
      
      return { angle: bodyLineAngle, isAligned };
    },
  
    // Squat-specific utilities
    checkKneeAngle: (landmarks) => {
      // Calculate knee angle (hip-knee-ankle)
      const leftKneeAngle = ExerciseTracking.calculateAngle(
        landmarks[23], // left hip
        landmarks[25], // left knee
        landmarks[27]  // left ankle
      );
      
      const rightKneeAngle = ExerciseTracking.calculateAngle(
        landmarks[24], // right hip
        landmarks[26], // right knee
        landmarks[28]  // right ankle
      );
      
      // Average of both knees
      const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
      
      // Check if knee angle is proper for squat (around 90° at bottom position)
      const isProperDepth = avgKneeAngle >= 70 && avgKneeAngle <= 120;
      
      return { angle: avgKneeAngle, isProperDepth };
    },
  
    checkAnkleKneeHipAlignment: (landmarks) => {
      // Check if ankles, knees and hips are aligned
      const leftHip = landmarks[23];
      const leftKnee = landmarks[25];
      const leftAnkle = landmarks[27];
      
      const rightHip = landmarks[24];
      const rightKnee = landmarks[26];
      const rightAnkle = landmarks[28];
      
      // Calculate angles to check alignment
      const leftAlignment = ExerciseTracking.calculateAngle(
        { x: leftHip.x, y: leftKnee.y }, // Projected hip position
        leftKnee,
        leftAnkle
      );
      
      const rightAlignment = ExerciseTracking.calculateAngle(
        { x: rightHip.x, y: rightKnee.y }, // Projected hip position
        rightKnee,
        rightAnkle
      );
      
      // Check if knees are not caving in (knees should be aligned with ankles)
      const isAligned = leftAlignment > 160 && rightAlignment > 160;
      
      return isAligned;
    },
  
    // Hook creators for each exercise type
    createPushupDetector: (webcamRef, canvasRef, setCameraActive, setStatusMessage) => {
      // State references - these would be useState in a React component
      // For simplicity in this example, we'll use regular objects
      const state = {
        isTracking: false,
        pushupCount: 0,
        formScore: 0,
        formFeedback: 'Position yourself in a plank position to start',
        currentPhase: ExerciseTracking.PUSHUP_PHASE.UNKNOWN,
        repTime: 0,
        restTime: 0
      };
      
      // Refs for tracking
      const refs = {
        previousAngles: [],
        formScoreHistory: [],
        goodFormCount: 0,
        totalChecks: 0,
        lastRepTime: 0,
        lastRestTime: 0,
        repStartTime: 0,
        restStartTime: 0
      };
      
      // Update state function (simulating React's setState)
      const updateState = (key, value) => {
        state[key] = value;
        // In real implementation, this would be the React setState
      };
      
      // Function to draw pushup angles on canvas
      const drawPushupAngles = (ctx, landmarks, canvas) => {
        if (!landmarks || landmarks.length < 33) return;
        
        // Draw elbow angle
        const leftShoulder = landmarks[11];
        const leftElbow = landmarks[13];
        const leftWrist = landmarks[15];
        
        ctx.beginPath();
        ctx.moveTo(leftShoulder.x * canvas.width, leftShoulder.y * canvas.height);
        ctx.lineTo(leftElbow.x * canvas.width, leftElbow.y * canvas.height);
        ctx.lineTo(leftWrist.x * canvas.width, leftWrist.y * canvas.height);
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#FF9000';
        ctx.stroke();
        
        // Calculate elbow angle
        const elbowResult = ExerciseTracking.checkElbowAngle(landmarks);
        const elbowAngle = elbowResult.angle;
        const elbowAngleTxt = Math.round(elbowAngle) + '°';
        
        // Display the angle near the elbow point
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeText(elbowAngleTxt, leftElbow.x * canvas.width + 20, leftElbow.y * canvas.height);
        ctx.fillText(elbowAngleTxt, leftElbow.x * canvas.width + 20, leftElbow.y * canvas.height);
        
        // Draw body alignment
        const shoulders = ExerciseTracking.getMidpoint(landmarks[11], landmarks[12]);
        const hips = ExerciseTracking.getMidpoint(landmarks[23], landmarks[24]);
        const ankles = ExerciseTracking.getMidpoint(landmarks[27], landmarks[28]);
        
        ctx.beginPath();
        ctx.moveTo(shoulders.x * canvas.width, shoulders.y * canvas.height);
        ctx.lineTo(hips.x * canvas.width, hips.y * canvas.height);
        ctx.lineTo(ankles.x * canvas.width, ankles.y * canvas.height);
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#00FF00';
        ctx.stroke();
      };
      
      // Function to check form during the pushup
      const checkPushupForm = (landmarks) => {
        refs.totalChecks++;
        
        // Check body alignment
        const alignmentResult = ExerciseTracking.checkPushupBodyAlignment(landmarks);
        const isBodyAligned = alignmentResult.isAligned;
        
        // Check elbow angle for proper depth
        const elbowResult = ExerciseTracking.checkElbowAngle(landmarks);
        const isProperDepth = elbowResult.isProperDepth;
        
        // Check if wrists are under shoulders
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftWrist = landmarks[15];
        const rightWrist = landmarks[16];
        
        const isWristUnderShoulder = 
          Math.abs(leftShoulder.x - leftWrist.x) < 0.1 && 
          Math.abs(rightShoulder.x - rightWrist.x) < 0.1;
        
        // Track good form points
        if (isBodyAligned) refs.goodFormCount++;
        
        // Provide specific feedback based on form issues
        if (!isBodyAligned && !isWristUnderShoulder) {
          updateState('formFeedback', 'Keep your body straight and wrists under shoulders');
        } else if (!isBodyAligned) {
          updateState('formFeedback', 'Try to keep your body in a straight line');
        } else if (!isWristUnderShoulder) {
          updateState('formFeedback', 'Position your wrists directly under your shoulders');
        } else if (!isProperDepth && state.currentPhase === ExerciseTracking.PUSHUP_PHASE.TRANSITION_DOWN) {
          updateState('formFeedback', 'Try to go lower, aim for 90° at the elbow');
        } else {
          updateState('formFeedback', 'Good form! Keep your core engaged');
        }
      };
      
      // Function to update form score after rep
      const updatePushupFormScore = () => {
        if (refs.totalChecks > 0) {
          // Calculate form score as percentage
          const newFormScore = Math.round((refs.goodFormCount / refs.totalChecks) * 100);
          updateState('formScore', newFormScore);
          refs.formScoreHistory.push(newFormScore);
          
          // Provide feedback based on form score
          if (newFormScore >= 90) {
            updateState('formFeedback', 'Excellent form! Perfect pushup.');
          } else if (newFormScore >= 75) {
            updateState('formFeedback', 'Good form! Try to maintain body alignment.');
          } else if (newFormScore >= 50) {
            updateState('formFeedback', 'Decent pushup. Focus on keeping your body straight.');
          } else {
            updateState('formFeedback', 'Try to maintain better form throughout the movement.');
          }
          
          // Reset form tracking for next rep
          refs.goodFormCount = 0;
          refs.totalChecks = 0;
        }
      };
      
      // Determine the current phase of the pushup
      const determinePushupPhase = (angle) => {
        const currentTime = Date.now();
        let newPhase = state.currentPhase;
        
        switch (state.currentPhase) {
          case ExerciseTracking.PUSHUP_PHASE.UNKNOWN:
            // Initial state determination
            if (angle >= ExerciseTracking.PUSHUP_ANGLE_THRESHOLDS.UP_MIN) {
              newPhase = ExerciseTracking.PUSHUP_PHASE.UP;
              updateState('formFeedback', 'Starting position good. Begin your pushup.');
              refs.repStartTime = currentTime;
            } else if (angle <= ExerciseTracking.PUSHUP_ANGLE_THRESHOLDS.DOWN_MAX) {
              newPhase = ExerciseTracking.PUSHUP_PHASE.DOWN;
              updateState('formFeedback', 'Starting in down position. Push up to begin.');
            } else {
              updateState('formFeedback', 'Move to either up or down position to start.');
            }
            break;
            
          case ExerciseTracking.PUSHUP_PHASE.UP:
            // From up position, user starts going down
            if (angle < ExerciseTracking.PUSHUP_ANGLE_THRESHOLDS.UP_MIN - ExerciseTracking.PUSHUP_ANGLE_THRESHOLDS.THRESHOLD_BUFFER) {
              newPhase = ExerciseTracking.PUSHUP_PHASE.TRANSITION_DOWN;
              updateState('formFeedback', 'Going down - keep your body straight!');
              refs.repStartTime = currentTime;
              refs.restStartTime = 0; // Reset rest timer when starting a rep
            }
            break;
            
          case ExerciseTracking.PUSHUP_PHASE.TRANSITION_DOWN:
            // While going down, check if reached bottom
            if (angle <= ExerciseTracking.PUSHUP_ANGLE_THRESHOLDS.DOWN_MAX) {
              newPhase = ExerciseTracking.PUSHUP_PHASE.DOWN;
              updateState('formFeedback', 'Good depth! Now push back up smoothly.');
            } else if (angle >= ExerciseTracking.PUSHUP_ANGLE_THRESHOLDS.UP_MIN) {
              // Went back up without completing rep
              newPhase = ExerciseTracking.PUSHUP_PHASE.UP;
              updateState('formFeedback', 'Incomplete rep - try to go lower.');
            }
            break;
            
          case ExerciseTracking.PUSHUP_PHASE.DOWN:
            // From down position, user starts coming up
            if (angle > ExerciseTracking.PUSHUP_ANGLE_THRESHOLDS.DOWN_MAX + ExerciseTracking.PUSHUP_ANGLE_THRESHOLDS.THRESHOLD_BUFFER) {
              newPhase = ExerciseTracking.PUSHUP_PHASE.TRANSITION_UP;
              updateState('formFeedback', 'Coming up - keep your core engaged!');
            }
            break;
            
          case ExerciseTracking.PUSHUP_PHASE.TRANSITION_UP:
            // While coming up, check if reached top
            if (angle >= ExerciseTracking.PUSHUP_ANGLE_THRESHOLDS.UP_MIN) {
              newPhase = ExerciseTracking.PUSHUP_PHASE.UP;
              // Complete the rep when returning to the up position
              updateState('pushupCount', state.pushupCount + 1);
              
              // Calculate rep time
              const repTime = Math.round((currentTime - refs.repStartTime) / 1000);
              updateState('repTime', repTime);
              refs.lastRepTime = currentTime;
              
              // Provide time-based feedback
              if (repTime < 1) {
                updateState('formFeedback', 'Too fast! Slow down for better form.');
              } else if (repTime > 5) {
                updateState('formFeedback', 'Good control, but try to maintain momentum.');
              } else {
                updateState('formFeedback', 'Good pace! Keep it up.');
              }
              
              // Start tracking rest time
              refs.restStartTime = currentTime;
              
              // Calculate and update form score
              updatePushupFormScore();
            } else if (angle <= ExerciseTracking.PUSHUP_ANGLE_THRESHOLDS.DOWN_MAX) {
              // Went back down without completing rep
              newPhase = ExerciseTracking.PUSHUP_PHASE.DOWN;
              updateState('formFeedback', 'Try again - push all the way up.');
            }
            break;
        }
        
        // Debug log when phase changes
        if (state.currentPhase !== newPhase) {
          console.log(`Pushup phase changed: ${state.currentPhase} -> ${newPhase}, Angle: ${angle.toFixed(1)}°`);
          updateState('currentPhase', newPhase);
        }
      };
      
      // Function to detect pushup movement
      const detectPushup = (landmarks) => {
        // Check if key landmarks are visible
        const pushupLandmarks = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
        const VISIBILITY_THRESHOLD = 0.5;
        
        if (!ExerciseTracking.areKeyLandmarksVisible(landmarks, pushupLandmarks, VISIBILITY_THRESHOLD)) {
          updateState('formFeedback', 'Cannot detect full body. Please adjust position.');
          updateState('currentPhase', ExerciseTracking.PUSHUP_PHASE.UNKNOWN);
          return;
        }
        
        // Calculate the elbow angle
        const elbowResult = ExerciseTracking.checkElbowAngle(landmarks);
        const currentAngle = elbowResult.angle;
        
        // Add to history for smoothing
        refs.previousAngles.push(currentAngle);
        if (refs.previousAngles.length > 10) { // HISTORY_LENGTH
          refs.previousAngles.shift();
        }
        
        // Calculate smoothed angle
        const smoothedAngle = refs.previousAngles.reduce((sum, angle) => sum + angle, 0) / refs.previousAngles.length;
        
        // Determine phase based on angle
        determinePushupPhase(smoothedAngle);
        
        // Check form during the movement
        if (state.currentPhase === ExerciseTracking.PUSHUP_PHASE.TRANSITION_DOWN || 
            state.currentPhase === ExerciseTracking.PUSHUP_PHASE.TRANSITION_UP) {
          checkPushupForm(landmarks);
        }
        
        // Calculate rest time between reps
        if (state.currentPhase === ExerciseTracking.PUSHUP_PHASE.UP && refs.lastRepTime > 0) {
          const currentTime = Date.now();
          if (refs.restStartTime === 0) {
            refs.restStartTime = currentTime;
          }
          
          // Update rest time if not currently doing a rep
          updateState('restTime', Math.round((currentTime - refs.restStartTime) / 1000));
        }
      };
      
      // Reset pushup counter
      const resetCounter = () => {
        updateState('pushupCount', 0);
        updateState('formScore', 0);
        updateState('repTime', 0);
        updateState('restTime', 0);
        refs.formScoreHistory = [];
        refs.goodFormCount = 0;
        refs.totalChecks = 0;
        refs.previousAngles = [];
        refs.lastRepTime = 0;
        refs.restStartTime = 0;
        refs.repStartTime = 0;
        updateState('currentPhase', ExerciseTracking.PUSHUP_PHASE.UNKNOWN);
        
        updateState('formFeedback', 'Position yourself in a plank position to start');
        
        setStatusMessage({
          type: state.isTracking ? 'active' : 'ready',
          message: state.isTracking 
            ? 'Counter reset. Continue with your pushups!' 
            : 'Counter reset. Click "Start Tracking" when ready'
        });
      };
      
      // Get session summary
      const getSessionSummary = () => {
        const avgFormScore = refs.formScoreHistory.length > 0 
          ? refs.formScoreHistory.reduce((sum, score) => sum + score, 0) / refs.formScoreHistory.length 
          : 0;
        
        return {
          totalReps: state.pushupCount,
          averageFormScore: Math.round(avgFormScore),
          lastRepTime: state.repTime,
          currentRestTime: state.restTime
        };
      };
      
      // Toggle tracking
      const toggleTracking = () => {
        const newIsTracking = !state.isTracking;
        updateState('isTracking', newIsTracking);
        
        if (newIsTracking) {
          setStatusMessage({
            type: 'active',
            message: 'Tracking active - perform pushups slowly with good form'
          });
        } else {
          setStatusMessage({
            type: 'ready',
            message: 'Tracking paused. Click "Start Tracking" to resume'
          });
        }
      };
      
      // Return the interface for the pushup detector
      return {
        getState: () => state,
        toggleTracking,
        resetCounter,
        detectPushup,
        drawPushupAngles,
        getSessionSummary
      };
    },
  
    createSquatDetector: (webcamRef, canvasRef, setCameraActive, setStatusMessage) => {
      // State references
      const state = {
        isTracking: false,
        squatCount: 0,
        formScore: 0,
        formFeedback: 'Stand with feet shoulder-width apart to start',
        currentPhase: ExerciseTracking.SQUAT_PHASE.UNKNOWN,
        repTime: 0,
        restTime: 0,
        squatDepth: 0
      };
      
      // Refs for tracking
      const refs = {
        previousAngles: [],
        formScoreHistory: [],
        depthHistory: [],
        goodFormCount: 0,
        totalChecks: 0,
        lastRepTime: 0,
        lastRestTime: 0,
        repStartTime: 0,
        restStartTime: 0
      };
      
      // Update state function
      const updateState = (key, value) => {
        state[key] = value;
      };
      
      // Function to draw squat angles on canvas
      const drawSquatAngles = (ctx, landmarks, canvas) => {
        if (!landmarks || landmarks.length < 33) return;
        
        // Draw knee angle
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
        
        // Calculate knee angle
        const kneeResult = ExerciseTracking.checkKneeAngle(landmarks);
        const kneeAngle = kneeResult.angle;
        const kneeAngleTxt = Math.round(kneeAngle) + '°';
        
        // Display the angle near the knee point
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeText(kneeAngleTxt, leftKnee.x * canvas.width + 20, leftKnee.y * canvas.height);
        ctx.fillText(kneeAngleTxt, leftKnee.x * canvas.width + 20, leftKnee.y * canvas.height);
        
        // Draw hip height line to show depth
        const hipMid = ExerciseTracking.getMidpoint(landmarks[23], landmarks[24]);
        const shoulderMid = ExerciseTracking.getMidpoint(landmarks[11], landmarks[12]);
        
        // Draw depth line
        ctx.beginPath();
        ctx.moveTo(0, hipMid.y * canvas.height);
        ctx.lineTo(canvas.width, hipMid.y * canvas.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FFFF00';
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      };
      
      // Function to check squat form
      const checkSquatForm = (landmarks) => {
        refs.totalChecks++;
        
        // Check ankle-knee-hip alignment
        const isAligned = ExerciseTracking.checkAnkleKneeHipAlignment(landmarks);
        
        // Check knee angle for proper depth
        const kneeResult = ExerciseTracking.checkKneeAngle(landmarks);
        const isProperDepth = kneeResult.isProperDepth;
        
        // Check if back is straight
        const nose = landmarks[0];
        const shoulder = ExerciseTracking.getMidpoint(landmarks[11], landmarks[12]);
        const hip = ExerciseTracking.getMidpoint(landmarks[23], landmarks[24]);
        
        // Calculate back angle (should be relatively straight)
        const backAngle = ExerciseTracking.calculateAngle(
          { x: nose.x, y: nose.y },
          { x: shoulder.x, y: shoulder.y },
          { x: hip.x, y: hip.y }
        );
        
        const isBackStraight = backAngle > 160;
        
        // Check if feet are shoulder-width apart
        const leftAnkle = landmarks[27];
        const rightAnkle = landmarks[28];
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        
        const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
        const feetWidth = Math.abs(leftAnkle.x - rightAnkle.x);
        
        const isFeetPositionGood = Math.abs(feetWidth - shoulderWidth) < 0.1;
        
        // Track good form points
        if (isAligned && isBackStraight) refs.goodFormCount++;
        
        // Provide specific feedback based on form issues
        if (!isAligned && !isBackStraight) {
          updateState('formFeedback', 'Keep knees aligned with feet and back straight');
        } else if (!isAligned) {
          updateState('formFeedback', 'Knees caving in - keep them aligned with your feet');
        } else if (!isBackStraight) {
          updateState('formFeedback', 'Try to keep your back straighter during the squat');
        } else if (!isProperDepth && state.currentPhase === ExerciseTracking.SQUAT_PHASE.TRANSITION_DOWN) {
          updateState('formFeedback', 'Try to go lower for a full squat');
        } else if (!isFeetPositionGood) {
          updateState('formFeedback', 'Position feet about shoulder-width apart');
        } else {
          updateState('formFeedback', 'Good form! Keep your chest up');
        }
      };
      
      // Update form score after completing a rep
      const updateSquatFormScore = () => {
        if (refs.totalChecks > 0) {
          // Calculate form score as percentage
          const newFormScore = Math.round((refs.goodFormCount / refs.totalChecks) * 100);
          updateState('formScore', newFormScore);
          refs.formScoreHistory.push(newFormScore);
          
          // Provide feedback based on form score
          if (newFormScore >= 90) {
            updateState('formFeedback', 'Excellent form! Perfect squat.');
          } else if (newFormScore >= 75) {
            updateState('formFeedback', 'Good form! Try to keep knees aligned with toes.');
          } else if (newFormScore >= 50) {
            updateState('formFeedback', 'Decent squat. Focus on keeping your back straight.');
          } else {
            updateState('formFeedback', 'Try to maintain better form throughout the movement.');
          }
          
          // Reset form tracking for next rep
          refs.goodFormCount = 0;
          refs.totalChecks = 0;
        }
      };
      
      // Determine the current phase of the squat
      const determineSquatPhase = (angle) => {
        const currentTime = Date.now();
        let newPhase = state.currentPhase;
        
        switch (state.currentPhase) {
          case ExerciseTracking.SQUAT_PHASE.UNKNOWN:
            // Initial state determination
            if (angle >= ExerciseTracking.SQUAT_ANGLE_THRESHOLDS.UP_MIN) {
              newPhase = ExerciseTracking.SQUAT_PHASE.UP;
              updateState('formFeedback', 'Starting position good. Begin your squat.');
              refs.repStartTime = currentTime;
            } else if (angle <= ExerciseTracking.SQUAT_ANGLE_THRESHOLDS.DOWN_MAX) {
              newPhase = ExerciseTracking.SQUAT_PHASE.DOWN;
              updateState('formFeedback', 'Starting in squat position. Stand up to begin.');
            } else {
                updateState('formFeedback', 'Stand with feet shoulder-width apart to start.');
              }
              break;
              
            case ExerciseTracking.SQUAT_PHASE.UP:
              // From standing position, user starts going down
              if (angle < ExerciseTracking.SQUAT_ANGLE_THRESHOLDS.UP_MIN - ExerciseTracking.SQUAT_ANGLE_THRESHOLDS.THRESHOLD_BUFFER) {
                newPhase = ExerciseTracking.SQUAT_PHASE.TRANSITION_DOWN;
                updateState('formFeedback', 'Going down - keep your knees aligned with toes!');
                refs.repStartTime = currentTime;
                refs.restStartTime = 0; // Reset rest timer when starting a rep
              }
              break;
              
            case ExerciseTracking.SQUAT_PHASE.TRANSITION_DOWN:
              // While going down, check if reached bottom
              if (angle <= ExerciseTracking.SQUAT_ANGLE_THRESHOLDS.DOWN_MAX) {
                newPhase = ExerciseTracking.SQUAT_PHASE.DOWN;
                updateState('formFeedback', 'Good depth! Now stand back up smoothly.');
                
                // Calculate and save squat depth
                const hipY = (landmarks[23].y + landmarks[24].y) / 2; // Average Y of left and right hip
                updateState('squatDepth', hipY);
                refs.depthHistory.push(hipY);
              } else if (angle >= ExerciseTracking.SQUAT_ANGLE_THRESHOLDS.UP_MIN) {
                // Went back up without completing rep
                newPhase = ExerciseTracking.SQUAT_PHASE.UP;
                updateState('formFeedback', 'Incomplete rep - try to go lower.');
              }
              break;
              
            case ExerciseTracking.SQUAT_PHASE.DOWN:
              // From squat position, user starts coming up
              if (angle > ExerciseTracking.SQUAT_ANGLE_THRESHOLDS.DOWN_MAX + ExerciseTracking.SQUAT_ANGLE_THRESHOLDS.THRESHOLD_BUFFER) {
                newPhase = ExerciseTracking.SQUAT_PHASE.TRANSITION_UP;
                updateState('formFeedback', 'Coming up - push through your heels!');
              }
              break;
              
            case ExerciseTracking.SQUAT_PHASE.TRANSITION_UP:
              // While coming up, check if reached top
              if (angle >= ExerciseTracking.SQUAT_ANGLE_THRESHOLDS.UP_MIN) {
                newPhase = ExerciseTracking.SQUAT_PHASE.UP;
                // Complete the rep when returning to the standing position
                updateState('squatCount', state.squatCount + 1);
                
                // Calculate rep time
                const repTime = Math.round((currentTime - refs.repStartTime) / 1000);
                updateState('repTime', repTime);
                refs.lastRepTime = currentTime;
                
                // Provide time-based feedback
                if (repTime < 2) {
                  updateState('formFeedback', 'Too fast! Slow down for better form and muscle engagement.');
                } else if (repTime > 8) {
                  updateState('formFeedback', 'Good control, but try to maintain a steadier pace.');
                } else {
                  updateState('formFeedback', 'Good pace! Keep it up.');
                }
                
                // Start tracking rest time
                refs.restStartTime = currentTime;
                
                // Calculate and update form score
                updateSquatFormScore();
              } else if (angle <= ExerciseTracking.SQUAT_ANGLE_THRESHOLDS.DOWN_MAX) {
                // Went back down without completing rep
                newPhase = ExerciseTracking.SQUAT_PHASE.DOWN;
                updateState('formFeedback', 'Try again - stand all the way up.');
              }
              break;
          }
          
          // Debug log when phase changes
          if (state.currentPhase !== newPhase) {
            console.log(`Squat phase changed: ${state.currentPhase} -> ${newPhase}, Angle: ${angle.toFixed(1)}°`);
            updateState('currentPhase', newPhase);
          }
        };
        
        // Function to detect squat movement
        const detectSquat = (landmarks) => {
          // Check if key landmarks are visible
          const squatLandmarks = [23, 24, 25, 26, 27, 28]; // Hips, knees, ankles
          const VISIBILITY_THRESHOLD = 0.5;
          
          if (!ExerciseTracking.areKeyLandmarksVisible(landmarks, squatLandmarks, VISIBILITY_THRESHOLD)) {
            updateState('formFeedback', 'Cannot detect lower body. Please ensure legs are visible.');
            updateState('currentPhase', ExerciseTracking.SQUAT_PHASE.UNKNOWN);
            return;
          }
          
          // Calculate the knee angle
          const kneeResult = ExerciseTracking.checkKneeAngle(landmarks);
          const currentAngle = kneeResult.angle;
          
          // Add to history for smoothing
          refs.previousAngles.push(currentAngle);
          if (refs.previousAngles.length > 10) { // HISTORY_LENGTH
            refs.previousAngles.shift();
          }
          
          // Calculate smoothed angle
          const smoothedAngle = refs.previousAngles.reduce((sum, angle) => sum + angle, 0) / refs.previousAngles.length;
          
          // Determine phase based on angle
          determineSquatPhase(smoothedAngle);
          
          // Check form during the movement
          if (state.currentPhase === ExerciseTracking.SQUAT_PHASE.TRANSITION_DOWN || 
              state.currentPhase === ExerciseTracking.SQUAT_PHASE.TRANSITION_UP) {
            checkSquatForm(landmarks);
          }
          
          // Calculate rest time between reps
          if (state.currentPhase === ExerciseTracking.SQUAT_PHASE.UP && refs.lastRepTime > 0) {
            const currentTime = Date.now();
            if (refs.restStartTime === 0) {
              refs.restStartTime = currentTime;
            }
            
            // Update rest time if not currently doing a rep
            updateState('restTime', Math.round((currentTime - refs.restStartTime) / 1000));
          }
        };
        
        // Reset squat counter
        const resetCounter = () => {
          updateState('squatCount', 0);
          updateState('formScore', 0);
          updateState('repTime', 0);
          updateState('restTime', 0);
          updateState('squatDepth', 0);
          refs.formScoreHistory = [];
          refs.depthHistory = [];
          refs.goodFormCount = 0;
          refs.totalChecks = 0;
          refs.previousAngles = [];
          refs.lastRepTime = 0;
          refs.restStartTime = 0;
          refs.repStartTime = 0;
          updateState('currentPhase', ExerciseTracking.SQUAT_PHASE.UNKNOWN);
          
          updateState('formFeedback', 'Stand with feet shoulder-width apart to start');
          
          setStatusMessage({
            type: state.isTracking ? 'active' : 'ready',
            message: state.isTracking 
              ? 'Counter reset. Continue with your squats!' 
              : 'Counter reset. Click "Start Tracking" when ready'
          });
        };
        
        // Get session summary
        const getSessionSummary = () => {
          const avgFormScore = refs.formScoreHistory.length > 0 
            ? refs.formScoreHistory.reduce((sum, score) => sum + score, 0) / refs.formScoreHistory.length 
            : 0;
          
          const avgDepth = refs.depthHistory.length > 0
            ? refs.depthHistory.reduce((sum, depth) => sum + depth, 0) / refs.depthHistory.length
            : 0;
            
          return {
            totalReps: state.squatCount,
            averageFormScore: Math.round(avgFormScore),
            averageDepth: avgDepth.toFixed(2),
            lastRepTime: state.repTime,
            currentRestTime: state.restTime
          };
        };
        
        // Toggle tracking
        const toggleTracking = () => {
          const newIsTracking = !state.isTracking;
          updateState('isTracking', newIsTracking);
          
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
        };
        
        // Return the interface for the squat detector
        return {
          getState: () => state,
          toggleTracking,
          resetCounter,
          detectSquat,
          drawSquatAngles,
          getSessionSummary
        };
      },
      
      // Main processor function to handle pose detection
      processPose: (results, webcamRef, canvasRef, exercise, exerciseTracker, setStatusMessage) => {
        // Get canvas context
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // If no exercise tracker or no results, return
        if (!exerciseTracker || !results.poseLandmarks) {
          return;
        }
        
        // Check if tracking is active
        const state = exerciseTracker.getState();
        if (!state.isTracking) {
          return;
        }
        
        // Process the landmarks based on exercise type
        if (exercise === 'pushup') {
          exerciseTracker.detectPushup(results.poseLandmarks);
          exerciseTracker.drawPushupAngles(ctx, results.poseLandmarks, canvas);
        } else if (exercise === 'squat') {
          exerciseTracker.detectSquat(results.poseLandmarks);
          exerciseTracker.drawSquatAngles(ctx, results.poseLandmarks, canvas);
        }
      }
    };
    
    // Export the exercise tracking module
    export default ExerciseTracking;