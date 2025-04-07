import React, { useState } from 'react';

const FileTree = ({ files, onFileSelect }) => {
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [selectedFile, setSelectedFile] = useState(null);

  const toggleFolder = (path) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFileClick = (file) => {
    setSelectedFile(file.path);
    onFileSelect(file);
  };

  const renderTree = (items, level = 0) => {
    return (
      <ul className={`file-tree-list ${level === 0 ? 'root' : ''}`}>
        {items.map((item) => (
          <li key={item.path} className="file-tree-item">
            {item.type === 'folder' ? (
              <div className="folder-item">
                <button 
                  className="folder-button"
                  onClick={() => toggleFolder(item.path)}
                >
                  <span className="folder-icon">
                    {expandedFolders.has(item.path) ? '📂' : '📁'}
                  </span>
                  {item.name}
                </button>
                {expandedFolders.has(item.path) && item.children && 
                  renderTree(item.children, level + 1)}
              </div>
            ) : (
              <button 
                className={`file-button ${selectedFile === item.path ? 'selected' : ''}`}
                onClick={() => handleFileClick(item)}
              >
                <span className="file-icon">📄</span>
                {item.name}
              </button>
            )}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="file-tree">
      {renderTree(files)}
    </div>
  );
};

export default FileTree; 