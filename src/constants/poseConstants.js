// constants/poseConstants.js

// Exercise phase definitions
export const PHASE = {
    UNKNOWN: 'unknown',
    UP: 'up',
    TRANSITION_DOWN: 'going down',
    DOWN: 'down',
    TRANSITION_UP: 'coming up'
  };
  
  // Angle thresholds for sit-up phases
  export const ANGLE_THRESHOLDS = {
    UP_MIN: 80,       // Minimum angle when in up position
    DOWN_MAX: 40,     // Maximum angle when in down position
    THRESHOLD_BUFFER: 5  // Buffer to prevent oscillation
  };
  
  // History tracking for smoothing
  export const HISTORY_LENGTH = 5;
  
  // Key landmarks for the pose detection
  export const KEY_LANDMARK_INDICES = [11, 12, 23, 24, 25, 26]; // Shoulders, hips, knees
  export const VISIBILITY_THRESHOLD = 0.7;