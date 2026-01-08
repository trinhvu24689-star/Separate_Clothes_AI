import React, { useRef } from 'react';
import { Camera, Lock, Check, Star, PlayCircle, Crown, ShoppingBag } from 'lucide-react';
import { UserProfile, Frame, VipLevel } from '../types';
import { Button } from './Button';
import { formatStarBalance } from '../App';

// DEFINED FRAMES
export const AVAILABLE_FRAMES: Frame[] = [
  { 
    id: 'default', 
    name: 'Cơ Bản', 
    type: 'DEFAULT', 
    cssClass: 'border-4 border-gray-600', 
    description: 'Khung mặc định đơn giản.' 
  },
  { 
    id: 'neon_blue', 
    name: 'Neon Blue', 
    type: 'STAR_BUY', 
    cost: 50, 
    cssClass: 'border-4 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)]', 
    description: 'Ánh sáng Neon xanh hiện đại.' 
  },
  { 
    id: 'gold_vip', 
    name: 'Hoàng Gia', 
    type: 'VIP_UNLOCK', 
    requiredVip: 'SSVIP', 
    cssClass: 'border-4 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.8)] relative after:content-[""] after:absolute after:inset-[-4px] after:border-2 after:border-yellow-200 after:animate-pulse', 
    description: 'Dành riêng cho thành viên SSVIP.' 
  },
  { 
    id: 'rainbow_ultra', 
    name: 'Cầu Vồng Vô Cực', 
    type: 'VIP_UNLOCK', 
    requiredVip: 'ULTRA_INFINITY', 
    cssClass: 'border-[6px] border-transparent bg-gradient-to-r from-red-500 via-green-500 to-blue-500 [background-clip:padding-box,border-box] [background-origin:border-box] animate-[spin_4s_linear_infinite]', 
    description: 'Khung đẳng cấp Ultra Infinity.' 
  },
  { 
    id: 'fire_ad', 
    name: 'Hỏa Diệm', 
    type: 'AD_WATCH', 
    cssClass: 'border-4 border-orange-600 shadow-[0_0_20px_rgba(234,88,12,0.9)] animate-pulse', 
    description: 'Xem quảng cáo để mở khóa.' 
  }
];

interface ProfileViewProps {
  profile: UserProfile;
  vipLevel: VipLevel;
  credits: number;
  onUpdateAvatar: (url: string) => void;
  onEquipFrame: (frameId: string) => void;
  onBuyFrame: (frame: Frame) => void;
  onWatchAd: (frame: Frame) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  vipLevel,
  credits,
  onUpdateAvatar,
  onEquipFrame,
  onBuyFrame,
  onWatchAd
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getFrameStatus = (frame: Frame) => {
    // Check if owned
    const isOwned = profile.ownedFrameIds.includes(frame.id);
    // Check if VIP automatically unlocks it
    const vipLevels = ['NONE', 'VIP', 'SSVIP', 'ULTRA_INFINITY', 'LIFETIME', 'MODERATOR'];
    const userVipIndex = vipLevels.indexOf(vipLevel);
    // Adjust logic: Lifetime covers all
    if (vipLevel === 'LIFETIME' || vipLevel === 'MODERATOR') return 'OWNED';

    const requiredVipIndex = frame.requiredVip ? vipLevels.indexOf(frame.requiredVip) : -1;
    
    // If VIP requirement is met, consider it owned
    if (frame.type === 'VIP_UNLOCK' && userVipIndex >= requiredVipIndex) {
        return 'OWNED';
    }

    if (isOwned) return 'OWNED';
    return 'LOCKED';
  };

  const currentFrame = AVAILABLE_FRAMES.find(f => f.id === profile.currentFrameId) || AVAILABLE_FRAMES[0];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Section: Avatar & Info */}
      <div className="bg-[#131B2C] rounded-3xl p-8 border border-gray-800 shadow-2xl flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-4 opacity-10">
            <Crown size={120} />
         </div>

         <div className="relative group">
            <div className={`w-32 h-32 rounded-full overflow-hidden ${currentFrame.cssClass} transition-all duration-300`}>
               <img 
                 src={profile.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"} 
                 alt="Avatar" 
                 className="w-full h-full object-cover"
               />
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-purple-600 p-2 rounded-full text-white shadow-lg hover:scale-110 transition-transform"
            >
              <Camera size={16} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
            />
         </div>

         <div className="text-center md:text-left z-10">
            <h2 className="text-3xl font-bold text-white mb-2">Hồ Sơ Của Bạn</h2>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
               <span className={`px-3 py-1 rounded-full text-xs font-bold border ${vipLevel === 'ULTRA_INFINITY' ? 'border-purple-500 text-purple-400' : 'border-gray-600 text-gray-400'}`}>
                 {vipLevel.replace('_', ' ')}
               </span>
               <span className="px-3 py-1 rounded-full text-xs font-bold border border-yellow-500 text-yellow-500 flex items-center gap-1">
                 {formatStarBalance(credits)} <Star size={10} fill="currentColor" />
               </span>
            </div>
            <p className="text-gray-400 mt-4 text-sm max-w-md">
               Quản lý thông tin cá nhân và bộ sưu tập khung của bạn tại đây.
            </p>
         </div>
      </div>

      {/* Frame Shop Section - Distinct Look */}
      <div className="bg-gray-900/50 rounded-3xl border border-gray-700 p-6 shadow-inner">
         <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-4">
             <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <ShoppingBag className="text-pink-500" /> Cửa Hàng Khung Avatar
             </h3>
             <span className="text-xs text-gray-400">Dùng Sao hoặc xem QC để mua khung</span>
         </div>
         
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {AVAILABLE_FRAMES.map((frame) => {
               const status = getFrameStatus(frame);
               const isEquipped = profile.currentFrameId === frame.id || (status === 'OWNED' && profile.currentFrameId === frame.id);

               return (
                  <div key={frame.id} className="bg-[#131B2C] border border-gray-800 rounded-2xl p-6 flex flex-col items-center relative hover:border-pink-500/30 transition-colors group">
                     {isEquipped && (
                        <div className="absolute top-4 right-4 text-green-500 bg-green-900/20 p-1 rounded-full">
                           <Check size={16} />
                        </div>
                     )}

                     <div className={`w-20 h-20 rounded-full bg-gray-900 mb-4 ${frame.cssClass} group-hover:scale-105 transition-transform`}></div>
                     
                     <h4 className="text-lg font-bold text-white">{frame.name}</h4>
                     <p className="text-xs text-gray-500 text-center mb-4 h-8">{frame.description}</p>

                     {isEquipped ? (
                        <button disabled className="w-full py-2 rounded-lg bg-green-500/20 text-green-400 text-sm font-bold cursor-default">
                           Đang Sử Dụng
                        </button>
                     ) : status === 'OWNED' ? (
                        <Button onClick={() => onEquipFrame(frame.id)} variant="secondary" className="w-full py-2 text-sm">
                           Trang Bị
                        </Button>
                     ) : (
                        // ACTION BUTTONS BASED ON TYPE
                        <>
                           {frame.type === 'STAR_BUY' && (
                              <Button 
                                onClick={() => onBuyFrame(frame)} 
                                disabled={credits < (frame.cost || 0)}
                                className="w-full py-2 text-sm"
                              >
                                 Mua {frame.cost} ⭐
                              </Button>
                           )}
                           {frame.type === 'VIP_UNLOCK' && (
                              <div className="w-full py-2 rounded-lg bg-gray-800 text-gray-500 text-sm font-bold text-center border border-gray-700 flex items-center justify-center gap-2">
                                 <Lock size={14} /> VIP {frame.requiredVip}
                              </div>
                           )}
                           {frame.type === 'AD_WATCH' && (
                              <Button 
                                onClick={() => onWatchAd(frame)}
                                className="w-full py-2 text-sm bg-orange-600 hover:bg-orange-500"
                                icon={<PlayCircle size={14} />}
                              >
                                 Xem QC nhận
                              </Button>
                           )}
                        </>
                     )}
                  </div>
               );
            })}
         </div>
      </div>
    </div>
  );
};