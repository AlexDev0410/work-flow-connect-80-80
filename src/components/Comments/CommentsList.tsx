
import React, { useState, useEffect } from 'react';
import { CommentType, ReplyType } from '@/types';
import { CommentItem } from './CommentItem';
import { Skeleton } from '@/components/ui/skeleton';
import { commentService } from '@/services/api';
import { toast } from '@/components/ui/use-toast';

interface CommentsListProps {
  comments: CommentType[] | undefined;
  jobId: string;
  loading?: boolean;
  onRefresh?: () => void;
}

export const CommentsList: React.FC<CommentsListProps> = ({ 
  comments: initialComments, 
  jobId, 
  loading = false,
  onRefresh
}) => {
  const [comments, setComments] = useState<CommentType[] | undefined>(initialComments);

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  const handleCommentDelete = (commentId: string) => {
    // Actualizar la UI eliminando el comentario del estado
    setComments(prevComments => 
      prevComments?.filter(comment => comment.id !== commentId)
    );
    
    // Notificar al componente padre para refrescar datos si es necesario
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleReplyAdded = (commentId: string, newReply: ReplyType) => {
    // Actualizar la UI añadiendo la respuesta al comentario correspondiente
    setComments(prevComments => 
      prevComments?.map(comment => 
        comment.id === commentId
          ? {
              ...comment,
              replies: [...(comment.replies || []), newReply]
            }
          : comment
      )
    );
    
    // Notificar al componente padre para refrescar datos si es necesario
    if (onRefresh) {
      onRefresh();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-start space-x-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!comments || comments.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-500">No hay comentarios aún. ¡Sé el primero en comentar!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {comments.map((comment) => (
        <CommentItem 
          key={comment.id} 
          comment={comment} 
          jobId={jobId} 
          onDelete={handleCommentDelete}
          onReplyAdded={handleReplyAdded}
        />
      ))}
    </div>
  );
};
