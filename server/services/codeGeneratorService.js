const fs = require('fs');
const path = require('path');
const util = require('util');
const mkdir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);

const generateReactCode = async (figmaJson, componentName = 'FigmaComponent') => {
  try {
    // Use absolute path to ensure correct file location
    const baseDir = path.resolve(__dirname, '../../generated_code/reactapp');
    console.log('Generating code in:', baseDir);
    console.log('Current directory:', __dirname);

    // Create all necessary directories first
    const directories = [
      baseDir,
      path.join(baseDir, 'src'),
      path.join(baseDir, 'src/components'),
      path.join(baseDir, 'public')
    ];

    // Create directories synchronously
    directories.forEach(dir => {
      try {
        if (!fs.existsSync(dir)) {
          console.log('Creating directory:', dir);
          fs.mkdirSync(dir, { recursive: true });
          console.log('Directory created successfully:', dir);
        } else {
          console.log('Directory already exists:', dir);
        }
      } catch (error) {
        console.error(`Error creating directory ${dir}:`, error);
        throw error;
      }
    });

    // Define all files to be created
    const files = [
      {
        content: generateReactComponent(figmaJson, componentName),
        path: path.join(baseDir, 'src/components', `${componentName}.js`)
      },
      {
        content: generateStyles(figmaJson),
        path: path.join(baseDir, 'src/components', `${componentName}.css`)
      },
      {
        content: generateIndexFile(componentName),
        path: path.join(baseDir, 'src', 'index.js')
      },
      {
        content: generateIndexHtml(),
        path: path.join(baseDir, 'public', 'index.html')
      },
      {
        content: generatePackageJson(),
        path: path.join(baseDir, 'package.json')
      }
    ];

    // Save all files synchronously
    const savedFiles = {};
    files.forEach(file => {
      try {
        console.log('Writing file:', file.path);
        console.log('File content preview:', file.content.substring(0, 100) + '...');
        fs.writeFileSync(file.path, file.content, 'utf8');
        console.log('File written successfully:', file.path);
        savedFiles[path.basename(file.path)] = file.path;
      } catch (error) {
        console.error(`Error creating ${file.path}:`, error);
        throw error;
      }
    });

    // Verify all files were created
    const missingFiles = files.filter(file => !fs.existsSync(file.path));
    if (missingFiles.length > 0) {
      throw new Error(`Failed to create files: ${missingFiles.map(f => f.path).join(', ')}`);
    }

    return {
      success: true,
      message: 'React application generated successfully',
      path: baseDir,
      files: savedFiles
    };
  } catch (error) {
    console.error('Error in generateReactCode:', error);
    throw error;
  }
};

module.exports = {
  generateReactCode
};

const createDirectoryStructure = async (baseDir) => {
  const directories = [
    baseDir,
    path.join(baseDir, 'src'),
    path.join(baseDir, 'src', 'components'),
    path.join(baseDir, 'src', 'styles'),
    path.join(baseDir, 'public')
  ];

  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
  }
};

const saveFile = async (filePath, content) => {
  await fs.promises.writeFile(filePath, content, 'utf8');
};

const generateReactComponent = (figmaJson, componentName) => {
  return `
import React from 'react';
import './${componentName}.css';

const ${componentName} = () => {
  return (
    <div className="${componentName.toLowerCase()}-container">
      {/* Generated component content */}
    </div>
  );
};

export default ${componentName};
`.trim();
};

const generateStyles = (figmaJson) => {
  return `
/* Generated styles */
.${figmaJson.name?.toLowerCase() || 'component'}-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
`.trim();
};

const generateIndexFile = (componentName) => {
  return `
import React from 'react';
import ReactDOM from 'react-dom/client';
import ${componentName} from './components/${componentName}';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <${componentName} />
  </React.StrictMode>
);
`.trim();
};

const generateIndexHtml = () => {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Figma React App</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`.trim();
};

const generatePackageJson = () => {
  return JSON.stringify({
    name: "figma-react-app",
    version: "1.0.0",
    private: true,
    dependencies: {
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "react-scripts": "5.0.1"
    },
    scripts: {
      "start": "react-scripts start",
      "build": "react-scripts build"
    }
  }, null, 2);
}; 