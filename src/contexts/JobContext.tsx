
import { createContext, useContext, useState, useEffect } from 'react';
import { JobType, CommentType, ReplyType, UserType } from '@/types';
import { jobService } from '@/lib/jobService';
import { useAuth } from './AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useData } from './DataContext';

export interface JobContextType {
  jobs: JobType[];
  userJobs: JobType[];
  filteredJobs: JobType[];
  setFilteredJobs: (jobs: JobType[]) => void;
  popularJobs: JobType[];
  getJobById: (id: string) => JobType | undefined;
  loading: boolean;
  addComment: (jobId: string, text: string) => Promise<CommentType | undefined>;
  addReply: (commentId: string, jobId: string, text: string) => Promise<ReplyType | undefined>;
  addReplyToComment: (jobId: string, commentId: string, text: string, user: UserType) => Promise<void>;
  refreshJobs: () => Promise<void>;
  saveJob: (jobId: string) => Promise<void>;
  unsaveJob: (jobId: string) => Promise<void>;
  savedJobs: JobType[];
  deleteComment: (commentId: string) => void;
  createJob: (jobData: Partial<JobType>) => Promise<JobType | null>;
  updateJob: (jobId: string, jobData: Partial<JobType>) => Promise<JobType | null>;
  deleteJob: (jobId: string) => Promise<boolean>;
}

const JobContext = createContext<JobContextType | null>(null);

export const useJobs = () => {
  const context = useContext(JobContext);
  if (!context) {
    throw new Error('useJobs must be used within a JobProvider');
  }
  return context;
};

export const JobProvider = ({ children }: { children: React.ReactNode }) => {
  const [jobs, setJobs] = useState<JobType[]>([]);
  const [userJobs, setUserJobs] = useState<JobType[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<JobType[]>([]);
  const [popularJobs, setPopularJobs] = useState<JobType[]>([]);
  const [savedJobs, setSavedJobs] = useState<JobType[]>([]);
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();
  const { getUserById } = useData();
  const { toast } = useToast();

  useEffect(() => {
    refreshJobs();
  }, [currentUser]);

  const refreshJobs = async () => {
    setLoading(true);
    try {
      const allJobs = await jobService.getAllJobs();
      
      // Ensure all job objects have the required properties
      const processedJobs = allJobs.map(job => ({
        ...job,
        // Convert dates to strings if they're Date objects
        createdAt: job.createdAt instanceof Date ? job.createdAt.toISOString() : job.createdAt,
        updatedAt: job.updatedAt instanceof Date ? job.updatedAt.toISOString() : job.updatedAt,
        // Ensure userName is present
        userName: job.userName || 'Usuario desconocido',
        // Initialize comments array if it doesn't exist
        comments: job.comments || []
      }));
      
      setJobs(processedJobs);
      setFilteredJobs(processedJobs);

      if (currentUser) {
        const userJobsData = await jobService.getJobsByUser(currentUser.id);
        // Process dates for user jobs
        const processedUserJobs = userJobsData.map(job => ({
          ...job,
          createdAt: job.createdAt instanceof Date ? job.createdAt.toISOString() : job.createdAt,
          updatedAt: job.updatedAt instanceof Date ? job.updatedAt.toISOString() : job.updatedAt,
          userName: job.userName || 'Usuario desconocido',
          comments: job.comments || []
        }));
        setUserJobs(processedUserJobs);

        // Set saved jobs (placeholder implementation)
        setSavedJobs([]);
      }

      // For popular jobs, show the 3 most recent jobs
      const popularJobsTemp = processedJobs.slice(0, 3);
      setPopularJobs(popularJobsTemp);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al cargar los trabajos."
      });
    } finally {
      setLoading(false);
    }
  };

  const getJobById = (id: string) => {
    return jobs.find(job => job.id === id);
  };

  const createJob = async (jobData: Partial<JobType>): Promise<JobType | null> => {
    try {
      const createdJob = await jobService.createJob(jobData);
      
      // Refresh jobs after creating a new one
      await refreshJobs();
      
      toast({
        title: "Propuesta creada",
        description: "La propuesta se ha creado correctamente."
      });
      
      return createdJob;
    } catch (error) {
      console.error("Error creating job:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al crear la propuesta."
      });
      return null;
    }
  };

  const updateJob = async (jobId: string, jobData: Partial<JobType>): Promise<JobType | null> => {
    try {
      const updatedJob = await jobService.updateJob(jobId, jobData);
      
      if (updatedJob) {
        // Actualizar el estado local reemplazando el trabajo actualizado
        setJobs(prevJobs => 
          prevJobs.map(job => job.id === jobId ? updatedJob : job)
        );
        
        setUserJobs(prevJobs => 
          prevJobs.map(job => job.id === jobId ? updatedJob : job)
        );
        
        setFilteredJobs(prevJobs => 
          prevJobs.map(job => job.id === jobId ? updatedJob : job)
        );
      }
      
      return updatedJob;
    } catch (error) {
      console.error("Error updating job:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al actualizar la propuesta."
      });
      return null;
    }
  };

  const deleteJob = async (jobId: string): Promise<boolean> => {
    try {
      const success = await jobService.deleteJob(jobId);
      
      if (success) {
        // Eliminar el trabajo del estado local
        setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
        setUserJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
        setFilteredJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
        
        toast({
          title: "Propuesta eliminada",
          description: "La propuesta se ha eliminado correctamente."
        });
      }
      
      return success;
    } catch (error) {
      console.error("Error deleting job:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al eliminar la propuesta."
      });
      return false;
    }
  };

  const addComment = async (jobId: string, text: string): Promise<CommentType | undefined> => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes iniciar sesión para comentar."
      });
      return;
    }

    try {
      const comment = await jobService.addComment(jobId, text);
      
      // Update the jobs state with the new comment
      setJobs(prevJobs => {
        return prevJobs.map(job => {
          if (job.id === jobId) {
            const comments = job.comments || [];
            return { ...job, comments: [...comments, comment] };
          }
          return job;
        });
      });
      
      toast({
        title: "Comentario publicado",
        description: "Tu comentario ha sido publicado correctamente."
      });
      
      return comment;
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al publicar el comentario."
      });
    }
  };

  const addReply = async (commentId: string, jobId: string, text: string): Promise<ReplyType | undefined> => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes iniciar sesión para responder."
      });
      return;
    }

    try {
      const reply = await jobService.addReply(commentId, text);
      
      // Update the jobs state with the new reply
      setJobs(prevJobs => {
        return prevJobs.map(job => {
          if (job.id === jobId) {
            const updatedComments = job.comments?.map(comment => {
              if (comment.id === commentId) {
                const replies = comment.replies || [];
                return { ...comment, replies: [...replies, reply] };
              }
              return comment;
            });
            return { ...job, comments: updatedComments };
          }
          return job;
        });
      });
      
      toast({
        title: "Respuesta publicada",
        description: "Tu respuesta ha sido publicada correctamente."
      });
      
      return reply;
    } catch (error) {
      console.error("Error adding reply:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al publicar la respuesta."
      });
    }
  };

  // Function for the CommentItem component to use
  const addReplyToComment = async (jobId: string, commentId: string, text: string, user: UserType) => {
    await addReply(commentId, jobId, text);
  };

  const deleteComment = async (commentId: string) => {
    try {
      await jobService.deleteComment(commentId);
      
      // Update the jobs state by removing the deleted comment
      setJobs(prevJobs => {
        return prevJobs.map(job => {
          const updatedComments = job.comments?.filter(comment => comment.id !== commentId);
          return { ...job, comments: updatedComments };
        });
      });
      
      toast({
        title: "Comentario eliminado",
        description: "El comentario ha sido eliminado correctamente."
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al eliminar el comentario."
      });
    }
  };

  const saveJob = async (jobId: string) => {
    // This will be implemented when job saving functionality is added
    toast({
      title: "Funcionalidad no implementada",
      description: "La funcionalidad de guardar trabajos será implementada próximamente."
    });
  };

  const unsaveJob = async (jobId: string) => {
    // This will be implemented when job saving functionality is added
    toast({
      title: "Funcionalidad no implementada",
      description: "La funcionalidad de quitar trabajos guardados será implementada próximamente."
    });
  };

  const value: JobContextType = {
    jobs,
    userJobs,
    filteredJobs,
    setFilteredJobs,
    popularJobs,
    getJobById,
    loading,
    addComment,
    addReply,
    refreshJobs,
    saveJob,
    unsaveJob,
    savedJobs,
    deleteComment,
    createJob,
    updateJob,
    deleteJob,
    addReplyToComment
  };

  return (
    <JobContext.Provider value={value}>
      {children}
    </JobContext.Provider>
  );
};
