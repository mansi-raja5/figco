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

const generateReactCode = async (figmaJson, componentName = 'FigmaComponent', logger = console) => {
  try {
    logger.log('Starting code generation for component:', componentName);
    
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

    // Find image nodes and handle images
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

    // Find the Test frame
    const testFrame = findTestFrame(figmaJson.document);
    if (!testFrame) {
      throw new Error('Test frame not found in Figma document');
    }

    // Generate the CSS first
    logger.log('Generating CSS...');
    const cssContent = generateStyles(testFrame);
    logger.log('CSS content generated:', cssContent);

    // Define files to create
    const files = [
      {
        content: generateReactComponent(figmaJson, componentName),
        path: path.join(baseDir, 'src/components', `${componentName}.js`)
      },
      {
        content: cssContent,
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

    // Save all files
    const savedFiles = {};
    for (const file of files) {
      try {
        logger.log('Writing file:', file.path);
        logger.log('File content:', file.content);
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
      files: savedFiles
    };
  } catch (error) {
    logger.error('Error in generateReactCode:', error);
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
  const styles = generateNodeStyles(node);
  const nodeType = (node.type && typeof node.type === 'string') ? node.type.toLowerCase() : 'div';
  const nodeId = (node.id && typeof node.id === 'string') ? node.id.replace(':', '-') : Date.now().toString();
  const className = `node-${nodeType}-${nodeId}`;

  let component = '';

  try {
    // Check if this is a frame that contains an image
    const hasImageFill = node.fills?.[0]?.type === 'IMAGE' || node.background?.[0]?.type === 'IMAGE';
    const imageRef = node.fills?.[0]?.imageRef || node.background?.[0]?.imageRef;

    switch (node.type) {
      case 'FRAME':
        if (hasImageFill && imageRef && typeof imageRef === 'string') {
          // This is a frame with an image fill, render as img
          component = `${indent}<img 
${indent}  src={'/images/Image_${imageRef}.png'}
${indent}  alt="${(node.name && typeof node.name === 'string') ? node.name : 'Image'}"
${indent}  className="${className}"
${indent}/>`;
        } else {
          // Regular frame, render as div with children
          const childrenContent = Array.isArray(node.children) 
            ? node.children.map(child => generateNodeComponent(child, depth + 1)).join('\n') 
            : '';
          component = `${indent}<div className="${className}">
${childrenContent}
${indent}</div>`;
        }
        break;

      case 'TEXT':
        const text = node.characters && typeof node.characters === 'string' ? node.characters : '';
        component = `${indent}<p className="${className}">${text}</p>`;
        break;

      default:
        const defaultChildrenContent = Array.isArray(node.children)
          ? node.children.map(child => generateNodeComponent(child, depth + 1)).join('\n')
          : '';
        component = `${indent}<div className="${className}">
${defaultChildrenContent}
${indent}</div>`;
    }
  } catch (error) {
    console.error('Error generating component for node:', error);
    component = `${indent}<div className="${className}"></div>`;
  }

  return component;
};

const generateStyles = (node) => {
  if (!node || typeof node !== 'object') return '';

  let styles = [];
  console.log('Starting style generation for node:', node.name || 'unnamed node');
  
  const processNode = (node) => {
    if (!node || typeof node !== 'object') return;

    try {
      const nodeType = (node.type && typeof node.type === 'string') ? node.type.toLowerCase() : 'div';
      const nodeId = (node.id && typeof node.id === 'string') ? node.id.replace(':', '-') : Date.now().toString();
      const className = `node-${nodeType}-${nodeId}`;
      const nodeStyles = generateNodeStyles(node);
      
      console.log('Generated styles for node:', {
        name: node.name,
        type: nodeType,
        className,
        styles: nodeStyles
      });
      
      if (Object.keys(nodeStyles).length > 0) {
        const styleString = generateStylesString(nodeStyles);
        console.log('Style string generated:', styleString);
        
        if (styleString.trim()) {
          styles.push(`.${className} {
  ${styleString}
}`);
        }
      }

      if (Array.isArray(node.children)) {
        node.children.forEach(processNode);
      }
    } catch (error) {
      console.error('Error processing styles for node:', error);
    }
  };

  processNode(node);
  const finalStyles = styles.join('\n\n');
  console.log('Final CSS generated:', finalStyles);
  return finalStyles;
};

const findTestFrame = (document) => {
  if (!document) return null;
  
  let testFrame = null;
  
  const findNode = (node) => {
    if (!node) return;
    
    if (node.name === 'Test' && node.type === 'FRAME') {
      testFrame = node;
      return;
    }
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(findNode);
    }
  };

  findNode(document);
  return testFrame;
};

const generateReactComponent = (figmaJson, componentName) => {
  try {
    const testFrame = findTestFrame(figmaJson.document);
    
    if (!testFrame) {
      console.error('Test frame not found in Figma document');
      return generateDefaultComponent(componentName);
    }

    return `
import React from 'react';
import './${componentName}.css';

const ${componentName} = () => {
  return (
${generateNodeComponent(testFrame, 2)}
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
    scripts: {
      "start": "react-scripts start",
      "build": "react-scripts build"
    }
  }, null, 2);
}; 