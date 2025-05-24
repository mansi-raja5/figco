const express = require('express');
const cors = require('cors');
const path = require('path');
const generateCodeRouter = require('./routes/generateCode');
const imageHandlingRouter = require('./routes/imageHandling');
const fs = require('fs');
const archiver = require('archiver');

const app = express();
const PORT = process.env.PORT || 3002;

// Increase JSON payload limit to 50mb
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));

// Middleware
app.use(cors());

// Add request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// Routes
app.use('/api', generateCodeRouter);
app.use('/api', imageHandlingRouter);

// Serve the generated code directory
app.use('/generated_code', express.static(path.join(__dirname, '..', 'generated_code')));

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '..', 'build')));

// Add a test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running' });
});

app.get('/api/download-app', async (req, res) => {
  const appPath = path.join(__dirname, '../generated_code/reactapp');
  const zipPath = path.join(__dirname, '../generated_code/reactapp.zip');

  try {
    // Create a write stream for the zip file
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Listen for all archive data to be written
    output.on('close', function() {
      // Send the zip file
      res.download(zipPath, 'reactapp.zip', (err) => {
        if (err) {
          console.error('Error sending file:', err);
        }
        // Clean up: delete the zip file after sending
        fs.unlink(zipPath, (unlinkErr) => {
          if (unlinkErr) {
            console.error('Error deleting zip file:', unlinkErr);
          }
        });
      });
    });

    // Handle archive errors
    archive.on('error', function(err) {
      console.error('Archive error:', err);
      res.status(500).json({ error: 'Failed to create zip file' });
    });

    // Pipe archive data to the output file
    archive.pipe(output);

    // Add the reactapp directory to the archive
    archive.directory(appPath, 'reactapp');

    // Finalize the archive
    await archive.finalize();
  } catch (error) {
    console.error('Error creating zip:', error);
    res.status(500).json({ error: 'Failed to create zip file' });
  }
});

// Basic error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Something broke!'
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Current directory: ${__dirname}`);
  console.log(`Generated code path: ${path.join(__dirname, '..', 'generated_code')}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
}); 