const fs = require('fs');
const path = require('path');

const generateReactCode = async (figmaJson, componentName = 'FigmaComponent') => {
  try {
    const baseDir = path.join(__dirname, '../../generated_code/reactapp');
    console.log('Generating code in:', baseDir);

    // Create directories
    await fs.promises.mkdir(baseDir, { recursive: true });
    await fs.promises.mkdir(path.join(baseDir, 'src'), { recursive: true });
    await fs.promises.mkdir(path.join(baseDir, 'src/components'), { recursive: true });

    // Generate component file
    const componentContent = `
import React from 'react';

const ${componentName} = () => {
  return (
    <div>
      <h1>Generated Component</h1>
      <pre>{JSON.stringify(${JSON.stringify(figmaJson, null, 2)}, null, 2)}</pre>
    </div>
  );
};

export default ${componentName};
    `.trim();

    const componentPath = path.join(baseDir, 'src/components', `${componentName}.js`);
    await fs.promises.writeFile(componentPath, componentContent);

    return {
      success: true,
      message: 'Code generated successfully',
      path: componentPath
    };
  } catch (error) {
    console.error('Error generating code:', error);
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