import React, { useEffect } from 'react';

const VideoContainer = ({ webcamRef, canvasRef, currentPhase }) => {
  // Adjust phase indicator styling based on current phase
  const getPhaseIndicatorStyle = () => {
    switch (currentPhase) {
      case 'up':
        return { backgroundColor: 'rgba(76, 175, 80, 0.7)' };
      case 'down':
        return { backgroundColor: 'rgba(33, 150, 243, 0.7)' };
      case 'going down':
      case 'coming up':
        return { backgroundColor: 'rgba(255, 152, 0, 0.7)' };
      default:
        return { backgroundColor: 'rgba(0, 0, 0, 0.6)' };
    }
  };

  return (
    <div className="video-container">
      <video 
        ref={webcamRef}
        id="webcam" 
        autoPlay 
        playsInline
      />
      <canvas 
        ref={canvasRef}
        id="canvas-overlay"
      />
      <div 
        className="phase-indicator" 
        style={getPhaseIndicatorStyle()}
      >
        {currentPhase}
      </div>
    </div>
  );
};

export default VideoContainer;