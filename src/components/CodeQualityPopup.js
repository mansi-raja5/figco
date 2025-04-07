import React from 'react';
import { analyzeCode } from '../services/codeAnalysisService';

const metricsInfo = {
  complexity: "Calculated based on:\n• Number of conditional statements (if/else/switch)\n• Number of loops (for/while)\n• Number of functions\nLower score indicates higher complexity.",
  
  maintainability: "Calculated based on:\n• Number of lines longer than 80 characters\n• Number of functions longer than 20 lines\nHigher score indicates better maintainability.",
  
  reliability: "Calculated based on:\n• Presence of error handling (try/catch)\n• Potential error points (null/undefined checks)\nHigher score indicates better error handling.",
  
  duplication: "Calculated by:\n• Analyzing repeated lines of code\n• Percentage of duplicate code in the file\nLower percentage indicates less code duplication.",
  
  coverage: "Estimated based on:\n• Presence of exports\n• Pure function patterns\n• State management practices\nHigher score suggests better testability.",
  
  codeSmells: "Detected issues that might indicate deeper problems:\n• Long Functions (>20 lines)\n• Magic Numbers\n• Long Parameter Lists\n• Nested Callbacks\n• Debug Statements"
};

const CodeQualityPopup = ({ isOpen, onClose, fileContent, fileName }) => {
  if (!isOpen || !fileContent) return null;

  const analysis = analyzeCode(fileContent, fileName);

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <div className="popup-header">
          <h3>Code Quality Analysis: {fileName}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="quality-metrics">
          {Object.entries(analysis.metrics).map(([key, value]) => (
            <div key={key} className="metric-item">
              <div className="metric-label-group">
                <div className="metric-label">
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </div>
                <div 
                  className="info-icon" 
                  data-tooltip={metricsInfo[key]}
                >
                  ⓘ
                </div>
              </div>
              <div className="metric-bar-container">
                <div 
                  className="metric-bar" 
                  style={{ width: value }}
                  data-value={value}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="quality-summary">
          <h4>Summary</h4>
          <p>Overall code quality score: <strong>{analysis.overallScore}/100</strong></p>
          <div className="code-smells-section">
            <h5>
              Code Smells Detected 
              <span 
                className="info-icon" 
                data-tooltip={metricsInfo.codeSmells}
              >
                ⓘ
              </span>
              <span className="smell-count">({analysis.codeSmells.length})</span>
            </h5>
            {analysis.codeSmells.length > 0 ? (
              <ul className="smell-list">
                {analysis.codeSmells.map((smell, index) => (
                  <li key={index} className="smell-item">
                    <span className="smell-type">{smell.type}</span>
                    <span className="smell-description">{smell.description}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-smells">No code smells detected! 🎉</p>
            )}
          </div>
          <div className="practices-section">
            <h5>Suggested Improvements:</h5>
            <ul>
              {analysis.summary.practices.map((practice, index) => (
                <li key={index}>{practice}</li>
              ))}
            </ul>
          </div>
          <div className="metrics-summary">
            <p>Code organization: <strong>{analysis.summary.organization}</strong></p>
            <p>Performance optimization: <strong>{analysis.summary.performance}</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeQualityPopup; 