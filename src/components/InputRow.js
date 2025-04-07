import React, { useState } from 'react';
import { exportFigmaImage, fetchFigmaFile } from '../services/figmaService';
import { generateReactCode } from '../services/codeGeneratorService';
import FileTree from './FileTree';

const InputRow = ({ onImageLoad, onJsonLoad, onCodeGenerate, onFolderUpload }) => {
  console.log('All env vars:', process.env);
  console.log('Environment token:', process.env.REACT_APP_FIGMA_DEFAULT_TOKEN); // Debug log

  const [accessToken, setAccessToken] = useState(() => {
    const token = process.env.REACT_APP_FIGMA_DEFAULT_TOKEN;
    console.log('Setting initial token:', token); // Debug log
    return token || '';
  });
  const [fileKey, setFileKey] = useState('T49dHtWJGVNCxCiS9NHfN2');
  const [nodeId, setNodeId] = useState('1-903');
  const [selectedFramework, setSelectedFramework] = useState('react');
  const [loadingFigma, setLoadingFigma] = useState(false);
  const [loadingJson, setLoadingJson] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [jsonData, setJsonData] = useState(null);
  const [showUpload, setShowUpload] = useState(false);

  const frameworks = [
    { value: 'react', label: 'React JS' },
    { value: 'vue', label: 'Vue JS' },
    { value: 'angular', label: 'Angular JS' },
    { value: 'html', label: 'HTML/CSS' }
  ];

  const handleLoadFigma = async () => {
    setLoadingFigma(true);
    try {
      // Remove any spaces and ensure correct format
      const cleanNodeId = nodeId.trim();
      console.log('Making API call with:', {
        fileKey,
        nodeId: cleanNodeId,
        accessToken: accessToken.substring(0, 10) + '...' // Log partial token for security
      });
      
      const imageUrl = await exportFigmaImage(fileKey, cleanNodeId, accessToken);
      if (imageUrl) {
        console.log('Successfully got image URL:', imageUrl);
        onImageLoad(imageUrl);
        setImageLoaded(true); // Set this flag when image is loaded
      } else {
        console.error('No image URL returned from API');
      }
    } catch (error) {
      console.error('Error in handleLoadFigma:', error);
    } finally {
      setLoadingFigma(false);
    }
  };

  const handleLoadJson = async () => {
    setLoadingJson(true);
    try {
      const data = await fetchFigmaFile(fileKey, accessToken);
      setJsonData(data);
      onJsonLoad(data);
    } catch (error) {
      console.error('Error loading Figma JSON:', error);
    } finally {
      setLoadingJson(false);
    }
  };

  const handleGenerateCode = async () => {
    if (!jsonData) {
      console.error('No JSON data available');
      return;
    }

    setGeneratingCode(true);
    try {
      console.log('Generating code with JSON:', jsonData); // Debug log
      const generatedCode = await generateReactCode(jsonData);
      console.log('Generated code result:', generatedCode); // Debug log
      onCodeGenerate(generatedCode);
    } catch (error) {
      console.error('Error generating code:', error);
      // You might want to show an error message to the user here
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCodeQuality = () => {
    console.log('Code Quality Check');
    // Add your code quality logic here
  };

  const processDirectory = async (entry) => {
    const files = [];
    
    const readEntry = async (entry, path = '') => {
      if (entry.isFile) {
        const file = await new Promise((resolve) => entry.file(resolve));
        return {
          type: 'file',
          name: entry.name,
          path: path + '/' + entry.name,
          file
        };
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const entries = await new Promise((resolve) => {
          dirReader.readEntries((entries) => resolve(entries));
        });
        
        const children = await Promise.all(
          entries.map((entry) => readEntry(entry, path + '/' + entry.name))
        );

        return {
          type: 'folder',
          name: entry.name,
          path: path + '/' + entry.name,
          children
        };
      }
    };

    const items = await Promise.all(
      Array.from(entry).map((entry) => readEntry(entry))
    );
    
    return items;
  };

  const handleFileUpload = async (event) => {
    const files = event.target.files || (event.dataTransfer && event.dataTransfer.files);
    
    if (files) {
      try {
        const fileArray = Array.from(files);
        const structure = [];
        
        fileArray.forEach(file => {
          const path = file.webkitRelativePath || file.name;
          const parts = path.split('/');
          
          let currentLevel = structure;
          let currentPath = '';
          
          for (let i = 0; i < parts.length - 1; i++) {
            currentPath += (currentPath ? '/' : '') + parts[i];
            let folder = currentLevel.find(item => item.name === parts[i]);
            
            if (!folder) {
              folder = {
                type: 'folder',
                name: parts[i],
                path: currentPath,
                children: []
              };
              currentLevel.push(folder);
            }
            currentLevel = folder.children;
          }
          
          currentLevel.push({
            type: 'file',
            name: parts[parts.length - 1],
            path: path,
            file: file
          });
        });
        
        onFolderUpload(structure);
        setShowUpload(false);
      } catch (error) {
        console.error('Error processing files:', error);
      }
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    // If it's a dropped folder, use the DataTransfer API
    if (event.dataTransfer.items) {
      const items = Array.from(event.dataTransfer.items);
      const entries = items
        .filter(item => item.webkitGetAsEntry)
        .map(item => item.webkitGetAsEntry());
      
      if (entries.length > 0) {
        processDirectory(entries).then(structure => {
          onFolderUpload(structure);
          setShowUpload(false);
        });
      }
    }
  };

  return (
    <div className="input-container">
      <div className="input-row">
        <div className="figma-section">
          <div className="input-group">
            <label>Access Token</label>
            <input 
              type="text" 
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="input-group">
            <label>File Key</label>
            <input 
              type="text" 
              value={fileKey}
              onChange={(e) => setFileKey(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="input-group">
            <label>Node ID</label>
            <input 
              type="text" 
              value={nodeId}
              onChange={(e) => setNodeId(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="button-group">
            <button 
              className="load-button"
              onClick={handleLoadFigma}
              disabled={loadingFigma}
            >
              {loadingFigma ? 'Loading...' : 'Load Figma'}
            </button>
            {imageLoaded && (
              <button 
                className="load-button json-button"
                onClick={handleLoadJson}
                disabled={loadingJson}
              >
                {loadingJson ? 'Loading...' : 'Load JSON'}
              </button>
            )}
          </div>
        </div>
        <div className="separator"></div>
        <div className="framework-section">
          <label>Select Framework</label>
          <div className="framework-controls">
            <select 
              value={selectedFramework}
              onChange={(e) => setSelectedFramework(e.target.value)}
              className="framework-select"
            >
              {frameworks.map(framework => (
                <option key={framework.value} value={framework.value}>
                  {framework.label}
                </option>
              ))}
            </select>
            <button 
              className="generate-button"
              onClick={handleGenerateCode}
              disabled={generatingCode || !jsonData}
            >
              {generatingCode ? 'Generating...' : 'Generate Code'}
            </button>
          </div>
        </div>
        <div className="separator"></div>
        <div className="import-section">
          <label>Import External UI</label>
          <div className="import-controls">
            <button 
              className="import-button"
              onClick={() => setShowUpload(!showUpload)}
            >
              Import UI code from other tool
            </button>
            {showUpload && (
              <div className="upload-overlay">
                <div className="upload-content">
                  <div className="upload-header">
                    <h3>Import UI Code</h3>
                    <button 
                      className="close-button"
                      onClick={() => setShowUpload(false)}
                    >
                      ×
                    </button>
                  </div>
                  <div className="upload-body">
                    <div className="upload-zone" 
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={handleDrop}
                    >
                      <input
                        type="file"
                        id="folder-upload"
                        className="file-input"
                        onChange={handleFileUpload}
                        webkitdirectory=""
                        directory=""
                        multiple
                      />
                      <label htmlFor="folder-upload" className="file-label">
                        <span className="upload-icon">📁</span>
                        <span>Drop folder here or click to upload</span>
                        <span className="file-hint">Select a project folder</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputRow; 