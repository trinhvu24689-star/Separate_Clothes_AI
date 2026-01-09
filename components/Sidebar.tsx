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
  // Menu items - Clean and simple
  const menuItems = [
    { 
      id: 'HOME', 
      label: 'Tạo Hình Ảnh', 
      icon: <ImageIcon size={20} />
    },
    { 
      id: 'HISTORY', 
      label: 'Lịch Sử Tách', 
      icon: <Clock size={20} />
    },
    { 
      id: 'DRAW', 
      label: 'Vẽ Tranh Tự Do', 
      icon: <Palette size={20} />
    },
    { 
      id: 'AUTO_PAINT', 
      label: 'Họa Sĩ AI (Auto)', 
      icon: <Wand2 size={20} />, 
      badge: 'HOT'
    },
    { 
      id: 'PUBLIC_CHAT', 
      label: 'Phòng Chat Chung', 
      icon: <MessageSquare size={20} />
    },
    { 
      id: 'ADMIN_CHAT', 
      label: 'Hỗ Trợ Riêng (1-1)', 
      icon: <MessageCircle size={20} />, 
      badge: 'ULTRA'
    },
    { 
      id: 'PROFILE', 
      label: 'Hồ Sơ & Khung Ảnh', 
      icon: <User size={20} />
    },
    { 
      id: 'SHOP_TRIGGER', 
      label: 'Cửa Hàng & Nạp VIP', 
      icon: <ShoppingCart size={20} />,
      isShop: true
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
    }
  };

  const formatCurrency = (val: number) => {
      if (val >= 1000000000) return (val / 1000000000).toFixed(1) + ' tỷ';
      if (val >= 1000000) return (val / 1000000).toFixed(1) + ' Tr';
      return val.toLocaleString();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/80 z-40 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div 
        className={`fixed top-0 left-0 bottom-0 w-80 bg-[#0f1522] border-r border-gray-800 z-50 transform transition-transform duration-200 shadow-2xl flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 flex items-center justify-between border-b border-gray-800 shrink-0">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-white" /> Menu
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          
          {/* VIP PROFILE CARD - Optimized (No gradients/shadows) */}
          <div className="mb-6 bg-[#161b26] rounded-xl p-5 border border-gray-800">
             <div className="flex justify-between items-center mb-3">
                 <span className={`text-xs font-bold ${vipLevel === 'NONE' ? 'text-gray-400' : 'text-red-400'} flex items-center gap-1`}>
                    <Crown size={12} /> {vipLevel === 'NONE' ? 'MEMBER' : vipLevel}
                 </span>
                 <span className="text-[10px] text-gray-500">Tổng nạp</span>
             </div>
             <div className="flex items-baseline gap-1 mb-3">
                 <span className="text-2xl font-bold text-white">{formatCurrency(totalRecharged)}</span>
                 <span className="text-xs text-gray-500">VND</span>
             </div>
             {/* Simple Progress Bar */}
             <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                 <div 
                    className="h-full bg-orange-600 rounded-full" 
                    style={{ width: vipLevel === 'NONE' ? '5%' : '100%' }}
                 ></div>
             </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-[10px] font-bold text-gray-600 uppercase mb-2 px-2">Chức Năng Chính</h3>
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
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors mb-1 ${
                        isActive
                        ? 'bg-[#1e293b] text-cyan-400 border border-cyan-900/30' 
                        : isShop 
                            ? 'text-yellow-400 hover:bg-[#1e293b]' 
                            : 'text-gray-300 hover:text-white hover:bg-[#1e293b]'
                    }`}
                    >
                        <div className={isShop ? "text-yellow-400" : isActive ? "text-cyan-400" : "text-gray-400"}>
                            {item.icon}
                        </div>
                        <span className="text-sm font-medium flex-1 text-left flex items-center gap-2">
                            {item.label}
                            {item.badge && (
                                <span className={`text-[9px] text-white px-1.5 py-0.5 rounded font-bold ${
                                    item.badge === 'HOT' ? 'bg-red-600' : 'bg-purple-600'
                                }`}>{item.badge}</span>
                            )}
                        </span>
                    </button>
                );
            })}
          </div>

          <div className="my-6 border-t border-gray-800"></div>

          <div className="space-y-1">
              <h3 className="text-[10px] font-bold text-gray-600 uppercase mb-2 px-2">Hệ Thống</h3>
              <button
                onClick={handleAdminClick}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-[#1e293b] transition-colors"
              >
                {vipLevel === 'MODERATOR' ? <UserCog size={20}/> : <Shield size={20} />}
                <span className="text-sm font-medium">{vipLevel === 'MODERATOR' ? 'Moderator Panel' : 'Admin Panel'}</span>
              </button>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-800 bg-[#0f1522]">
            <p className="text-[10px] text-gray-600 text-center">
                StyleExtract AI v2.5.0
            </p>
        </div>
      </div>
    </>
  );
};