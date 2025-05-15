const jobModel = require('../models/jobModel');
const userModel = require('../models/userModel');
const commentModel = require('../models/commentModel');
const { v4: uuidv4 } = require('uuid');

const jobController = {
  // Create a new job
  async createJob(req, res) {
    try {
      const { title, description, budget, category, skills } = req.body;
      const userId = req.user.userId;
      
      console.log('Creating job with data:', { title, description, budget, category, skills, userId });
      
      // Validate required fields
      if (!title || !description || !budget || !category) {
        console.error('Missing required fields:', { title, description, budget, category });
        return res.status(400).json({
          success: false,
          message: 'Missing required fields (title, description, budget, category)'
        });
      }
      
      // Create the job
      const job = await jobModel.create({
        title,
        description,
        budget: parseFloat(budget),
        category,
        skills: Array.isArray(skills) ? skills : [],
        userId
      });
      
      console.log('Job created successfully:', job);
      
      // Get user info for the response
      const user = await userModel.findById(userId);
      
      const jobWithUser = {
        ...job,
        userName: user ? user.name : 'Usuario desconocido',
        userPhoto: user ? user.avatar : null
      };
      
      return res.status(201).json({
        success: true,
        message: 'Job created successfully',
        job: jobWithUser
      });
      
    } catch (error) {
      console.error('Error creating job:', error);
      
      // Proporcionar un mensaje más descriptivo basado en el error
      let errorMessage = 'Error creating job';
      if (error.code === '23502') { // Error de restricción de no nulo
        errorMessage = `Required field "${error.column}" cannot be null`;
      }
      
      return res.status(500).json({
        success: false,
        message: errorMessage,
        error: error.message,
        details: error.detail || null,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },
  
  // Get all jobs with filters
  async getAllJobs(req, res) {
    try {
      const { category, search, status } = req.query;
      
      const filter = {};
      
      // Filter by category
      if (category) {
        filter.category = category;
      }
      
      // Filter by status
      if (status) {
        filter.status = status;
      }
      
      // Search by title or description (simplified for PostgreSQL)
      if (search) {
        filter.search = search;
      }
      
      const jobs = await jobModel.findAll(filter);
      
      // Get user info for each job
      const jobsWithUserInfo = await Promise.all(jobs.map(async (job) => {
        const user = await userModel.findById(job.userId);
        return {
          ...job,
          userName: user ? user.name : 'Usuario desconocido',
          userPhoto: user ? user.avatar : null
        };
      }));
      
      return res.status(200).json({
        success: true,
        jobs: jobsWithUserInfo
      });
      
    } catch (error) {
      console.error('Error getting jobs:', error);
      return res.status(500).json({
        success: false,
        message: 'Error getting jobs',
        error: error.message
      });
    }
  },
  
  // Get job by ID
  async getJobById(req, res) {
    try {
      const { jobId } = req.params;
      
      const job = await jobModel.findById(jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }
      
      // Get user info
      const user = await userModel.findById(job.userId);
      
      const jobWithUser = {
        ...job,
        userName: user ? user.name : 'Usuario desconocido',
        userPhoto: user ? user.avatar : null
      };
      
      return res.status(200).json({
        success: true,
        job: jobWithUser
      });
      
    } catch (error) {
      console.error('Error getting job by ID:', error);
      return res.status(500).json({
        success: false,
        message: 'Error getting job',
        error: error.message
      });
    }
  },
  
  // Update a job
  async updateJob(req, res) {
    try {
      const { jobId } = req.params;
      const { title, description, budget, category, skills, status } = req.body;
      const userId = req.user.userId;
      
      // Check if job exists
      const job = await jobModel.findById(jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }
      
      // Verify user is the owner
      if (job.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to edit this job'
        });
      }
      
      // Update job
      const updatedData = {};
      if (title) updatedData.title = title;
      if (description) updatedData.description = description;
      if (budget) updatedData.budget = parseFloat(budget);
      if (category) updatedData.category = category;
      if (skills) updatedData.skills = skills;
      if (status) updatedData.status = status;
      
      const updatedJob = await jobModel.update(jobId, updatedData);
      
      // Get user info for the response
      const user = await userModel.findById(userId);
      
      const jobWithUser = {
        ...updatedJob,
        userName: user ? user.name : 'Usuario desconocido',
        userPhoto: user ? user.avatar : null
      };
      
      return res.status(200).json({
        success: true,
        message: 'Job updated successfully',
        job: jobWithUser
      });
      
    } catch (error) {
      console.error('Error updating job:', error);
      return res.status(500).json({
        success: false,
        message: 'Error updating job',
        error: error.message
      });
    }
  },
  
  // Delete a job
  async deleteJob(req, res) {
    try {
      const { jobId } = req.params;
      const userId = req.user.userId;
      
      // Check if job exists
      const job = await jobModel.findById(jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }
      
      // Verify user is the owner
      if (job.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this job'
        });
      }
      
      // Delete job
      await jobModel.delete(jobId);
      
      return res.status(200).json({
        success: true,
        message: 'Job deleted successfully'
      });
      
    } catch (error) {
      console.error('Error deleting job:', error);
      return res.status(500).json({
        success: false,
        message: 'Error deleting job',
        error: error.message
      });
    }
  },
  
  // Comment functions
  async addComment(req, res) {
    try {
      const { jobId } = req.params;
      const { content } = req.body;
      const userId = req.user.userId;
      
      if (!content) {
        return res.status(400).json({
          success: false,
          message: 'Comment content is required'
        });
      }
      
      // Check if job exists
      const job = await jobModel.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }
      
      // Create comment
      const commentId = uuidv4();
      const now = new Date().toISOString();
      
      const comment = {
        id: commentId,
        content,
        userId,
        jobId,
        createdAt: now,
        updatedAt: now,
        replies: []
      };
      
      // Save comment to database
      const savedComment = await commentModel.create(comment);
      
      // Get user info for the response
      const user = await userModel.findById(userId);
      
      const commentWithUser = {
        ...savedComment,
        userName: user ? user.name : 'Usuario desconocido',
        userPhoto: user ? user.avatar : null
      };
      
      return res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        comment: commentWithUser
      });
      
    } catch (error) {
      console.error('Error adding comment:', error);
      return res.status(500).json({
        success: false,
        message: 'Error adding comment',
        error: error.message
      });
    }
  },
  
  async getComments(req, res) {
    try {
      const { jobId } = req.params;
      
      // Check if job exists
      const job = await jobModel.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }
      
      // Get comments for the job
      const comments = await commentModel.findByJobId(jobId);
      
      // Enrich comments with user info
      const enrichedComments = await Promise.all(comments.map(async (comment) => {
        const user = await userModel.findById(comment.userId);
        
        // Enrich replies with user info if there are any
        let enrichedReplies = [];
        if (comment.replies && comment.replies.length > 0) {
          enrichedReplies = await Promise.all(comment.replies.map(async (reply) => {
            const replyUser = await userModel.findById(reply.userId);
            return {
              ...reply,
              userName: replyUser ? replyUser.name : 'Usuario desconocido',
              userPhoto: replyUser ? replyUser.avatar : null
            };
          }));
        }
        
        return {
          ...comment,
          userName: user ? user.name : 'Usuario desconocido',
          userPhoto: user ? user.avatar : null,
          replies: enrichedReplies
        };
      }));
      
      return res.status(200).json({
        success: true,
        comments: enrichedComments
      });
      
    } catch (error) {
      console.error('Error getting comments:', error);
      return res.status(500).json({
        success: false,
        message: 'Error getting comments',
        error: error.message
      });
    }
  },
  
  async deleteComment(req, res) {
    try {
      const { commentId } = req.params;
      const userId = req.user.userId;
      
      // Get the comment
      const comment = await commentModel.findById(commentId);
      
      if (!comment) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found'
        });
      }
      
      // Check if user is the owner of the comment
      if (comment.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to delete this comment'
        });
      }
      
      // Delete comment
      await commentModel.delete(commentId);
      
      return res.status(200).json({
        success: true,
        message: 'Comment deleted successfully'
      });
      
    } catch (error) {
      console.error('Error deleting comment:', error);
      return res.status(500).json({
        success: false,
        message: 'Error deleting comment',
        error: error.message
      });
    }
  },
  
  async addReply(req, res) {
    try {
      const { commentId } = req.params;
      const { content } = req.body;
      const userId = req.user.userId;
      
      if (!content) {
        return res.status(400).json({
          success: false,
          message: 'Reply content is required'
        });
      }
      
      // Get the comment
      const comment = await commentModel.findById(commentId);
      
      if (!comment) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found'
        });
      }
      
      // Create reply
      const replyId = uuidv4();
      const now = new Date().toISOString();
      
      const reply = {
        id: replyId,
        content,
        userId,
        commentId,
        createdAt: now,
        updatedAt: now
      };
      
      // Save reply to database
      const savedReply = await commentModel.addReply(commentId, reply);
      
      // Get user info for the response
      const user = await userModel.findById(userId);
      
      const replyWithUser = {
        ...savedReply,
        userName: user ? user.name : 'Usuario desconocido',
        userPhoto: user ? user.avatar : null
      };
      
      return res.status(201).json({
        success: true,
        message: 'Reply added successfully',
        reply: replyWithUser
      });
      
    } catch (error) {
      console.error('Error adding reply:', error);
      return res.status(500).json({
        success: false,
        message: 'Error adding reply',
        error: error.message
      });
    }
  },
  
  async deleteReply(req, res) {
    try {
      const { replyId } = req.params;
      const userId = req.user.userId;
      
      // Get the reply
      const reply = await commentModel.findReplyById(replyId);
      
      if (!reply) {
        return res.status(404).json({
          success: false,
          message: 'Reply not found'
        });
      }
      
      // Check if user is the owner of the reply
      if (reply.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to delete this reply'
        });
      }
      
      // Delete reply
      await commentModel.deleteReply(replyId);
      
      return res.status(200).json({
        success: true,
        message: 'Reply deleted successfully'
      });
      
    } catch (error) {
      console.error('Error deleting reply:', error);
      return res.status(500).json({
        success: false,
        message: 'Error deleting reply',
        error: error.message
      });
    }
  }
};

module.exports = jobController;
