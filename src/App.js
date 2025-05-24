import React, { useState } from 'react';
import Header from './components/Header.js';
import InputRow from './components/InputRow.js';
import MainContent from './components/MainContent.js';
import './styles/main.css';

function App() {
  const [imageUrl, setImageUrl] = useState(null);
  const [jsonData, setJsonData] = useState(null);
  const [folderStructure, setFolderStructure] = useState(null);

  const handleCodeGenerate = (code) => {
    console.log('Generated Code:', code);
    // You can update the code section in MainContent here
  };

  const handleCodeQuality = () => {
    console.log('Code Quality Check');
    // Add your code quality logic here
  };

  return (
    <div className="app">
      <Header />
      <InputRow 
        onImageLoad={setImageUrl} 
        onJsonLoad={setJsonData}
        onCodeGenerate={handleCodeGenerate}
        onFolderUpload={setFolderStructure}
        jsonData={jsonData}
      />
      <MainContent 
        imageUrl={imageUrl}
        jsonData={jsonData}
        folderStructure={folderStructure}
      />
    </div>
  );
}

export default App;
