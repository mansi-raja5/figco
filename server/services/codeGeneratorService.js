const fs = require('fs');
const path = require('path');
const util = require('util');
const mkdir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);

// Add function to copy images
const copyImagesToPublic = async (imageRefs, baseDir, logger = console) => {
  try {
    const sourceDir = path.resolve(__dirname, '../../generated_code/images');
    const targetDir = path.join(baseDir, 'public/images');

    logger.log('Source directory:', sourceDir);
    logger.log('Target directory:', targetDir);
    logger.log('Image refs to copy:', imageRefs);

    // Check if source directory exists
    try {
      await fs.promises.access(sourceDir);
      const sourceFiles = await fs.promises.readdir(sourceDir);
      logger.log('Files in source directory:', sourceFiles);

      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        logger.log('Creating target directory:', targetDir);
        await fs.promises.mkdir(targetDir, { recursive: true });
      }

      // Copy each image
      for (const imageRef of imageRefs) {
        // Look for the file with case-insensitive match
        const sourceFileName = sourceFiles.find(
          file => file.toLowerCase() === `image_${imageRef}.png`.toLowerCase()
        );

        if (!sourceFileName) {
          logger.error(`No matching file found for image ref: ${imageRef}`);
          continue;
        }

        const sourcePath = path.join(sourceDir, sourceFileName);
        const targetPath = path.join(targetDir, sourceFileName);

        logger.log('Attempting to copy:', sourcePath, '->', targetPath);

        try {
          await fs.promises.copyFile(sourcePath, targetPath);
          logger.log(`Successfully copied image: ${sourceFileName}`);
        } catch (error) {
          logger.error(`Failed to copy image ${sourceFileName}:`, error.message);
        }
      }
    } catch (error) {
      logger.error('Error accessing source directory:', error.message);
    }
  } catch (error) {
    logger.error('Error in copyImagesToPublic:', error);
  }
};

const findImageNodes = (node, logger = console) => {
  const images = [];
  
  const traverse = (node) => {
    if (node.type === 'FRAME' && node.name === 'Image') {
      logger.log('Found image node:', JSON.stringify(node, null, 2));
      images.push(node);
    }
    
    if (node.children) {
      node.children.forEach(traverse);
    }
  };
  
  traverse(node);
  logger.log('Total image nodes found:', images.length);
  return images;
};

const generateEslintConfig = () => {
  return `module.exports = {
  root: true,
  extends: ['react-app'],
  settings: {
    react: {
      version: 'detect'
    }
  }
};`;
};

const generateReactCode = async (figmaJson, componentName = 'FigmaComponent', logger = console) => {
  try {
    if (!figmaJson || !figmaJson.document) {
      throw new Error('Invalid Figma JSON');
    }

    logger.log('Starting code generation for component:', componentName);
    
    // Find the main frame that contains our design
    const mainFrame = findMainFrame(figmaJson.document);
    if (!mainFrame) {
      throw new Error('No suitable frame found in Figma document');
    }

    // Set up directory structure
    const baseDir = path.resolve(__dirname, '../../generated_code/reactapp');
    logger.log('Base directory:', baseDir);

    // Create directories
    const directories = [
      baseDir,
      path.join(baseDir, 'src'),
      path.join(baseDir, 'src/components'),
      path.join(baseDir, 'public'),
      path.join(baseDir, 'public/images')
    ];

    for (const dir of directories) {
      try {
        if (!fs.existsSync(dir)) {
          logger.log('Creating directory:', dir);
          await fs.promises.mkdir(dir, { recursive: true });
        }
      } catch (error) {
        logger.error(`Error creating directory ${dir}:`, error);
        throw error;
      }
    }

    // Handle images
    logger.log('Finding image nodes in Figma JSON...');
    const imageNodes = findImageNodes(figmaJson.document, logger);
    const imageRefs = imageNodes.map(node => {
      const ref = node.fills?.[0]?.imageRef || node.background?.[0]?.imageRef;
      logger.log('Found image ref:', ref);
      return ref;
    }).filter(Boolean);

    if (imageRefs.length > 0) {
      logger.log('Copying images to public directory...');
      await copyImagesToPublic(imageRefs, baseDir, logger);
    }

    // Generate component code and styles
    const componentCode = `import React from 'react';
import './FigmaComponent.css';

const FigmaComponent = () => {
  return (
${generateNodeComponent(mainFrame, 2)}
  );
};

export default FigmaComponent;`;

    const styles = generateStyles(mainFrame);

    // Define files to create
    const files = [
      {
        content: componentCode,
        path: path.join(baseDir, 'src/components', `${componentName}.js`)
      },
      {
        content: styles,
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
      },
      {
        content: generateEslintConfig(),
        path: path.join(baseDir, '.eslintrc.js')
      }
    ];

    // Save all files
    const savedFiles = {};
    for (const file of files) {
      try {
        logger.log('Writing file:', file.path);
        await fs.promises.writeFile(file.path, file.content, 'utf8');
        logger.log('File written successfully:', file.path);
        savedFiles[path.basename(file.path)] = file.path;
      } catch (error) {
        logger.error(`Error creating ${file.path}:`, error);
        throw error;
      }
    }

    return {
      success: true,
      message: 'React application generated successfully',
      path: baseDir,
      files: savedFiles,
      componentCode,
      styles
    };
  } catch (error) {
    logger.error('Error in generateReactCode:', error);
    throw error;
  }
};

// Helper function to find the main frame
const findMainFrame = (document) => {
  if (!document) return null;
  
  let mainFrame = null;
  
  const findNode = (node) => {
    if (!node) return;
    
    // Look for a FRAME or COMPONENT_SET that has children
    if ((node.type === 'FRAME' || node.type === 'COMPONENT_SET') && 
        node.children && node.children.length > 0) {
      // If we haven't found a frame yet, or if this frame has more children
      if (!mainFrame || (node.children.length > mainFrame.children.length)) {
        mainFrame = node;
      }
    }
    
    // Continue searching in children
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(findNode);
    }
  };

  findNode(document);
  return mainFrame;
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

// Meta model transformation helpers
const transformImageProperties = (imageNode) => {
  const imageProps = {
    width: imageNode.absoluteBoundingBox?.width || '100%',
    height: imageNode.absoluteBoundingBox?.height || '100%',
    borderRadius: imageNode.cornerRadius || 0,
    imageRef: imageNode.fills?.[0]?.imageRef || imageNode.background?.[0]?.imageRef,
    scaleMode: imageNode.fills?.[0]?.scaleMode || imageNode.background?.[0]?.scaleMode || 'FILL',
    blendMode: imageNode.fills?.[0]?.blendMode || imageNode.background?.[0]?.blendMode || 'NORMAL',
  };

  return imageProps;
};

const generateImageComponent = (imageNodes, componentName) => {
  // Transform all image nodes to get their properties
  const images = imageNodes.map(node => transformImageProperties(node));
  
  return `
import React from 'react';
import './${componentName}.css';

const ${componentName} = () => {
  const images = ${JSON.stringify(images, null, 2)};

  return (
    <div className="images-grid">
      {images.map((image, index) => (
        <div key={index} className="image-container">
          <img
            src={'/images/Image_' + image.imageRef + '.png'}
            alt={\`Image \${index + 1}\`}
            className="styled-image"
          />
        </div>
      ))}
    </div>
  );
};

export default ${componentName};
`.trim();
};

// Meta-model transformation helpers
const transformLayoutProps = (node) => {
  if (!node) return {};
  
  const layout = {
    display: 'block',
    flexDirection: 'column',
    gap: 0,
    padding: 0,
    width: '100%',
    height: 'auto'
  };

  if (node.layoutMode && typeof node.layoutMode === 'string') {
    const isHorizontal = node.layoutMode.toLowerCase() === 'horizontal';
    layout.display = isHorizontal ? 'flex' : 'block';
    layout.flexDirection = isHorizontal ? 'row' : 'column';
  }

  if (typeof node.itemSpacing === 'number') {
    layout.gap = node.itemSpacing;
  }

  if (typeof node.padding === 'number') {
    layout.padding = node.padding;
  }

  if (node.absoluteBoundingBox) {
    if (typeof node.absoluteBoundingBox.width === 'number') {
      layout.width = `${node.absoluteBoundingBox.width}px`;
    }
    if (typeof node.absoluteBoundingBox.height === 'number') {
      layout.height = `${node.absoluteBoundingBox.height}px`;
    }
  }

  return layout;
};

const transformTextStyles = (node) => {
  if (!node) return {};

  const styles = {
    fontSize: 'inherit',
    fontWeight: 'normal',
    fontFamily: 'inherit',
    lineHeight: 'normal',
    color: 'inherit'
  };

  if (node.style) {
    if (typeof node.style.fontSize === 'number') {
      styles.fontSize = `${node.style.fontSize}px`;
    }
    if (node.style.fontWeight) {
      styles.fontWeight = node.style.fontWeight;
    }
    if (node.style.fontFamily) {
      styles.fontFamily = node.style.fontFamily;
    }
    if (typeof node.style.lineHeightPx === 'number') {
      styles.lineHeight = `${node.style.lineHeightPx}px`;
    }
  }

  if (node.fills && node.fills[0] && node.fills[0].color) {
    const color = node.fills[0].color;
    styles.color = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
  }

  return styles;
};

const generateNodeStyles = (node) => {
  if (!node) return {};

  let styles = {};

  try {
    // Clean up node ID to create valid CSS class name
    const cleanNodeId = (id) => {
      if (!id) return Date.now().toString();
      // Remove instance path separators and clean up the ID
      return id.split(';')[0]  // Take only the first part of instance ID
        .replace(':', '-')     // Replace colons with hyphens
        .replace(/[^a-zA-Z0-9-]/g, ''); // Remove any other invalid characters
    };

    if (node.type === 'FRAME') {
      const layout = transformLayoutProps(node);
      styles = {
        ...layout,
        backgroundColor: 'transparent',
        borderRadius: '0',
        overflow: 'visible'
      };

      if (node.backgroundColor) {
        styles.backgroundColor = `rgba(${Math.round(node.backgroundColor.r * 255)}, ${Math.round(node.backgroundColor.g * 255)}, ${Math.round(node.backgroundColor.b * 255)}, ${node.backgroundColor.a})`;
      }

      if (typeof node.cornerRadius === 'number') {
        styles.borderRadius = `${node.cornerRadius}px`;
      }

      if (typeof node.clipsContent === 'boolean') {
        styles.overflow = node.clipsContent ? 'hidden' : 'visible';
      }
    } else if (node.type === 'TEXT') {
      styles = transformTextStyles(node);
    }

    // Add the cleanNodeId function to the module exports
    if (typeof module !== 'undefined' && module.exports) {
      module.exports.cleanNodeId = cleanNodeId;
    }

  } catch (error) {
    console.error('Error generating styles for node:', error);
  }

  return styles;
};

const generateStylesString = (styles) => {
  if (!styles || typeof styles !== 'object') return '';
  
  return Object.entries(styles)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => {
      // Convert camelCase to kebab-case
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${cssKey}: ${value};`;
    })
    .join('\n  ');
};

const generateNodeComponent = (node, depth = 0) => {
  if (!node || typeof node !== 'object') return '';
  
  const indent = '  '.repeat(depth);
  const nodeId = cleanNodeId(node.id);
  const className = `node-${node.type.toLowerCase()}-${nodeId}`;

  // Handle different node types
  switch (node.type) {
    case 'TEXT':
      return `${indent}<div className="${className}">
${indent}  {${JSON.stringify(node.characters)}}
${indent}</div>`;

    case 'FRAME':
      // Special handling for the root frame (Test frame)
      if (node.name === 'Test') {
        // Find the section heading and card container nodes
        const headingNode = node.children.find(child => child.type === 'TEXT');
        const cardNodes = node.children.filter(child => 
          child.type === 'FRAME' && child.children && child.children.length > 0 && child.name !== 'Section heading'
        );

        // Generate the heading component
        const headingComponent = headingNode ? generateNodeComponent(headingNode, depth + 1) : '';

        // Generate the cards container with grid layout
        const cardsComponent = cardNodes.length > 0 ? 
          `${indent}<div className="cards-grid">
${cardNodes.map(card => `${indent}  <div className="card-wrapper">
${generateNodeComponent(card, depth + 2)}
${indent}  </div>`).join('\n')}
${indent}</div>` : '';

        // Return the complete structure
        return `${indent}<div className="${className}">
${headingComponent}
${cardsComponent}
${indent}</div>`;
      }

      // Special handling for Image frames
      if (node.name === 'Image' && node.fills && node.fills[0] && node.fills[0].type === 'IMAGE') {
        return `${indent}<div className="${className}">
${indent}  <img 
${indent}    src={'/images/Image_${node.fills[0].imageRef}.png'}
${indent}    alt="Frame Image"
${indent}    className="card-image"
${indent}  />
${indent}</div>`;
      }

      // Handle card frames
      if (node.children) {
        const children = node.children
          .map(child => generateNodeComponent(child, depth + 1))
          .filter(Boolean)
          .join('\n');

        // Add layout properties based on node's layout settings
        const layoutStyle = {};
        
        if (node.layoutMode === 'HORIZONTAL') {
          layoutStyle.display = 'flex';
          layoutStyle.flexDirection = 'row';
          layoutStyle.alignItems = 'center';
        } else if (node.layoutMode === 'VERTICAL') {
          layoutStyle.display = 'flex';
          layoutStyle.flexDirection = 'column';
        }

        if (typeof node.itemSpacing === 'number') {
          layoutStyle.gap = `${node.itemSpacing}px`;
        }

        const styleString = Object.keys(layoutStyle).length > 0 
          ? ` style={${JSON.stringify(layoutStyle)}}`
          : '';

        return `${indent}<div className="${className}"${styleString}>
${children}
${indent}</div>`;
      }

      return '';

    default:
      if (Array.isArray(node.children) && node.children.length > 0) {
        const children = node.children
          .map(child => generateNodeComponent(child, depth + 1))
          .filter(Boolean)
          .join('\n');

        return `${indent}<div className="${className}">
${children}
${indent}</div>`;
      }
      return '';
  }
};

// Add function to extract month data
const extractCardData = (node) => {
  if (!node || !node.children) return null;

  const months = [];
  
  const processNode = (node) => {
    if (!node || !node.children) return;
    
    // Check if this is a month frame structure (has a rectangle and text)
    if (node.type === 'FRAME' && node.children.length > 0) {
      const rectangleNode = node.children.find(child => 
        child.type === 'RECTANGLE'
      );
      
      const textNode = node.children.find(child => 
        child.type === 'TEXT'
      );

      if (rectangleNode && textNode) {
        months.push({
          id: node.id,
          name: textNode.characters,
          color: rectangleNode.fills?.[0]?.color || { r: 1, g: 1, b: 1, a: 1 },
          frameClassName: `node-frame-${cleanNodeId(node.id)}`,
          rectangleClassName: `node-rectangle-${cleanNodeId(rectangleNode.id)}`,
          textClassName: `node-text-${cleanNodeId(textNode.id)}`
        });
      }
    }

    // Process children recursively
    if (Array.isArray(node.children)) {
      node.children.forEach(processNode);
    }
  };

  processNode(node);
  console.log('Extracted months data:', months);
  return months;
};

const generateReactComponent = (figmaJson, componentName) => {
  try {
    const testFrame = findTestFrame(figmaJson.document);
    
    if (!testFrame) {
      console.error('No suitable frame found in Figma document');
      return generateDefaultComponent(componentName);
    }

    // Generate the component
    const componentContent = generateNodeComponent(testFrame, 2);
    
    if (!componentContent) {
      return generateDefaultComponent(componentName);
    }

    return `
import React from 'react';
import './${componentName}.css';

const ${componentName} = () => {
  return (
${componentContent}
  );
};

export default ${componentName};
`.trim();

  } catch (error) {
    console.error('Error in generateReactComponent:', error);
    return generateDefaultComponent(componentName);
  }
};

const generateDefaultComponent = (componentName) => {
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
      "react-scripts": "5.0.1",
      "styled-components": "^5.3.10"
    },
    devDependencies: {
      "eslint": "^8.56.0",
      "eslint-config-react-app": "^7.0.1"
    },
    scripts: {
      "start": "npx react-scripts start",
      "build": "npx react-scripts build"
    }
  }, null, 2);
};

const findTestFrame = (document) => {
  if (!document) {
    console.log('Document is null or undefined');
    return null;
  }
  
  let testFrame = null;
  let frameCount = 0;
  
  const findNode = (node) => {
    if (!node) return;
    
    // Log the node we're currently examining
    console.log(`Examining node: ${node.name} (type: ${node.type})`);
    
    if ((node.type === 'FRAME' || node.type === 'COMPONENT_SET' || node.type === 'COMPONENT') && 
        node.children && node.children.length > 0) {
      frameCount++;
      console.log(`Found potential frame/component: ${node.name} (type: ${node.type}, children: ${node.children.length})`);
      
      // If we haven't found a frame yet, or if this is a COMPONENT_SET (prefer COMPONENT_SET)
      if (!testFrame || 
          (node.type === 'COMPONENT_SET') || 
          (node.type === 'COMPONENT' && testFrame.type === 'FRAME')) {
        testFrame = node;
        console.log(`Selected as current best frame: ${node.name} (type: ${node.type})`);
      }
    }
    
    // Continue searching in children
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(findNode);
    }
  };

  // Start searching from the document
  console.log('Starting frame search in document...');
  findNode(document);
  
  console.log(`Frame search complete. Found ${frameCount} potential frames/components`);
  if (testFrame) {
    console.log(`Selected frame: ${testFrame.name} (type: ${testFrame.type})`);
  } else {
    console.log('No suitable frame found');
  }

  return testFrame;
};

// Helper function to clean node IDs for CSS class names
const cleanNodeId = (id) => {
  if (!id) return Date.now().toString();
  // Remove instance path separators and clean up the ID
  return id.split(';')[0]  // Take only the first part of instance ID
    .replace(':', '-')     // Replace colons with hyphens
    .replace(/[^a-zA-Z0-9-]/g, ''); // Remove any other invalid characters
};

const generateStyles = (node) => {
  if (!node || typeof node !== 'object') return '';

  let styles = [];
  
  // Add base styles
  styles.push(`
/* Base styles */
.node-frame-64-2 {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Grid layout */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  width: 100%;
  margin-top: 40px;
}

/* Card wrapper */
.card-wrapper {
  display: flex;
  flex-direction: column;
}

/* Card image */
.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

/* Section heading */
.node-text-64-85 {
  font-family: Inter;
  font-size: 48px;
  font-weight: 600;
  line-height: 58px;
  letter-spacing: -0.96px;
  text-align: center;
  color: rgba(0, 0, 0, 1);
  margin-bottom: 32px;
  width: 100%;
}

/* Responsive grid */
@media (max-width: 1024px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
}`);
  
  const processNode = (node) => {
    if (!node || typeof node !== 'object') return;

    try {
      const nodeType = (node.type && typeof node.type === 'string') ? node.type.toLowerCase() : 'div';
      const nodeId = cleanNodeId(node.id);
      const className = `node-${nodeType}-${nodeId}`;

      // Generate styles based on node type
      switch (node.type) {
        case 'TEXT': {
          // Skip the section heading as it's handled in base styles
          if (node.style && node.style.fontSize >= 48) break;

          const textStyle = {};
          if (node.style) {
            if (node.style.fontFamily) textStyle['font-family'] = node.style.fontFamily;
            if (node.style.fontSize) textStyle['font-size'] = `${node.style.fontSize}px`;
            if (node.style.fontWeight) textStyle['font-weight'] = node.style.fontWeight;
            if (node.style.lineHeightPx) textStyle['line-height'] = `${node.style.lineHeightPx}px`;
            if (node.style.letterSpacing) textStyle['letter-spacing'] = `${node.style.letterSpacing}px`;
            if (node.style.textAlignHorizontal) textStyle['text-align'] = node.style.textAlignHorizontal.toLowerCase();
          }

          if (node.fills && node.fills[0] && node.fills[0].type === 'SOLID') {
            const color = node.fills[0].color;
            textStyle.color = `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${color.a})`;
          }

          styles.push(`.${className} {
  ${Object.entries(textStyle).map(([key, value]) => `${key}: ${value};`).join('\n  ')}
}`);
          break;
        }

        case 'FRAME': {
          const frameStyle = {};
          
          // Handle layout properties
          if (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL') {
            frameStyle.display = 'flex';
            frameStyle['flex-direction'] = node.layoutMode === 'HORIZONTAL' ? 'row' : 'column';
            
            if (typeof node.itemSpacing === 'number') {
              frameStyle.gap = `${node.itemSpacing}px`;
            }
          }

          if (Object.keys(frameStyle).length > 0) {
            styles.push(`.${className} {
  ${Object.entries(frameStyle).map(([key, value]) => `${key}: ${value};`).join('\n  ')}
}`);
          }
          break;
        }
      }

      // Process children recursively
      if (Array.isArray(node.children)) {
        node.children.forEach(processNode);
      }
    } catch (error) {
      console.error('Error processing node styles:', error);
    }
  };

  processNode(node);
  return styles.join('\n\n');
}; 