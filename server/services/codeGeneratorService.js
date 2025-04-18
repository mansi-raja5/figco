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
    
    // Use absolute path to ensure correct file location
    const baseDir = path.resolve(__dirname, '../../generated_code/reactapp');
    logger.log('Base directory:', baseDir);

    // Create all necessary directories first
    const directories = [
      baseDir,
      path.join(baseDir, 'src'),
      path.join(baseDir, 'src/components'),
      path.join(baseDir, 'public'),
      path.join(baseDir, 'public/images')
    ];

    // Create directories synchronously
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

    // Find all image nodes and collect their refs
    logger.log('Finding image nodes in Figma JSON...');
    const imageNodes = findImageNodes(figmaJson.document, logger);
    const imageRefs = imageNodes.map(node => {
      const ref = node.fills?.[0]?.imageRef || node.background?.[0]?.imageRef;
      logger.log('Found image ref:', ref);
      return ref;
    }).filter(Boolean);

    // Copy images to public directory
    if (imageRefs.length > 0) {
      logger.log('Copying images to public directory...');
      await copyImagesToPublic(imageRefs, baseDir, logger);
    } else {
      logger.log('No image references found to copy');
    }

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

const generateImageComponent = (imageNode, componentName) => {
  const props = transformImageProperties(imageNode);
  
  return `
import React from 'react';
import './${componentName}.css';

const ${componentName} = () => {
  return (
    <div className="image-container">
      <img
        src={'/images/Image_${props.imageRef}.png'}
        alt="${componentName}"
        className="styled-image"
      />
    </div>
  );
};

export default ${componentName};
`.trim();
};

// Modified generateReactComponent to handle image components
const generateReactComponent = (figmaJson, componentName) => {
  const imageNodes = findImageNodes(figmaJson.document, console);
  
  if (imageNodes.length > 0) {
    return generateImageComponent(imageNodes[0], componentName);
  }

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
.image-container {
  width: 100%;
  max-width: 393px;
  height: 405px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.styled-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
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
      "react-scripts": "5.0.1",
      "styled-components": "^5.3.10"
    },
    scripts: {
      "start": "react-scripts start",
      "build": "react-scripts build"
    }
  }, null, 2);
}; 