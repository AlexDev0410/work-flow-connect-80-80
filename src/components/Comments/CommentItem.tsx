
import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Trash } from 'lucide-react';
import { CommentType, ReplyType } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { commentService } from '@/services/api';
import { toast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

type CommentItemProps = {
  comment: CommentType;
  jobId: string;
  onDelete?: (commentId: string) => void;
  onReplyAdded?: (commentId: string, reply: ReplyType) => void;
};

export const CommentItem: React.FC<CommentItemProps> = ({ 
  comment, 
  jobId, 
  onDelete,
  onReplyAdded
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  
  const { currentUser } = useAuth();

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || !currentUser) return;
    
    setIsSubmittingReply(true);
    try {
      const newReply = await commentService.addReply(comment.id, replyContent);
      
      // Actualizar la interfaz con la nueva respuesta
      if (onReplyAdded) {
        onReplyAdded(comment.id, newReply);
      }
      
      setReplyContent('');
      setShowReplyForm(false);
      toast({
        title: "Respuesta enviada",
        description: "Tu respuesta ha sido publicada correctamente"
      });
    } catch (error) {
      console.error('Error al enviar respuesta:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo enviar la respuesta. Inténtalo de nuevo."
      });
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!currentUser || currentUser.id !== comment.userId) return;
    
    try {
      await commentService.deleteComment(comment.id);
      if (onDelete) {
        onDelete(comment.id);
      }
      toast({
        title: "Comentario eliminado",
        description: "El comentario ha sido eliminado correctamente"
      });
    } catch (error) {
      console.error('Error al eliminar comentario:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el comentario"
      });
    }
  };

  const formatDateTime = (timestamp: number | string | undefined) => {
    if (!timestamp) return '';
    
    const date = typeof timestamp === 'number' 
      ? new Date(timestamp) 
      : new Date(timestamp);
      
    return formatDistanceToNow(date, { 
      addSuffix: true,
      locale: es
    });
  };

  // Get comment content (handle both content and text properties)
  const commentContent = comment.content || comment.text || '';

  return (
    <div className="space-y-3">
      {/* Comentario principal */}
      <div className="flex space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.userPhoto || comment.userAvatar} alt={comment.userName} />
          <AvatarFallback className="bg-wfc-purple-medium text-white">
            {comment.userName?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex justify-between">
            <h4 className="font-medium text-sm">{comment.userName}</h4>
            <span className="text-xs text-gray-500">
              {formatDateTime(comment.timestamp || comment.createdAt)}
            </span>
          </div>
          <p className="text-gray-700 text-sm mt-1">{commentContent}</p>
          
          <div className="flex mt-1 space-x-4">
            {currentUser && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="text-xs text-wfc-purple flex items-center"
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                {showReplyForm ? 'Cancelar' : 'Responder'}
              </button>
            )}
            
            {currentUser && currentUser.id === comment.userId && (
              <button
                onClick={() => handleDeleteComment()}
                className="text-xs text-red-500 flex items-center"
              >
                <Trash className="h-3 w-3 mr-1" />
                Eliminar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Formulario de respuesta */}
      {showReplyForm && (
        <div className="ml-11 mt-2">
          <Textarea
            placeholder="Escribe tu respuesta..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="min-h-[80px] text-sm"
          />
          <div className="flex justify-end mt-2">
            <Button
              size="sm"
              variant="outline"
              className="mr-2"
              onClick={() => setShowReplyForm(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitReply}
              disabled={isSubmittingReply || !replyContent.trim()}
              className="bg-wfc-purple hover:bg-wfc-purple-medium"
            >
              {isSubmittingReply ? 'Enviando...' : 'Responder'}
            </Button>
          </div>
        </div>
      )}

      {/* Respuestas */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-11 space-y-3 border-l-2 border-gray-100 pl-3">
          {comment.replies.map((reply: ReplyType) => {
            // Get reply content (handle both content and text properties)
            const replyContent = reply.content || reply.text || '';
            
            return (
              <div key={reply.id} className="flex space-x-3">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={reply.userPhoto || reply.userAvatar} alt={reply.userName} />
                  <AvatarFallback className="bg-wfc-purple-light text-white text-xs">
                    {reply.userName?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <h4 className="font-medium text-xs">{reply.userName}</h4>
                    <span className="text-xs text-gray-500">
                      {formatDateTime(reply.timestamp || reply.createdAt)}
                    </span>
                  </div>
                  <p className="text-gray-700 text-xs mt-1">{replyContent}</p>
                  
                  {currentUser && currentUser.id === reply.userId && (
                    <button
                      onClick={async () => {
                        try {
                          await commentService.deleteReply(reply.id);
                          toast({
                            title: "Respuesta eliminada",
                            description: "La respuesta ha sido eliminada correctamente"
                          });
                          // Actualizar la UI se manejará a través de una refrescada
                        } catch (error) {
                          toast({
                            variant: "destructive",
                            title: "Error",
                            description: "No se pudo eliminar la respuesta"
                          });
                        }
                      }}
                      className="text-xs text-red-500 mt-1 flex items-center"
                    >
                      <Trash className="h-3 w-3 mr-1" />
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
