import React, { useState } from 'react';
import '../styles/Visualizer.css';

const LinkedListRenderer = ({ data }) => {
  return (
    <div className="linked-list-container">
      {data.nodes.map((node, idx) => (
        <div key={idx} className="list-node-wrapper">
          <div className={`list-node ${data.current === idx ? 'active' : ''}`}>
            {node.val}
            {data.head === idx && <div className="pointer-label" style={{top: '-20px'}}>head</div>}
            {data.current === idx && <div className="pointer-label" style={{bottom: '-20px', color: 'var(--accent)'}}>current</div>}
          </div>
          {node.next !== null && (
            <div className={`list-arrow ${data.current === idx ? 'active' : ''}`}></div>
          )}
        </div>
      ))}
    </div>
  );
};

const TreeRenderer = ({ data }) => {
  // Simple level-based rendering for the prototype
  return (
    <div className="tree-container">
      <div className="tree-level">
        <div className={`tree-node ${data.active === data.root ? 'active' : ''}`}>
          {data.nodes[data.root]?.val}
        </div>
      </div>
      <div className="tree-level">
        {data.nodes[data.root]?.left !== undefined && (
          <div className={`tree-node ${data.active === data.nodes[data.root].left ? 'active' : ''}`}>
            {data.nodes[data.nodes[data.root].left]?.val || 'null'}
          </div>
        )}
        {data.nodes[data.root]?.right !== undefined && (
          <div className={`tree-node ${data.active === data.nodes[data.root].right ? 'active' : ''}`}>
            {data.nodes[data.nodes[data.root].right]?.val || 'null'}
          </div>
        )}
      </div>
    </div>
  );
};

const ArrayRenderer = ({ label, array, activeIndex }) => (
  <div style={{ marginBottom: '1.5rem' }}>
    <div className="viz-section-title">{label}</div>
    <div className="array-container">
      {array.map((val, idx) => (
        <div key={idx} className="array-item">
          <div style={{ height: '20px' }}>
            {activeIndex === idx && <div className="pointer-i">▼</div>}
          </div>
          <div className={`array-box ${activeIndex === idx ? 'active' : ''}`}>
            {val}
          </div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{idx}</div>
        </div>
      ))}
    </div>
  </div>
);

const CodeVisualizer = ({ data }) => {
  const [stepIndex, setStepIndex] = useState(0);
  if (!data || !data.steps) return <div className="p-4 text-muted">No visualization data available.</div>;

  const currentStep = data.steps[stepIndex];
  const codeLines = data.code.split('\n');

  const nextStep = () => { if (stepIndex < data.steps.length - 1) setStepIndex(stepIndex + 1); };
  const prevStep = () => { if (stepIndex > 0) setStepIndex(stepIndex - 1); };

  const renderState = (state) => {
    return Object.entries(state).map(([key, val]) => {
      if (val && typeof val === 'object' && val.type === 'linked_list') {
        return <LinkedListRenderer key={key} data={val} />;
      }
      if (val && typeof val === 'object' && val.type === 'tree') {
        return <TreeRenderer key={key} data={val} />;
      }
      if (Array.isArray(val)) {
        return <ArrayRenderer key={key} label={key} array={val} activeIndex={state.i ?? state.left ?? state.right} />;
      }
      return null;
    });
  };

  return (
    <div className="visualizer-container">
      <div className="visualizer-header">
        <div className="visualizer-title">{data.title} - Execution Trace</div>
        <div className="visualizer-controls">
          <button onClick={prevStep} disabled={stepIndex === 0} className="viz-btn">Prev</button>
          <span className="step-counter">STEP {stepIndex + 1} / {data.steps.length}</span>
          <button onClick={nextStep} disabled={stepIndex === data.steps.length - 1} className="viz-btn viz-btn-primary">Next</button>
        </div>
      </div>

      <div className="visualizer-content">
        <div className="code-panel">
          <div className="code-panel-header">Python Reference Solution</div>
          <div className="code-display">
            {codeLines.map((line, idx) => (
              <div key={idx} className={`code-line ${currentStep.line === idx + 1 ? 'active' : ''}`}>
                <span className="line-num">{idx + 1}</span>
                <span className="code-text">{line}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="right-panel">
          <div className="explanation-card">
            <div className="viz-section-title">Logic Step</div>
            <ul className="explanation-list">
              {currentStep.explanation.split('\n').map((p, i) => (
                <li key={i}>{p.replace(/^[•\-\*]\s*/, '')}</li>
              ))}
            </ul>
          </div>

          <div className="viz-panel">
            <div className="viz-section-title">Active Data Structures</div>
            {renderState(currentStep.state)}
            
            <div className="data-grid" style={{marginTop: '1rem'}}>
               {Object.entries(currentStep.state).map(([key, val]) => {
                 if (typeof val !== 'object') {
                   return (
                     <div key={key} className="variable-card">
                       <div className="variable-label">{key}</div>
                       <div className="variable-value">{String(val)}</div>
                     </div>
                   );
                 }
                 if (val && !Array.isArray(val) && val.type === undefined) {
                    return (
                      <div key={key} className="variable-card">
                        <div className="variable-label">{key} (map)</div>
                        {Object.entries(val).map(([k, v]) => (
                          <div key={k} className="map-item"><span>{k}:</span> <span>{v}</span></div>
                        ))}
                      </div>
                    )
                 }
                 return null;
               })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeVisualizer;
