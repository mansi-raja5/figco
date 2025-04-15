import express from 'express';
import { generateReactCode } from '../services/codeGeneratorService';

const router = express.Router();

router.post('/generate', async (req, res) => {
  try {
    const { figmaJson, componentName } = req.body;
    const result = await generateReactCode(figmaJson, componentName);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router; 