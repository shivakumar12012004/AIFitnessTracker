import React from 'react';

const FormGuidelines = ({ exerciseType = 'pushup' }) => {
  if (exerciseType === 'squat') {
    return (
      <>
        {/* Rules Section */}
        <section className="rules-section">
          <h2>Proper Squat Form Guidelines</h2>
          <ul className="rules-list">
            <li><strong>Foot placement:</strong> Place feet shoulder-width apart or slightly wider.</li>
            <li><strong>Toe angle:</strong> Toes should be pointed slightly outward (about 5-20 degrees).</li>
            <li><strong>Knee alignment:</strong> Knees should track over toes, not caving inward.</li>
            <li><strong>Depth:</strong> Lower until thighs are at least parallel to the ground.</li>
            <li><strong>Back position:</strong> Maintain a neutral spine throughout the movement.</li>
            <li><strong>Weight distribution:</strong> Keep weight in mid-foot to heel, not on toes.</li>
            <li><strong>Hip hinge:</strong> Initiate the movement by hinging at the hips.</li>
            <li><strong>Breathing:</strong> Inhale on the way down, exhale on the way up.</li>
          </ul>
        </section>

        {/* Common Mistakes Section */}
        <section className="rules-section">
          <h2>Common Squat Mistakes to Avoid</h2>
          <ul className="rules-list">
            <li><strong>Knees caving in:</strong> Keep knees aligned with toes.</li>
            <li><strong>Rising on toes:</strong> Keep weight in heels and mid-foot.</li>
            <li><strong>Rounding back:</strong> Maintain neutral spine position.</li>
            <li><strong>Shallow depth:</strong> Aim for thighs parallel to ground or lower.</li>
            <li><strong>Leaning too far forward:</strong> Keep chest up and back straight.</li>
          </ul>
        </section>
      </>
    );
  } else {
    return (
      <>
        {/* Rules Section */}
        <section className="rules-section">
          <h2>Proper Push-Up Form Guidelines</h2>
          <ul className="rules-list">
            <li><strong>Hand placement:</strong> Place hands slightly wider than shoulder-width apart.</li>
            <li><strong>Body alignment:</strong> Maintain a straight line from head to heels.</li>
            <li><strong>Elbow angle:</strong> At the bottom of the movement, elbows should bend to approximately 90 degrees or less.</li>
            <li><strong>Range of motion:</strong> Lower your chest to nearly touch the ground, then fully extend arms at the top.</li>
            <li><strong>Breathing:</strong> Inhale on the way down, exhale on the way up.</li>
            <li><strong>Head position:</strong> Keep your neck neutral by looking slightly ahead, not down.</li>
            <li><strong>Core engagement:</strong> Keep your core tight throughout the entire movement.</li>
            <li><strong>Speed:</strong> Perform push-ups at a controlled pace, avoiding rapid movements.</li>
          </ul>
        </section>

        {/* Common Mistakes Section */}
        <section className="rules-section">
          <h2>Common Push-Up Mistakes to Avoid</h2>
          <ul className="rules-list">
            <li><strong>Sagging hips:</strong> Keep your body in a straight line.</li>
            <li><strong>Partial range of motion:</strong> Go deep enough on each repetition.</li>
            <li><strong>Flared elbows:</strong> Keep elbows at about 45° angle to your body.</li>
            <li><strong>Holding breath:</strong> Maintain proper breathing throughout.</li>
            <li><strong>Head dropping:</strong> Keep your neck aligned with your spine.</li>
          </ul>
        </section>
      </>
    );
  }
};

export default FormGuidelines;