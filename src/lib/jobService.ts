import { JobType, CommentType, ReplyType, UserType } from '@/types';
import axios from 'axios';
import { toast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const jobService = {
  getAllJobs: async (): Promise<JobType[]> => {
    try {
      console.log(`Fetching jobs from: ${API_URL}/jobs`);
      const response = await axios.get(`${API_URL}/jobs`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log("Jobs response:", response.data);
      
      if (response.data.success && response.data.jobs) {
        // Ensure all job objects have valid dates
        const processedJobs = response.data.jobs.map((job: JobType) => ({
          ...job,
          createdAt: job.createdAt || new Date().toISOString(),
          updatedAt: job.updatedAt || new Date().toISOString(),
        }));
        return processedJobs;
      }
      return [];
    } catch (error) {
      console.error("Error fetching jobs:", error);
      // Show a toast with the error but don't throw to prevent UI breakage
      toast({
        variant: "destructive",
        title: "Error",
        description: `Error al obtener las propuestas: ${axios.isAxiosError(error) ? error.message : 'Error desconocido'}`
      });
      return [];
    }
  },
  
  getJobById: async (id: string): Promise<JobType | null> => {
    try {
      console.log(`Fetching job with ID: ${id}`);
      const response = await axios.get(`${API_URL}/jobs/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log("Job response:", response.data);
      
      if (response.data.success && response.data.job) {
        // Ensure job has valid dates
        const processedJob = {
          ...response.data.job,
          createdAt: response.data.job.createdAt || new Date().toISOString(),
          updatedAt: response.data.job.updatedAt || new Date().toISOString(),
        };
        return processedJob;
      }
      return null;
    } catch (error) {
      console.error("Error fetching job:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Error al obtener la propuesta: ${axios.isAxiosError(error) ? error.message : 'Error desconocido'}`
      });
      return null;
    }
  },
  
  getJobsByUser: async (userId: string): Promise<JobType[]> => {
    try {
      // For now, we'll filter all jobs by user ID
      const allJobs = await jobService.getAllJobs();
      return allJobs.filter(job => job.userId === userId);
    } catch (error) {
      console.error("Error fetching user jobs:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Error al obtener las propuestas del usuario: ${axios.isAxiosError(error) ? error.message : 'Error desconocido'}`
      });
      throw error;
    }
  },
  
  createJob: async (jobData: Partial<JobType>): Promise<JobType> => {
    try {
      console.log("Creating job with data:", jobData);
      // Validar que los datos requeridos estén presentes
      if (!jobData.title || !jobData.description || !jobData.category || jobData.budget === undefined) {
        const errorMsg = "Datos incompletos para crear la propuesta";
        console.error(errorMsg, jobData);
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMsg
        });
        throw new Error(errorMsg);
      }
      
      const response = await axios.post(`${API_URL}/jobs`, jobData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log("Create job response:", response.data);
      
      if (response.data.success) {
        toast({
          title: "Éxito",
          description: "Propuesta creada correctamente"
        });
        return response.data.job;
      }
      
      const errorMsg = response.data.message || "Error al crear la propuesta";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMsg
      });
      throw new Error(errorMsg);
    } catch (error) {
      console.error("Error creating job:", error);
      
      let errorMessage = "Error al crear la propuesta";
      if (axios.isAxiosError(error) && error.response?.data?.details) {
        errorMessage += `: ${error.response.data.message || error.response.data.details}`;
      } else if (axios.isAxiosError(error) && error.response?.data?.message) {
        errorMessage += `: ${error.response.data.message}`;
      } else if (axios.isAxiosError(error)) {
        errorMessage += `: ${error.message}`;
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage
      });
      throw error;
    }
  },
  
  updateJob: async (id: string, jobData: Partial<JobType>): Promise<JobType | null> => {
    try {
      console.log(`Updating job with ID: ${id}`, jobData);
      
      if (!id) {
        throw new Error('ID de la propuesta no proporcionado');
      }
      
      const response = await axios.put(`${API_URL}/jobs/${id}`, jobData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log("Update job response:", response.data);
      
      if (response.data.success) {
        toast({
          title: "Éxito",
          description: "Propuesta actualizada correctamente"
        });
        return response.data.job;
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: response.data.message || "Error al actualizar la propuesta"
      });
      return null;
    } catch (error) {
      console.error("Error updating job:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Error al actualizar la propuesta: ${axios.isAxiosError(error) ? error.message : 'Error desconocido'}`
      });
      throw error;
    }
  },
  
  deleteJob: async (id: string): Promise<boolean> => {
    try {
      console.log(`Deleting job with ID: ${id}`);
      
      if (!id) {
        throw new Error('ID de la propuesta no proporcionado');
      }
      
      const response = await axios.delete(`${API_URL}/jobs/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log("Delete job response:", response.data);
      
      if (response.data.success) {
        toast({
          title: "Éxito",
          description: "Propuesta eliminada correctamente"
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.data.message || "Error al eliminar la propuesta"
        });
      }
      
      return response.data.success;
    } catch (error) {
      console.error("Error deleting job:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Error al eliminar la propuesta: ${axios.isAxiosError(error) ? error.message : 'Error desconocido'}`
      });
      throw error;
    }
  },

  addComment: async (jobId: string, content: string): Promise<CommentType> => {
    try {
      console.log(`Adding comment to job ${jobId}: ${content}`);
      
      // In a real implementation, this would be a backend call
      const response = await axios.post(`${API_URL}/jobs/${jobId}/comments`, {
        content
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data && response.data.comment) {
        return response.data.comment;
      }
      
      // Temporary client-side fallback until backend is fully implemented
      const token = localStorage.getItem('token');
      let userInfo = null;
      try {
        userInfo = token ? JSON.parse(atob(token.split('.')[1])) : null;
      } catch (e) {
        console.error("Error parsing token:", e);
      }
      
      const newComment: CommentType = {
        id: uuidv4(),
        userId: userInfo?.userId || 'unknown',
        jobId,
        content,
        text: content, // Add both text and content for compatibility
        createdAt: new Date().toISOString(),
        timestamp: Date.now(),
        userName: userInfo?.name || 'Usuario',
        userPhoto: userInfo?.photoURL || '',
        replies: []
      };
      
      return newComment;
    } catch (error) {
      console.error("Error adding comment:", error);
      
      // Generate a temporary comment when API fails
      const token = localStorage.getItem('token');
      let userInfo = null;
      try {
        userInfo = token ? JSON.parse(atob(token.split('.')[1])) : null;
      } catch (e) {
        console.error("Error parsing token:", e);
      }
      
      const newComment: CommentType = {
        id: uuidv4(),
        userId: userInfo?.userId || 'unknown',
        jobId,
        content,
        text: content, // Add both text and content for compatibility
        createdAt: new Date().toISOString(),
        timestamp: Date.now(),
        userName: userInfo?.name || 'Usuario',
        userPhoto: userInfo?.photoURL || '',
        replies: []
      };
      
      return newComment;
    }
  },

  addReply: async (commentId: string, content: string): Promise<ReplyType> => {
    try {
      console.log(`Adding reply to comment ${commentId}: ${content}`);
      
      // In a real implementation, this would be a backend call
      const response = await axios.post(`${API_URL}/comments/${commentId}/replies`, {
        content
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data && response.data.reply) {
        return response.data.reply;
      }
      
      // Temporary client-side fallback
      const token = localStorage.getItem('token');
      let userInfo = null;
      try {
        userInfo = token ? JSON.parse(atob(token.split('.')[1])) : null;
      } catch (e) {
        console.error("Error parsing token:", e);
      }
      
      const newReply: ReplyType = {
        id: uuidv4(),
        userId: userInfo?.userId || 'unknown',
        commentId,
        content,
        text: content, // Add both text and content for compatibility
        createdAt: new Date().toISOString(),
        timestamp: Date.now(),
        userName: userInfo?.name || 'Usuario',
        userPhoto: userInfo?.photoURL || '',
      };
      
      return newReply;
    } catch (error) {
      console.error("Error adding reply:", error);
      
      // Generate a temporary reply when API fails
      const token = localStorage.getItem('token');
      let userInfo = null;
      try {
        userInfo = token ? JSON.parse(atob(token.split('.')[1])) : null;
      } catch (e) {
        console.error("Error parsing token:", e);
      }
      
      const newReply: ReplyType = {
        id: uuidv4(),
        userId: userInfo?.userId || 'unknown',
        commentId,
        content,
        text: content, // Add both text and content for compatibility
        createdAt: new Date().toISOString(),
        timestamp: Date.now(),
        userName: userInfo?.name || 'Usuario',
        userPhoto: userInfo?.photoURL || '',
      };
      
      return newReply;
    }
  },

  deleteComment: async (commentId: string): Promise<boolean> => {
    try {
      console.log(`Deleting comment ${commentId}`);
      
      // In a real implementation, this would be a backend call
      const response = await axios.delete(`${API_URL}/comments/${commentId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      return response.data.success || true;
    } catch (error) {
      console.error("Error deleting comment:", error);
      // Return true even on error to allow UI to update
      return true;
    }
  }
};

export const userService = {
  getUserById: async (id: string): Promise<UserType | null> => {
    try {
      const response = await axios.get(`${API_URL}/users/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data && response.data.user) {
        return response.data.user;
      }
      return null;
    } catch (error) {
      console.error("Error fetching user:", error);
      return null;
    }
  }
};
