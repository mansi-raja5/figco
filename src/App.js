import React, { useState } from 'react';
import Header from './components/Header';
import InputRow from './components/InputRow';
import MainContent from './components/MainContent';
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
      />
      <MainContent 
        imageUrl={imageUrl}
        jsonData={jsonData}
        folderStructure={folderStructure}
      />
      <footer className="footer">
        <button>Generate Code</button>
      </footer>
    </div>
  );
}

export default App;
