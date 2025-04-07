import React, { useState } from 'react';
import ReactJson from 'react-json-view';
import FileTree from './FileTree';
import CodeQualityPopup from './CodeQualityPopup';

const MainContent = ({ imageUrl, jsonData, folderStructure, onCodeQuality }) => {
  const [imageError, setImageError] = useState(false);
  const [selectedFileContent, setSelectedFileContent] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState(null);
  const [isQualityPopupOpen, setIsQualityPopupOpen] = useState(false);

  const handleFullscreen = (sectionClass) => {
    const section = document.querySelector(`.${sectionClass}`);
    if (!document.fullscreenElement) {
      section.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleFileSelect = async (file) => {
    try {
      const content = await file.file.text();
      setSelectedFileContent(content);
      setSelectedFileName(file.name);
    } catch (error) {
      console.error('Error reading file:', error);
    }
  };

  const handleCodeQuality = () => {
    setIsQualityPopupOpen(true);
    if (onCodeQuality) {
      onCodeQuality();
    }
  };

  return (
    <>
      <div className="main-content">
        <div className="section image-section">
          <div className="section-header">
            {imageUrl && (
              <button 
                className="fullscreen-button"
                onClick={() => handleFullscreen('image-section')}
                title="Toggle fullscreen"
              >
                ⊕
              </button>
            )}
          </div>
          {imageUrl ? (
            <div className="image-container">
              <img 
                src={imageUrl} 
                alt="Figma design" 
                onError={(e) => setImageError(true)}
              />
              {imageError && <div className="error-message">Failed to load image</div>}
            </div>
          ) : (
            <div className="placeholder">No image loaded yet</div>
          )}
        </div>

        <div className="section json-section">
          <div className="section-header">
            {jsonData && (
              <button 
                className="fullscreen-button"
                onClick={() => handleFullscreen('json-section')}
                title="Toggle fullscreen"
              >
                ⊕
              </button>
            )}
          </div>
          {jsonData ? (
            <div className="json-viewer">
              <ReactJson 
                src={jsonData}
                theme="rjv-default"
                displayDataTypes={false}
                enableClipboard={true}
                collapsed={2}
                style={{
                  padding: '10px',
                  backgroundColor: 'white',
                  borderRadius: '4px'
                }}
              />
            </div>
          ) : (
            <div className="placeholder">No JSON data loaded yet</div>
          )}
        </div>

        <div className="section code-section">
          <div className="section-header">
            <button 
              className="quality-button"
              onClick={handleCodeQuality}
              title="Check code quality"
            >
              Code Quality & Validation
            </button>
            <button 
              className="fullscreen-button"
              onClick={() => handleFullscreen('code-section')}
              title="Toggle fullscreen"
            >
              ⊕
            </button>
          </div>
          <div className="code-container">
            {folderStructure ? (
              <div className="file-explorer">
                <div className="file-tree-container">
                  <FileTree 
                    files={folderStructure} 
                    onFileSelect={handleFileSelect}
                  />
                </div>
                <div className="file-content-preview">
                  {selectedFileContent ? (
                    <pre className="content-preview">
                      {selectedFileContent}
                    </pre>
                  ) : (
                    <div className="no-file-selected">
                      Select a file to view its content
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="placeholder">
                No code loaded yet. Import a project or generate code.
              </div>
            )}
          </div>
        </div>
      </div>
      <CodeQualityPopup 
        isOpen={isQualityPopupOpen}
        onClose={() => setIsQualityPopupOpen(false)}
        fileContent={selectedFileContent}
        fileName={selectedFileName}
      />
    </>
  );
};

export default MainContent; 