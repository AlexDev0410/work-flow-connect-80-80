import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  UserPlus, 
  Users, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Info,
  Loader2,
  MessageCircle,
  Edit,
  Trash2,
  MoreVertical,
  Check,
  X,
  LogOut
} from 'lucide-react';
import { ChatGroupForm } from '@/components/ChatGroupForm';
import { UserSelectDialog } from '@/components/UserSelectDialog';
import { toast } from '@/components/ui/use-toast';
import { ChatType, MessageType } from '@/types';
import ChatMobileSheet from '@/components/ChatMobileSheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EmojiPicker from '@/components/EmojiPicker';
import FileAttachment from '@/components/FileAttachment';
import FileUpload from '@/components/FileUpload';
import { fileService } from '@/services/api';
import MessageSearch from '@/components/MessageSearch';

const ChatsPage = () => {
  const { 
    chats, 
    activeChat, 
    setActiveChat, 
    sendMessage, 
    onlineUsers, 
    createPrivateChat,
    addParticipantToChat,
    loadChats,
    loadingChats,
    getMessages,
    updateMessage,
    deleteMessage,
    searchMessages,
    leaveChat
  } = useChat();
  const { currentUser } = useAuth();
  const { getUserById } = useData();
  const [messageText, setMessageText] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isSelectingUser, setIsSelectingUser] = useState(false);
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileChat, setIsMobileChat] = useState(false);
  const [editingMessage, setEditingMessage] = useState<{id: string, content: string} | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isConfirmingLeaveChat, setIsConfirmingLeaveChat] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get messages for the active chat
  const activeMessages = activeChat ? getMessages(activeChat.id) : [];
  
  // Add emoji to message text
  const handleEmojiClick = (emoji: string) => {
    setMessageText(prev => prev + emoji);
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [activeMessages.length]);
  
  useEffect(() => {
    if (currentUser) {
      console.log("ChatsPage montada, iniciando conexión en tiempo real");
      loadChats();
    }
  }, [currentUser]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  const getChatName = (chat: ChatType) => {
    if (chat.name) return chat.name;
    
    if (!chat.isGroup && currentUser) {
      const otherUserId = chat.participants.find((id) => id !== currentUser.id);
      if (otherUserId) {
        const otherUser = getUserById(otherUserId);
        return otherUser ? otherUser.name : 'Usuario';
      }
    }
    
    return 'Chat';
  };
  
  const getChatAvatar = (chat: ChatType) => {
    if (!chat.isGroup && currentUser) {
      const otherUserId = chat.participants.find((id) => id !== currentUser.id);
      if (otherUserId) {
        const otherUser = getUserById(otherUserId);
        return otherUser?.photoURL;
      }
    }
    return undefined;
  };
  
  const getAvatarFallback = (chat: ChatType) => {
    const name = getChatName(chat);
    return name.charAt(0).toUpperCase();
  };
  
  const handleSendMessage = () => {
    if (!activeChat || !messageText.trim()) return;
    
    sendMessage(activeChat.id, messageText);
    setMessageText('');
  };
  
  const handleCreatePrivateChat = async (userId: string) => {
    await createPrivateChat(userId);
    toast({
      title: "Chat creado",
      description: "Se ha iniciado un nuevo chat privado"
    });
  };
  
  const handleAddParticipant = async (userId: string) => {
    if (!activeChat) return;
    
    const success = await addParticipantToChat(activeChat.id, userId);
    if (success) {
      toast({
        title: "Participante añadido",
        description: "Se ha añadido el participante al chat"
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo añadir el participante"
      });
    }
  };
  
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const isUserOnline = (userId?: string) => userId ? onlineUsers.includes(userId) : false;

  const filteredChats = chats.filter(chat => 
    getChatName(chat).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const openMobileChat = (chat: ChatType) => {
    setActiveChat(chat);
    setIsMobileChat(true);
  };
  
  const handleEditMessage = async (id: string, content: string) => {
    if (!editingMessage) {
      // Comenzar edición
      setEditingMessage({ id, content });
    } else {
      // Finalizar edición
      try {
        await updateMessage(editingMessage.id, editingMessage.content);
        setEditingMessage(null);
      } catch (error) {
        console.error('Error al actualizar mensaje:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo actualizar el mensaje."
        });
      }
    }
  };
  
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      setIsConfirmingDelete(null);
    } catch (error) {
      console.error('Error al eliminar mensaje:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el mensaje."
      });
    }
  };
  
  const handleFileUpload = async (file: File) => {
    if (!activeChat) return;
    
    setIsUploading(true);
    
    try {
      await fileService.uploadFile(activeChat.id, file);
      toast({
        title: "Archivo enviado",
        description: "El archivo se ha enviado correctamente"
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo enviar el archivo"
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  // Función para abrir el diálogo de búsqueda de mensajes
  const handleOpenSearch = () => {
    setIsSearching(true);
  };

  // Manejador para cuando se selecciona un mensaje en la búsqueda
  const handleSearchMessageSelect = (message: MessageType) => {
    if (message.chatId) {
      // Buscar el chat al que pertenece el mensaje
      const chat = chats.find(c => c.id === message.chatId);
      if (chat) {
        setActiveChat(chat);
        // Cerrar el diálogo de búsqueda
        setIsSearching(false);
        
        // Dar tiempo para que se carguen los mensajes y luego hacer scroll al mensaje
        setTimeout(() => {
          const messageElement = document.getElementById(`message-${message.id}`);
          if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Destacar el mensaje brevemente
            messageElement.classList.add('bg-yellow-100', 'dark:bg-yellow-900');
            setTimeout(() => {
              messageElement.classList.remove('bg-yellow-100', 'dark:bg-yellow-900');
            }, 2000);
          }
        }, 500);
      }
    }
  };
  
  // Función para manejar la salida de un chat grupal
  const handleLeaveChat = async (chatId: string) => {
    try {
      await leaveChat(chatId);
      setIsConfirmingLeaveChat(null);
    } catch (error) {
      console.error('Error al salir del chat:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo salir del chat grupal."
      });
    }
  };
  
  return (
    <MainLayout>
      <div className="h-[calc(100vh-8rem)] flex">
        {/* Left sidebar - chat list */}
        <div className={`relative transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-full md:w-80 lg:w-96'}`}>
          {!sidebarCollapsed && (
            <Card className="h-full flex flex-col">
              {/* Chat list header */}
              <div className="p-4 border-b">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="font-semibold text-lg">Mensajes</h2>
                  <div className="flex space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="rounded-full"
                            onClick={() => setIsCreatingGroup(true)}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Crear chat grupal</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="rounded-full"
                            onClick={() => setIsSelectingUser(true)}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Nuevo chat privado</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar conversaciones..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <ScrollArea className="flex-1">
                {loadingChats ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <Loader2 className="h-8 w-8 animate-spin text-[#9b87f5] mb-2" />
                    <p className="text-gray-500">Cargando conversaciones...</p>
                  </div>
                ) : filteredChats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    {searchQuery ? (
                      <p className="text-gray-500">No se encontraron conversaciones</p>
                    ) : (
                      <>
                        <p className="text-gray-500">No tienes ninguna conversación aún</p>
                        <div className="flex mt-2 space-x-2">
                          <Button 
                            variant="outline" 
                            className="text-[#9b87f5]"
                            onClick={() => setIsCreatingGroup(true)}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Crear grupo
                          </Button>
                          <Button 
                            variant="outline" 
                            className="text-[#9b87f5]"
                            onClick={() => setIsSelectingUser(true)}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Chat privado
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {filteredChats.map((chat) => (
                      <div
                        key={chat.id}
                        className={`p-3 flex items-start space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded-md
                          ${activeChat?.id === chat.id ? 'bg-[#9b87f5]/10 border-l-4 border-[#9b87f5]' : ''}
                        `}
                        onClick={() => setActiveChat(chat)}
                      >
                        <div className="relative">
                          <Avatar>
                            <AvatarImage src={getChatAvatar(chat)} />
                            <AvatarFallback className={`bg-[#9b87f5] text-white`}>
                              {getAvatarFallback(chat)}
                            </AvatarFallback>
                          </Avatar>
                          {chat.isGroup ? (
                            <Badge className="absolute -top-1 -right-1 bg-[#9b87f5] p-0 min-w-[1.1rem] h-[1.1rem] flex items-center justify-center">
                              <Users className="h-3 w-3" />
                            </Badge>
                          ) : (
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800
                              ${isUserOnline(chat.participants.find((id) => id !== currentUser?.id)) 
                                ? 'bg-green-500' 
                                : 'bg-gray-300'}
                            `} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between">
                            <h3 className="font-medium leading-tight truncate">{getChatName(chat)}</h3>
                            {chat.lastMessage && (
                              <span className="text-xs text-gray-400">
                                {formatTime(chat.lastMessage.timestamp)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate mt-1">
                            {chat.lastMessage 
                              ? chat.lastMessage.content 
                              : 'No hay mensajes aún'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              
              {/* Update connection button */}
              <div className="p-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => loadChats()}
                  disabled={loadingChats}
                >
                  {loadingChats ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    <>Actualizar conexión</>
                  )}
                </Button>
              </div>
            </Card>
          )}
          
          {/* Sidebar toggle button */}
          <button 
            onClick={toggleSidebar}
            className="absolute -right-4 top-1/2 transform -translate-y-1/2 bg-[#9b87f5] text-white rounded-full h-8 w-8 flex items-center justify-center shadow-md z-10 hover:bg-[#8E9196] transition-colors"
            aria-label={sidebarCollapsed ? "Mostrar contactos" : "Ocultar contactos"}
          >
            {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
        
        {/* Main chat area */}
        <div className={`flex-1 transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'ml-0' : 'ml-4'}`}>
          <Card className="h-full flex flex-col">
            {activeChat ? (
              <>
                {/* Chat header */}
                <div className="p-4 border-b flex items-center space-x-3">
                  {sidebarCollapsed && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={toggleSidebar} 
                      className="mr-2"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  )}
                  <Avatar>
                    <AvatarImage src={getChatAvatar(activeChat)} />
                    <AvatarFallback className="bg-[#9b87f5] text-white">
                      {getAvatarFallback(activeChat)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold truncate">{getChatName(activeChat)}</h2>
                    <p className="text-xs text-gray-500">
                      {activeChat.isGroup 
                        ? `${activeChat.participants.length} participantes` 
                        : isUserOnline(activeChat.participants.find((id) => id !== currentUser?.id))
                          ? 'En línea'
                          : 'Desconectado'
                      }
                    </p>
                  </div>

                  {/* Botón de búsqueda en el chat */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={handleOpenSearch}
                        >
                          <Search className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Buscar en este chat</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  {activeChat.isGroup && (
                    <>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setIsAddingParticipant(true)}
                            >
                              <UserPlus className="h-5 w-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Añadir participante</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setIsConfirmingLeaveChat(activeChat.id)}
                            >
                              <LogOut className="h-5 w-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Salir del grupo</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </>
                  )}
                </div>
                
                {/* Messages area with proper visualization */}
                <ScrollArea id="messages-container" className="flex-1 p-4 bg-gray-50 dark:bg-gray-900">
                  {activeMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <p className="text-gray-500">No hay mensajes aún</p>
                      <p className="text-sm text-gray-400 mt-2">Envía un mensaje para iniciar la conversación</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeMessages.map((message, index, messages) => {
                        const isCurrentUser = currentUser && message.senderId === currentUser.id;
                        const isSystemMessage = message.senderId === "system";
                        const sender = isSystemMessage ? null : getUserById(message.senderId);
                        const isEditing = editingMessage && editingMessage.id === message.id;
                        const isDeleted = message.deleted;
                        
                        const showDateSeparator = index === 0 || 
                          new Date(message.timestamp).toDateString() !== 
                          new Date(messages[index - 1].timestamp).toDateString();
                        
                        return (
                          <React.Fragment key={message.id}>
                            {showDateSeparator && (
                              <div className="flex justify-center my-4">
                                <div className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-xs text-gray-500">
                                  {formatDate(message.timestamp)}
                                </div>
                              </div>
                            )}
                            
                            {isSystemMessage ? (
                              <div className="flex justify-center my-4">
                                <div className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-xs text-gray-500 flex items-center">
                                  <Info className="h-3 w-3 mr-1" />
                                  {message.content}
                                </div>
                              </div>
                            ) : (
                              <div 
                                id={`message-${message.id}`} 
                                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} group mb-2 transition-colors duration-300`}
                              >
                                {/* Avatar for received messages only */}
                                {!isCurrentUser && (
                                  <Avatar className="h-8 w-8 mr-2 self-end flex-shrink-0">
                                    <AvatarImage src={sender?.photoURL} />
                                    <AvatarFallback className="bg-gray-300 text-gray-700 text-xs">
                                      {sender?.name?.charAt(0).toUpperCase() || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                
                                <div className="max-w-[70%]">
                                  {/* Sender name for group chats */}
                                  {!isCurrentUser && activeChat.isGroup && (
                                    <div className="text-xs text-gray-500 ml-1 mb-1">
                                      {sender?.name || 'Usuario'}
                                    </div>
                                  )}
                                  
                                  {/* Message bubble with different colors for sent/received */}
                                  <div className={`px-4 py-2 rounded-2xl relative ${
                                    isDeleted
                                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 italic'
                                      : isCurrentUser 
                                        ? 'bg-[#9b87f5] text-white rounded-br-none' 
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                                  } group`}>
                                    {isEditing ? (
                                      <div className="flex items-center">
                                        <Input
                                          value={editingMessage.content}
                                          onChange={(e) => setEditingMessage({...editingMessage, content: e.target.value})}
                                          className="bg-white text-gray-800 border-0"
                                          autoFocus
                                        />
                                        <Button 
                                          size="sm" 
                                          variant="ghost"
                                          onClick={() => handleEditMessage(message.id, editingMessage.content)}
                                          className="ml-2"
                                        >
                                          <Check className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="ghost"
                                          onClick={() => setEditingMessage(null)}
                                          className="ml-1"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <p className="break-words">{message.content}</p>
                                    )}
                                    
                                    {/* Opciones de mensaje (editar/eliminar) para mensajes propios no eliminados */}
                                    {isCurrentUser && !isDeleted && !isEditing && (
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 p-0 absolute top-1 right-1 opacity-0 group-hover:opacity-100"
                                          >
                                            <MoreVertical className="h-4 w-4 text-white" />
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-2">
                                          <div className="flex flex-col space-y-1">
                                            <Button 
                                              variant="ghost" 
                                              size="sm" 
                                              className="flex justify-start px-2"
                                              onClick={() => setEditingMessage({ id: message.id, content: message.content })}
                                            >
                                              <Edit className="h-4 w-4 mr-2" />
                                              Editar
                                            </Button>
                                            <Button 
                                              variant="ghost" 
                                              size="sm" 
                                              className="flex justify-start text-red-500 hover:text-red-600 px-2"
                                              onClick={() => setIsConfirmingDelete(message.id)}
                                            >
                                              <Trash2 className="h-4 w-4 mr-2" />
                                              Eliminar
                                            </Button>
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                    )}
                                    
                                    {/* Edited indicator */}
                                    {message.edited && !isDeleted && (
                                      <span className="text-xs opacity-70 ml-1">(editado)</span>
                                    )}
                                  </div>
                                  
                                  {/* Message timestamp */}
                                  <div className={`text-xs text-gray-400 mt-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                                    {formatTime(message.timestamp)}
                                  </div>
                                </div>
                                
                                {/* Avatar for sent messages only */}
                                {isCurrentUser && (
                                  <Avatar className="h-8 w-8 ml-2 self-end flex-shrink-0">
                                    <AvatarImage src={currentUser.photoURL} />
                                    <AvatarFallback className="bg-[#9b87f5] text-white text-xs">
                                      {currentUser.name?.charAt(0).toUpperCase() || 'Y'}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                
                                {message.fileId && (
                                  <FileAttachment
                                    id={message.fileId}
                                    filename={message.file?.filename || 'archivo.txt'}
                                    contentType={message.file?.contentType}
                                    size={message.file?.size}
                                    uploadedBy={message.senderId}
                                    onDelete={() => {
                                      // This will be called after file deletion
                                      // No need to do anything as the socket will handle the update
                                    }}
                                  />
                                )}
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
                
                {/* Message input with emoji picker and file upload */}
                <div className="p-4 border-t">
                  <div className="flex items-center space-x-2">
                    <EmojiPicker onEmojiClick={handleEmojiClick} />
                    <FileUpload onFileSelect={handleFileUpload} />
                    <Input
                      placeholder="Escribe un mensaje..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="flex-1"
                      disabled={isUploading}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || isUploading}
                      className="bg-[#9b87f5] hover:bg-[#8a74f0]"
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                {sidebarCollapsed && (
                  <Button 
                    variant="outline" 
                    onClick={toggleSidebar} 
                    className="mb-4"
                  >
                    <ChevronRight className="h-4 w-4 mr-2" />
                    Ver contactos
                  </Button>
                )}
                <h2 className="text-xl font-semibold">Selecciona un chat</h2>
                <p className="text-gray-500 mt-2">
                  Elige una conversación de la lista o inicia una nueva
                </p>
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreatingGroup(true)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Crear chat grupal
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => setIsSelectingUser(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Chat privado
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
      
      {/* Mobile chat view with emoji support */}
      {activeChat && (
        <ChatMobileSheet
          isOpen={isMobileChat}
          onClose={() => setIsMobileChat(false)}
          title={getChatName(activeChat)}
          messages={activeMessages}
          isGroup={activeChat.isGroup}
          onEditMessage={(id, content) => setEditingMessage({ id, content })}
          onDeleteMessage={(id) => setIsConfirmingDelete(id)}
        >
          <div className="flex items-center space-x-2">
            <EmojiPicker onEmojiClick={handleEmojiClick} />
            <Input
              placeholder="Escribe un mensaje..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!messageText.trim()}
              className="bg-[#9b87f5] hover:bg-[#8a74f0]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </ChatMobileSheet>
      )}
      
      {/* Diálogo de búsqueda de mensajes */}
      <MessageSearch 
        isOpen={isSearching} 
        onOpenChange={setIsSearching}
        activeChat={activeChat}
        onSearchResultClick={handleSearchMessageSelect}
        searchMessages={searchMessages}
      />
      
      {/* Dialogs */}
      <Dialog open={isCreatingGroup} onOpenChange={setIsCreatingGroup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear chat grupal</DialogTitle>
          </DialogHeader>
          <ChatGroupForm onClose={() => setIsCreatingGroup(false)} />
        </DialogContent>
      </Dialog>
      
      <UserSelectDialog 
        open={isSelectingUser} 
        onOpenChange={setIsSelectingUser}
        title="Nuevo chat privado"
        onUserSelect={handleCreatePrivateChat}
      />
      
      {activeChat && (
        <UserSelectDialog 
          open={isAddingParticipant} 
          onOpenChange={setIsAddingParticipant}
          title="Añadir participante"
          onUserSelect={handleAddParticipant}
          excludeUsers={activeChat.participants}
        />
      )}
      
      {/* Dialog para confirmar salir del chat grupal */}
      <Dialog 
        open={!!isConfirmingLeaveChat} 
        onOpenChange={(open) => !open && setIsConfirmingLeaveChat(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Salir del chat grupal</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>¿Estás seguro que deseas salir de este chat grupal? No podrás volver a entrar a menos que alguien te añada nuevamente.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmingLeaveChat(null)}>Cancelar</Button>
            <Button 
              variant="destructive"
              onClick={() => isConfirmingLeaveChat && handleLeaveChat(isConfirmingLeaveChat)}
            >
              Salir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit message dialog */}
      {editingMessage && !isConfirmingDelete && (
        <Dialog 
          open={!!editingMessage} 
          onOpenChange={(open) => !open && setEditingMessage(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar mensaje</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                value={editingMessage.content}
                onChange={(e) => setEditingMessage({...editingMessage, content: e.target.value})}
                className="w-full"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingMessage(null)}>Cancelar</Button>
              <Button 
                className="bg-[#9b87f5] hover:bg-[#8a74f0]"
                onClick={() => handleEditMessage(editingMessage.id, editingMessage.content)}
              >
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Delete confirmation dialog */}
      <Dialog 
        open={!!isConfirmingDelete} 
        onOpenChange={(open) => !open && setIsConfirmingDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar mensaje</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>¿Estás seguro que deseas eliminar este mensaje? Esta acción mostrará el texto como "Mensaje eliminado".</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmingDelete(null)}>Cancelar</Button>
            <Button 
              variant="destructive"
              onClick={() => isConfirmingDelete && handleDeleteMessage(isConfirmingDelete)}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default ChatsPage;
