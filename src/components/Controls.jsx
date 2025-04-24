import React from 'react';

const Controls = ({ 
  cameraActive, 
  isTracking, 
  startCamera, 
  stopCamera, 
  toggleTracking, 
  resetCounter 
}) => {
  return (
    <div className="controls">
      <button 
        className="primary-btn" 
        onClick={startCamera} 
        disabled={cameraActive}
      >
        Start Camera
      </button>
      
      <button 
        className={isTracking ? "danger-btn" : "secondary-btn"} 
        onClick={toggleTracking} 
        disabled={!cameraActive}
      >
        {isTracking ? 'Pause Tracking' : 'Start Tracking'}
      </button>
      
      <button 
        className="secondary-btn" 
        onClick={resetCounter} 
        disabled={!cameraActive}
      >
        Reset Counter
      </button>
      
      <button 
        className="danger-btn" 
        onClick={stopCamera} 
        disabled={!cameraActive}
      >
        Stop Camera
      </button>
    </div>
  );
};

export default Controls;