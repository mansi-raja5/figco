import React from 'react';
import { analyzeCode } from '../services/codeAnalysisService';

const metricsInfo = {
  simplicity: "Calculated based on:\n• Number of conditional statements (if/else/switch)\n• Number of loops (for/while)\n• Number of functions\nHigher score indicates simpler, cleaner code.",
  
  maintainability: "Calculated based on:\n• Number of lines longer than 80 characters\n• Number of functions longer than 20 lines\nHigher score indicates better maintainability.",
  
  reliability: "Calculated based on:\n• Presence of error handling (try/catch)\n• Potential error points (null/undefined checks)\nHigher score indicates better error handling.",
  
  duplication: "Calculated by:\n• Analyzing repeated lines of code\n• Percentage of duplicate code in the file\nLower percentage indicates less code duplication.",
  
  coverage: "Estimated based on:\n• Presence of exports\n• Pure function patterns\n• State management practices\nHigher score suggests better testability.",
  
  codeSmells: "Issues that might indicate problems:\n• Long Functions: Over 20 lines\n• Magic Numbers: Unnamed numeric constants\n• Long Parameter Lists: Over 3 parameters\n• Nested Callbacks: Multiple promise chains\n• Debug Statements: Console logs in production"
};

const getScoreColor = (score, isInverse = false) => {
  const numScore = parseInt(score);
  if (isInverse) {
    if (numScore <= 20) return '#22c55e'; // green
    if (numScore <= 40) return '#84cc16'; // light green
    if (numScore <= 60) return '#eab308'; // yellow
    return '#ef4444'; // red
  } else {
    if (numScore >= 80) return '#22c55e'; // green
    if (numScore >= 60) return '#84cc16'; // light green
    if (numScore >= 40) return '#eab308'; // yellow
    return '#ef4444'; // red
  }
};

const CodeQualityPopup = ({ isOpen, onClose, fileContent, fileName }) => {
  if (!isOpen || !fileContent) return null;

  const analysis = analyzeCode(fileContent, fileName);
  
  // Only include these specific metrics
  const validMetrics = ['simplicity', 'maintainability', 'reliability', 'duplication'];
  
  const filteredMetrics = Object.entries(analysis.metrics)
    .filter(([key]) => validMetrics.includes(key))
    .map(([key, value]) => {
      const normalizedValue = value.toString().endsWith('%') ? value : `${value}%`;
      return [key, normalizedValue];
    });

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <div className="popup-header">
          <h3>Code Quality Analysis: {fileName}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {/* Overall Score Section */}
        <div className="overall-score-section">
          <h4>Overall Quality Score</h4>
          <div className="score-circle" style={{ 
            backgroundColor: getScoreColor(analysis.overallScore)
          }}>
            <span className="score-number">{analysis.overallScore}</span>
            <span className="score-label">/100</span>
          </div>
        </div>

        {/* Metrics Section */}
        <div className="quality-metrics">
          <h4>Quality Metrics</h4>
          {filteredMetrics.map(([key, value]) => (
            <div key={key} className="metric-item">
              <div className="metric-label-group">
                <div className="metric-label">
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                  <div 
                    className="info-icon" 
                    data-tooltip={metricsInfo[key]}
                  >
                    ⓘ
                  </div>
                </div>
                <div className="metric-value">{value}</div>
              </div>
              <div className="metric-bar-container">
                <div 
                  className="metric-bar" 
                  style={{ 
                    width: value,
                    backgroundColor: getScoreColor(value, key === 'duplication')
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Issues Section */}
        <div className="issues-section">
          <h4>Detected Issues</h4>
          {analysis.codeSmells.length > 0 ? (
            <div className="code-smells-list">
              {analysis.codeSmells.map((smell, index) => (
                <div key={index} className="issue-item">
                  <div className="issue-header">
                    <span className="issue-type">{smell.type}</span>
                    <div 
                      className="info-icon"
                      data-tooltip={metricsInfo.codeSmells}
                    >
                      ⓘ
                    </div>
                  </div>
                  <p className="issue-description">{smell.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-issues">
              <span className="success-icon">✓</span>
              <p>No code issues detected!</p>
            </div>
          )}
        </div>

        {/* Recommendations Section */}
        <div className="recommendations-section">
          <h4>Recommendations</h4>
          {analysis.summary.practices.length > 0 ? (
            <ul className="recommendations-list">
              {analysis.summary.practices.map((practice, index) => (
                <li key={index} className="recommendation-item">
                  <span className="recommendation-icon">→</span>
                  {practice}
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-recommendations">No specific recommendations at this time.</p>
          )}
        </div>

        {/* Summary Section */}
        <div className="summary-section">
          <div className="summary-item">
            <span className="summary-label">Code Organization</span>
            <span 
              className="summary-value"
              data-status={analysis.summary.organization}
            >
              {analysis.summary.organization}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Performance</span>
            <span 
              className="summary-value"
              data-status={analysis.summary.performance}
            >
              {analysis.summary.performance}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeQualityPopup; 