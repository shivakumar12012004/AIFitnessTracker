// PushUpAnalyzer.js
class PushUpAnalyzer {
    constructor() {
      // Push-up counter variables
      this.count = 0;
      this.direction = 0; // 0: going down, 1: going up
      this.lastValidLandmarks = null;
      this.currentAngle = 0;
      this.qualityTracker = { goodCount: 0, totalCount: 0 };
      this.pushupQuality = '';
    }
  
    // Calculate angle between three points
    calculateAngle(a, b, c) {
      const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
      let angle = Math.abs(radians * (180.0 / Math.PI));
      if (angle > 180.0) angle = 360 - angle;
      return angle;
    }
  
    // Evaluate push-up quality
    evaluatePushupQuality(angle) {
      // Check if the pushup depth is good (going low enough)
      if (angle < 90) {
        return 'good';
      } else if (angle < 110) {
        return 'moderate';
      } else {
        return 'poor';
      }
    }
  
    // Process pose landmarks to count push-ups and analyze form
    processPose(poseLandmarks) {
      if (!poseLandmarks || poseLandmarks.length < 17) {
        return {
          count: this.count,
          angle: this.currentAngle,
          quality: this.pushupQuality,
          direction: this.direction
        };
      }
  
      const shoulder = poseLandmarks[12];
      const elbow = poseLandmarks[14];
      const wrist = poseLandmarks[16];
  
      // Calculate the angle
      const angle = this.calculateAngle(shoulder, elbow, wrist);
      this.currentAngle = Math.round(angle);
  
      // Evaluate push-up quality
      const quality = this.evaluatePushupQuality(angle);
      
      // Push-up counting logic
      if (angle > 160 && this.direction === 0) {
        this.count += 1;
        this.direction = 1;
        
        // Track quality stats
        this.qualityTracker.totalCount += 1;
        if (quality === 'good') {
          this.qualityTracker.goodCount += 1;
        }
        
        // Update overall quality feedback
        const qualityPercentage = (this.qualityTracker.goodCount / this.qualityTracker.totalCount) * 100;
        
        if (qualityPercentage >= 80) {
          this.pushupQuality = 'good';
        } else if (qualityPercentage >= 50) {
          this.pushupQuality = 'warning';
        } else {
          this.pushupQuality = 'poor';
        }
      } else if (angle < 70 && this.direction === 1) {
        this.direction = 0;
      }
  
      return {
        count: this.count,
        angle: this.currentAngle,
        quality: this.pushupQuality,
        direction: this.direction,
        momentaryQuality: quality
      };
    }
  
    // Get form feedback message based on current state
    getFormFeedback() {
      if (this.direction === 0 && this.currentAngle < 100) {
        return {
          message: "Good depth!",
          color: "#1b7740"
        };
      } else if (this.direction === 1 && this.currentAngle > 150) {
        return {
          message: "Good extension!",
          color: "#1b7740"
        };
      }
      return null;
    }
  
    // Get quality feedback message
    getQualityMessage() {
      if (!this.pushupQuality) return '';
      
      if (this.pushupQuality === 'good') {
        return 'Excellent form! Keep up the good work!';
      } else if (this.pushupQuality === 'warning') {
        return 'Good effort! Try to go lower for better results.';
      } else {
        return 'Focus on proper form: go deeper on each push-up.';
      }
    }
  
    // Reset all counters and tracking
    reset() {
      this.count = 0;
      this.direction = 0;
      this.lastValidLandmarks = null;
      this.currentAngle = 0;
      this.qualityTracker = { goodCount: 0, totalCount: 0 };
      this.pushupQuality = '';
    }
  
    // Get current state
    getState() {
      return {
        count: this.count,
        angle: this.currentAngle,
        quality: this.pushupQuality,
        qualityMessage: this.getQualityMessage(),
        formFeedback: this.getFormFeedback()
      };
    }
  }
  
  export default PushUpAnalyzer;