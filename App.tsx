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
    try {
        return localStorage.getItem(STORAGE_KEY_PROMPT) || DEFAULT_PROMPT;
    } catch { return DEFAULT_PROMPT; }
  });
  
  const [resolution, setResolution] = useState<Resolution>(() => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_RES);
        return (saved && RESOLUTIONS.includes(saved as Resolution)) 
          ? (saved as Resolution) 
          : '1040p';
    } catch { return '1040p'; }
  });

  const [showShop, setShowShop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasAiStudio, setHasAiStudio] = useState(false);
  
  // Custom API Key State
  const [userApiKey, setUserApiKey] = useState(() => {
      try {
          return localStorage.getItem(STORAGE_KEY_API) || '';
      } catch { return ''; }
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

  // Auto-Login Check with Safety
  useEffect(() => {
    try {
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
    } catch (e) {
        console.error("Auto login error:", e);
        // Fallback: clear remember to avoid loop
        localStorage.removeItem('styleExtract_remember_user');
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
          setProcessedHistory([]);
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
      try {
          const usersStr = localStorage.getItem('styleExtract_users_db');
          const users: User[] = usersStr ? JSON.parse(usersStr) : [];
          const updatedUsers = users.map(u => u.username === currentUser.username ? currentUser : u);
          localStorage.setItem('styleExtract_users_db', JSON.stringify(updatedUsers));
      } catch (e) { console.error("Save user error", e); }
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

  const renderHome = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. Prompt & History Controls */}
      <div className="bg-[#131B2C] p-4 rounded-2xl border border-gray-800 shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between">
         <div className="flex items-center gap-2 w-full md:w-auto">
             <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 transition-colors text-white"><Undo2 size={20}/></button>
             <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 transition-colors text-white"><Redo2 size={20}/></button>
             <div className="h-8 w-px bg-gray-700 mx-2"></div>
             
             <div className="relative flex-1 md:w-96 group">
                <input 
                  type="text" 
                  value={prompt}
                  onChange={(e) => {
                      setPrompt(e.target.value);
                      addToHistory(e.target.value, resolution);
                  }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-all shadow-inner"
                  placeholder="Mô tả yêu cầu tách..."
                />
             </div>
         </div>
         
         <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto scrollbar-hide">
            {SUGGESTED_PROMPTS.map((p, i) => (
                <button 
                  key={i}
                  onClick={() => selectPrompt(p.value)}
                  className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-400 hover:text-white hover:border-purple-500 transition-all"
                >
                    {p.label}
                </button>
            ))}
         </div>
      </div>

      {/* 2. Main Workspace */}
      <div className="grid lg:grid-cols-12 gap-6">
          
          {/* Left Panel: Upload & Preview */}
          <div className="lg:col-span-8 flex flex-col gap-4">
             <div className="bg-[#131B2C] border border-gray-800 rounded-3xl p-1 shadow-2xl relative min-h-[500px] flex flex-col">
                
                {/* Toolbar inside canvas */}
                <div className="absolute top-4 left-4 z-20 flex gap-2">
                   {uploadedImage && (
                       <button onClick={handleReset} className="p-2 bg-black/60 backdrop-blur text-white rounded-lg hover:bg-red-500/80 transition-colors" title="Reset">
                           <RefreshCw size={16} />
                       </button>
                   )}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed rounded-[20px] overflow-hidden relative flex items-center justify-center">
                    
                    {!uploadedImage ? (
                        <div className="p-8 w-full max-w-xl">
                            <ImageUploader onUpload={handleUpload} />
                        </div>
                    ) : (
                        <>
                           {appState === AppState.SUCCESS && resultImage ? (
                               <ImageComparison beforeImage={uploadedImage.previewUrl} afterImage={resultImage} />
                           ) : (
                               <div className="relative w-full h-full flex items-center justify-center p-4">
                                   <img 
                                      src={uploadedImage.previewUrl} 
                                      alt="Original" 
                                      className={`max-w-full max-h-full object-contain shadow-2xl transition-all duration-700 ${appState === AppState.PROCESSING ? 'scale-95 blur-sm opacity-50' : ''}`} 
                                   />
                                   
                                   {/* Processing Overlay */}
                                   {appState === AppState.PROCESSING && (
                                       <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
                                            <div className="relative w-32 h-32 mb-8">
                                                <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full animate-ping"></div>
                                                <div className="absolute inset-0 border-4 border-t-purple-500 rounded-full animate-spin"></div>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-xl font-black text-white">{Math.round(progress)}%</span>
                                                </div>
                                            </div>
                                            <h3 className="text-2xl font-bold text-white mb-2 animate-pulse">AI Đang Xử Lý...</h3>
                                            <p className="text-purple-300 text-sm max-w-xs text-center">
                                                Đang phân tích cấu trúc 3D và tách nền phức tạp. Vui lòng đợi.
                                            </p>
                                       </div>
                                   )}
                               </div>
                           )}
                        </>
                    )}
                </div>
             </div>
          </div>

          {/* Right Panel: Controls */}
          <div className="lg:col-span-4 space-y-4">
              
              {/* Status Card */}
              <div className="bg-[#131B2C] p-6 rounded-3xl border border-gray-800 shadow-xl">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Layers className="text-purple-500" /> Cấu Hình Render
                  </h3>
                  
                  {/* Resolution Selector */}
                  <div className="mb-6">
                      <label className="text-xs font-bold text-gray-500 uppercase mb-3 block">Độ Phân Giải Output</label>
                      <div className="grid grid-cols-2 gap-2">
                          {RESOLUTIONS.map((res) => {
                              const cost = COST_MAP[res];
                              const isSelected = resolution === res;
                              const isPro = ['1240p', '1440p', '2K', '4K', '8K'].includes(res);
                              
                              return (
                                  <button
                                    key={res}
                                    onClick={() => changeResolution(res)}
                                    className={`relative p-3 rounded-xl border text-left transition-all duration-200 group overflow-hidden ${
                                        isSelected 
                                        ? 'bg-purple-600/20 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                                        : 'bg-gray-900 border-gray-700 hover:border-gray-500'
                                    }`}
                                  >
                                      <div className={`text-sm font-black mb-1 ${isSelected ? 'text-white' : 'text-gray-300'}`}>{res}</div>
                                      <div className="flex items-center justify-between">
                                          <span className={`text-[10px] font-bold ${isSelected ? 'text-purple-200' : 'text-gray-500'}`}>
                                              {cost} Credits
                                          </span>
                                          {isPro && <span className="text-[9px] bg-yellow-500 text-black px-1 rounded font-bold">PRO</span>}
                                      </div>
                                  </button>
                              )
                          })}
                      </div>
                  </div>

                  {/* API Key Input (Conditional) */}
                  {(['1240p', '1440p', '2K', '4K', '8K'].includes(resolution) || needsApiKey) && (
                      <div className="mb-6 animate-in fade-in slide-in-from-top-2">
                          <div className="flex justify-between items-center mb-2">
                             <label className="text-xs font-bold text-yellow-500 uppercase flex items-center gap-1">
                                <Key size={12}/> API Key Riêng (Bắt buộc cho PRO)
                             </label>
                             <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 hover:underline">Lấy Key ở đâu?</a>
                          </div>
                          
                          {/* AI Studio Key Selection Button */}
                          {hasAiStudio && (
                            <Button 
                              onClick={handleSelectApiKey}
                              className="w-full mb-3 text-sm py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
                              icon={<Key size={14} />}
                            >
                                Chọn Key từ Google AI Studio
                            </Button>
                          )}
                          
                          <div className="relative">
                              <input 
                                type="password"
                                value={userApiKey}
                                onChange={(e) => setUserApiKey(e.target.value)}
                                className="w-full bg-black/30 border border-yellow-500/30 rounded-xl px-4 py-3 text-sm text-yellow-200 placeholder-yellow-500/20 focus:border-yellow-500 outline-none"
                                placeholder="Hoặc dán API Key của bạn vào đây..."
                              />
                              {userApiKey && (
                                  <button onClick={handleSaveKey} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-yellow-500/20 text-yellow-500 rounded-lg hover:bg-yellow-500 hover:text-black transition-colors">
                                      <Save size={14} />
                                  </button>
                              )}
                          </div>
                      </div>
                  )}

                  {/* Error Message */}
                  {error && (
                      <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3">
                          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                          <div className="text-xs text-red-200">
                              <strong className="block text-red-400 font-bold mb-1">Lỗi Xử Lý</strong>
                              {error}
                          </div>
                      </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-3">
                      {appState === AppState.SUCCESS ? (
                          <>
                            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl mb-4">
                                <p className="text-green-400 text-sm font-bold text-center flex items-center justify-center gap-2">
                                    <Sparkles size={16} /> Hoàn thành xuất sắc!
                                </p>
                            </div>
                            <Button onClick={downloadImage} className="w-full py-4 text-lg font-bold shadow-lg shadow-purple-500/20" icon={<Download size={20} />}>
                                Tải Ảnh Về Máy
                            </Button>
                            <Button onClick={() => setAppState(AppState.IDLE)} variant="secondary" className="w-full py-3" icon={<RefreshCw size={16} />}>
                                Làm Mới / Tách Ảnh Khác
                            </Button>
                          </>
                      ) : (
                          <Button 
                            onClick={handleGenerate} 
                            disabled={!uploadedImage || appState === AppState.PROCESSING}
                            isLoading={appState === AppState.PROCESSING}
                            className={`w-full py-4 text-lg font-bold shadow-lg shadow-purple-500/20 group relative overflow-hidden`}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:animate-[shimmer_1.5s_infinite]"></div>
                            <span className="relative flex items-center gap-2">
                                <Wand2 size={20} />
                                {appState === AppState.PROCESSING ? 'AI Đang Suy Nghĩ...' : 'Bắt Đầu Tách Nền'}
                            </span>
                          </Button>
                      )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-800 text-center">
                      <p className="text-[10px] text-gray-500">
                          Credits hiện có: <span className="text-white font-bold">{currentUser?.credits}</span> • Chi phí: <span className="text-yellow-500 font-bold">{COST_MAP[resolution]}</span>
                      </p>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );

  // Safe Render Logic
  try {
      if (!currentUser) {
          return <Auth onLogin={handleLogin} />;
      }

      return (
        <div className="min-h-screen bg-[#0B0F19] text-gray-100 font-sans pb-10 overflow-x-hidden selection:bg-purple-500/30">
          {/* Notifications */}
          {notification && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg text-sm font-bold flex items-center gap-2 border border-gray-700">
               <Sparkles size={16} className="text-yellow-300" /> {notification}
            </div>
          )}

          <StarShop 
            isOpen={showShop} 
            onClose={() => setShowShop(false)} 
            onPurchase={handlePurchase} 
            currentVipLevel={currentUser.vipLevel}
          />
          
          <Sidebar 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
            currentView={currentView as any}
            onChangeView={(v) => setCurrentView(v)}
            onOpenShop={() => setShowShop(true)}
            vipLevel={currentUser.vipLevel}
            totalRecharged={currentUser.totalRecharged || 0}
          />

          <div className="relative max-w-7xl mx-auto px-4 py-4 z-10">
             {/* Simple Header */}
             <header className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                   <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"><Menu size={24}/></button>
                   <button onClick={() => handleLogout()} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"><LogOut size={20}/></button>
                </div>
                
                <div className="absolute left-1/2 -translate-x-1/2 text-center">
                     <h1 className="text-2xl md:text-3xl font-black text-white font-['Caveat']">
                      Separate Clothes AI 2.0
                   </h1>
                </div>
                
                <button onClick={() => setShowShop(true)} className="flex items-center gap-2 bg-[#1e293b] px-4 py-2 rounded-full border border-gray-700 hover:border-blue-500 transition-colors group">
                   <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                   <span className="text-white font-bold text-sm">{formatStarBalance(currentUser.credits)}</span>
                   <div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-md group-hover:scale-105 transition-transform">+</div>
                </button>
             </header>

             {/* MAIN CONTENT WRAPPER */}
             <div className={getContainerStyle()}>
                <div className="spirit-path hidden md:block"><div className="spirit phoenix-spirit"></div></div>
                
                <div className={`bg-[#0f1522] rounded-2xl p-4 md:p-6 min-h-[80vh] relative z-10`}>
                   {currentView === 'HOME' && renderHome()}
                   {currentView === 'PROFILE' && (
                      <ProfileView 
                         profile={currentUser.profile}
                         vipLevel={currentUser.vipLevel}
                         credits={currentUser.credits}
                         onUpdateAvatar={handleUpdateAvatar}
                         onEquipFrame={(id) => setCurrentUser(prev => prev ? ({...prev, profile: {...prev.profile, currentFrameId: id}}) : null)}
                         onBuyFrame={(f) => {
                            if (currentUser.credits >= (f.cost || 0)) {
                               setCurrentUser(prev => prev ? ({
                                   ...prev,
                                   credits: prev.credits - (f.cost || 0),
                                   profile: { ...prev.profile, ownedFrameIds: [...prev.profile.ownedFrameIds, f.id], currentFrameId: f.id }
                               }) : null);
                            }
                         }}
                         onWatchAd={() => alert("Đã xem QC (Giả lập)")}
                      />
                   )}
                   {currentView === 'HISTORY' && (
                      <HistoryView 
                         history={processedHistory}
                         onSelect={handleHistorySelect}
                         onClear={() => { setProcessedHistory([]); localStorage.removeItem(STORAGE_KEY_HISTORY); }}
                         onDeleteItem={handleHistoryDeleteOne}
                         vipLevel={currentUser.vipLevel}
                         maxStorageBytes={STORAGE_LIMITS[currentUser.vipLevel]}
                         usedStorageBytes={calculateTotalHistorySize(processedHistory)}
                         onOpenShop={() => setShowShop(true)}
                      />
                   )}
                   {currentView === 'DRAW' && <FreeDraw vipLevel={currentUser.vipLevel} onOpenShop={() => setShowShop(true)} />}
                   {currentView === 'AUTO_PAINT' && <AutoPainter vipLevel={currentUser.vipLevel} onOpenShop={() => setShowShop(true)} />}
                   {currentView === 'ADMIN_CHAT' && <AdminChat currentUser={currentUser} onOpenShop={() => setShowShop(true)} />}
                   {currentView === 'PUBLIC_CHAT' && <PublicChat currentUser={currentUser} onUpdateUser={setCurrentUser} onOpenShop={() => setShowShop(true)} />}
                   {currentView === 'ADMIN' && <AdminPanel currentUser={currentUser} />}
                </div>
             </div>
          </div>
        </div>
      );
  } catch (err) {
      console.error("Render error:", err);
      // Force clear corrupt user state if render fails
      if (currentUser) setCurrentUser(null); 
      return <div className="p-10 text-center text-white">Loading Recovery...</div>;
  }
};

export default App;