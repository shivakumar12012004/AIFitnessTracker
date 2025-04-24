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


/*import React, { useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import StatusIndicator from './components/StatusIndicator';
import VideoContainer from './components/VideoContainer';
import Controls from './components/Controls';
import StatsContainer from './components/StatsContainer';
import usePoseDetection from './hooks/usePoseDetection';
import { trackPushUps, trackSquats } from './utils/ExerciseTracking';

function App() {
  const [cameraActive, setCameraActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState({
    type: 'ready',
    message: 'Click "Start Camera" to begin'
  });

  const [selectedExercise, setSelectedExercise] = useState('Sit Ups');
  const [reps, setReps] = useState(0);
  const [currentAngle, setCurrentAngle] = useState(0);

  const {
    webcamRef,
    canvasRef,
    isTracking,
    situpCount,
    formScore,
    formFeedback,
    currentPhase,
    poseLandmarks,
    startCamera,
    stopCamera,
    toggleTracking,
    resetCounter
  } = usePoseDetection(setCameraActive, setStatusMessage);

  if (poseLandmarks && poseLandmarks.length > 0) {
    if (selectedExercise === 'Push Ups') {
      const { count, angle } = trackPushUps(poseLandmarks);
      setReps(count);
      setCurrentAngle(angle);
    } else if (selectedExercise === 'Squats') {
      const { count, angle } = trackSquats(poseLandmarks);
      setReps(count);
      setCurrentAngle(angle);
    }
    // Sit Ups tracking is already handled in usePoseDetection
  }

  return (
    <>
      <Header />

      <div className="container">
        <StatusIndicator type={statusMessage.type} message={statusMessage.message} />

        <div className="exercise-selector">
          <label htmlFor="exercise">Select Exercise: </label>
          <select id="exercise" value={selectedExercise} onChange={(e) => setSelectedExercise(e.target.value)}>
            <option>Push Ups</option>
            <option>Squats</option>
            <option>Sit Ups</option>
          </select>
        </div>

        <VideoContainer 
          webcamRef={webcamRef} 
          canvasRef={canvasRef} 
          currentPhase={currentPhase} 
        />

        <Controls 
          cameraActive={cameraActive}
          isTracking={isTracking}
          startCamera={startCamera}
          stopCamera={stopCamera}
          toggleTracking={toggleTracking}
          resetCounter={resetCounter}
        />

        <StatsContainer 
          situpCount={selectedExercise === 'Sit Ups' ? situpCount : reps} 
          formScore={formScore} 
          formFeedback={formFeedback} 
          angle={currentAngle}
        />
      </div>

      <Footer />
    </>
  );
}

export default App;




/*import React, { useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import StatusIndicator from './components/StatusIndicator';
import VideoContainer from './components/VideoContainer';
import Controls from './components/Controls';
import StatsContainer from './components/StatsContainer';
import usePoseDetection from './hooks/usePoseDetection';


function App() {
  // Application state
  const [cameraActive, setCameraActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState({
    type: 'ready',
    message: 'Click "Start Camera" to begin'
  });

  const {
    webcamRef,
    canvasRef,
    isTracking,
    situpCount,
    formScore,
    formFeedback,
    currentPhase,
    startCamera,
    stopCamera,
    toggleTracking,
    resetCounter
  } = usePoseDetection(setCameraActive, setStatusMessage);

  return (
    <>
      <Header />
      
      <div className="container">
        <StatusIndicator type={statusMessage.type} message={statusMessage.message} />
        
        <VideoContainer 
          webcamRef={webcamRef} 
          canvasRef={canvasRef} 
          currentPhase={currentPhase} 
        />
        
        <Controls 
          cameraActive={cameraActive}
          isTracking={isTracking}
          startCamera={startCamera}
          stopCamera={stopCamera}
          toggleTracking={toggleTracking}
          resetCounter={resetCounter}
        />
        
        <StatsContainer 
          situpCount={situpCount} 
          formScore={formScore} 
          formFeedback={formFeedback} 
        />
      </div>
      
      <Footer />
    </>
  );
}

export default App;*/