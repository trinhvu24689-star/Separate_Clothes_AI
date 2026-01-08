import React, { useState, useEffect, useRef } from 'react';
import { User, VipLevel, ChatMessage } from '../types';
import { Send, User as UserIcon, ShieldCheck, Lock, Infinity, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from './Button';

interface AdminChatProps {
  currentUser: User;
  onOpenShop: () => void;
}

export const AdminChat: React.FC<AdminChatProps> = ({ currentUser, onOpenShop }) => {
  const allowedLevels: VipLevel[] = ['ULTRA_INFINITY', 'LIFETIME', 'MODERATOR'];
  const isLocked = !allowedLevels.includes(currentUser.vipLevel);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const storageKey = `styleExtract_chat_${currentUser.username}`;

  // Load chat history
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setMessages(JSON.parse(saved));
    } else {
      // Welcome message
      const welcome: ChatMessage = {
        id: 'welcome',
        sender: 'ADMIN',
        text: `Chào ${currentUser.username}, tôi là Quang Hổ Master G. Cảm ơn bạn đã đăng ký gói Ultra Infinity! Tôi có thể giúp gì cho bạn?`,
        timestamp: Date.now()
      };
      setMessages([welcome]);
    }
  }, [storageKey, currentUser.username]);

  // Save chat history
  useEffect(() => {
    if (!isLocked && messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
      scrollToBottom();
    }
  }, [messages, isLocked, storageKey]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'USER',
      text: inputText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputText('');
    setIsTyping(true);

    // Simulate Admin Response
    setTimeout(() => {
       const responses = [
         "Cảm ơn bạn đã phản hồi, tôi sẽ kiểm tra ngay.",
         "Vấn đề này cần kỹ thuật xử lý, vui lòng đợi trong giây lát.",
         "Tuyệt vời! Bạn có cần hỗ trợ thêm về tính năng tách ảnh 8K không?",
         "Hệ thống ghi nhận yêu cầu của bạn. Ưu tiên xử lý cấp độ Ultra.",
         "Tôi đang xem xét tài khoản của bạn..."
       ];
       const randomRes = responses[Math.floor(Math.random() * responses.length)];
       
       const newAdminMsg: ChatMessage = {
         id: (Date.now() + 1).toString(),
         sender: 'ADMIN',
         text: randomRes,
         timestamp: Date.now()
       };
       
       setMessages(prev => [...prev, newAdminMsg]);
       setIsTyping(false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearHistory = () => {
      if(confirm("Xóa toàn bộ lịch sử trò chuyện?")) {
          setMessages([]);
          localStorage.removeItem(storageKey);
      }
  };

  if (isLocked) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center p-8 text-center bg-[#131B2C] rounded-3xl border border-gray-800 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6">
          <Lock className="w-24 h-24 text-purple-500 mb-6 animate-pulse" />
          <h2 className="text-3xl font-black text-white mb-2">KHU VỰC HỖ TRỢ VIP 1-1</h2>
          <p className="text-gray-300 max-w-md mb-8">
            Tính năng chat trực tiếp với Admin chỉ dành cho thành viên <span className="text-purple-400 font-bold">ULTRA INFINITY</span> trở lên.
            <br/><span className="text-xs text-gray-500 mt-2 block">(Hỗ trợ ưu tiên, giải quyết khiếu nại 24/7)</span>
          </p>
          <Button onClick={onOpenShop} className="animate-bounce" icon={<Infinity className="w-5 h-5"/>}>
            Nâng Cấp Ultra Infinity
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[80vh] flex flex-col bg-[#131B2C] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl relative">
       {/* Header */}
       <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
             <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-600 to-orange-600 flex items-center justify-center border-2 border-yellow-500 shadow-lg shadow-red-500/20">
                   <ShieldCheck className="text-white w-6 h-6" />
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
             </div>
             <div>
                <h3 className="font-bold text-white flex items-center gap-2">
                   Admin Support 
                   <span className="text-[10px] bg-purple-600 px-2 py-0.5 rounded-full text-white">Ultra Priority</span>
                </h3>
                <p className="text-xs text-green-400">Đang hoạt động</p>
             </div>
          </div>
          <button onClick={clearHistory} className="p-2 text-gray-500 hover:text-red-400 transition-colors">
              <Trash2 size={18} />
          </button>
       </div>

       {/* Chat Area */}
       <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20 custom-scrollbar">
          {messages.map((msg) => {
             const isAdmin = msg.sender === 'ADMIN';
             return (
                <div key={msg.id} className={`flex ${isAdmin ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2`}>
                   {isAdmin && (
                      <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center mr-2 shrink-0 mt-1">
                         <span className="text-xs font-bold text-white">AD</span>
                      </div>
                   )}
                   <div className={`max-w-[75%] p-3 rounded-2xl text-sm leading-relaxed ${
                      isAdmin 
                      ? 'bg-gray-800 text-gray-100 rounded-tl-none border border-gray-700' 
                      : 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-tr-none shadow-lg shadow-purple-900/20'
                   }`}>
                      {msg.text}
                      <div className={`text-[10px] mt-1 text-right ${isAdmin ? 'text-gray-500' : 'text-purple-200'}`}>
                         {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                   </div>
                </div>
             );
          })}
          {isTyping && (
             <div className="flex justify-start animate-pulse">
                <div className="bg-gray-800/50 p-3 rounded-2xl rounded-tl-none text-gray-400 text-xs flex gap-1 items-center">
                   <MoreHorizontal size={16} /> Admin đang soạn tin...
                </div>
             </div>
          )}
          <div ref={messagesEndRef} />
       </div>

       {/* Input Area */}
       <div className="p-4 border-t border-gray-800 bg-gray-900/30">
          <div className="flex gap-2">
             <input 
               type="text" 
               value={inputText}
               onChange={(e) => setInputText(e.target.value)}
               onKeyDown={handleKeyDown}
               placeholder="Nhập tin nhắn cần hỗ trợ..."
               className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
             />
             <Button 
                onClick={handleSend} 
                disabled={!inputText.trim()}
                className="px-4"
                icon={<Send size={18} />}
             >
             </Button>
          </div>
          <p className="text-[10px] text-gray-500 mt-2 text-center">
             Lưu ý: Không spam hoặc gửi tin nhắn quấy rối để tránh bị khóa tài khoản.
          </p>
       </div>
    </div>
  );
};
