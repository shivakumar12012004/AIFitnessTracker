import React from 'react';

const StatsDisplay = ({ currentAngle, count, quality, qualityMessage, exerciseType = 'pushup' }) => {
  // Quality indicator class
  const getQualityClass = () => {
    if (!quality) return '';
    return `quality-indicator quality-${quality}`;
  };

  const angleLabel = exerciseType === 'squat' ? 'Knee Angle' : 'Elbow Angle';
  const countLabel = exerciseType === 'squat' ? 'Squat Count' : 'Push-Up Count';

  return (
    <div className="stats-container">
      <h3 className="stats-header">Real-time Analysis</h3>
      <p className="angle-display">Current {angleLabel}: {currentAngle}°</p>
      <p className={`count-display ${count > 0 ? 'count-updated' : ''}`}>
        {countLabel}: {count}
      </p>
      
      {quality && (
        <div className={getQualityClass()}>
          {qualityMessage}
        </div>
      )}
    </div>
  );
};

export default StatsDisplay;