import React, { useState } from 'react';
import './FileTree.css';

const FileTree = ({ structure = [], onFileSelect }) => {
  const [expandedFolders, setExpandedFolders] = useState(new Set());

  const toggleFolder = (path) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const renderTree = (items = []) => {
    if (!Array.isArray(items)) {
      return null;
    }

    return items.map((item, index) => {
      if (!item) return null;
      const isExpanded = expandedFolders.has(item.path);

      return (
        <div key={`${item.path}-${index}`} className="tree-item">
          {item.type === 'folder' ? (
            <div className="folder">
              <span 
                className="folder-name"
                onClick={() => toggleFolder(item.path)}
              >
                {isExpanded ? '📂' : '📁'} {item.name}
              </span>
              <div className={`folder-contents ${isExpanded ? 'expanded' : ''}`}>
                {isExpanded && item.children && renderTree(item.children)}
              </div>
            </div>
          ) : (
            <div 
              className="file"
              onClick={() => onFileSelect && onFileSelect(item)}
            >
              <span className="file-name">📄 {item.name}</span>
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="file-tree">
      {renderTree(structure)}
    </div>
  );
};

export default FileTree; 