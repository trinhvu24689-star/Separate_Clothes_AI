import React from 'react';
import { X, Image as ImageIcon, Palette, User, ShoppingCart, Crown, Shield, Wand2, UserCog, Sparkles, MessageCircle, MessageSquare, Clock } from 'lucide-react';
import { AppView, VipLevel } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  onOpenShop: () => void;
  vipLevel: VipLevel;
  totalRecharged: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  currentView, 
  onChangeView,
  onOpenShop,
  vipLevel,
  totalRecharged
}) => {
  // Define menu items with distinct NEON colors
  const menuItems = [
    { 
      id: 'HOME', 
      label: 'Tạo Hình Ảnh', 
      icon: <ImageIcon size={20} />, 
      colorClass: 'text-cyan-400', 
      shadowClass: 'drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]',
      bgActive: 'bg-cyan-500/10 border-cyan-500/50'
    },
    { 
      id: 'HISTORY', 
      label: 'Lịch Sử Tách', 
      icon: <Clock size={20} />, 
      colorClass: 'text-cyan-400', 
      shadowClass: 'drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]',
      bgActive: 'bg-cyan-500/10 border-cyan-500/50'
    },
    { 
      id: 'DRAW', 
      label: 'Vẽ Tranh Tự Do', 
      icon: <Palette size={20} />, 
      colorClass: 'text-pink-400', 
      shadowClass: 'drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]',
      bgActive: 'bg-pink-500/10 border-pink-500/50'
    },
    { 
      id: 'AUTO_PAINT', 
      label: 'Họa Sĩ AI (Auto)', 
      icon: <Wand2 size={20} />, 
      badge: 'HOT',
      colorClass: 'text-orange-400', 
      shadowClass: 'drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]',
      bgActive: 'bg-orange-500/10 border-orange-500/50'
    },
    { 
      id: 'PUBLIC_CHAT', 
      label: 'Phòng Chat Chung', 
      icon: <MessageSquare size={20} />,
      colorClass: 'text-green-400', 
      shadowClass: 'drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]',
      bgActive: 'bg-green-500/10 border-green-500/50'
    },
    { 
      id: 'ADMIN_CHAT', 
      label: 'Hỗ Trợ Riêng (1-1)', 
      icon: <MessageCircle size={20} />, 
      badge: 'ULTRA',
      colorClass: 'text-purple-400', 
      shadowClass: 'drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]',
      bgActive: 'bg-purple-500/10 border-purple-500/50'
    },
    { 
      id: 'PROFILE', 
      label: 'Hồ Sơ & Khung Ảnh', 
      icon: <User size={20} />,
      colorClass: 'text-blue-400', 
      shadowClass: 'drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]',
      bgActive: 'bg-blue-500/10 border-blue-500/50'
    },
    { 
      id: 'SHOP_TRIGGER', 
      label: 'Cửa Hàng & Nạp VIP', 
      icon: <ShoppingCart size={20} />, 
      highlight: true,
      colorClass: 'text-yellow-400', 
      shadowClass: 'drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]',
      bgActive: 'bg-yellow-500/10 border-yellow-500/50'
    },
  ];

  const handleAdminClick = () => {
    if (vipLevel === 'MODERATOR' || vipLevel === 'LIFETIME') {
        onChangeView('ADMIN');
        onClose();
        return;
    }

    const key = prompt("Nhập Key Quản Trị Viên (QTV):");
    if (key === 'QTV2468') {
      onChangeView('ADMIN');
      onClose();
    } else if (key !== null) {
      alert("Sai Key! Bạn không có quyền truy cập.");
    }
  };

  const getVipColor = () => {
      switch (vipLevel) {
          case 'LIFETIME': return 'text-red-500';
          case 'MODERATOR': return 'text-emerald-500';
          case 'ULTRA_INFINITY': return 'text-purple-400';
          case 'SSVIP': return 'text-yellow-400';
          case 'VIP': return 'text-blue-400';
          default: return 'text-gray-400';
      }
  };

  const formatCurrency = (val: number) => {
      if (val >= 1000000000) return (val / 1000000000).toFixed(1) + ' tỷ';
      if (val >= 1000000) return (val / 1000000).toFixed(1) + ' Tr';
      if (val >= 1000) return (val / 1000).toFixed(0) + ' K';
      return val;
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div 
        className={`fixed top-0 left-0 bottom-0 w-80 bg-[#131B2C] border-r border-gray-800 z-50 transform transition-transform duration-300 shadow-2xl flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 flex items-center justify-between border-b border-gray-800 shrink-0">
          <h2 className="text-xl font-bold text-white neon-text-rainbow flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> Menu
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 hover:bg-gray-800 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          
          {/* VIP PROFILE CARD */}
          <div className="mb-8 bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl p-5 border border-gray-800 relative overflow-hidden shadow-lg group">
             {/* Background glow based on VIP */}
             <div className={`absolute inset-0 opacity-10 ${
                 vipLevel === 'LIFETIME' ? 'bg-red-600' :
                 vipLevel === 'MODERATOR' ? 'bg-emerald-600' :
                 vipLevel === 'ULTRA_INFINITY' ? 'bg-purple-600' :
                 vipLevel === 'SSVIP' ? 'bg-yellow-500' :
                 'bg-blue-600'
             }`}></div>
             
             <div className="relative z-10">
                 <div className="flex justify-between items-center mb-3">
                     <span className={`text-xs font-black tracking-wider ${getVipColor()} flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg`}>
                        <Crown size={12} /> {vipLevel === 'NONE' ? 'MEMBER' : vipLevel.replace('_', ' ')}
                     </span>
                     <span className="text-[10px] text-gray-400 font-mono">Tổng nạp</span>
                 </div>
                 <div className="flex items-baseline gap-1 mb-3">
                     <span className="text-2xl font-black text-white tracking-tight">{formatCurrency(totalRecharged)}</span>
                     <span className="text-xs font-medium text-gray-500">VND</span>
                 </div>
                 {/* Progress Bar */}
                 <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden border border-gray-700/50">
                     <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                            vipLevel === 'MODERATOR' ? 'bg-emerald-500 w-full' : 
                            vipLevel === 'LIFETIME' ? 'bg-gradient-to-r from-red-500 to-orange-500 w-full animate-pulse' :
                            'bg-gradient-to-r from-blue-500 to-purple-500'
                        }`} 
                        style={{ width: vipLevel === 'NONE' ? '5%' : '100%' }}
                     ></div>
                 </div>
             </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2 mb-2">Chức Năng Chính</h3>
            {menuItems.map((item) => {
                const isShop = item.id === 'SHOP_TRIGGER';
                const isActive = currentView === item.id;
                
                return (
                    <button
                    key={item.id}
                    onClick={() => {
                        if (isShop) {
                            onOpenShop();
                        } else {
                            onChangeView(item.id as any);
                        }
                        onClose();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden mb-1 border ${
                        isActive
                        ? `${item.bgActive} ${item.colorClass} ${item.shadowClass} font-bold` 
                        : `border-transparent hover:bg-gray-800 ${item.colorClass} opacity-80 hover:opacity-100 hover:${item.shadowClass}`
                    }`}
                    >
                    <div className={`${isActive || isShop ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-200`}>
                        {item.icon}
                    </div>
                    <span className="font-medium flex-1 text-left flex items-center gap-2">
                        {item.label}
                        {item.badge && (
                            <span className={`text-[10px] text-white px-1.5 py-0.5 rounded animate-pulse font-bold ${
                                item.badge === 'HOT' ? 'bg-red-600' : 'bg-purple-600'
                            }`}>{item.badge}</span>
                        )}
                    </span>
                    {isShop && <div className="w-2 h-2 rounded-full bg-yellow-500 animate-ping"></div>}
                    </button>
                );
            })}
          </div>

          <div className="my-6 border-t border-gray-800"></div>

          <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2 mb-2">Hệ Thống</h3>
              <button
                onClick={handleAdminClick}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all border ${
                currentView === 'ADMIN' 
                    ? vipLevel === 'MODERATOR' 
                        ? 'bg-emerald-900/20 border-emerald-500 text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]'
                        : 'bg-red-900/20 border-red-500 text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.8)]'
                    : vipLevel === 'MODERATOR'
                        ? 'border-transparent text-emerald-400 hover:bg-gray-800 drop-shadow-[0_0_3px_rgba(52,211,153,0.5)]'
                        : 'border-transparent text-red-400 hover:bg-gray-800 drop-shadow-[0_0_3px_rgba(248,113,113,0.5)]'
                }`}
              >
                {vipLevel === 'MODERATOR' ? <UserCog size={20} className="text-emerald-500"/> : <Shield size={20} />}
                <span className="font-medium">{vipLevel === 'MODERATOR' ? 'Moderator Panel' : 'Admin Panel'}</span>
              </button>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-800 bg-[#0f1522]">
            <p className="text-[10px] text-gray-500 text-center">
                StyleExtract AI v2.5.0 <br/>
                Server: Asia/Vietnam
            </p>
        </div>
      </div>
    </>
  );
};