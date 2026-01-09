import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { Button } from './components/Button';
import { UploadedFile, AppState, Resolution, User, ProcessedHistoryItem } from './types';
import { generateSeparatedImage } from './services/geminiService';
import { ImageComparison } from './components/ImageComparison';
import { StarShop } from './components/StarShop';
import { Sidebar } from './components/Sidebar';
import { FreeDraw } from './components/FreeDraw';
import { ProfileView } from './components/ProfileView';
import { Auth } from './components/Auth';
import { AdminPanel } from './components/AdminPanel';
import { AutoPainter } from './components/AutoPainter';
import { AdminChat } from './components/AdminChat';
import { PublicChat } from './components/PublicChat';
import { HistoryView } from './components/HistoryView';
import { Wand2, Download, RefreshCw, Layers, Sparkles, Undo2, Redo2, Star, Menu, LogOut, Box, Key, AlertTriangle, ArrowDownCircle, Save } from 'lucide-react';

// Declare global interface for AI Studio
declare global {
  interface AIStudio {
    openSelectKey: () => Promise<void>;
    hasSelectedApiKey: () => Promise<boolean>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const SUGGESTED_PROMPTS = [
  { 
    label: "Tách quần áo & Tóc (Chuẩn)", 
    value: "Ghost mannequin effect. High-quality fashion photography editing. ISOLATE the clothing and the hairstyle completely. REMOVE the model's skin, face, body, arms, legs, and background entirely. The hair should remain floating in position relative to the clothes. The clothes should retain their 3D shape and volume. Solid white background." 
  },
  { 
    label: "Chỉ lấy trang phục (Bỏ tóc)", 
    value: "Ghost mannequin effect. Remove the person, body, skin, face, and hair. Keep only the outfit/clothing floating in 3D space. Solid white background." 
  },
  { 
    label: "Tách phụ kiện & Hiệu ứng", 
    value: "Isolate the glowing weapon, armor pieces, and special effects only. Remove the character body and background. Solid black background for contrast." 
  },
  {
    label: "Giữ nguyên đầu, xóa người",
    value: "Keep the character's head and hair completely intact. Remove the body and clothes below the neck. Floating head effect."
  }
];

const RESOLUTIONS: Resolution[] = ['480p', '720p', '1040p', '1240p', '1440p', '2K', '4K', '8K'];

// Cost Map
const COST_MAP: Record<Resolution, number> = {
  '480p': 2, '720p': 4, '1040p': 8, '1240p': 10, '1440p': 13, '2K': 20, '4K': 28, '8K': 36
};

// STORAGE LIMITS (Bytes)
const STORAGE_LIMITS: Record<string, number> = {
    'NONE': 2 * 1024 * 1024,
    'VIP': 10 * 1024 * 1024,
    'SSVIP': 30 * 1024 * 1024,
    'ULTRA_INFINITY': 100 * 1024 * 1024,
    'LIFETIME': 500 * 1024 * 1024,
    'MODERATOR': 500 * 1024 * 1024
};

// Prompt mặc định
const DEFAULT_PROMPT = "Ghost mannequin effect. High-quality fashion photography editing. ISOLATE the clothing and the hairstyle completely. REMOVE the model's skin, face, body, arms, legs, and background entirely. The hair should remain floating in position relative to the clothes. The clothes should retain their 3D shape and volume. Solid white background.";

const STORAGE_KEY_PROMPT = 'styleExtract_prompt';
const STORAGE_KEY_RES = 'styleExtract_resolution';
const STORAGE_KEY_HISTORY = 'styleExtract_history';
const STORAGE_KEY_API = 'styleExtract_custom_api_key';

export const formatStarBalance = (num: number) => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + ' T';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + ' Tr';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + ' N';
    return num.toLocaleString();
};

interface HistoryState {
  prompt: string;
  resolution: Resolution;
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [uploadedImage, setUploadedImage] = useState<UploadedFile | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState('HOME');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  
  // Settings
  const [prompt, setPrompt] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_PROMPT) || DEFAULT_PROMPT;
  });
  
  const [resolution, setResolution] = useState<Resolution>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_RES);
    return (saved && RESOLUTIONS.includes(saved as Resolution)) 
      ? (saved as Resolution) 
      : '1040p';
  });

  const [showShop, setShowShop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasAiStudio, setHasAiStudio] = useState(false);
  
  // Custom API Key State
  const [userApiKey, setUserApiKey] = useState(() => {
      return localStorage.getItem(STORAGE_KEY_API) || '';
  });
  
  const [history, setHistory] = useState<HistoryState[]>([
    { prompt: prompt, resolution: resolution }
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const [processedHistory, setProcessedHistory] = useState<ProcessedHistoryItem[]>([]);

  const progressInterval = useRef<number | null>(null);

  // Check for AI Studio environment
  useEffect(() => {
    if (typeof window !== 'undefined' && window.aistudio) {
      setHasAiStudio(true);
    }
  }, []);

  // Save Custom Key
  const handleSaveKey = () => {
      localStorage.setItem(STORAGE_KEY_API, userApiKey);
      setNeedsApiKey(false);
      handleGenerate(); // Retry immediately
  };

  // Auto-Login Check
  useEffect(() => {
    const rememberedUsername = localStorage.getItem('styleExtract_remember_user');
    if (rememberedUsername && !currentUser) {
        const usersStr = localStorage.getItem('styleExtract_users_db');
        if (usersStr) {
            const users: User[] = JSON.parse(usersStr);
            const user = users.find(u => u.username === rememberedUsername);
            if (user && user.status !== 'BANNED') {
                setCurrentUser(user);
            }
        }
    }
  }, []);

  // Load History
  useEffect(() => {
      try {
          const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
          if (savedHistory) {
              setProcessedHistory(JSON.parse(savedHistory));
          }
      } catch (e) {
          console.error("Failed to load history", e);
      }
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => localStorage.setItem(STORAGE_KEY_PROMPT, prompt), [prompt]);
  useEffect(() => localStorage.setItem(STORAGE_KEY_RES, resolution), [resolution]);

  useEffect(() => {
    if (currentUser) {
      const usersStr = localStorage.getItem('styleExtract_users_db');
      const users: User[] = usersStr ? JSON.parse(usersStr) : [];
      const updatedUsers = users.map(u => u.username === currentUser.username ? currentUser : u);
      localStorage.setItem('styleExtract_users_db', JSON.stringify(updatedUsers));
    }
  }, [currentUser]);

  // Handle Progress Simulation
  useEffect(() => {
    if (appState === AppState.PROCESSING) {
      setProgress(0);
      const isPro = ['1240p', '1440p', '2K', '4K', '8K'].includes(resolution);
      const increment = isPro ? 0.4 : 1.2; 
      const intervalTime = 50; 

      progressInterval.current = window.setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return 95;
          return prev + Math.random() * increment;
        });
      }, intervalTime);

    } else if (appState === AppState.SUCCESS) {
      setProgress(100);
      if (progressInterval.current) clearInterval(progressInterval.current);
    } else {
      setProgress(0);
      if (progressInterval.current) clearInterval(progressInterval.current);
    }
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [appState, resolution]);

  const addToHistory = (newPrompt: string, newResolution: Resolution) => {
    const current = history[historyIndex];
    if (current.prompt === newPrompt && current.resolution === newResolution) return;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ prompt: newPrompt, resolution: newResolution });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = useCallback(() => {
    setHistoryIndex(prev => {
      if (prev > 0) {
        const newIndex = prev - 1;
        const state = history[newIndex];
        setPrompt(state.prompt);
        setResolution(state.resolution);
        return newIndex;
      }
      return prev;
    });
  }, [history]);

  const handleRedo = useCallback(() => {
    setHistoryIndex(prev => {
      if (prev < history.length - 1) {
        const newIndex = prev + 1;
        const state = history[newIndex];
        setPrompt(state.prompt);
        setResolution(state.resolution);
        return newIndex;
      }
      return prev;
    });
  }, [history]);

  const handleUpload = (file: UploadedFile) => {
    setUploadedImage(file);
    setResultImage(null);
    setAppState(AppState.IDLE);
    setError(null);
    setProgress(0);
  };

  const handleReset = () => {
    setUploadedImage(null);
    setResultImage(null);
    setPrompt(DEFAULT_PROMPT);
    setResolution('1040p'); 
    setAppState(AppState.IDLE);
    setError(null);
    setProgress(0);
  };

  const calculateTotalHistorySize = (items: ProcessedHistoryItem[]) => {
      return items.reduce((acc, item) => acc + item.sizeBytes, 0);
  };

  const handleGenerate = async () => {
    if (!uploadedImage || !currentUser) return;

    const cost = COST_MAP[resolution];
    if (currentUser.credits < cost) {
      setShowShop(true);
      return;
    }

    // --- API KEY CHECK ---
    const isHighRes = ['1240p', '1440p', '2K', '4K', '8K'].includes(resolution);
    
    // Only try to use aistudio if it exists AND no custom key is set
    if (isHighRes && window.aistudio && !userApiKey) {
       try {
           const hasKey = await window.aistudio.hasSelectedApiKey();
           if (!hasKey) {
              setNeedsApiKey(true);
              return;
           }
       } catch (e) {
           console.warn("Error checking API key:", e);
           // Fallthrough if check fails
       }
    }

    setNeedsApiKey(false);
    setAppState(AppState.PROCESSING);
    setError(null);

    try {
      // Pass userApiKey (can be empty, service will use env)
      const generatedImageBase64 = await generateSeparatedImage(
        uploadedImage.base64,
        uploadedImage.mimeType,
        prompt,
        resolution,
        userApiKey
      );
      
      setCurrentUser(prev => prev ? ({
          ...prev,
          credits: Math.max(0, prev.credits - cost)
      }) : null);

      setResultImage(generatedImageBase64);
      setAppState(AppState.SUCCESS);

      const newItem: ProcessedHistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          originalImage: {
              previewUrl: uploadedImage.previewUrl,
              base64: uploadedImage.base64,
              mimeType: uploadedImage.mimeType
          },
          resultImage: generatedImageBase64,
          prompt,
          resolution,
          sizeBytes: generatedImageBase64.length + uploadedImage.base64.length
      };
      
      let updatedHistory = [newItem, ...processedHistory];
      const maxBytes = STORAGE_LIMITS[currentUser.vipLevel];
      
      while (calculateTotalHistorySize(updatedHistory) > maxBytes && updatedHistory.length > 0) {
          updatedHistory.pop();
      }

      setProcessedHistory(updatedHistory);
      
      try {
          localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updatedHistory));
      } catch (e) {
          const sliced = updatedHistory.slice(0, 5);
          setProcessedHistory(sliced);
          localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(sliced));
      }

    } catch (err: any) {
      // Handle known key errors or quota
      const errMsg = err.message || "";
      if (errMsg.includes("API Key") || errMsg.includes("403") || errMsg.includes("Quota") || errMsg.includes("Rate Limit")) {
           setNeedsApiKey(true); // Trigger UI to ask for key
           if (errMsg.includes("Quota")) {
                setError("Hết lượt miễn phí. Vui lòng nhập Key riêng hoặc giảm độ phân giải.");
           } else {
                setError("API Key không hợp lệ hoặc đã hết hạn.");
           }
           setAppState(AppState.IDLE);
           return;
      }

      setError(errMsg || "Đã xảy ra lỗi không mong muốn.");
      setAppState(AppState.ERROR);
      setProgress(0);
    }
  };

  const handleSelectApiKey = async () => {
    if (window.aistudio?.openSelectKey) {
      try {
        await window.aistudio.openSelectKey();
        setNeedsApiKey(false);
        // Force a small delay to allow env propagation then retry
        setTimeout(() => handleGenerate(), 500);
      } catch (e) {
        console.error("Selection failed", e);
        alert("Không thể mở bảng chọn Key. Vui lòng thử lại.");
      }
    } else {
        alert("Trình duyệt của bạn không hỗ trợ tính năng này. Vui lòng sử dụng ô nhập Key bên dưới.");
    }
  };

  const downloadImage = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `style-extracted-${resolution}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const changeResolution = (res: Resolution) => {
    setResolution(res);
    addToHistory(prompt, res);
  };

  const selectPrompt = (val: string) => {
    setPrompt(val);
    addToHistory(val, resolution);
  };

  const handlePurchase = (itemType: 'CREDIT' | 'VIP', amountOrDuration: number, level: any, pricePaid: number) => {
    if (!currentUser) return;
    setCurrentUser(prev => {
        if (!prev) return null;
        let newCredits = prev.credits;
        let newVipLevel = prev.vipLevel;
        let newVipExpiry = prev.vipExpiry || Date.now();

        if (itemType === 'CREDIT') {
            newCredits += amountOrDuration;
        } else if (itemType === 'VIP' && level) {
            newVipLevel = level;
            newVipExpiry = Date.now() + (amountOrDuration * 24 * 60 * 60 * 1000);
        }
        return {
            ...prev,
            credits: newCredits,
            vipLevel: newVipLevel,
            vipExpiry: newVipExpiry,
            totalRecharged: (prev.totalRecharged || 0) + pricePaid
        };
    });
  };

  const handleHistorySelect = (item: ProcessedHistoryItem) => {
      setUploadedImage(item.originalImage);
      setResultImage(item.resultImage);
      setPrompt(item.prompt);
      setResolution(item.resolution);
      setAppState(AppState.SUCCESS);
      setCurrentView('HOME');
  };

  const handleHistoryDeleteOne = (id: string) => {
      const updated = processedHistory.filter(item => item.id !== id);
      setProcessedHistory(updated);
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
  };

  const handleUpdateAvatar = (url: string) => {
     setCurrentUser(prev => prev ? ({ ...prev, profile: { ...prev.profile, avatarUrl: url } }) : null);
  };

  const handleLogin = (user: User) => {
      setCurrentUser(user);
      setCurrentView('HOME');
  };

  const handleLogout = () => {
      localStorage.removeItem('styleExtract_remember_user');
      setCurrentUser(null);
  };

  const getContainerStyle = () => {
    if (!currentUser) return "mythical-container";
    switch(currentUser.vipLevel) {
        case 'MODERATOR': return "mythical-container moderator-border";
        case 'LIFETIME': return "mythical-container lifetime-border";
        case 'ULTRA_INFINITY': return "mythical-container ultra-border";
        case 'SSVIP': return "mythical-container ssvip-border";
        case 'VIP': return "mythical-container vip-border";
        default: return "mythical-container";
    }
  };

  if (!currentUser) {
      return <Auth onLogin={handleLogin} />;
  }

  // --- RENDER HOME ---
  const renderHome = () => (
    <div className="grid lg:grid-cols-2 gap-6 items-start animate-in fade-in duration-300">
      {/* Left Column */}
      <div className="space-y-6">
        {/* Upload Container */}
        <div className="bg-[#131B2C] border border-gray-800 rounded-3xl p-6 shadow-md relative overflow-hidden group">
           <div className="flex items-center gap-2 mb-4">
              <Layers className="text-purple-400 w-5 h-5"/>
              <h3 className="text-white font-bold text-lg">Ảnh Gốc</h3>
           </div>
           
           {!uploadedImage ? (
             <ImageUploader onUpload={handleUpload} />
           ) : (
             <div className="relative rounded-2xl overflow-hidden bg-black/40 aspect-square group border border-gray-700 shadow-md">
               <img src={uploadedImage.previewUrl} alt="Original" className="w-full h-full object-contain"/>
               <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <Button variant="secondary" onClick={handleReset} icon={<RefreshCw className="w-4 h-4" />}>
                   Chọn ảnh khác
                 </Button>
               </div>
             </div>
           )}
        </div>

        {/* Controls */}
        <div className={`bg-[#131B2C] border border-gray-800 rounded-3xl p-6 shadow-md ${!uploadedImage ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
           <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl text-white font-['Caveat'] flex items-center gap-2">
                 Separate Clothes AI 2.0
              </h2>
              <div className="flex gap-2">
                  <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 text-gray-400 hover:text-white bg-gray-900 rounded-lg disabled:opacity-30"><Undo2 size={16}/></button>
                  <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-2 text-gray-400 hover:text-white bg-gray-900 rounded-lg disabled:opacity-30"><Redo2 size={16}/></button>
              </div>
           </div>
          
           <div className="space-y-6">
             {/* Resolution Grid */}
             <div>
                <div className="grid grid-cols-4 gap-2">
                    {RESOLUTIONS.map((res) => (
                    <button
                        key={res}
                        onClick={() => changeResolution(res)}
                        className={`px-1 py-3 text-[10px] md:text-xs font-bold rounded-xl border transition-colors flex flex-col items-center justify-center gap-1 ${
                        resolution === res 
                        ? 'bg-[#A855F7] border-[#A855F7] text-white' 
                        : 'bg-[#1e293b] border-gray-700 text-gray-400 hover:bg-gray-800'
                        }`}
                    >
                        <span>{res}</span>
                        <span className="text-[9px] font-normal opacity-70">{COST_MAP[res]} Stars</span>
                    </button>
                    ))}
                </div>
             </div>

             <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">GỢI Ý PROMPT</label>
                <div className="flex flex-col gap-2">
                    {SUGGESTED_PROMPTS.map((p, idx) => (
                    <button key={idx} onClick={() => selectPrompt(p.value)} className="text-xs px-4 py-3 rounded-xl bg-[#1e293b] hover:bg-gray-800 text-gray-300 border border-gray-700 transition-colors text-left">
                        {p.label}
                    </button>
                    ))}
                </div>
             </div>

             <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-[#1e293b] border border-gray-700 rounded-xl p-4 text-gray-200 text-sm h-32 resize-none focus:border-purple-500 outline-none transition-colors"
                placeholder="Nhập mô tả chi tiết..."
             />
            
             {needsApiKey ? (
               <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 text-center animate-pulse">
                 <Key className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                 <p className="text-yellow-200 font-bold mb-1">Yêu cầu API Key</p>
                 
                 {hasAiStudio ? (
                     <>
                        <p className="text-yellow-200/70 text-xs mb-4">Độ phân giải {resolution} cần sử dụng key cá nhân của bạn.</p>
                        <Button onClick={handleSelectApiKey} className="w-full text-sm bg-yellow-600 hover:bg-yellow-500 text-black border-none cursor-pointer">
                             Chọn API Key Nhanh (AI Studio)
                        </Button>
                        <div className="my-2 text-xs text-gray-400">- HOẶC -</div>
                     </>
                 ) : null}

                 {/* Manual Input Fallback */}
                 <div className="bg-black/30 p-3 rounded-xl border border-gray-700">
                     <p className="text-yellow-200/70 text-xs mb-2">Nhập API Key thủ công (Lấy tại aistudio.google.com):</p>
                     <div className="flex gap-2">
                         <input 
                             type="password" 
                             value={userApiKey}
                             onChange={(e) => setUserApiKey(e.target.value)}
                             placeholder="Dán API Key vào đây..."
                             className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500"
                         />
                         <button 
                             onClick={handleSaveKey}
                             className="bg-yellow-600 hover:bg-yellow-500 text-black px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1"
                         >
                             <Save size={14}/> Lưu
                         </button>
                     </div>
                 </div>
               </div>
             ) : (
               <Button 
                 onClick={handleGenerate} 
                 isLoading={appState === AppState.PROCESSING}
                 className="w-full py-4 text-base font-bold bg-[#8B5CF6] hover:bg-[#7C3AED] shadow-lg shadow-purple-500/20 rounded-xl text-white"
                 disabled={currentUser.credits < COST_MAP[resolution]}
               >
                 {appState === AppState.PROCESSING ? 'Đang Xử Lý...' : `Tách Đối Tượng (-${COST_MAP[resolution]} Stars)`}
               </Button>
             )}
             
             {error && (
                 <div className="flex flex-col gap-3 text-center bg-[#2D1A1A] p-4 rounded-xl border border-red-900/50 animate-in fade-in slide-in-from-top-2">
                     <div className="flex items-center justify-center gap-2 text-red-400 text-sm font-bold uppercase tracking-wider">
                        <AlertTriangle size={18} /> Lỗi API
                     </div>
                     <span className="text-red-200 text-xs leading-relaxed whitespace-pre-line">{error}</span>
                     
                     {/* Suggestion Action for Quota Errors */}
                     {(error.includes("Quota") || error.includes("1040p")) && (
                         <div className="flex gap-2 justify-center mt-2 flex-wrap">
                             <button 
                                onClick={() => { setResolution('1040p'); setError(null); handleGenerate(); }}
                                className="text-xs flex items-center gap-2 bg-red-900/50 hover:bg-red-800 text-white px-4 py-2 rounded-lg border border-red-700 transition-colors shadow-lg animate-pulse"
                             >
                                 <ArrowDownCircle size={14} /> Xuống 1040p (Fix Ngay)
                             </button>
                         </div>
                     )}
                 </div>
             )}
           </div>
        </div>
      </div>

      {/* Right Column (Result) */}
      <div className="bg-[#131B2C] border border-gray-800 rounded-3xl p-6 shadow-md min-h-[600px] flex flex-col relative overflow-hidden">
          <div className="flex-1 rounded-2xl bg-[url('https://assets.codepen.io/1480814/checkerboard.svg')] bg-repeat bg-center relative flex items-center justify-center overflow-hidden border border-dashed border-gray-700">
             {appState === AppState.PROCESSING && (
                <div className="absolute inset-0 bg-black/80 z-10 flex flex-col items-center justify-center">
                   <div className="text-5xl font-black text-white mb-4 animate-pulse">
                        {Math.round(progress)}%
                   </div>
                   <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
                       <div 
                           className="h-full bg-purple-600 rounded-full" 
                           style={{width: `${progress}%`}}
                       ></div>
                   </div>
                   <p className="text-gray-400 text-sm mt-4">AI đang phân tích & tách nền...</p>
                </div>
             )}
             
             {resultImage && uploadedImage ? (
                <div className="w-full h-full animate-in fade-in zoom-in duration-300">
                   <ImageComparison beforeImage={uploadedImage.previewUrl} afterImage={resultImage} />
                </div>
             ) : (
                <div className="text-gray-500 text-sm flex flex-col items-center opacity-50">
                   <Box size={64} className="mb-4 text-gray-700"/>
                   <span className="text-gray-600">Kết quả sẽ hiện ở đây</span>
                </div>
             )}
          </div>
          
          {resultImage && (
             <div className="mt-4 flex gap-3 animate-in fade-in slide-in-from-bottom-2">
               <Button onClick={downloadImage} className="flex-1 shadow-md" icon={<Download size={16}/>}>Tải Về</Button>
               <Button variant="outline" onClick={() => setAppState(AppState.IDLE)} icon={<RefreshCw size={16}/>}>Làm Mới</Button>
             </div>
          )}
      </div>
    </div>
  );
};

export default App;