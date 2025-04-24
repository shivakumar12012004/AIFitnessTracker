// utils/poseUtils.js

// Get midpoint between two landmarks
export const getMidpoint = (landmark1, landmark2) => {
    return {
      x: (landmark1.x + landmark2.x) / 2,
      y: (landmark1.y + landmark2.y) / 2,
      z: (landmark1.z + landmark2.z) / 2,
      visibility: Math.min(landmark1.visibility, landmark2.visibility)
    };
  };
  
  // Calculate angle between three points (in degrees)
  export const calculateAngle = (pointA, pointB, pointC) => {
    // Convert to 2D for simplicity since we're working with a 2D screen
    // Calculate vectors from point B to points A and C
    const vectorBA = {
      x: pointA.x - pointB.x,
      y: pointA.y - pointB.y
    };
    
    const vectorBC = {
      x: pointC.x - pointB.x,
      y: pointC.y - pointB.y
    };
    
    // Calculate the dot product
    const dotProduct = vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y;
    
    // Calculate the magnitudes
    const magnitudeBA = Math.sqrt(vectorBA.x * vectorBA.x + vectorBA.y * vectorBA.y);
    const magnitudeBC = Math.sqrt(vectorBC.x * vectorBC.x + vectorBC.y * vectorBC.y);
    
    // Calculate the angle in radians
    const angleRad = Math.acos(dotProduct / (magnitudeBA * magnitudeBC));
    
    // Convert to degrees
    let angleDeg = angleRad * (180 / Math.PI);
    
    // Return the angle
    return angleDeg;
  };
  
  // Check if key landmarks are visible enough
  export const areKeyLandmarksVisible = (landmarks, indices, threshold) => {
    for (const index of indices) {
      if (landmarks[index].visibility < threshold) {
        return false;
      }
    }
    return true;
  };
  
  // Check if torso is aligned properly
  export const checkTorsoAlignment = (landmarks) => {
    // Calculate spine straightness by comparing neck and hip positions
    const neck = landmarks[0]; // Nose as reference
    const shoulderMid = getMidpoint(landmarks[11], landmarks[12]);
    const hipMid = getMidpoint(landmarks[23], landmarks[24]);
    
    // Calculate vector from hip to shoulder
    const spineVector = {
      x: shoulderMid.x - hipMid.x,
      y: shoulderMid.y - hipMid.y
    };
    
    // Calculate vector from shoulder to neck
    const neckVector = {
      x: neck.x - shoulderMid.x,
      y: neck.y - shoulderMid.y
    };
    
    // Calculate the angle between these vectors
    const dotProduct = spineVector.x * neckVector.x + spineVector.y * neckVector.y;
    const spineLength = Math.sqrt(spineVector.x * spineVector.x + spineVector.y * spineVector.y);
    const neckLength = Math.sqrt(neckVector.x * neckVector.x + neckVector.y * neckVector.y);
    
    const cosAngle = dotProduct / (spineLength * neckLength);
    const angle = Math.acos(Math.min(Math.max(cosAngle, -1), 1)) * (180 / Math.PI);
    
    // If angle is close to 180 degrees, the spine is straight
    return angle > 150;
  };
  
  // Check if shoulders are level (not twisted)
  export const checkShouldersLevel = (landmarks) => {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    
    // Check if shoulders are roughly at the same height
    const heightDifference = Math.abs(leftShoulder.y - rightShoulder.y);
    
    // Allow some tolerance since people aren't perfectly symmetric
    return heightDifference < 0.05;
  };