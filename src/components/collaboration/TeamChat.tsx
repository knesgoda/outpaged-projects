import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRealtime } from '@/hooks/useRealtime';
import { MentionInput } from '@/components/mentions/MentionInput';
import { 
  Send, 
  Smile, 
  Paperclip, 
  Users, 
  Hash,
  Plus,
  Settings,
  Pin,
  Archive,
  Search
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ChatMessage {
  id: string;
  content: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  created_at: string;
  channel_id: string;
  message_type: 'text' | 'system' | 'file';
  mentions: string[];
  reactions: { emoji: string; users: string[] }[];
  is_pinned: boolean;
}

interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  type: 'general' | 'project' | 'team' | 'direct';
  project_id?: string;
  members: string[];
  is_private: boolean;
  created_by: string;
  created_at: string;
}

interface TeamChatProps {
  projectId?: string;
  channelId?: string;
}

export function TeamChat({ projectId, channelId: initialChannelId }: TeamChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentChannel, setCurrentChannel] = useState<string>(initialChannelId || '');
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Real-time updates for messages
  useRealtime({
    table: 'chat_messages',
    filter: currentChannel ? `channel_id=eq.${currentChannel}` : undefined,
    onInsert: (payload) => {
      const newMessage = payload.new as ChatMessage;
      setMessages(prev => [...prev, newMessage]);
      scrollToBottom();
    },
    onUpdate: (payload) => {
      const updatedMessage = payload.new as ChatMessage;
      setMessages(prev => prev.map(msg => 
        msg.id === updatedMessage.id ? updatedMessage : msg
      ));
    }
  });

  useEffect(() => {
    if (user) {
      loadChannels();
      // Set up user presence
      setOnlineUsers(prev => [...prev.filter(id => id !== user.id), user.id]);
    }
  }, [user, projectId]);

  useEffect(() => {
    if (currentChannel) {
      loadMessages();
    }
  }, [currentChannel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChannels = async () => {
    try {
      // For demo purposes, create default channels
      const defaultChannels: ChatChannel[] = [
        {
          id: 'general',
          name: 'general',
          description: 'General team discussions',
          type: 'general',
          project_id: projectId,
          members: [user?.id || ''],
          is_private: false,
          created_by: user?.id || '',
          created_at: new Date().toISOString()
        },
        {
          id: 'project-' + (projectId || 'default'),
          name: projectId ? 'Project Discussion' : 'random',
          description: projectId ? 'Project-specific discussions' : 'Random conversations',
          type: projectId ? 'project' : 'general',
          project_id: projectId,
          members: [user?.id || ''],
          is_private: false,
          created_by: user?.id || '',
          created_at: new Date().toISOString()
        }
      ];

      setChannels(defaultChannels);
      
      // Set current channel if not set
      if (!currentChannel && defaultChannels.length > 0) {
        setCurrentChannel(defaultChannels[0].id);
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    }
  };

  const loadMessages = async () => {
    try {
      // For demo purposes, load from localStorage
      const savedMessages = localStorage.getItem(`chat_messages_${currentChannel}`);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else {
        // Create a welcome message for the channel
        const channel = channels.find(c => c.id === currentChannel);
        if (channel) {
          const welcomeMessage: ChatMessage = {
            id: 'welcome-' + currentChannel,
            content: `Welcome to #${channel.name}! ${channel.description || 'Start chatting with your team.'}`,
            author_id: 'system',
            author_name: 'System',
            created_at: new Date().toISOString(),
            channel_id: currentChannel,
            message_type: 'system',
            mentions: [],
            reactions: [],
            is_pinned: false
          };
          setMessages([welcomeMessage]);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !currentChannel || isLoading) return;

    setIsLoading(true);
    try {
      // Extract mentions from message
      const mentionMatches = newMessage.match(/@[\w\s]+/g) || [];
      const mentions = mentionMatches.map(match => match.substring(1).trim());

      const message: ChatMessage = {
        id: crypto.randomUUID(),
        content: newMessage,
        author_id: user.id,
        author_name: user.user_metadata?.full_name || user.email || 'Unknown User',
        author_avatar: user.user_metadata?.avatar_url,
        created_at: new Date().toISOString(),
        channel_id: currentChannel,
        message_type: 'text',
        mentions,
        reactions: [],
        is_pinned: false
      };

      const updatedMessages = [...messages, message];
      setMessages(updatedMessages);
      
      // Save to localStorage for demo
      localStorage.setItem(`chat_messages_${currentChannel}`, JSON.stringify(updatedMessages));

      setNewMessage('');
      scrollToBottom();

      // Show mention notifications
      if (mentions.length > 0) {
        toast({
          title: "Mentions Sent",
          description: `You mentioned ${mentions.length} team member(s).`,
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addReaction = (messageId: string, emoji: string) => {
    if (!user) return;

    const updatedMessages = messages.map(msg => {
      if (msg.id === messageId) {
        const existingReaction = msg.reactions.find(r => r.emoji === emoji);
        if (existingReaction) {
          const userIndex = existingReaction.users.indexOf(user.id);
          if (userIndex > -1) {
            // Remove reaction
            existingReaction.users.splice(userIndex, 1);
            if (existingReaction.users.length === 0) {
              msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
            }
          } else {
            // Add reaction
            existingReaction.users.push(user.id);
          }
        } else {
          // New reaction
          msg.reactions.push({ emoji, users: [user.id] });
        }
      }
      return msg;
    });

    setMessages(updatedMessages);
    localStorage.setItem(`chat_messages_${currentChannel}`, JSON.stringify(updatedMessages));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const currentChannelData = channels.find(c => c.id === currentChannel);

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-muted/50 border-r">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Channels</h3>
            <Button variant="ghost" size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => setCurrentChannel(channel.id)}
                className={`w-full flex items-center gap-2 p-2 rounded text-left hover:bg-accent transition-colors ${
                  currentChannel === channel.id ? 'bg-accent' : ''
                }`}
              >
                <Hash className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{channel.name}</span>
                {channel.is_private && (
                  <Badge variant="secondary" className="text-xs">Private</Badge>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Online Users */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Online ({onlineUsers.length})</span>
          </div>
          <div className="space-y-1">
            {onlineUsers.slice(0, 5).map((userId, index) => (
              <div key={userId} className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">User {index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">
                {currentChannelData?.name || 'Select a channel'}
              </h2>
              {currentChannelData?.description && (
                <span className="text-sm text-muted-foreground">
                  {currentChannelData.description}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Search className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message, index) => {
              const showAuthor = index === 0 || messages[index - 1].author_id !== message.author_id;
              const isSystem = message.message_type === 'system';
              
              return (
                <div key={message.id} className={`group ${isSystem ? 'text-center' : ''}`}>
                  {isSystem ? (
                    <div className="flex items-center gap-2">
                      <Separator className="flex-1" />
                      <Badge variant="secondary" className="text-xs">
                        {message.content}
                      </Badge>
                      <Separator className="flex-1" />
                    </div>
                  ) : (
                    <div className="flex gap-3 hover:bg-accent/50 p-2 rounded -m-2">
                      {showAuthor && (
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={message.author_avatar} />
                          <AvatarFallback className="text-xs">
                            {message.author_name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      {!showAuthor && <div className="w-8" />}
                      
                      <div className="flex-1 min-w-0">
                        {showAuthor && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">{message.author_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(message.created_at)}
                            </span>
                            {message.is_pinned && (
                              <Pin className="w-3 h-3 text-muted-foreground" />
                            )}
                          </div>
                        )}
                        
                        <div className="text-sm text-foreground whitespace-pre-wrap break-words">
                          {message.content}
                        </div>
                        
                        {message.reactions.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {message.reactions.map((reaction) => (
                              <button
                                key={reaction.emoji}
                                onClick={() => addReaction(message.id, reaction.emoji)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors ${
                                  reaction.users.includes(user?.id || '') 
                                    ? 'bg-primary/10 border-primary' 
                                    : 'bg-background border-border hover:bg-accent'
                                }`}
                              >
                                {reaction.emoji}
                                <span>{reaction.users.length}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addReaction(message.id, '👍')}
                        >
                          <Smile className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <div className="flex-1">
              <MentionInput
                value={newMessage}
                onChange={setNewMessage}
                placeholder={`Message #${currentChannelData?.name || 'channel'}`}
                projectId={projectId}
                className="min-h-[40px] max-h-32 resize-none"
              />
            </div>
            
            <div className="flex gap-1">
              <Button variant="ghost" size="sm">
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button 
                onClick={sendMessage}
                disabled={!newMessage.trim() || isLoading}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}