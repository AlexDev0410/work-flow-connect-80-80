
import axios from 'axios';
import { UserType, JobType, ChatType, MessageType, FileType, CommentType, ReplyType } from '@/types';

// Configurando la instancia de axios
export const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Interceptor para agregar token de autorización
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Servicios de usuario
export const userService = {
  async getUsers(): Promise<UserType[]> {
    const response = await api.get('/users');
    return response.data;
  },

  async getUserById(userId: string): Promise<UserType> {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  async updateUserProfile(userId: string, userData: Partial<UserType>): Promise<UserType> {
    const response = await api.put(`/users/${userId}`, userData);
    return response.data;
  }
};

// Servicios de trabajos
export const jobService = {
  async getAllJobs(): Promise<JobType[]> {
    const response = await api.get('/jobs');
    return response.data;
  },
  
  async getJobById(jobId: string): Promise<JobType> {
    const response = await api.get(`/jobs/${jobId}`);
    return response.data;
  },
  
  async createJob(jobData: Partial<JobType>): Promise<JobType> {
    const response = await api.post('/jobs', jobData);
    return response.data;
  },
  
  async updateJob(jobId: string, jobData: Partial<JobType>): Promise<JobType> {
    const response = await api.put(`/jobs/${jobId}`, jobData);
    return response.data;
  },
  
  async deleteJob(jobId: string): Promise<void> {
    await api.delete(`/jobs/${jobId}`);
  },
  
  async applyToJob(jobId: string): Promise<void> {
    await api.post(`/jobs/${jobId}/apply`);
  },
  
  async toggleSavedJob(jobId: string): Promise<{ message: string }> {
    const response = await api.post(`/jobs/${jobId}/toggle-save`);
    return response.data;
  },
  
  async getSavedJobs(): Promise<JobType[]> {
    const response = await api.get('/jobs/saved');
    return response.data;
  },
  
  async getAppliedJobs(): Promise<JobType[]> {
    const response = await api.get('/jobs/applied');
    return response.data;
  },
  
  async getPostedJobs(): Promise<JobType[]> {
    const response = await api.get('/jobs/posted');
    return response.data;
  },
  
  async getJobApplicants(jobId: string): Promise<UserType[]> {
    const response = await api.get(`/jobs/${jobId}/applicants`);
    return response.data;
  },
  
  async updateJobStatus(jobId: string, status: string): Promise<JobType> {
    const response = await api.put(`/jobs/${jobId}/status`, { status });
    return response.data;
  }
};

// Servicios de chats
export const chatService = {
  async getChats(): Promise<ChatType[]> {
    const response = await api.get('/chats');
    return response.data;
  },
  
  async getChatById(chatId: string): Promise<ChatType> {
    const response = await api.get(`/chats/${chatId}`);
    return response.data;
  },
  
  async createGroupChat(name: string, participantIds: string[]): Promise<ChatType> {
    const response = await api.post('/chats/group', { name, participants: participantIds });
    return response.data;
  },
  
  async createPrivateChat(userId: string): Promise<ChatType> {
    const response = await api.post('/chats/private', { userId });
    return response.data;
  },
  
  async deleteChat(chatId: string): Promise<void> {
    await api.delete(`/chats/${chatId}`);
  },
  
  async addUsersToChat(chatId: string, userIds: string[]): Promise<void> {
    await api.post(`/chats/${chatId}/users`, { userIds });
  },
  
  async removeUserFromChat(chatId: string, userId: string): Promise<void> {
    await api.delete(`/chats/${chatId}/participants/${userId}`);
  },
  
  async leaveChat(chatId: string): Promise<void> {
    await api.post(`/chats/${chatId}/leave`);
  }
};

// Servicios de mensajes
export const messageService = {
  async getMessages(chatId: string): Promise<MessageType[]> {
    const response = await api.get(`/messages/${chatId}`);
    return response.data;
  },
  
  async sendMessage(chatId: string, content: string): Promise<MessageType> {
    const response = await api.post('/messages', { chatId, content });
    return response.data;
  },
  
  async updateMessage(messageId: string, text: string): Promise<MessageType> {
    const response = await api.put(`/messages/${messageId}`, { text });
    return response.data;
  },
  
  async deleteMessage(messageId: string): Promise<void> {
    await api.delete(`/messages/${messageId}`);
  },
  
  async searchMessages(query: string): Promise<MessageType[]> {
    const response = await api.get(`/messages/search?query=${encodeURIComponent(query)}`);
    return response.data;
  },
  
  async searchMessagesInChat(chatId: string, search: string): Promise<MessageType[]> {
    const response = await api.get(`/messages/${chatId}?search=${encodeURIComponent(search)}`);
    return response.data;
  }
};

// Servicios de archivos
export const fileService = {
  async uploadFile(chatId: string, file: File): Promise<FileType> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('chatId', chatId);
    
    // Convertir archivo a base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Extraer solo la parte base64 (quitar el prefijo "data:tipo/subtipo;base64,")
          resolve(reader.result.split(',')[1]);
        } else {
          reject(new Error('No se pudo leer el archivo como string'));
        }
      };
      reader.onerror = (error) => reject(error);
    });
    
    // Enviar datos del archivo
    const response = await api.post('/files', {
      filename: file.name,
      contentType: file.type,
      size: file.size,
      data: base64Data,
      chatId
    });
    
    return response.data;
  },
  
  async getFile(fileId: string): Promise<Blob> {
    const response = await api.get(`/files/${fileId}`, {
      responseType: 'blob'
    });
    return response.data;
  },
  
  async deleteFile(fileId: string): Promise<void> {
    await api.delete(`/files/${fileId}`);
  },
  
  getFileUrl(fileId: string): string {
    const token = localStorage.getItem('token');
    return `http://localhost:5000/api/files/${fileId}?token=${token}`;
  },

  // Helper function to format file size
  formatFileSize(bytes: number | undefined): string {
    if (!bytes || bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }
};

// Servicios de autenticación
export const authService = {
  async login(email: string, password: string): Promise<{ user: UserType; token: string }> {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  
  async register(userData: {
    email: string;
    password: string;
    name: string;
    role?: string;
  }): Promise<{ user: UserType; token: string }> {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  
  async verifyToken(): Promise<UserType> {
    const response = await api.get('/auth/verify');
    return response.data;
  }
};

// Servicios de comentarios
export const commentService = {
  async getCommentsByJobId(jobId: string): Promise<CommentType[]> {
    try {
      const response = await api.get(`/jobs/${jobId}/comments`);
      
      if (response.data && response.data.comments) {
        return response.data.comments;
      } else {
        console.log("Got response but no comments:", response.data);
        return [];
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
      // Return empty array instead of throwing to prevent UI errors
      return [];
    }
  },
  
  async addComment(jobId: string, content: string): Promise<CommentType> {
    try {
      const response = await api.post(`/jobs/${jobId}/comments`, { content });
      
      if (response.data && response.data.comment) {
        return response.data.comment;
      } else {
        throw new Error("API returned invalid comment format");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      throw error;
    }
  },
  
  async updateComment(commentId: string, content: string): Promise<CommentType> {
    try {
      const response = await api.put(`/comments/${commentId}`, { content });
      return response.data;
    } catch (error) {
      console.error("Error updating comment:", error);
      throw error;
    }
  },
  
  async deleteComment(commentId: string): Promise<void> {
    try {
      await api.delete(`/comments/${commentId}`);
    } catch (error) {
      console.error("Error deleting comment:", error);
      throw error;
    }
  },
  
  async addReply(commentId: string, content: string): Promise<ReplyType> {
    try {
      const response = await api.post(`/comments/${commentId}/replies`, { content });
      
      if (response.data && response.data.reply) {
        return response.data.reply;
      } else {
        throw new Error("API returned invalid reply format");
      }
    } catch (error) {
      console.error("Error adding reply:", error);
      throw error;
    }
  },
  
  async updateReply(replyId: string, content: string): Promise<ReplyType> {
    try {
      const response = await api.put(`/replies/${replyId}`, { content });
      return response.data;
    } catch (error) {
      console.error("Error updating reply:", error);
      throw error;
    }
  },
  
  async deleteReply(replyId: string): Promise<void> {
    try {
      await api.delete(`/replies/${replyId}`);
    } catch (error) {
      console.error("Error deleting reply:", error);
      throw error;
    }
  }
};
