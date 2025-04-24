import React from 'react';

const StatusIndicator = ({ type, message }) => {
  return (
    <div className={`status-indicator ${type}`} id="status">
      {message}
    </div>
  );
};

export default StatusIndicator;