class SquatAnalyzer {
  constructor() {
    this.count = 0;
    this.inSquat = false;
    this.lastAngle = 0;
    this.quality = '';
    this.formFeedback = null;
    
    // Thresholds
    this.SQUAT_THRESHOLD = 110; // Angle at which we consider the person in a squat
    this.STAND_THRESHOLD = 160;  // Angle at which we consider the person standing
    
    // Min depth that we'll count as a proper squat
    this.MIN_SQUAT_DEPTH = 95;

    // Good form tracking
    this.depthStreak = 0;
    this.kneeAlignmentIssues = 0;
    this.torsoLeanIssues = 0;
  }

  reset() {
    this.count = 0;
    this.inSquat = false;
    this.lastAngle = 0;
    this.quality = '';
    this.formFeedback = null;
    this.depthStreak = 0;
    this.kneeAlignmentIssues = 0;
    this.torsoLeanIssues = 0;
  }

  // Calculate the angle between three points
  calculateAngle(pointA, pointB, pointC) {
    if (!pointA || !pointB || !pointC) return 0;
    
    const angleRadians = Math.atan2(
      pointC.y - pointB.y,
      pointC.x - pointB.x
    ) - Math.atan2(
      pointA.y - pointB.y,
      pointA.x - pointB.x
    );
    
    let angleDegrees = Math.abs(angleRadians * 180 / Math.PI);
    
    // Adjust the angle for knee calculation
    if (angleDegrees > 180) {
      angleDegrees = 360 - angleDegrees;
    }
    
    return Math.round(angleDegrees);
  }

  // Check knee alignment (knees should track over toes)
  checkKneeAlignment(pose) {
    try {
      const leftHip = pose[23];
      const leftKnee = pose[25];
      const leftAnkle = pose[27];
      const rightHip = pose[24];
      const rightKnee = pose[26];
      const rightAnkle = pose[28];
      
      // Check if knees are caving in - simplified check
      const leftKneeAlignment = (leftKnee.x < leftAnkle.x) && this.inSquat;
      const rightKneeAlignment = (rightKnee.x > rightAnkle.x) && this.inSquat;
      
      if (leftKneeAlignment || rightKneeAlignment) {
        this.kneeAlignmentIssues++;
        return false;
      }
      
      return true;
    } catch (e) {
      return true;
    }
  }

  // Check torso position (should be relatively upright)
  checkTorsoPosition(pose) {
    try {
      const leftShoulder = pose[11];
      const leftHip = pose[23];
      const rightShoulder = pose[12];
      const rightHip = pose[24];
      
      // Calculate torso angle from vertical
      const midShoulder = {
        x: (leftShoulder.x + rightShoulder.x) / 2,
        y: (leftShoulder.y + rightShoulder.y) / 2
      };
      
      const midHip = {
        x: (leftHip.x + rightHip.x) / 2,
        y: (leftHip.y + rightHip.y) / 2
      };
      
      // Create a vertical point above the hips
      const vertical = {
        x: midHip.x,
        y: midHip.y - 0.5 // Arbitrary vertical distance
      };
      
      // Calculate angle between vertical and torso
      const torsoAngle = this.calculateAngle(vertical, midHip, midShoulder);
      
      // If leaning too far forward (> 35 degrees from vertical) when in squat
      if (torsoAngle > 35 && this.inSquat) {
        this.torsoLeanIssues++;
        return false;
      }
      
      return true;
    } catch (e) {
      return true;
    }
  }

  // Main function to process pose landmarks
  processPose(pose) {
    if (!pose || pose.length < 33) {
      return { angle: 0, count: this.count, quality: this.quality };
    }
    
    // Get landmarks for knee angle calculation
    const leftHip = pose[23];
    const leftKnee = pose[25];
    const leftAnkle = pose[27];
    
    // Calculate knee angle
    const angle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
    this.lastAngle = angle;
    
    // Check form issues
    this.checkKneeAlignment(pose);
    this.checkTorsoPosition(pose);
    
    // Squat counting logic
    if (!this.inSquat && angle < this.SQUAT_THRESHOLD) {
      this.inSquat = true;
      
      // Track depth quality
      if (angle <= this.MIN_SQUAT_DEPTH) {
        this.depthStreak++;
      }
    }
    
    // When moving back up from squat
    if (this.inSquat && angle > this.STAND_THRESHOLD) {
      this.inSquat = false;
      this.count++;
      
      // Evaluate quality after each squat
      this.evaluateQuality();
    }
    
    // Update form feedback
    this.updateFormFeedback();
    
    return {
      angle: angle,
      count: this.count,
      quality: this.quality
    };
  }

  // Evaluate the quality of the squat
  evaluateQuality() {
    // Check for good depth
    const goodDepth = this.depthStreak > 0;
    
    // Check for knee alignment issues
    const goodKneeAlignment = this.kneeAlignmentIssues < 3;
    
    // Check for excessive forward lean
    const goodTorsoPosition = this.torsoLeanIssues < 3;
    
    // Determine overall quality
    if (goodDepth && goodKneeAlignment && goodTorsoPosition) {
      this.quality = 'excellent';
    } else if ((goodDepth && goodKneeAlignment) || (goodDepth && goodTorsoPosition)) {
      this.quality = 'good';
    } else if (goodDepth || goodKneeAlignment || goodTorsoPosition) {
      this.quality = 'fair';
    } else {
      this.quality = 'poor';
    }
  }

  // Update form feedback based on current issues
  updateFormFeedback() {
    if (this.inSquat) {
      if (this.lastAngle > this.MIN_SQUAT_DEPTH) {
        this.formFeedback = {
          message: "Go deeper! Aim for parallel thighs to ground.",
          color: "#ff9900" // Orange
        };
      } else if (this.kneeAlignmentIssues > 2) {
        this.formFeedback = {
          message: "Keep knees aligned with toes!",
          color: "#ff0000" // Red
        };
      } else if (this.torsoLeanIssues > 2) {
        this.formFeedback = {
          message: "Keep chest up, don't lean too far forward!",
          color: "#ff0000" // Red
        };
      } else {
        this.formFeedback = {
          message: "Good squat form!",
          color: "#00cc00" // Green
        };
      }
    } else if (this.count > 0) {
      // Display quality feedback after a squat
      switch (this.quality) {
        case 'excellent':
          this.formFeedback = {
            message: "Excellent squat form!",
            color: "#00cc00" // Green
          };
          break;
        case 'good':
          this.formFeedback = {
            message: "Good squat form, keep it up!",
            color: "#66cc00" // Light green
          };
          break;
        case 'fair':
          this.formFeedback = {
            message: "Fair squat, work on depth and alignment.",
            color: "#ff9900" // Orange
          };
          break;
        case 'poor':
          this.formFeedback = {
            message: "Poor form. Check guidelines and try again.",
            color: "#ff0000" // Red
          };
          break;
        default:
          this.formFeedback = null;
      }
    } else {
      this.formFeedback = null;
    }
  }

  // Get the form feedback for display
  getFormFeedback() {
    return this.formFeedback;
  }

  // Get quality message for display
  getQualityMessage() {
    switch (this.quality) {
      case 'excellent':
        return "Excellent form! Perfect depth and alignment.";
      case 'good':
        return "Good form! Minor improvements needed.";
      case 'fair':
        return "Fair form. Work on depth and knee tracking.";
      case 'poor':
        return "Form needs improvement. Review guidelines.";
      default:
        return "";
    }
  }
}

export default SquatAnalyzer;