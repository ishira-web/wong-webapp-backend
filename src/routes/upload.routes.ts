import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All upload routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/uploads/sign:
 *   post:
 *     summary: Get ImageKit authentication signature for client-side upload
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Signature generated successfully
 */
router.post('/sign', UploadController.getSignature);

/**
 * @swagger
 * /api/uploads/complete:
 *   post:
 *     summary: Complete file upload and store metadata
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileId
 *               - name
 *               - url
 *               - size
 *               - fileType
 *             properties:
 *               fileId:
 *                 type: string
 *               name:
 *                 type: string
 *               url:
 *                 type: string
 *               thumbnailUrl:
 *                 type: string
 *               size:
 *                 type: number
 *               fileType:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [AVATAR, DOCUMENT, RESUME, PAYSLIP, CONTRACT, OTHER]
 *               entityType:
 *                 type: string
 *               entityId:
 *                 type: string
 *     responses:
 *       201:
 *         description: File uploaded successfully
 */
router.post('/complete', UploadController.completeUpload);

/**
 * @swagger
 * /api/uploads:
 *   get:
 *     summary: Get user's uploaded files
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *       - in: query
 *         name: offset
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Files retrieved successfully
 */
router.get('/', UploadController.getUserFiles);

/**
 * @swagger
 * /api/uploads/{id}:
 *   get:
 *     summary: Get file details
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File details retrieved successfully
 */
router.get('/:id', UploadController.getFile);

/**
 * @swagger
 * /api/uploads/{id}:
 *   put:
 *     summary: Update file metadata
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *               entityType:
 *                 type: string
 *               entityId:
 *                 type: string
 *     responses:
 *       200:
 *         description: File updated successfully
 */
router.put('/:id', UploadController.updateFile);

/**
 * @swagger
 * /api/uploads/{id}:
 *   delete:
 *     summary: Delete file
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File deleted successfully
 */
router.delete('/:id', UploadController.deleteFile);

export default router;
