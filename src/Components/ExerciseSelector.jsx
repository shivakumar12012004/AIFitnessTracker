import React from 'react';

const ExerciseSelector = ({ selectedExercise, onExerciseChange }) => {
  return (
    <div className="exercise-selector">
      <label htmlFor="exercise-select">Select Exercise: </label>
      <select 
        id="exercise-select" 
        value={selectedExercise} 
        onChange={(e) => onExerciseChange(e.target.value)}
        className="exercise-dropdown"
      >
        <option value="pushup">Push-Up</option>
        <option value="squat">Squat</option>
      </select>
    </div>
  );
};

export default ExerciseSelector;