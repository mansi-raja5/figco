import { parseNodeToComponent } from '../utils/parser';
import { generateComponent } from '../utils/generator';
import JSZip from 'jszip'; // We'll need to install this: npm install jszip

export const generateReactCode = async (figmaJson) => {
  try {
    // Create a new ZIP file
    const zip = new JSZip();

    // Create basic React app structure
    const appStructure = zip.folder("figma-react-app");
    const srcFolder = appStructure.folder("src");
    const componentsFolder = srcFolder.folder("components");
    const stylesFolder = srcFolder.folder("styles");

    // Parse the Figma JSON to extract component structure
    const componentStructure = parseNodeToComponent(figmaJson);
    
    // Generate React components
    const { components, mainComponent } = generateReactComponents(componentStructure);

    // Add package.json
    appStructure.file("package.json", generatePackageJson());

    // Add index.html
    appStructure.file("public/index.html", generateIndexHtml());

    // Add index.js
    srcFolder.file("index.js", generateIndexJs());

    // Add App.js
    srcFolder.file("App.js", generateAppComponent(mainComponent.name));

    // Add components
    Object.entries(components).forEach(([name, { content }]) => {
      componentsFolder.file(`${name}.js`, content);
    });

    // Add styles
    stylesFolder.file("main.css", generateMainCss());

    // Generate ZIP file
    const content = await zip.generateAsync({ type: "blob" });
    
    // Trigger download
    const url = window.URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'figma-react-app.zip';
    a.click();
    window.URL.revokeObjectURL(url);

    return {
      components,
      mainComponent,
      message: "React application has been generated and downloaded!"
    };
  } catch (error) {
    console.error('Error generating React code:', error);
    throw error;
  }
};

const generateReactComponents = (node, components = {}) => {
  // Generate unique component name
  const componentName = generateComponentName(node.name || 'Component');
  
  // Generate styles
  const styles = generateStyles(node.styles);
  
  // Generate JSX structure
  const jsx = generateJSX(node);
  
  // Create component content
  const componentContent = `
import React from 'react';

const ${componentName} = () => {
  return (
    <div className="${componentName.toLowerCase()}-container">
      ${jsx}
    </div>
  );
};

${generateStylesString(styles, componentName)}

export default ${componentName};
`;

  // Store component
  components[componentName] = {
    content: componentContent,
    fileName: `${componentName}.js`
  };

  // Process children recursively
  if (node.children) {
    node.children.forEach(child => {
      generateReactComponents(child, components);
    });
  }

  return { name: componentName, components };
};

const generateComponentName = (baseName) => {
  return baseName
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^[0-9]/, 'Component$&')
    .replace(/^[a-z]/, char => char.toUpperCase());
};

const generateStyles = (styles = {}) => {
  // Convert Figma styles to CSS
  const cssStyles = {};
  
  if (styles.width) cssStyles.width = `${styles.width}px`;
  if (styles.height) cssStyles.height = `${styles.height}px`;
  if (styles.backgroundColor) cssStyles.backgroundColor = styles.backgroundColor;
  // Add more style conversions as needed
  
  return cssStyles;
};

const generateStylesString = (styles, componentName) => {
  const cssString = Object.entries(styles)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');

  return `
const styles = {
  ${componentName.toLowerCase()}Container: {
${cssString}
  }
};`;
};

const generateJSX = (node) => {
  // Generate JSX based on node type and properties
  let jsx = '';
  
  if (node.type === 'TEXT') {
    jsx = `<span>${node.characters || ''}</span>`;
  } else if (node.children && node.children.length > 0) {
    jsx = node.children
      .map(child => generateJSX(child))
      .join('\n');
  }
  
  return jsx;
};

const generatePackageJson = () => {
  return JSON.stringify({
    "name": "figma-react-app",
    "version": "0.1.0",
    "private": true,
    "dependencies": {
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "react-scripts": "5.0.1"
    },
    "scripts": {
      "start": "react-scripts start",
      "build": "react-scripts build",
      "test": "react-scripts test",
      "eject": "react-scripts eject"
    },
    "eslintConfig": {
      "extends": ["react-app"]
    },
    "browserslist": {
      "production": [
        ">0.2%",
        "not dead",
        "not op_mini all"
      ],
      "development": [
        "last 1 chrome version",
        "last 1 firefox version",
        "last 1 safari version"
      ]
    }
  }, null, 2);
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

const generateIndexJs = () => {
  return `
import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/main.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
  `.trim();
};

const generateAppComponent = (mainComponentName) => {
  return `
import React from 'react';
import ${mainComponentName} from './components/${mainComponentName}';

function App() {
  return (
    <div className="app">
      <${mainComponentName} />
    </div>
  );
}

export default App;
  `.trim();
};

const generateMainCss = () => {
  return `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app {
  min-height: 100vh;
}
  `.trim();
}; 