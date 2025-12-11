import { Router } from 'express';
import authRoutes from './auth.routes';
import uploadRoutes from './upload.routes';
// Import other routes as they are created

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Metrics endpoint for monitoring
router.get('/metrics', (_req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/uploads', uploadRoutes);

export default router;
