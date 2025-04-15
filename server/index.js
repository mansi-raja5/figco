const express = require('express');
const cors = require('cors');
const path = require('path');
const generateCodeRouter = require('./routes/generateCode');

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

// Serve the generated code directory
app.use('/generated_code', express.static(path.join(__dirname, '..', 'generated_code')));

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '..', 'build')));

// Add a test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running' });
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