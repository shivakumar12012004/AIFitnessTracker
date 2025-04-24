import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as tf from '@tensorflow/tfjs';

// Initialize TensorFlow.js
async function initializeTensorFlow() {
  // Force using WebGL backend instead of WebGPU
  await tf.setBackend('webgl');
  await tf.ready();
  console.log('TensorFlow backend initialized:', tf.getBackend());
}

// Start initialization
initializeTensorFlow();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();