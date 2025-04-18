const express = require('express');
const { generateReactCode } = require('../services/codeGeneratorService');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

router.post('/generate', async (req, res) => {
  try {
    console.log('Received generate request:', req.body);
    const { figmaJson, componentName } = req.body;
    
    if (!figmaJson) {
      return res.status(400).json({
        success: false,
        error: 'figmaJson is required'
      });
    }

    const result = await generateReactCode(figmaJson, componentName);
    res.json(result);
  } catch (error) {
    console.error('Error in generate route:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/run-app', async (req, res) => {
  try {
    const appPath = path.join(__dirname, '../../generated_code/reactapp');
    
    // Check if directory exists
    try {
      await fs.access(appPath);
    } catch (error) {
      throw new Error('React app directory not found. Please generate the code first.');
    }

    // Run npm install
    exec('cd ' + appPath + ' && npm install', (error, stdout, stderr) => {
      if (error) {
        console.error('Error running npm install:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to install dependencies: ' + error.message,
          stdout,
          stderr
        });
      }

      console.log('npm install output:', stdout);
      
      // Start the React app
      exec('cd ' + appPath + ' && npm start', (error, stdout, stderr) => {
        if (error) {
          console.error('Error starting React app:', error);
          return res.status(500).json({
            success: false,
            error: 'Failed to start React app: ' + error.message,
            stdout,
            stderr
          });
        }

        console.log('npm start output:', stdout);
        res.json({
          success: true,
          message: 'React app started successfully',
          url: 'http://localhost:3000'
        });
      });
    });
  } catch (error) {
    console.error('Error in run-app route:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/readDirectory', async (req, res) => {
  try {
    const dirPath = req.query.path;
    
    // Validate the path is within your project
    if (!dirPath.startsWith('/var/www/figco/generated_code')) {
      throw new Error('Invalid directory path');
    }

    // Recursive function to read directory contents
    async function readDirRecursive(currentPath) {
      const stats = await fs.stat(currentPath);
      
      if (stats.isFile()) {
        return {
          type: 'file',
          name: path.basename(currentPath),
          path: currentPath
        };
      }

      if (stats.isDirectory()) {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        const children = await Promise.all(
          entries.map(async entry => {
            const fullPath = path.join(currentPath, entry.name);
            return readDirRecursive(fullPath);
          })
        );

        return {
          type: 'folder',
          name: path.basename(currentPath),
          path: currentPath,
          children: children
        };
      }
    }

    const structure = await readDirRecursive(dirPath);
    res.json(structure);
  } catch (error) {
    console.error('Error reading directory:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/readFile', async (req, res) => {
  try {
    const filePath = req.query.path;
    
    // Validate the path is within your project
    if (!filePath.startsWith('/var/www/figco/generated_code')) {
      throw new Error('Invalid file path');
    }

    // Read the file content
    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ content });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 