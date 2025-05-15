
import { api } from '@/services/api';
import { JobType, CommentType, ReplyType } from '@/types';

export const jobService = {
  async getAllJobs(): Promise<JobType[]> {
    try {
      const response = await api.get('/jobs');
      return response.data.jobs || [];
    } catch (error) {
      console.error('Error fetching jobs:', error);
      return [];
    }
  },

  async getJobById(jobId: string): Promise<JobType | null> {
    try {
      const response = await api.get(`/jobs/${jobId}`);
      return response.data.job || null;
    } catch (error) {
      console.error('Error fetching job by ID:', error);
      return null;
    }
  },

  async getJobsByUser(userId: string): Promise<JobType[]> {
    try {
      const response = await api.get(`/users/${userId}/jobs`);
      return response.data.jobs || [];
    } catch (error) {
      console.error('Error fetching user jobs:', error);
      return [];
    }
  },

  async createJob(jobData: Partial<JobType>): Promise<JobType> {
    try {
      const response = await api.post('/jobs', jobData);
      return response.data.job;
    } catch (error) {
      console.error('Error creating job:', error);
      throw error;
    }
  },

  async updateJob(jobId: string, jobData: Partial<JobType>): Promise<JobType> {
    try {
      const response = await api.put(`/jobs/${jobId}`, jobData);
      return response.data.job;
    } catch (error) {
      console.error('Error updating job:', error);
      throw error;
    }
  },

  async deleteJob(jobId: string): Promise<boolean> {
    try {
      await api.delete(`/jobs/${jobId}`);
      return true;
    } catch (error) {
      console.error('Error deleting job:', error);
      throw error;
    }
  },

  // Comment related functions
  async getCommentsByJobId(jobId: string): Promise<CommentType[]> {
    try {
      const response = await api.get(`/jobs/${jobId}/comments`);
      return response.data.comments || [];
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  },

  async addComment(jobId: string, content: string): Promise<CommentType> {
    try {
      const response = await api.post(`/jobs/${jobId}/comments`, { content });
      return response.data.comment;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  },

  async deleteComment(commentId: string): Promise<boolean> {
    try {
      await api.delete(`/jobs/comments/${commentId}`);
      return true;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  },

  async addReply(commentId: string, content: string): Promise<ReplyType> {
    try {
      const response = await api.post(`/jobs/comments/${commentId}/replies`, { content });
      if (response.data && response.data.reply) {
        return response.data.reply;
      } else {
        throw new Error('No se recibió respuesta válida del servidor');
      }
    } catch (error) {
      console.error('Error adding reply:', error);
      throw error;
    }
  },

  async getRepliesByCommentId(commentId: string): Promise<ReplyType[]> {
    try {
      const response = await api.get(`/jobs/comments/${commentId}/replies`);
      return response.data.replies || [];
    } catch (error) {
      console.error('Error fetching replies:', error);
      return [];
    }
  },

  async deleteReply(replyId: string): Promise<boolean> {
    try {
      await api.delete(`/jobs/replies/${replyId}`);
      return true;
    } catch (error) {
      console.error('Error deleting reply:', error);
      throw error;
    }
  }
};

export default jobService;
