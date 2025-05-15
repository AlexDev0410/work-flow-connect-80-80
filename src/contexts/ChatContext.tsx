import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { ChatType, MessageType, UserType } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import io, { Socket } from 'socket.io-client';
import { chatService, messageService, fileService } from '@/services/api';

// Context Type
export interface ChatContextType {
  createChat: (participantIds: string[], name?: string) => void;
  createPrivateChat: (userId: string) => Promise<ChatType | undefined>;
  sendMessage: (chatId: string, content: string) => void;
  sendFile: (chatId: string, file: File) => Promise<void>;
  deleteChat: (chatId: string) => void;
  setActiveChat: (chat: ChatType | null) => void;
  markAsRead: (chatId: string) => void;
  getMessages: (chatId: string) => MessageType[];
  findExistingPrivateChat: (userId: string) => ChatType | undefined;
  activeChat: ChatType | null;
  chats: ChatType[];
  onlineUsers: string[];
  loadingChats: boolean;
  loadingMessages: boolean;
  addParticipantToChat: (chatId: string, userId: string) => Promise<boolean>;
  loadChats: () => Promise<void>;
  loadMessages: (chatId: string) => Promise<void>;
  updateMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  searchMessages: (query: string, chatId?: string) => Promise<MessageType[]>;
  leaveChat: (chatId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chats, setChats] = useState<ChatType[]>([]);
  const [messages, setMessages] = useState<Record<string, MessageType[]>>({});
  const [activeChat, setActiveChat] = useState<ChatType | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [loadingChats, setLoadingChats] = useState<boolean>(false);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  
  // Load messages for a specific chat
  const loadMessages = useCallback(async (chatId: string) => {
    if (!currentUser || !chatId) return;
    
    setLoadingMessages(true);
    
    try {
      const messagesData = await messageService.getMessages(chatId);
      
      // Format messages with additional timestamp field for compatibility
      const formattedMessages = messagesData.map(msg => ({
        ...msg,
        timestamp: msg.timestamp || msg.createdAt || new Date().toISOString() // Use timestamp or fallback to current time
      }));
      
      console.log("Loaded messages for chat", chatId, ":", formattedMessages);
      
      setMessages(prev => ({
        ...prev,
        [chatId]: formattedMessages
      }));
      
      // Mark messages as read since we've loaded them
      markAsRead(chatId);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los mensajes"
      });
    } finally {
      setLoadingMessages(false);
    }
  }, [currentUser, toast]);
  
  // Connect to socket when user logs in
  useEffect(() => {
    if (!currentUser) return;

    // Initialize Socket.io connection
    try {
      const newSocket = io('http://localhost:5000', {
        query: {
          userId: currentUser.id
        },
        auth: {
          token: localStorage.getItem('token') || ''
        },
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      // Socket event listeners
      newSocket.on('connect', () => {
        console.log('Connected to Socket.io server');
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from Socket.io server');
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      newSocket.on('user:online', (userId: string) => {
        setOnlineUsers(prev => [...prev.filter(id => id !== userId), userId]);
      });

      newSocket.on('user:offline', (userId: string) => {
        setOnlineUsers(prev => prev.filter(id => id !== userId));
      });

      newSocket.on('chat:message', (chatId: string, message: MessageType) => {
        console.log("Received message:", message, "for chat:", chatId);
        
        // Convert any Date objects to strings to ensure consistent format
        const messageWithTimestamp: MessageType = {
          ...message,
          timestamp: typeof message.timestamp === 'string' 
            ? message.timestamp 
            : message.timestamp 
              ? new Date(message.timestamp).toISOString() 
              : new Date().toISOString()
        };
        
        // Add message to messages state
        setMessages((prev) => {
          const chatMessages = prev[chatId] || [];
          // Avoid duplicate messages
          if (!chatMessages.some(msg => msg.id === messageWithTimestamp.id)) {
            return {
              ...prev,
              [chatId]: [...chatMessages, messageWithTimestamp]
            };
          }
          return prev;
        });

        // Update chat's lastMessage
        setChats((prev) =>
          prev.map((chat) => {
            if (chat.id === chatId) {
              return {
                ...chat,
                lastMessage: {
                  content: messageWithTimestamp.content || '',
                  timestamp: messageWithTimestamp.timestamp
                }
              };
            }
            return chat;
          })
        );

        // If this chat is active, mark messages as read
        if (activeChat?.id === chatId) {
          markAsRead(chatId);
        } else {
          // Show notification for new message
          const senderName = message.senderName || 'Nuevo mensaje';
          toast({
            title: senderName,
            description: message.content || ''
          });
        }
      });

      // Add handler for updated messages (edit/delete)
      newSocket.on('chat:message:update', (chatId: string, updatedMessage: MessageType) => {
        console.log("Received updated message:", updatedMessage, "for chat:", chatId);
        
        // Ensure message has proper timestamp format
        const messageWithTimestamp: MessageType = {
          ...updatedMessage,
          timestamp: typeof updatedMessage.timestamp === 'string'
            ? updatedMessage.timestamp
            : updatedMessage.timestamp
              ? new Date(updatedMessage.timestamp).toISOString()
              : new Date().toISOString()
        };
        
        // Update the message in the messages state
        setMessages((prev) => {
          const chatMessages = prev[chatId] || [];
          const updatedMessages = chatMessages.map((msg) => 
            msg.id === messageWithTimestamp.id ? messageWithTimestamp : msg
          );
          
          return {
            ...prev,
            [chatId]: updatedMessages
          };
        });
        
        // If the message was the last message in the chat, update the chat's lastMessage
        setChats((prev) =>
          prev.map((chat) => {
            if (chat.id === chatId) {
              const lastMessage = messages[chatId]?.slice(-1)[0]; 
              if (lastMessage?.id === messageWithTimestamp.id) {
                return {
                  ...chat,
                  lastMessage: {
                    content: messageWithTimestamp.content || '',
                    timestamp: messageWithTimestamp.timestamp
                  }
                };
              }
            }
            return chat;
          })
        );
      });

      // Add handler for deleted messages
      newSocket.on('chat:message:delete', (chatId: string, deletedMessage: { id: string, deleted: boolean, content: string, timestamp: string }) => {
        console.log("Received deleted message:", deletedMessage, "for chat:", chatId);
        
        // Update the message in the messages state to mark it as deleted
        setMessages((prev) => {
          const chatMessages = prev[chatId] || [];
          const updatedMessages = chatMessages.map((msg) => {
            if (msg.id === deletedMessage.id) {
              return {
                ...msg,
                deleted: true,
                content: '[Mensaje eliminado]',
                timestamp: deletedMessage.timestamp
              } as MessageType;
            }
            return msg;
          });
          
          return {
            ...prev,
            [chatId]: updatedMessages
          };
        });
        
        // If the deleted message was the last message in the chat, update the chat's lastMessage
        setChats((prev) =>
          prev.map((chat) => {
            if (chat.id === chatId) {
              const lastMessage = messages[chatId]?.slice(-1)[0]; 
              if (lastMessage?.id === deletedMessage.id) {
                return {
                  ...chat,
                  lastMessage: {
                    content: '[Mensaje eliminado]',
                    timestamp: deletedMessage.timestamp
                  }
                };
              }
            }
            return chat;
          })
        );
      });

      // Handle errors
      newSocket.on('error', (errorMessage: string) => {
        console.error('Socket error:', errorMessage);
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMessage
        });
      });

      setSocket(newSocket);

      // Load chats when user logs in
      loadChats();
      
    } catch (error) {
      console.error("Failed to connect to socket:", error);
    }

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [currentUser]);
  
  // Load messages when activeChat changes
  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat.id);
    }
  }, [activeChat, loadMessages]);

  // Load user's chats
  const loadChats = async () => {
    if (!currentUser) return;
    
    setLoadingChats(true);
    
    try {
      const chatsData = await chatService.getChats();
      console.log("Loaded chats:", chatsData);
      setChats(chatsData || []);
    } catch (error) {
      console.error('Error loading chats:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los chats"
      });
    } finally {
      setLoadingChats(false);
    }
  };

  // Create a new chat
  const createChat = async (participantIds: string[], name?: string) => {
    if (!currentUser) return;
    
    try {
      // Create the chat based on whether it's a group or private chat
      const isGroup = participantIds.length > 1 || name;
      let newChat;
      
      if (isGroup) {
        newChat = await chatService.createGroupChat(name || "Nuevo grupo", participantIds);
      } else {
        newChat = await chatService.createPrivateChat(participantIds[0]);
      }
      
      console.log("Created chat:", newChat);
      
      // Add the new chat to the state
      setChats(prev => [...prev, newChat]);
      
      // Set as active chat
      setActiveChat(newChat);
      
      return newChat;
    } catch (error) {
      console.error('Error creating chat:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el chat"
      });
    }
  };

  // Find an existing private chat with a user
  const findExistingPrivateChat = (userId: string): ChatType | undefined => {
    if (!currentUser) return undefined;
    
    // Filter for non-group chats that include both the current user and the target user
    return chats.find(chat => 
      !chat.isGroup && 
      chat.participants && 
      chat.participants.some(p => p === userId) && 
      chat.participants.some(p => p === currentUser.id)
    );
  };

  // Send a message
  const sendMessage = async (chatId: string, content: string) => {
    if (!currentUser) return;
    
    try {
      // Preferimos usar socket si está conectado
      if (socket && socket.connected) {
        // Solo enviamos a través del socket y NO hacemos la petición HTTP
        socket.emit('sendMessage', { chatId, text: content });
        
        // Ya no hacemos la petición HTTP como backup
        // messageService.sendMessage(chatId, content).then((message) => {...})
      } else {
        // Solo si el socket no está disponible, usamos HTTP
        const message = await messageService.sendMessage(chatId, content);
        console.log("Sent message via HTTP (socket unavailable):", message);
        
        // Actualizamos manualmente la UI
        if (message) {
          setMessages((prev) => {
            const chatMessages = prev[chatId] || [];
            if (!chatMessages.some(msg => msg.id === message.id)) {
              return {
                ...prev,
                [chatId]: [...chatMessages, message]
              };
            }
            return prev;
          });
          
          setChats((prev) =>
            prev.map((chat) => {
              if (chat.id === chatId) {
                return {
                  ...chat,
                  lastMessage: {
                    content: message.content,
                    timestamp: message.timestamp || message.createdAt || new Date().toISOString()
                  }
                };
              }
              return chat;
            })
          );
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo enviar el mensaje"
      });
    }
  };

  // Send a file
  const sendFile = async (chatId: string, file: File): Promise<void> => {
    if (!currentUser) return;
    
    try {
      // Usamos el fileService para subir el archivo
      const fileResponse = await fileService.uploadFile(file, chatId);
      
      console.log('File uploaded successfully:', fileResponse);
      
      // No necesitamos crear manualmente un mensaje ya que el backend lo hace por nosotros
      
      // Asegurarnos de que el chat esté actualizado con el nuevo mensaje
      if (activeChat?.id === chatId) {
        await loadMessages(chatId);
      }
      
      // Actualizar la lista de chats para mostrar el último mensaje
      await loadChats();
      
    } catch (error) {
      console.error('Error sending file:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo enviar el archivo. Intente nuevamente."
      });
      throw error; // Re-lanzar el error para manejo adicional
    }
  };

  // Update a message
  const updateMessage = async (messageId: string, content: string) => {
    if (!currentUser) return;
    
    try {
      if (socket && socket.connected) {
        // Only use socket, not both
        socket.emit('editMessage', { messageId, text: content });
      } else {
        // Only if socket isn't connected, use HTTP
        const updatedMessage = await messageService.updateMessage(messageId, content);
        
        console.log("Updated message via HTTP (socket unavailable):", updatedMessage);
        
        // Find which chat this message belongs to
        let chatId = '';
        for (const [cId, msgs] of Object.entries(messages)) {
          if (msgs.some(m => m.id === messageId)) {
            chatId = cId;
            break;
          }
        }
        
        if (chatId) {
          // Update the message in state
          setMessages((prev) => {
            const chatMessages = prev[chatId] || [];
            const updatedMessages = chatMessages.map((msg) => 
              msg.id === messageId ? { ...msg, content, edited: true } : msg
            );
            
            return {
              ...prev,
              [chatId]: updatedMessages
            };
          });
          
          // Update the chat's lastMessage if needed
          setChats((prev) =>
            prev.map((chat) => {
              if (chat.id === chatId) {
                const lastMessage = messages[chatId]?.slice(-1)[0];
                if (lastMessage?.id === messageId) {
                  return {
                    ...chat,
                    lastMessage: {
                      content,
                      timestamp: new Date().toISOString()
                    }
                  };
                }
              }
              return chat;
            })
          );
        }
      }
      
      toast({
        title: "Mensaje actualizado",
        description: "El mensaje ha sido actualizado correctamente"
      });
    } catch (error) {
      console.error('Error updating message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el mensaje"
      });
    }
  };

  // Delete a message
  const deleteMessage = async (messageId: string) => {
    if (!currentUser) return;
    
    try {
      if (socket && socket.connected) {
        // Only use socket, not both
        socket.emit('deleteMessage', messageId);
      } else {
        // Only if socket isn't connected, use HTTP
        await messageService.deleteMessage(messageId);
        
        console.log("Deleted message via HTTP (socket unavailable):", messageId);
        
        // Find which chat this message belongs to
        let chatId = '';
        for (const [cId, msgs] of Object.entries(messages)) {
          if (msgs.some(m => m.id === messageId)) {
            chatId = cId;
            break;
          }
        }
        
        if (chatId) {
          // Update the message in state
          setMessages((prev) => {
            const chatMessages = prev[chatId] || [];
            const updatedMessages = chatMessages.map((msg) => {
              if (msg.id === messageId) {
                return {
                  ...msg, 
                  deleted: true, 
                  content: '[Mensaje eliminado]' 
                } as MessageType;
              }
              return msg;
            });
            
            return {
              ...prev,
              [chatId]: updatedMessages
            };
          });
          
          // Update the chat's lastMessage if needed
          setChats((prev) =>
            prev.map((chat) => {
              if (chat.id === chatId) {
                const lastMessage = messages[chatId]?.slice(-1)[0];
                if (lastMessage?.id === messageId) {
                  return {
                    ...chat,
                    lastMessage: {
                      content: '[Mensaje eliminado]',
                      timestamp: new Date().toISOString()
                    }
                  };
                }
              }
              return chat;
            })
          );
        }
      }
      
      toast({
        title: "Mensaje eliminado",
        description: "El mensaje ha sido eliminado correctamente"
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el mensaje"
      });
    }
  };

  // Search messages in chats
  const searchMessages = async (query: string, chatId?: string): Promise<MessageType[]> => {
    if (!currentUser || query.trim().length < 2) {
      return [];
    }

    try {
      let result: MessageType[];
      
      if (chatId) {
        // Búsqueda solo en el chat actual
        result = await messageService.searchMessagesInChat(chatId, query);
      } else {
        // Búsqueda global en todos los chats
        result = await messageService.searchMessages(query);
      }
      
      console.log(`Found ${result.length} messages matching "${query}"${chatId ? ` in chat ${chatId}` : ''}`);
      return result;
    } catch (error) {
      console.error('Error searching messages:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al buscar mensajes"
      });
      return [];
    }
  };

  // Get messages for a chat
  const getMessages = (chatId: string) => {
    return messages[chatId] || [];
  };

  // Mark messages as read
  const markAsRead = async (chatId: string) => {
    if (!currentUser) return;
    
    try {
      // This endpoint would need to be implemented in your backend
      await fetch(`http://localhost:5000/api/chats/${chatId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Delete a chat
  const deleteChat = async (chatId: string) => {
    if (!currentUser) return;
    
    try {
      await chatService.deleteChat(chatId);
      
      // Remove chat from state
      setChats((prev) => prev.filter(chat => chat.id !== chatId));
      
      // If the active chat is deleted, set activeChat to null
      if (activeChat?.id === chatId) {
        setActiveChat(null);
      }
      
      toast({
        title: "Chat eliminado",
        description: "El chat ha sido eliminado exitosamente"
      });
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el chat"
      });
    }
  };

  // Add a participant to a group chat
  const addParticipantToChat = async (chatId: string, userId: string): Promise<boolean> => {
    if (!currentUser) return false;
    
    try {
      await chatService.addUsersToChat(chatId, [userId]);
      
      // Update chat in state by reloading chats
      await loadChats();
      
      toast({
        title: "Participante agregado",
        description: "El usuario ha sido agregado al chat exitosamente"
      });
      
      return true;
    } catch (error) {
      console.error('Error adding participant:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo agregar el participante"
      });
      return false;
    }
  };

  // Create a new private chat
  const createPrivateChat = async (userId: string): Promise<ChatType | undefined> => {
    if (!currentUser) return undefined;
    
    // Check if a chat already exists with this user
    const existingChat = findExistingPrivateChat(userId);
    if (existingChat) {
      setActiveChat(existingChat);
      return existingChat;
    }
    
    try {
      const newChat = await chatService.createPrivateChat(userId);
      console.log("Created new private chat:", newChat);
      
      if (newChat) {
        // Add the new chat to the state
        setChats(prev => {
          // Make sure we're not adding duplicate chats
          const exists = prev.some(chat => chat.id === newChat.id);
          if (exists) return prev;
          return [...prev, newChat];
        });
        
        // Set as active chat
        setActiveChat(newChat);
        
        toast({
          title: "Chat creado",
          description: "Se ha iniciado un nuevo chat privado"
        });
      }
      
      // Reload all chats to make sure we have the latest data
      await loadChats();
      
      return newChat;
    } catch (error) {
      console.error('Error creating private chat:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el chat privado"
      });
      return undefined;
    }
  };

  // Nueva función para salir de un chat grupal
  const leaveChat = async (chatId: string): Promise<void> => {
    if (!currentUser) return;
    
    try {
      // Llamar a la API para salir del chat
      await chatService.leaveChat(chatId);
      
      // Eliminar el chat de la lista de chats
      setChats((prev) => prev.filter(chat => chat.id !== chatId));
      
      // Si el chat activo es el que se está abandonando, establecerlo a null
      if (activeChat?.id === chatId) {
        setActiveChat(null);
      }
      
      toast({
        title: "Chat abandonado",
        description: "Has salido del chat grupal exitosamente"
      });
    } catch (error) {
      console.error('Error al salir del chat:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo salir del chat grupal"
      });
    }
  };

  return (
    <ChatContext.Provider
      value={{
        createChat,
        createPrivateChat,
        sendMessage,
        sendFile,
        deleteChat,
        setActiveChat,
        markAsRead,
        getMessages,
        findExistingPrivateChat,
        activeChat,
        chats,
        onlineUsers,
        loadingChats,
        loadingMessages,
        addParticipantToChat,
        loadChats,
        loadMessages,
        updateMessage,
        deleteMessage,
        searchMessages,
        leaveChat
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
