import React from 'react';
import './SolutionCard.css';

const Difficulty = ({ level }) => (
  <span className={`badge badge--${level.toLowerCase()}`} role="status" aria-label={`Difficulty: ${level}`}>
    {level}
  </span>
);

export const SolutionCard = ({
  problem,
  approach,
  solution,
  complexity,
  code,
  difficulty = 'medium',
  onSave,
}) => {
  return (
    <article className="card" tabIndex={-1}>
      {/* Fixed Header Section */}
      <header className="card-header">
        <h1 className="card-header__title">
          Solution Card
        </h1>

        <p className="card-header__subtitle">
          Problem Analysis & Implementation
        </p>

        <div className="card-header__meta" aria-label="Problem metadata">
          {difficulty && <Difficulty level={difficulty} />}
        </div>
      </header>

      {/* Scrollable Body Section */}
      <div className="card-body" role="region" aria-label="Solution content">
        <div className="card-sections">

          {/* Problem Section */}
          <section className="card-section" aria-labelledby="problem-title">
            <h2 id="problem-title" className="card-section__title">Problem</h2>
            {problem ? (
              <p className="card-section__content" id="problem-content">{problem}</p>
            ) : (
              <code className="card-section__code">// Problem description...</code>
            )}
          </section>

          {/* Approach Section */}
          <section className="card-section" aria-labelledby="approach-title">
            <h2 id="approach-title" className="card-section__title">Approach</h2>
            {approach ? (
              <p className="card-section__content" id="approach-content">{approach}</p>
            ) : (
              <code className="card-section__code">// Approach strategy...</code>
            )}
          </section>

          {/* Solution Section */}
          <section className="card-section" aria-labelledby="solution-title">
            <h2 id="solution-title" className="card-section__title">Solution</h2>
            {solution ? (
              <p className="card-section__content" id="solution-content">{solution}</p>
            ) : (
              <code className="card-section__code">// Solution implementation...</code>
            )}
          </section>

          {/* Complexity Section */}
          <section className="card-section" aria-labelledby="complexity-title">
            <h2 id="complexity-title" className="card-section__title">Complexity</h2>
            {complexity ? (
              <p className="card-section__content" id="complexity-content">{complexity}</p>
            ) : (
              <code className="card-section__code">// Time & Space complexity...</code>
            )}
          </section>

          {/* Code Section */}
          <section className="card-section" aria-labelledby="code-title">
            <h2 id="code-title" className="card-section__title">Code</h2>
            {code ? (
              <pre
                className="card-section__code"
                aria-label={`Code snippet with ${code.length} characters`}
              >
                {code.trim()}
              </pre>
            ) : (
              <code className="card-section__code">// Code implementation...</code>
            )}
          </section>

        </div>
      </div>

      {/* Footer - Save Action */}
      <footer className="card-footer" aria-label="Card actions">
        <div className="card-footer__actions">
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              className="btn btn-primary"
              aria-label="Save solution"
            >
              Save Solution
            </button>
          )}
        </div>
        <span className="card-footer__meta">SolutionCard v1.0</span>
      </footer>
    </article>
  );
};

export default SolutionCard;
