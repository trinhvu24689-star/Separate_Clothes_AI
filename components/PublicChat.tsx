import React, { useState, useEffect, useRef } from 'react';
import { User, VipLevel, PublicChatMessage } from '../types';
import { Send, Users, Clock, AlertCircle, Crown, Shield, Zap, Infinity, MessageSquare } from 'lucide-react';
import { Button } from './Button';
import { AVAILABLE_FRAMES } from './ProfileView';

interface PublicChatProps {
  currentUser: User;
  onUpdateUser: (updatedUser: User) => void;
  onOpenShop: () => void;
}

// --- CONFIGURATION ---
const CHAT_CONFIG: Record<VipLevel, { dailyLimit: number; cooldown: number }> = {
    'NONE': { dailyLimit: 50, cooldown: 20 }, // 20s
    'VIP': { dailyLimit: 150, cooldown: 15 }, // 15s
    'SSVIP': { dailyLimit: 250, cooldown: 10 }, // 10s
    'ULTRA_INFINITY': { dailyLimit: 350, cooldown: 5 }, // 5s
    'LIFETIME': { dailyLimit: 999, cooldown: 3 }, // 3s
    'MODERATOR': { dailyLimit: 2000, cooldown: 1 }, // 1s
};

// Admin overwrite
const ADMIN_USERNAME = "Quang Hổ Master G";

export const PublicChat: React.FC<PublicChatProps> = ({ currentUser, onUpdateUser, onOpenShop }) => {
  const [messages, setMessages] = useState<PublicChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const storageKey = 'styleExtract_public_chat_db';

  const isAdmin = currentUser.username === ADMIN_USERNAME;
  const config = CHAT_CONFIG[currentUser.vipLevel];
  const dailyLimit = isAdmin ? 999999 : config.dailyLimit;
  const cooldownTime = isAdmin ? 0 : config.cooldown;
  const usedToday = currentUser.dailyChatCount || 0;

  // Load messages
  useEffect(() => {
    const loadMessages = () => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            setMessages(JSON.parse(saved));
        }
    };
    loadMessages();

    // Poll for new messages (simulate real-time)
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cooldown Timer Logic
  useEffect(() => {
     if (currentUser.lastChatTimestamp) {
         const elapsedSec = (Date.now() - currentUser.lastChatTimestamp) / 1000;
         const remaining = Math.max(0, cooldownTime - elapsedSec);
         setCooldownLeft(Math.ceil(remaining));

         if (remaining > 0) {
             const timer = setInterval(() => {
                 setCooldownLeft(prev => {
                     if (prev <= 1) {
                         clearInterval(timer);
                         return 0;
                     }
                     return prev - 1;
                 });
             }, 1000);
             return () => clearInterval(timer);
         }
     }
  }, [currentUser.lastChatTimestamp, cooldownTime]);

  const handleSend = () => {
      if (!inputText.trim()) return;

      // Check Daily Limit
      if (usedToday >= dailyLimit) {
          alert("Bạn đã hết lượt chat hôm nay. Vui lòng nâng cấp VIP để chat nhiều hơn!");
          return;
      }

      // Check Cooldown
      if (cooldownLeft > 0) {
          return; // Button is disabled anyway
      }

      const newMessage: PublicChatMessage = {
          id: Date.now().toString() + Math.random().toString(),
          username: currentUser.username,
          vipLevel: currentUser.vipLevel,
          avatarUrl: currentUser.profile.avatarUrl,
          frameId: currentUser.profile.currentFrameId,
          text: inputText.trim(),
          timestamp: Date.now(),
          isAdmin: isAdmin
      };

      // Optimistic update
      const updatedMessages = [...messages, newMessage].slice(-100); // Keep last 100 msgs
      setMessages(updatedMessages);
      localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
      setInputText('');

      // Update User State
      const updatedUser = {
          ...currentUser,
          dailyChatCount: (currentUser.dailyChatCount || 0) + 1,
          lastChatTimestamp: Date.now()
      };
      onUpdateUser(updatedUser);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getVipBadge = (level: VipLevel, isAdm: boolean) => {
      if (isAdm) return <span className="bg-red-600 text-white text-[10px] px-1 rounded font-bold animate-pulse">ADMIN</span>;
      switch(level) {
          case 'MODERATOR': return <span className="bg-emerald-600 text-white text-[10px] px-1 rounded font-bold flex items-center gap-1"><Shield size={8}/> NKD</span>;
          case 'LIFETIME': return <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] px-1 rounded font-bold flex items-center gap-1"><Zap size={8}/> LIFE</span>;
          case 'ULTRA_INFINITY': return <span className="bg-purple-600 text-white text-[10px] px-1 rounded font-bold flex items-center gap-1"><Infinity size={8}/> ULTRA</span>;
          case 'SSVIP': return <span className="bg-yellow-500 text-black text-[10px] px-1 rounded font-bold flex items-center gap-1"><Crown size={8}/> SSVIP</span>;
          case 'VIP': return <span className="bg-blue-500 text-white text-[10px] px-1 rounded font-bold">VIP</span>;
          default: return <span className="bg-gray-600 text-gray-300 text-[10px] px-1 rounded font-bold">MEM</span>;
      }
  };

  const getNameColor = (level: VipLevel, isAdm: boolean) => {
      if (isAdm) return 'text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]';
      switch(level) {
          case 'MODERATOR': return 'text-emerald-400';
          case 'LIFETIME': return 'text-orange-500 font-black';
          case 'ULTRA_INFINITY': return 'neon-text-rainbow';
          case 'SSVIP': return 'text-yellow-400';
          case 'VIP': return 'text-blue-400';
          default: return 'text-gray-300';
      }
  };

  return (
      <div className="flex flex-col h-full bg-[#131B2C] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
          {/* HEADER */}
          <div className="p-4 border-b border-gray-800 bg-gray-900/80 backdrop-blur-md flex justify-between items-center z-10">
              <div className="flex items-center gap-3">
                  <div className="bg-blue-600/20 p-2 rounded-lg text-blue-400">
                      <Users size={24} />
                  </div>
                  <div>
                      <h2 className="text-green-400 font-black text-lg flex items-center gap-2 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)] tracking-wider">
                          Phòng Chat Chung
                          <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse border border-green-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online
                          </span>
                      </h2>
                      <p className="text-xs text-gray-500">Nơi giao lưu của cộng đồng StyleExtract</p>
                  </div>
              </div>
              
              {/* User Stats */}
              <div className="flex flex-col items-end">
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                      Hôm nay: <span className={`${usedToday >= dailyLimit ? 'text-red-500' : 'text-white'} font-bold`}>{usedToday}/{dailyLimit === 999999 ? '∞' : dailyLimit}</span> tn
                  </div>
                  <div className="text-[10px] text-gray-500 flex items-center gap-1">
                      Cooldown: <span className="text-yellow-500 font-mono">{cooldownTime}s</span>
                  </div>
              </div>
          </div>

          {/* MESSAGES LIST */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
              {messages.length === 0 && (
                  <div className="text-center text-gray-500 mt-10 opacity-50">
                      <MessageSquare size={48} className="mx-auto mb-2" />
                      <p>Chưa có tin nhắn nào. Hãy là người đầu tiên!</p>
                  </div>
              )}
              
              {messages.map((msg) => {
                  const isMe = msg.username === currentUser.username;
                  const frame = AVAILABLE_FRAMES.find(f => f.id === msg.frameId);
                  const frameClass = frame ? frame.cssClass : 'border-gray-600';

                  return (
                      <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                          {/* Avatar */}
                          <div className="flex flex-col items-center gap-1">
                              <div className={`w-10 h-10 rounded-full bg-gray-800 flex-shrink-0 overflow-hidden ${frameClass} ${msg.vipLevel === 'ULTRA_INFINITY' ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                                   <img src={msg.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + msg.username} alt="Avt" className="w-full h-full object-cover" />
                              </div>
                          </div>

                          {/* Content */}
                          <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                  {getVipBadge(msg.vipLevel, msg.isAdmin || false)}
                                  <span className={`text-xs font-bold ${getNameColor(msg.vipLevel, msg.isAdmin || false)}`}>
                                      {msg.username}
                                  </span>
                                  <span className="text-[10px] text-gray-600">
                                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                              </div>
                              <div className={`px-4 py-2 rounded-2xl text-sm break-words shadow-md ${
                                  isMe 
                                  ? 'bg-blue-600 text-white rounded-tr-none' 
                                  : msg.isAdmin 
                                      ? 'bg-red-900/80 border border-red-500/30 text-white rounded-tl-none'
                                      : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-tl-none'
                              }`}>
                                  {msg.text}
                              </div>
                          </div>
                      </div>
                  );
              })}
              <div ref={messagesEndRef} />
          </div>

          {/* INPUT AREA */}
          <div className="p-4 bg-gray-900 border-t border-gray-800">
              {usedToday >= dailyLimit && !isAdmin ? (
                   <div className="flex items-center justify-between bg-red-900/20 border border-red-500/30 p-3 rounded-xl mb-2">
                       <span className="text-red-400 text-xs flex items-center gap-2">
                           <AlertCircle size={16} /> Bạn đã hết lượt chat hôm nay.
                       </span>
                       <Button onClick={onOpenShop} className="py-1 px-3 text-xs h-8">Nâng VIP</Button>
                   </div>
              ) : (
                  <div className="flex gap-2 relative">
                      <input 
                          type="text" 
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder={cooldownLeft > 0 ? `Vui lòng đợi ${cooldownLeft}s...` : "Nhập tin nhắn..."}
                          disabled={cooldownLeft > 0}
                          className={`flex-1 bg-gray-800 border ${cooldownLeft > 0 ? 'border-yellow-600/50 cursor-not-allowed opacity-50' : 'border-gray-700'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all`}
                      />
                      <Button 
                          onClick={handleSend} 
                          disabled={!inputText.trim() || cooldownLeft > 0}
                          className={`px-4 transition-all ${cooldownLeft > 0 ? 'grayscale' : ''}`}
                      >
                         {cooldownLeft > 0 ? (
                             <span className="font-mono text-yellow-300 w-6 text-center">{cooldownLeft}</span>
                         ) : (
                             <Send size={20} />
                         )}
                      </Button>
                  </div>
              )}
              
              {/* Limit Progress Bar */}
              <div className="mt-3 flex items-center gap-2">
                   <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                       <div 
                           className={`h-full rounded-full transition-all duration-500 ${usedToday >= dailyLimit ? 'bg-red-500' : 'bg-green-500'}`} 
                           style={{ width: `${Math.min(100, (usedToday / dailyLimit) * 100)}%` }}
                       ></div>
                   </div>
                   <span className="text-[10px] text-gray-500 font-mono">{usedToday}/{dailyLimit === 999999 ? '∞' : dailyLimit}</span>
              </div>
          </div>
      </div>
  );
};
