import React, { useState, useEffect } from 'react';
import { exportFigmaImage, fetchFigmaFile } from '../services/figmaService';
import { generateReactCode, runReactApp } from '../services/codeGeneratorService';
import FileTree from './FileTree';
import '../styles/InputRow.css';

const InputRow = ({ onImageLoad, onJsonLoad, onCodeGenerate, onFolderUpload, jsonData }) => {
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
  const [loadingImages, setLoadingImages] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [hasGeneratedCode, setHasGeneratedCode] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [runningApp, setRunningApp] = useState(false);

  useEffect(() => {
    console.log('State changed:', {
      generatingCode,
      hasGeneratedCode,
      runningApp,
      hasJsonData: !!jsonData
    });
  }, [generatingCode, hasGeneratedCode, runningApp, jsonData]);

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
      onJsonLoad(data);
    } catch (error) {
      console.error('Error loading Figma JSON:', error);
    } finally {
      setLoadingJson(false);
    }
  };

  const handleLoadImages = async () => {
    if (!jsonData) {
      console.error('No JSON data available');
      return;
    }

    setLoadingImages(true);
    try {
      // Create images directory if it doesn't exist
      try {
        await fetch('/api/createDirectory', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: '/var/www/figco/generated_code/images'
          })
        });
      } catch (error) {
        console.error('Error creating images directory:', error);
        return;
      }

      // Extract all image references and their parent node IDs from the JSON data
      const imageNodes = [];
      const findImageNodes = (node) => {
        if (node.background && Array.isArray(node.background)) {
          node.background.forEach(bg => {
            if (bg.type === 'IMAGE' && bg.imageRef) {
              imageNodes.push({
                nodeId: node.id,
                imageRef: bg.imageRef,
                name: `${node.name || 'image'}_${bg.imageRef}.png`.replace(/[^a-zA-Z0-9-_\.]/g, '_')
              });
            }
          });
        }
        if (node.children && Array.isArray(node.children)) {
          node.children.forEach(findImageNodes);
        }
      };
      findImageNodes(jsonData.document);

      // Load and save each image
      const downloadPromises = imageNodes.map(async ({ nodeId, name }) => {
        try {
          const imageUrl = await exportFigmaImage(fileKey, nodeId, accessToken);
          if (!imageUrl) return null;

          // Download image and save to file
          const response = await fetch('/api/downloadImage', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: imageUrl,
              path: `/var/www/figco/generated_code/images/${name}`
            })
          });

          if (!response.ok) {
            throw new Error(`Failed to download image: ${response.statusText}`);
          }

          const result = await response.json();
          return result.path;
        } catch (error) {
          console.error(`Error downloading image ${name}:`, error);
          return null;
        }
      });

      const savedPaths = await Promise.all(downloadPromises);
      const validPaths = savedPaths.filter(path => path);

      if (validPaths.length > 0) {
        alert('Successfully downloaded images:', validPaths);
      } else {
        console.error('No images were downloaded successfully');
      }
    } catch (error) {
      console.error('Error processing images:', error);
    } finally {
      setLoadingImages(false);
    }
  };

  const handleGenerateCode = async () => {
    if (!jsonData) {
      console.error('No JSON data available');
      return;
    }

    console.log('Starting code generation...');
    setGeneratingCode(true);
    setHasGeneratedCode(false);
    try {
      const result = await generateReactCode(jsonData, 'FigmaComponent');
      console.log('Code generation result:', result);
      if (result.success) {
        console.log('Code generated successfully at:', result.path);
        
        try {
          // Use the base directory path instead of the file path
          const basePath = '/var/www/figco/generated_code';
          const files = await fetch(`/api/readDirectory?path=${encodeURIComponent(basePath)}`);
          const structure = await files.json();
          
          // Pass the actual directory structure to parent component
          onFolderUpload([structure]); // Wrap in array to match UI import format
          onCodeGenerate(result);
          setHasGeneratedCode(true);
        } catch (error) {
          console.error('Error reading directory structure:', error);
        }
      } else {
        console.error('Error generating code:', result.error);
      }
    } catch (error) {
      console.error('Error generating code:', error);
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleRunApp = async () => {
    console.log('Run app clicked, current states:', {
      runningApp,
      hasGeneratedCode,
      generatingCode,
      isDisabled: runningApp || !hasGeneratedCode
    });

    if (runningApp || !hasGeneratedCode) {
      console.log('Button should be disabled, not proceeding');
      return;
    }

    setRunningApp(true);
    try {
      console.log('Starting to run React app...');
      const result = await runReactApp();
      console.log('Run app result:', result);
      
      if (result.success) {
        console.log('React app started at:', result.url);
        window.open(result.url, '_blank');
      } else {
        console.error('Failed to start React app:', result.error);
      }
    } catch (error) {
      console.error('Error running React app:', error);
    } finally {
      setRunningApp(false);
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

  const handleDownload = async () => {
    try {
      const response = await fetch('/api/download-app');
      if (!response.ok) {
        throw new Error('Failed to download app');
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = url;
      link.download = 'reactapp.zip';
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading app:', error);
      alert('Failed to download the app. Please try again.');
    }
  };

  return (
    <div className="input-container">
      <div className="input-row">
        <div className="figma-section">
          <h3>Figma Configuration</h3>
          <div className="framework-controls">
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
            <button 
              className="load-button json-button"
              onClick={handleLoadJson}
              disabled={loadingJson || !imageLoaded}
            >
              {loadingJson ? 'Loading...' : 'Load JSON'}
            </button>
            <button 
              className="load-button image-button"
              onClick={handleLoadImages}
              disabled={loadingImages || !jsonData}
            >
              {loadingImages ? 'Loading...' : 'Load Images'}
            </button>
          </div>
          </div>

        </div>

        <div className="separator"></div>

        <div className="framework-section">
          <h3>Code Generation</h3>
          <div className="framework-controls">
            <select 
              className="framework-select"
              value={selectedFramework}
              onChange={(e) => setSelectedFramework(e.target.value)}
            >
              {frameworks.map(fw => (
                <option key={fw.value} value={fw.value}>{fw.label}</option>
              ))}
            </select>
            <button 
              className="generate-button"
              onClick={handleGenerateCode}
              disabled={!jsonData || generatingCode}
            >
              {generatingCode ? 'Generating...' : 'Generate Code'}
            </button>
            {console.log('Run Application button state:', { runningApp, hasGeneratedCode, isDisabled: runningApp || !hasGeneratedCode })}
            <button
              className={`run-button ${hasGeneratedCode && !runningApp ? 'enabled' : 'disabled'}`}
              onClick={handleRunApp}
              disabled={runningApp || !hasGeneratedCode}
              data-loading={runningApp}
            >
              {runningApp ? 'Starting App...' : 'Run Application'}
            </button>
          </div>
        </div>

        <div className="separator"></div>

        <div className="import-section">
          <h3>External UI Import</h3>
          <div className="import-controls">
            <button 
              className="import-button"
              onClick={() => setShowUpload(!showUpload)}
            >
              Import UI code from other tool
            </button>
          </div>
        </div>

        <div className="separator"></div>

        <div className="download-section">
          <div className="download-controls"> 
            <button
              className="download-button"
              onClick={handleDownload}
              title="Download Generated App"
            >Download Generated App</button>
          </div>
        </div>
      </div>

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
  );
};

export default InputRow; 