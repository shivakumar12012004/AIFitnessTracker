// src/App.js
import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';
import ExerciseAnalyzer from './components/ExerciseAnalyzer';

function App() {
  const [showExerciseAnalyzer, setShowExerciseAnalyzer] = useState(false);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <h1>Fitness Form Analyzer</h1>
        <p>
          Analyze your push-ups and squats with AI-powered form detection
        </p>
        <button 
          className="App-link" 
          onClick={() => setShowExerciseAnalyzer(!showExerciseAnalyzer)}
        >
          {showExerciseAnalyzer ? 'Hide Exercise Analyzer' : 'Start Exercise Analysis'}
        </button>
      </header>
      
      {showExerciseAnalyzer && (
        <div className="analyzer-container">
          <ExerciseAnalyzer />
        </div>
      )}
    </div>
  );
}

export default App;
