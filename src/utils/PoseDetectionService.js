// PoseDetectionService.js
class PoseDetectionService {
    constructor() {
      this.poseModel = null;
      this.isModelReady = false;
      this.isLoading = true;
      this.scriptsLoaded = false;
    }
  
    // Load all required MediaPipe scripts
    async loadScripts() {
      const scripts = [
        { src: 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js', id: 'mediapipe-pose' },
        { src: 'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js', id: 'mediapipe-drawing' },
        { src: 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js', id: 'mediapipe-camera' }
      ];
  
      let scriptPromises = [];
  
      scripts.forEach(script => {
        if (!document.getElementById(script.id)) {
          const promise = new Promise((resolve, reject) => {
            const scriptEl = document.createElement('script');
            scriptEl.src = script.src;
            scriptEl.id = script.id;
            scriptEl.async = true;
            scriptEl.onload = () => resolve();
            scriptEl.onerror = () => reject(`Failed to load ${script.src}`);
            document.body.appendChild(scriptEl);
          });
          scriptPromises.push(promise);
        }
      });
  
      try {
        await Promise.all(scriptPromises);
        console.log('All MediaPipe scripts loaded successfully');
        this.scriptsLoaded = true;
        return true;
      } catch (error) {
        console.error('Error loading MediaPipe scripts:', error);
        return false;
      }
    }
  
    // Initialize the pose detection model
    async initializePoseModel(onResultsCallback) {
      if (!this.scriptsLoaded) {
        console.error('Scripts must be loaded before initializing pose model');
        return false;
      }
      
      const initializeWhenReady = () => {
        return new Promise((resolve, reject) => {
          const checkAndInitialize = () => {
            if (typeof window.Pose !== 'function') {
              setTimeout(checkAndInitialize, 100);
              return;
            }
            
            try {
              const pose = new window.Pose({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
              });
  
              pose.setOptions({
                modelComplexity: 1,
                smoothLandmarks: true,
                enableSegmentation: false,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
              });
  
              pose.onResults(onResultsCallback);
              this.poseModel = pose;
              resolve(true);
            } catch (error) {
              console.error('Error initializing pose:', error);
              reject(error);
            }
          };
  
          checkAndInitialize();
        });
      };
  
      try {
        await initializeWhenReady();
        await this.loadPoseModel();
        return true;
      } catch (error) {
        console.error('Failed to initialize pose model:', error);
        return false;
      }
    }
  
    // Load and warm up the pose model
    async loadPoseModel() {
      try {
        const tempImage = document.createElement("canvas");
        tempImage.width = 640;
        tempImage.height = 480;
        const ctx = tempImage.getContext("2d");
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, 640, 480);
        
        await this.poseModel.send({ image: tempImage });
        
        console.log('MediaPipe Pose model loaded successfully!');
        this.isModelReady = true;
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error('Error loading pose model:', error);
        // Retry loading
        return new Promise((resolve) => {
          setTimeout(async () => {
            const result = await this.loadPoseModel();
            resolve(result);
          }, 1000);
        });
      }
    }
  
    // Create and start camera
    createCamera(videoElement, onFrameCallback) {
      if (!this.isModelReady) {
        console.error("Pose model is not ready");
        return null;
      }
  
      try {
        const Camera = window.Camera;
        
        if (!Camera) {
          console.error("Camera API not loaded properly");
          return null;
        }
        
        const camera = new Camera(videoElement, {
          onFrame: onFrameCallback,
          width: 640,
          height: 480
        });
        
        return camera;
      } catch (error) {
        console.error('Error creating camera:', error);
        return null;
      }
    }
  
    // Process a single video frame through the pose model
    async processFrame(imageElement) {
      if (!this.poseModel || !this.isModelReady) {
        return false;
      }
      
      try {
        await this.poseModel.send({ image: imageElement });
        return true;
      } catch (error) {
        console.error('Error processing frame:', error);
        return false;
      }
    }
  
    // Get model status
    getStatus() {
      return {
        isLoading: this.isLoading,
        isModelReady: this.isModelReady,
        scriptsLoaded: this.scriptsLoaded
      };
    }
  }
  
  export default PoseDetectionService;