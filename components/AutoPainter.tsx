import React, { useState } from 'react';
import { UploadedFile, VipLevel } from '../types';
import { ImageUploader } from './ImageUploader';
import { Button } from './Button';
import { generateArtisticImage } from '../services/geminiService';
import { Wand2, Sliders, Lock, Download, RefreshCw, Palette } from 'lucide-react';

interface AutoPainterProps {
    vipLevel: VipLevel;
    onOpenShop: () => void;
}

const STYLES = [
    { id: 'oil_painting', name: 'Tranh Sơn Dầu (Oil)', desc: 'Cổ điển, nét cọ dày' },
    { id: 'pencil_sketch', name: 'Phác Thảo Chì', desc: 'Đen trắng, chi tiết' },
    { id: 'watercolor', name: 'Màu Nước (Watercolor)', desc: 'Mềm mại, loang màu' },
    { id: 'cyberpunk', name: 'Cyberpunk Neon', desc: 'Tương lai, màu rực rỡ' },
    { id: 'ghibli', name: 'Anime Ghibli', desc: 'Hoạt hình Nhật Bản' },
    { id: '3d_render', name: '3D Render', desc: 'Chân thực, bóng bẩy' },
    { id: 'pixel_art', name: 'Pixel Art', desc: 'Retro game 8-bit' },
    { id: 'van_gogh', name: 'Phong cách Van Gogh', desc: 'Xoáy ốc, ấn tượng' }
];

export const AutoPainter: React.FC<AutoPainterProps> = ({ vipLevel, onOpenShop }) => {
    const isLocked = vipLevel !== 'LIFETIME';
    
    const [uploadedImage, setUploadedImage] = useState<UploadedFile | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Settings
    const [style, setStyle] = useState(STYLES[0].id);
    const [detailLevel, setDetailLevel] = useState(99);
    const [creativity, setCreativity] = useState(30);
    const [customPrompt, setCustomPrompt] = useState('');

    const handleGenerate = async () => {
        if (!uploadedImage) return;
        
        // Safety check for API key
        if (window.aistudio) {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                await window.aistudio.openSelectKey();
                return;
            }
        }

        setIsProcessing(true);
        setError(null);
        setResultImage(null);

        try {
            const result = await generateArtisticImage(
                uploadedImage.base64,
                uploadedImage.mimeType,
                {
                    style: STYLES.find(s => s.id === style)?.name || style,
                    detailLevel,
                    creativity,
                    customPrompt
                }
            );
            setResultImage(result);
        } catch (err: any) {
            setError(err.message || "Lỗi khi tạo tranh.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!resultImage) return;
        const link = document.createElement('a');
        link.href = resultImage;
        link.download = `autopaint-${style}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLocked) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center p-8 text-center bg-[#131B2C] rounded-3xl border border-gray-800 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                    <Lock className="w-24 h-24 text-red-500 mb-6 animate-pulse" />
                    <h2 className="text-3xl font-black text-white mb-2">TÍNH NĂNG KHÓA</h2>
                    <p className="text-gray-300 max-w-md mb-8">
                        Công cụ "Họa Sĩ AI Tự Động" (Auto Painter) chỉ dành riêng cho thành viên gói <span className="text-red-500 font-bold">LIFETIME (Trọn Đời)</span>.
                    </p>
                    <Button onClick={onOpenShop} className="animate-bounce">
                        Nâng Cấp Ngay
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="grid lg:grid-cols-12 gap-6 h-full">
            {/* LEFT: Controls */}
            <div className="lg:col-span-4 space-y-6">
                <div className="bg-[#131B2C] border border-gray-800 rounded-3xl p-6 shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Palette className="text-purple-400" /> Thiết Lập Tranh
                    </h2>

                    {/* Image Upload */}
                    {!uploadedImage ? (
                         <div className="mb-6">
                            <ImageUploader onUpload={setUploadedImage} />
                         </div>
                    ) : (
                        <div className="mb-6 relative group rounded-xl overflow-hidden aspect-video bg-black/50 border border-gray-700">
                             <img src={uploadedImage.previewUrl} alt="Source" className="w-full h-full object-contain" />
                             <button 
                                onClick={() => { setUploadedImage(null); setResultImage(null); }}
                                className="absolute top-2 right-2 p-2 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                                 <RefreshCw size={16} />
                             </button>
                        </div>
                    )}

                    <div className="space-y-5">
                        {/* Style Selector */}
                        <div>
                            <label className="text-sm font-medium text-gray-400 mb-2 block">Phong cách vẽ</label>
                            <div className="grid grid-cols-2 gap-2">
                                {STYLES.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => setStyle(s.id)}
                                        className={`p-3 rounded-xl text-left border transition-all ${
                                            style === s.id 
                                            ? 'bg-purple-600/20 border-purple-500 text-white' 
                                            : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'
                                        }`}
                                    >
                                        <div className="font-bold text-xs">{s.name}</div>
                                        <div className="text-[10px] opacity-70 truncate">{s.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sliders */}
                        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800 space-y-4">
                            <div>
                                <div className="flex justify-between text-xs mb-2">
                                    <span className="text-gray-300">Độ chi tiết (Details)</span>
                                    <span className="text-purple-400 font-bold">{detailLevel}%</span>
                                </div>
                                <input 
                                    type="range" min="1" max="100" value={detailLevel} 
                                    onChange={(e) => setDetailLevel(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between text-xs mb-2">
                                    <span className="text-gray-300">Sự sáng tạo (Creativity)</span>
                                    <span className="text-purple-400 font-bold">{creativity}%</span>
                                </div>
                                <input 
                                    type="range" min="0" max="100" value={creativity} 
                                    onChange={(e) => setCreativity(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                            </div>
                        </div>

                        {/* Custom Prompt */}
                        <div>
                            <label className="text-sm font-medium text-gray-400 mb-2 block">Ghi chú thêm (Tùy chọn)</label>
                            <textarea 
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                placeholder="VD: Thêm ánh trăng, làm tối nền, thêm hoa..."
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:border-purple-500 outline-none h-20 resize-none"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300 text-xs">
                                {error}
                            </div>
                        )}

                        <Button 
                            onClick={handleGenerate} 
                            disabled={!uploadedImage || isProcessing}
                            isLoading={isProcessing}
                            className="w-full py-4 text-lg font-bold shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                            icon={<Wand2 className="w-5 h-5" />}
                        >
                            {isProcessing ? 'Đang Vẽ...' : 'Vẽ Tranh Ngay'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* RIGHT: Result Canvas */}
            <div className="lg:col-span-8">
                <div className="h-full bg-[#131B2C] border border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white">Kết Quả Tác Phẩm</h2>
                        {resultImage && (
                            <Button onClick={handleDownload} variant="secondary" icon={<Download size={16} />} className="py-2 text-sm">
                                Lưu Tranh
                            </Button>
                        )}
                    </div>
                    
                    <div className="flex-1 bg-black/40 rounded-2xl border-2 border-dashed border-gray-700 relative flex items-center justify-center overflow-hidden min-h-[400px]">
                        {!uploadedImage ? (
                            <div className="text-center opacity-30">
                                <Palette size={64} className="mx-auto mb-4" />
                                <p>Chọn ảnh và nhấn vẽ để bắt đầu</p>
                            </div>
                        ) : isProcessing ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
                                <div className="w-24 h-24 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-purple-300 animate-pulse text-lg font-bold">AI đang phác thảo...</p>
                                <p className="text-gray-500 text-xs mt-2">Đang áp dụng style: {STYLES.find(s => s.id === style)?.name}</p>
                            </div>
                        ) : resultImage ? (
                            <img src={resultImage} alt="Result" className="w-full h-full object-contain animate-in fade-in zoom-in duration-700" />
                        ) : (
                            <div className="text-center opacity-50">
                                <p>Ảnh gốc đã sẵn sàng. Hãy điều chỉnh và nhấn Vẽ!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
