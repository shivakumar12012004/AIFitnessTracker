import React from 'react';

const StatsContainer = ({ situpCount, formScore, formFeedback }) => {
  return (
    <div className="stats-container">
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-value" id="situp-count">
            {situpCount}
          </div>
          <div className="stat-label">Sit-ups</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" id="form-score">
            {formScore}%
          </div>
          <div className="stat-label">Form Score</div>
        </div>
      </div>
      <div id="form-feedback">{formFeedback}</div>
    </div>
  );
};

export default StatsContainer;