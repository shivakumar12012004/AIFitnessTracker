import React from 'react';

const Header = ({ selectedExercise, setSelectedExercise, darkMode, toggleDarkMode }) => {
  return (
    <header className="header">
      <div className="nav-container">
        <div className="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 9V15M9 9V15M11 9V15M13 9V15M15 9V15M17 9V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 5H21M3 19H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          FitTrack Pro
        </div>
        <div className="nav-buttons">
          <button 
            className={`exercise-btn ${selectedExercise === 'situp' ? 'active' : ''}`}
            onClick={() => setSelectedExercise('situp')}
          >
            Sit-ups
          </button>
          <button 
            className={`exercise-btn ${selectedExercise === 'pushup' ? 'active' : ''}`}
            onClick={() => setSelectedExercise('pushup')}
          >
            Push-ups
          </button>
          <button 
            className={`exercise-btn ${selectedExercise === 'squat' ? 'active' : ''}`}
            onClick={() => setSelectedExercise('squat')}
          >
            Squats
          </button>
          <button className="theme-toggle" onClick={toggleDarkMode}>
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

