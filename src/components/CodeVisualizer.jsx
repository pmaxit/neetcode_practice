import React, { useState } from 'react';
import '../styles/Visualizer.css';

const CodeVisualizer = ({ data }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = data.steps[stepIndex];
  const codeLines = data.code.split('\n');

  const nextStep = () => {
    if (stepIndex < data.steps.length - 1) setStepIndex(stepIndex + 1);
  };

  const prevStep = () => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  };

  return (
    <div className="visualizer-container">
      <div className="visualizer-header">
        <div className="visualizer-title">Execution Visualizer: {data.title}</div>
        <div className="visualizer-controls">
          <button 
            onClick={prevStep} 
            disabled={stepIndex === 0}
            className="viz-btn"
          >
            Previous
          </button>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            STEP {stepIndex + 1} / {data.steps.length}
          </span>
          <button 
            onClick={nextStep} 
            disabled={stepIndex === data.steps.length - 1}
            className="viz-btn viz-btn-primary"
          >
            Next
          </button>
        </div>
      </div>

      <div className="visualizer-content">
        {/* Code Panel */}
        <div className="code-panel">
          <div className="code-panel-header">Source Code (JavaScript)</div>
          <div className="code-display">
            {codeLines.map((line, idx) => (
              <div 
                key={idx} 
                className={`code-line ${currentStep.line === idx + 1 ? 'active' : ''}`}
              >
                <span className="line-num">{idx + 1}</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Visualizer Panel */}
        <div className="right-panel">
          <div className="explanation-card">
            <div className="viz-section-title">AI Explanation</div>
            <div className="explanation-text">
              <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
                {currentStep.explanation.split('\n').map((point, i) => (
                  <li key={i} style={{ marginBottom: '0.4rem' }}>
                    {point.replace(/^[•\-\*]\s*/, '')}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="viz-panel">
            <div>
              <div className="viz-section-title">Data Structures</div>
              
              {/* Array Visualization */}
              {currentStep.state.nums && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>nums[]</div>
                  <div className="array-container">
                    {currentStep.state.nums.map((val, idx) => (
                      <div key={idx} className="array-item">
                        <div style={{ height: '20px' }}>
                          {currentStep.state.i === idx && (
                            <div className="pointer-i">▼</div>
                          )}
                        </div>
                        <div className={`array-box ${currentStep.state.i === idx ? 'active' : ''}`}>
                          {val}
                        </div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{idx}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grid for other variables */}
              <div className="data-grid">
                {currentStep.state.map && (
                  <div className="variable-card" style={{ gridRow: 'span 2' }}>
                    <div className="variable-label">map (hash table)</div>
                    <div style={{ marginTop: '0.5rem' }}>
                      {Object.entries(currentStep.state.map).map(([key, val]) => (
                        <div key={key} className="map-item">
                          <span style={{ color: 'var(--medium)' }}>{key}:</span>
                          <span>{val}</span>
                        </div>
                      ))}
                      {Object.keys(currentStep.state.map).length === 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Empty</div>
                      )}
                    </div>
                  </div>
                )}
                
                {currentStep.state.complement !== undefined && (
                  <div className="variable-card">
                    <div className="variable-label">complement</div>
                    <div className="variable-value">{currentStep.state.complement}</div>
                  </div>
                )}

                {currentStep.state.result && (
                  <div className="variable-card" style={{ borderColor: 'var(--accent)', background: 'rgba(16, 185, 129, 0.1)' }}>
                    <div className="variable-label" style={{ color: 'var(--accent)' }}>RETURN</div>
                    <div className="variable-value">[{currentStep.state.result.join(', ')}]</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeVisualizer;
