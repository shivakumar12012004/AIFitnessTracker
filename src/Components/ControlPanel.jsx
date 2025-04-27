import React from 'react';

const ControlPanel = ({ 
  modelReady, 
  cameraActive, 
  onStartCamera, 
  onStopCamera, 
  onVideoUpload, 
  onResetCount 
}) => {
  return (
    <div className="control-panel">
      <button 
        className="button button-primary" 
        onClick={onStartCamera} 
        disabled={!modelReady || cameraActive}
      >
        Start Camera
      </button>
      <button 
        className="button button-danger" 
        onClick={onStopCamera} 
        disabled={!modelReady || !cameraActive}
      >
        Stop Camera
      </button>
      <label className="file-input-label" disabled={!modelReady}>
        Upload Video
        <input 
          type="file" 
          className="file-input" 
          accept="video/*" 
          onChange={onVideoUpload} 
          disabled={!modelReady}
        />
      </label>
      <button 
        className="button button-secondary" 
        onClick={onResetCount} 
        disabled={!modelReady}
      >
        Reset Count
      </button>
    </div>
  );
};

export default ControlPanel;