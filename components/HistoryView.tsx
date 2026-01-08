import React from 'react';
import { ProcessedHistoryItem, VipLevel } from '../types';
import { Trash2, Clock, HardDrive, ArrowRight, MousePointer2, AlertTriangle, Cloud } from 'lucide-react';
import { Button } from './Button';

interface HistoryViewProps {
  history: ProcessedHistoryItem[];
  onSelect: (item: ProcessedHistoryItem) => void;
  onClear: () => void;
  onDeleteItem: (id: string) => void;
  vipLevel: VipLevel;
  maxStorageBytes: number;
  usedStorageBytes: number;
  onOpenShop: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ 
  history, 
  onSelect, 
  onClear, 
  onDeleteItem,
  vipLevel,
  maxStorageBytes,
  usedStorageBytes,
  onOpenShop
}) => {
  
  // Format bytes to MB
  const toMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2);
  const percentage = Math.min(100, (usedStorageBytes / maxStorageBytes) * 100);
  
  const getStorageColor = () => {
      if (percentage > 90) return 'bg-red-500';
      if (percentage > 70) return 'bg-yellow-500';
      return 'bg-green-500';
  };

  const getLimitLabel = () => {
     if (maxStorageBytes >= 100 * 1024 * 1024) return "100 MB (ULTRA)";
     if (maxStorageBytes >= 30 * 1024 * 1024) return "30 MB (SSVIP)";
     if (maxStorageBytes >= 10 * 1024 * 1024) return "10 MB (VIP)";
     return "2 MB (MEMBER)";
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header & Storage Info */}
      <div className="bg-[#131B2C] border border-gray-800 rounded-3xl p-6 shadow-xl animate-in fade-in slide-in-from-top-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 <Clock className="text-cyan-400" /> Lịch Sử Đã Tách
             </h2>
             <div className="flex items-center gap-3">
                 {history.length > 0 && (
                     <Button variant="danger" onClick={onClear} className="py-2 px-4 text-xs h-9" icon={<Trash2 size={14}/>}>
                         Xóa Tất Cả
                     </Button>
                 )}
             </div>
          </div>

          {/* Storage Bar */}
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
              <div className="flex justify-between items-end mb-2">
                  <div className="flex items-center gap-2">
                      <Cloud size={16} className={percentage > 90 ? 'text-red-500 animate-pulse' : 'text-blue-400'} />
                      <span className="text-xs text-gray-400 font-medium">Lưu trữ đám mây</span>
                  </div>
                  <div className="text-right">
                      <span className={`text-sm font-bold ${percentage > 90 ? 'text-red-400' : 'text-white'}`}>
                          {toMB(usedStorageBytes)} MB
                      </span>
                      <span className="text-xs text-gray-500"> / {toMB(maxStorageBytes)} MB</span>
                  </div>
              </div>
              
              <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-600 relative">
                  <div 
                      className={`h-full ${getStorageColor()} transition-all duration-500 relative`} 
                      style={{ width: `${percentage}%` }}
                  >
                      {/* Scanline effect */}
                      <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
                  </div>
              </div>

              <div className="mt-3 flex justify-between items-center">
                  <div className="text-[10px] text-gray-500">
                      Gói hiện tại: <span className="text-yellow-500 font-bold">{vipLevel}</span> • Giới hạn: {getLimitLabel()}
                  </div>
                  {vipLevel === 'NONE' || vipLevel === 'VIP' ? (
                      <button onClick={onOpenShop} className="text-[10px] text-purple-400 hover:text-purple-300 underline flex items-center gap-1">
                          <HardDrive size={10} /> Nâng cấp để lưu nhiều hơn
                      </button>
                  ) : null}
              </div>
          </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0f1522] rounded-3xl p-4 border border-gray-800 relative min-h-[400px]">
          {history.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 opacity-50">
                  <Clock size={64} className="mb-4" />
                  <p>Chưa có lịch sử nào.</p>
              </div>
          ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {history.map((item) => (
                      <div 
                          key={item.id} 
                          className="group relative bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-all hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] cursor-pointer"
                          onClick={() => onSelect(item)}
                      >
                          {/* Image Thumbnail (Split View) */}
                          <div className="aspect-square relative flex">
                              <div className="w-1/2 h-full border-r border-gray-700 overflow-hidden relative">
                                  <img src={item.originalImage.previewUrl} className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 transition-all" alt="Orig" />
                                  <span className="absolute bottom-1 left-1 text-[8px] bg-black/50 text-white px-1 rounded">Gốc</span>
                              </div>
                              <div className="w-1/2 h-full overflow-hidden relative">
                                  <img src={item.resultImage} className="w-full h-full object-cover bg-[url('https://assets.codepen.io/1480814/checkerboard.svg')] bg-center" alt="Result" />
                                  <span className="absolute bottom-1 right-1 text-[8px] bg-green-600/80 text-white px-1 rounded">Đã tách</span>
                              </div>
                              
                              {/* Hover Overlay */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <div className="bg-cyan-600 text-white p-2 rounded-full shadow-lg transform scale-0 group-hover:scale-100 transition-transform">
                                      <MousePointer2 size={20} />
                                  </div>
                              </div>
                          </div>

                          {/* Info Footer */}
                          <div className="p-3 bg-gray-800 relative">
                              <div className="flex justify-between items-start mb-1">
                                  <span className="text-[10px] text-gray-400 bg-gray-700 px-1.5 py-0.5 rounded">{item.resolution}</span>
                                  <span className="text-[10px] text-gray-500">{new Date(item.timestamp).toLocaleDateString()}</span>
                              </div>
                              <p className="text-xs text-gray-300 truncate font-medium mb-1" title={item.prompt}>
                                  {item.prompt.substring(0, 20)}...
                              </p>
                              <div className="text-[10px] text-gray-600 flex justify-between items-center">
                                  <span>{toMB(item.sizeBytes)} MB</span>
                              </div>

                              <button 
                                  onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                                  className="absolute top-2 right-2 p-1.5 text-gray-500 hover:text-cyan-400 hover:bg-gray-700 rounded-full transition-colors"
                                  title="Xóa ảnh này"
                              >
                                  <Trash2 size={12} />
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>
    </div>
  );
};
