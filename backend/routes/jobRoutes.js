
const express = require('express');
const jobController = require('../controllers/jobController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Create a new job
router.post('/', jobController.createJob);

// Get all jobs with optional filtering
router.get('/', jobController.getAllJobs);

// Get job by ID
router.get('/:jobId', jobController.getJobById);

// Update a job
router.put('/:jobId', jobController.updateJob);

// Delete a job
router.delete('/:jobId', jobController.deleteJob);

// Comment routes
router.post('/:jobId/comments', jobController.addComment);
router.get('/:jobId/comments', jobController.getComments);
router.delete('/comments/:commentId', jobController.deleteComment);

// Reply routes
router.post('/comments/:commentId/replies', jobController.addReply);
router.get('/comments/:commentId/replies', jobController.getRepliesByCommentId);
router.delete('/replies/:replyId', jobController.deleteReply);

// Añadir este log para depuración
console.log('Job routes initialized');

module.exports = router;
