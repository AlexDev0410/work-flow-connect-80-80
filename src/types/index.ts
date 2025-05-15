
export interface UserType {
  id: string;
  name: string;
  email?: string;
  role: string;
  photoURL?: string;
  joinedAt?: number;
  status?: 'online' | 'offline';
  bio?: string;
  skills?: string[];
}

export interface ChatType {
  id: string;
  name?: string;
  isGroup?: boolean;
  participants: string[];
  createdAt?: string; 
  updatedAt?: string;
  lastMessageAt?: string;
  users?: string[];
  messages?: MessageType[];
  participantDetails?: UserType[];
  otherUser?: UserType;
  lastMessage?: {
    content: string;
    timestamp: string;
  };
}

export interface MessageType {
  id: string;
  chatId?: string;
  senderId: string;
  senderName?: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
  edited?: boolean;
  deleted?: boolean;
  fileId?: string;
  timestamp: string;
  file?: {
    id?: string;
    filename: string;
    contentType?: string;
    size?: number;
    uploadedBy?: string;
  };
  // Added for MessageSearch component
  chatName?: string;
  chatIsGroup?: boolean;
}

export interface JobType {
  id: string;
  title: string;
  description: string;
  budget: number;
  category: string;
  skills: string[];
  status: 'open' | 'in progress' | 'completed';
  userId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  userName?: string;
  userPhoto?: string;
  comments?: CommentType[];
}

export interface CommentType {
  id: string;
  content: string;
  text?: string;  // Added for compatibility
  userId: string;
  jobId: string;
  createdAt: string;
  updatedAt?: string;
  userName?: string;
  userPhoto?: string;
  userAvatar?: string;
  timestamp?: number | string;
  replies?: ReplyType[];
}

export interface ReplyType {
  id: string;
  content: string;
  text?: string;  // Added for compatibility
  userId: string;
  commentId: string;
  createdAt: string;
  updatedAt?: string;
  userName?: string;
  userPhoto?: string;
  userAvatar?: string;
  timestamp?: number | string;
}

export interface FileType {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  url?: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface ChatContextValue {
  chats: ChatType[];
  messages: Record<string, MessageType[]>;
  activeChat: ChatType | null;
  setActiveChat: (chat: ChatType | null) => void;
  sendMessage: (chatId: string, content: string) => void;
  getMessages: (chatId: string) => MessageType[];
  loadMessages: (chatId: string) => Promise<void>;
}
