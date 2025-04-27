import React, { useState } from 'react';
import ExerciseSelector from './ExerciseSelector';
import PushUpTrainer from './PushUpTrainer';
import SquatTrainer from './SquatTrainer';

const ExerciseTrainer = () => {
  const [selectedExercise, setSelectedExercise] = useState('pushup');

  const handleExerciseChange = (exercise) => {
    setSelectedExercise(exercise);
  };

  return (
    <div className="exercise-trainer-container">
      <div className="exercise-control-panel">
        <ExerciseSelector
          selectedExercise={selectedExercise}
          onExerciseChange={handleExerciseChange}
        />
      </div>
      
      {selectedExercise === 'pushup' ? (
        <PushUpTrainer />
      ) : (
        <SquatTrainer />
      )}
    </div>
  );
};

export default ExerciseTrainer;