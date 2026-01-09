import React, { useState } from 'react';
import { X, Star, CheckCircle, Crown, Zap, Infinity, ShieldCheck, UserCog, Calendar, Clock, CreditCard } from 'lucide-react';
import { VipLevel } from '../types';
import { Button } from './Button';

interface StarShopProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (itemType: 'CREDIT' | 'VIP', amountOrDuration: number, level: VipLevel | null, pricePaid: number) => void;
  currentVipLevel: VipLevel;
}

type ShopTab = 'STARS' | 'VIP';

// --- STAR PACKAGES (CREDITS ONLY) ---
const STAR_PACKAGES = [
    { stars: 50, price: 20000, label: 'Gói Tập Sự', bonus: 0 },
    { stars: 300, price: 100000, label: 'Gói Phổ Thông', bonus: 0 },
    { stars: 1500, price: 450000, label: 'Gói Cao Cấp', bonus: 100 },
    { stars: 5000, price: 1200000, label: 'Gói Đại Gia', bonus: 500 },
    { stars: 20000, price: 4000000, label: 'Gói Tỷ Phú', bonus: 2000 },
];

// --- VIP SUBSCRIPTIONS ---
// Base Monthly Prices (Calculated as ~50% of old lifetime prices for Month)
// VIP Old: 120k -> Month: 60k
// SSVIP Old: 465k -> Month: 230k
// ULTRA Old: 999k -> Month: 500k
const VIP_TIERS = [
    {
        id: 'vip',
        level: 'VIP' as VipLevel,
        name: 'VIP MEMBER',
        icon: <Crown className="w-6 h-6 text-blue-400" />,
        color: 'from-blue-500 to-cyan-500',
        features: ['Mở khóa ảnh 2K', 'Hỗ trợ ưu tiên', 'Icon VIP xanh'],
        prices: {
            day: 5000,
            month: 60000,
            year: 600000
        }
    },
    {
        id: 'ssvip',
        level: 'SSVIP' as VipLevel,
        name: 'SSVIP ELITE',
        icon: <Zap className="w-6 h-6 text-yellow-400" />,
        color: 'from-yellow-500 to-amber-600',
        features: ['Mở khóa ảnh 4K', 'Viền Avatar Vàng', 'Sale 5% gói NKD', 'Xử lý nhanh'],
        prices: {
            day: 15000,
            month: 230000,
            year: 2300000
        }
    },
    {
        id: 'ultra',
        level: 'ULTRA_INFINITY' as VipLevel,
        name: 'ULTRA INFINITY',
        icon: <Infinity className="w-6 h-6 text-purple-400" />,
        color: 'from-purple-600 to-pink-600',
        features: ['Mở khóa ảnh 8K', 'Viền Cầu Vồng', 'Sale 15% gói NKD', 'Hỗ trợ 1-1'],
        prices: {
            day: 30000,
            month: 500000,
            year: 5000000
        }
    }
];

// Moderator Package (Separate because only Year)
const MODERATOR_PKG = {
    level: 'MODERATOR' as VipLevel,
    name: 'NGƯỜI KIỂM DUYỆT',
    price: 34567890,
    durationLabel: '1 Năm',
    durationDays: 365,
    features: ['Quyền hạn 30% Admin', 'Truy cập Admin Panel', 'Buff Sao (Max 1000)', 'Danh hiệu QTV'],
    color: 'from-emerald-500 to-green-700'
};

export const StarShop: React.FC<StarShopProps> = ({ isOpen, onClose, onPurchase, currentVipLevel }) => {
  const [activeTab, setActiveTab] = useState<ShopTab>('STARS');
  const [selectedDuration, setSelectedDuration] = useState<'day' | 'month' | 'year'>('month');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmItem, setConfirmItem] = useState<any>(null); // To show payment modal

  if (!isOpen) return null;

  const handleBuyStars = (pkg: typeof STAR_PACKAGES[0]) => {
      setConfirmItem({
          type: 'CREDIT',
          data: pkg,
          price: pkg.price,
          name: `${pkg.stars} Sao (+${pkg.bonus})`
      });
  };

  const handleBuyVip = (tier: typeof VIP_TIERS[0]) => {
      const price = tier.prices[selectedDuration];
      let durationDays = 1;
      if (selectedDuration === 'month') durationDays = 30;
      if (selectedDuration === 'year') durationDays = 365;

      setConfirmItem({
          type: 'VIP',
          data: { ...tier, duration: durationDays },
          price: price,
          name: `Gói ${tier.name} (${selectedDuration === 'day' ? '1 Ngày' : selectedDuration === 'month' ? '1 Tháng' : '1 Năm'})`
      });
  };

  const handleBuyModerator = () => {
      setConfirmItem({
          type: 'VIP',
          data: { level: MODERATOR_PKG.level, duration: 365 },
          price: MODERATOR_PKG.price,
          name: `Gói ${MODERATOR_PKG.name} (1 Năm)`
      });
  };

  const processPayment = () => {
      if (!confirmItem) return;
      setIsProcessing(true);
      setTimeout(() => {
          if (confirmItem.type === 'CREDIT') {
              onPurchase('CREDIT', confirmItem.data.stars + confirmItem.data.bonus, null, confirmItem.price);
          } else {
              onPurchase('VIP', confirmItem.data.duration, confirmItem.data.level, confirmItem.price);
          }
          setIsProcessing(false);
          setConfirmItem(null);
          onClose();
      }, 2000);
  };

  // --- RENDER FUNCTIONS ---

  const renderStarsTab = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-right-4">
          {STAR_PACKAGES.map((pkg, idx) => (
              <div key={idx} className="bg-gray-900 border border-gray-700 rounded-2xl p-6 hover:border-yellow-500/50 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Star size={80} />
                  </div>
                  <div className="relative z-10">
                      <h3 className="text-gray-400 font-bold text-sm mb-1">{pkg.label}</h3>
                      <div className="flex items-end gap-1 mb-4">
                          <span className="text-3xl font-black text-white">{pkg.stars.toLocaleString()}</span>
                          <Star className="text-yellow-400 fill-yellow-400 mb-1" size={20} />
                          {pkg.bonus > 0 && <span className="text-xs text-green-400 font-bold mb-1 ml-2">+{pkg.bonus} bonus</span>}
                      </div>
                      <Button 
                        onClick={() => handleBuyStars(pkg)}
                        className="w-full bg-gray-800 hover:bg-yellow-600 hover:text-white border-none"
                      >
                          {pkg.price.toLocaleString()} VND
                      </Button>
                  </div>
              </div>
          ))}
      </div>
  );

  const renderVipTab = () => (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
          
          {/* Duration Selector */}
          <div className="flex justify-center mb-6">
              <div className="bg-gray-900 p-1 rounded-xl flex gap-1 border border-gray-700">
                  {(['day', 'month', 'year'] as const).map(d => (
                      <button
                        key={d}
                        onClick={() => setSelectedDuration(d)}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                            selectedDuration === d 
                            ? 'bg-purple-600 text-white shadow-lg' 
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                      >
                          {d === 'day' ? 'Theo Ngày' : d === 'month' ? 'Theo Tháng' : 'Theo Năm'}
                      </button>
                  ))}
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {VIP_TIERS.map((tier) => (
                  <div key={tier.id} className={`bg-gray-900 border border-gray-700 rounded-2xl p-0 overflow-hidden hover:border-gray-500 transition-all flex flex-col`}>
                      <div className={`h-2 bg-gradient-to-r ${tier.color}`} />
                      <div className="p-6 flex-1 flex flex-col">
                          <div className="flex items-center gap-3 mb-4">
                              <div className="p-2 bg-gray-800 rounded-lg">{tier.icon}</div>
                              <h3 className="font-bold text-lg text-white">{tier.name}</h3>
                          </div>
                          
                          <div className="mb-6">
                              <span className="text-2xl font-black text-white">
                                  {tier.prices[selectedDuration].toLocaleString()} 
                              </span>
                              <span className="text-xs text-gray-500 ml-1">VND</span>
                          </div>

                          <ul className="space-y-3 mb-8 flex-1">
                              {tier.features.map((f, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                                      <CheckCircle size={14} className="text-green-500 shrink-0" /> {f}
                                  </li>
                              ))}
                          </ul>

                          <Button onClick={() => handleBuyVip(tier)} className={`w-full bg-gradient-to-r ${tier.color}`}>
                              Nâng Cấp
                          </Button>
                      </div>
                  </div>
              ))}
          </div>

          {/* Moderator Section */}
          <div className="mt-8 border-t border-gray-800 pt-8">
              <div className="bg-gradient-to-r from-emerald-900/40 to-black border border-emerald-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors"></div>
                  <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-2">
                          <UserCog className="text-emerald-400 w-8 h-8" />
                          <h3 className="text-2xl font-black text-white">{MODERATOR_PKG.name}</h3>
                      </div>
                      <p className="text-emerald-200 text-sm mb-4">Gói quyền lực dành cho quản trị viên tập sự.</p>
                      <ul className="grid grid-cols-2 gap-x-8 gap-y-2">
                          {MODERATOR_PKG.features.map((f, i) => (
                              <li key={i} className="flex items-center gap-2 text-xs text-gray-400">
                                  <ShieldCheck size={12} className="text-emerald-500" /> {f}
                              </li>
                          ))}
                      </ul>
                  </div>
                  <div className="relative z-10 text-right">
                      <div className="text-3xl font-black text-emerald-400 mb-1">{MODERATOR_PKG.price.toLocaleString()}</div>
                      <div className="text-xs text-gray-500 mb-4">VND / Năm</div>
                      
                      {/* Discount Logic Display */}
                      {['SSVIP', 'ULTRA_INFINITY', 'LIFETIME'].includes(currentVipLevel) && (
                           <div className="text-xs text-yellow-400 mb-2 font-bold animate-pulse">
                               Bạn được giảm giá theo cấp bậc!
                           </div>
                      )}

                      <Button onClick={handleBuyModerator} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20">
                          Đăng Ký Ngay
                      </Button>
                  </div>
              </div>
          </div>
      </div>
  );

  const renderPaymentModal = () => {
      if (!confirmItem) return null;
      return (
          <div className="absolute inset-0 z-50 bg-[#0f1522] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto w-full">
                  <h3 className="text-2xl font-bold text-white mb-8 border-b border-gray-800 pb-4 w-full">Xác Nhận Thanh Toán</h3>
                  
                  <div className="bg-gray-900 w-full rounded-2xl p-6 border border-gray-800 mb-8">
                      <div className="flex justify-between items-center mb-4">
                          <span className="text-gray-400">Sản phẩm</span>
                          <span className="font-bold text-white text-lg">{confirmItem.name}</span>
                      </div>
                      <div className="flex justify-between items-center mb-4">
                          <span className="text-gray-400">Giá trị</span>
                          <span className="font-bold text-green-400 text-xl">{confirmItem.price.toLocaleString()} VND</span>
                      </div>
                      <div className="h-px bg-gray-800 my-4"></div>
                      <div className="text-left space-y-3 text-sm text-gray-300">
                          <p>Ngân hàng: <span className="text-white font-bold">MB Bank</span></p>
                          <p>STK: <span className="text-yellow-400 font-bold font-mono text-lg">86869999269999</span></p>
                          <p>Chủ TK: <span className="text-white font-bold">SAM BA VUONG</span></p>
                          <p>Nội dung: <span className="text-blue-400 font-bold">MUA {confirmItem.type === 'VIP' ? confirmItem.data.level : 'CREDIT'}</span></p>
                      </div>
                  </div>

                  <div className="flex gap-4 w-full">
                      <Button variant="secondary" onClick={() => setConfirmItem(null)} className="flex-1">Hủy</Button>
                      <Button onClick={processPayment} isLoading={isProcessing} className="flex-1">Xác Nhận CK</Button>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-[#0f1522] w-full max-w-5xl rounded-3xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] h-[800px]">
        {/* Header with Tabs */}
        <div className="bg-[#131B2C] p-4 flex flex-col md:flex-row items-center justify-between border-b border-gray-800 gap-4">
            <div className="flex gap-2 bg-gray-900 p-1 rounded-xl">
                <button
                    onClick={() => setActiveTab('STARS')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${activeTab === 'STARS' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                    <Star size={18} /> Cửa Hàng Sao
                </button>
                <button
                    onClick={() => setActiveTab('VIP')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${activeTab === 'VIP' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    <Crown size={18} /> Nâng Cấp VIP
                </button>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white">
                <X size={24} />
            </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 relative">
            {activeTab === 'STARS' ? renderStarsTab() : renderVipTab()}
        </div>
        
        {/* Payment Modal Overlay - Moved outside scrollable area to overlay correctly */}
        {renderPaymentModal()}
      </div>
    </div>
  );
};