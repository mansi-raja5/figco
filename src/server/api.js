const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const router = express.Router();

// Create directory endpoint
router.post('/createDirectory', async (req, res) => {
  try {
    const { path: dirPath } = req.body;
    await fs.mkdir(dirPath, { recursive: true });
    res.json({ success: true, path: dirPath });
  } catch (error) {
    console.error('Error creating directory:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Download image endpoint
router.post('/downloadImage', async (req, res) => {
  try {
    const { url, path: filePath } = req.body;
    
    // Download image
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    // Get the buffer
    const buffer = await response.buffer();
    
    // Save to file
    await fs.writeFile(filePath, buffer);
    
    res.json({ success: true, path: filePath });
  } catch (error) {
    console.error('Error downloading image:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 