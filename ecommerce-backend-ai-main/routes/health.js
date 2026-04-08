import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'ecommerce-backend-ai-main',
    timestamp: Date.now()
  });
});

export default router;
