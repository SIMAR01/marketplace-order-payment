import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

// Public health checks
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
  });
});

export default app;
