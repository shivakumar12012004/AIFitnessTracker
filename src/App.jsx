import React from 'react';
import './styles/App.css';
import ExerciseTrainer from './Components/ExerciseTrainer';

const App = () => {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Exercise Analysis Trainer</h1>
        <p>Perfect your form with real-time AI-powered analysis</p>
      </header>

      <ExerciseTrainer />

      <footer className="app-footer">
        <p>Exercise Analysis Trainer &copy; {new Date().getFullYear()} | Powered by MediaPipe Pose Detection</p>
        <p>Get real-time feedback on your exercise form and track your progress</p>
      </footer>
    </div>
  );
};

export default App;