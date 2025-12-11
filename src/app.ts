import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import pinoHttp from 'pino-http';
import logger from './config/logger';
import { swaggerSpec } from './config/swagger';
import { corsOptions, securityHeaders, rateLimiter, requestLogger } from './middlewares/security.middleware';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import routes from './routes';

const app = express();

// Request logging
app.use(pinoHttp({ logger }));

// Security middleware
app.use(securityHeaders);
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging
app.use(requestLogger);

// Rate limiting
app.use('/api', rateLimiter);

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    message: 'HR Management System API',
    version: '1.0.0',
    documentation: '/api-docs',
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
