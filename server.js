import express from 'express';
import path from 'path';
import generateCodeRouter from './src/api/generateCode';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use('/api', generateCodeRouter);

// Serve the generated code directory
app.use('/generated_code', express.static(path.join(process.cwd(), 'generated_code')));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 