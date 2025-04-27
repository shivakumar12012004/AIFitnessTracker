import React from 'react';

const VideoCanvas = ({ videoRef, canvasRef }) => {
  return (
    <div className="media-container">
      {/* Video is hidden and only used for processing */}
      <video 
        ref={videoRef}
        className="video-element" 
        playsInline 
        style={{ display: 'none' }} 
      />
      {/* Only show the canvas with processed results */}
      <canvas 
        ref={canvasRef}
        className="canvas-element" 
        width="640" 
        height="480" 
        style={{ border: '2px solid #4361ee' }}
      />
    </div>
  );
};

export default VideoCanvas;