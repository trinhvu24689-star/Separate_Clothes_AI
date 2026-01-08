import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { Button } from './components/Button';
import { UploadedFile, AppState, Resolution, VipLevel, AppView, UserProfile, Frame, User, ProcessedHistoryItem } from './types';
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
import { Wand2, Download, RefreshCw, Layers, Sparkles, Trash2, Smartphone, Settings2, Key, Undo2, Redo2, Star, Plus, Menu, Gift, LogOut, Clock } from 'lucide-react';

const SUGGESTED_PROMPTS = [
  { 
    label: "Tách quần áo & Tóc (Chuẩn)", 
    value: "Product photography editing. Create a ghost mannequin effect. Remove the model's body, skin, and face entirely. Keep the clothing and hair exactly as they are, maintaining their 3D shape and volume. Solid white background." 
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
  '480p': 2,
  '720p': 4,
  '1040p': 8,
  '1240p': 10,
  '1440p': 13,
  '2K': 20,
  '4K': 28,
  '8K': 36
};

// STORAGE LIMITS (Bytes)
const STORAGE_LIMITS: Record<VipLevel, number> = {
    'NONE': 2 * 1024 * 1024,      // 2 MB
    'VIP': 10 * 1024 * 1024,      // 10 MB
    'SSVIP': 30 * 1024 * 1024,    // 30 MB
    'ULTRA_INFINITY': 100 * 1024 * 1024, // 100 MB
    'LIFETIME': 500 * 1024 * 1024, // 500 MB (Effectively limited by Browser)
    'MODERATOR': 500 * 1024 * 1024
};

const DEFAULT_PROMPT = "Product photography editing. Create a ghost mannequin effect. Remove the model's body, skin, and face entirely. Keep the clothing and hair exactly as they are, maintaining their 3D shape and volume. Solid white background.";

const STORAGE_KEY_PROMPT = 'styleExtract_prompt';
const STORAGE_KEY_RES = 'styleExtract_resolution';
const STORAGE_KEY_HISTORY = 'styleExtract_history';

// --- STAR BALANCE FORMATTER ---
export const formatStarBalance = (num: number) => {
    if (num >= 100000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + ' TTyr'; // 100 Tỷ+
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + ' T'; // 1 Tỷ+
    if (num >= 100000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + ' M'; // 100 Triệu+ (Custom)
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + ' Tr'; // 1 Triệu+
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + ' N'; // 1 Nghìn+
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
  const [currentView, setCurrentView] = useState<AppView>('HOME');
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
  
  // History State
  const [history, setHistory] = useState<HistoryState[]>([
    { prompt: prompt, resolution: resolution }
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Processed History (Saved Results)
  const [processedHistory, setProcessedHistory] = useState<ProcessedHistoryItem[]>([]);

  const progressInterval = useRef<number | null>(null);

  // Auto-Login Check (Remember Me)
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

  // Load Processed History
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

  // Persist prompt/res settings
  useEffect(() => localStorage.setItem(STORAGE_KEY_PROMPT, prompt), [prompt]);
  useEffect(() => localStorage.setItem(STORAGE_KEY_RES, resolution), [resolution]);

  // SAVE USER DATA WHENEVER IT CHANGES
  useEffect(() => {
    if (currentUser) {
      const usersStr = localStorage.getItem('styleExtract_users_db');
      const users: User[] = usersStr ? JSON.parse(usersStr) : [];
      const updatedUsers = users.map(u => u.username === currentUser.username ? currentUser : u);
      localStorage.setItem('styleExtract_users_db', JSON.stringify(updatedUsers));
    }
  }, [currentUser]);

  // DAILY BONUS LOGIC & VIP EXPIRY CHECK
  useEffect(() => {
    if (currentUser) {
        const today = new Date();
        const todayStr = today.toDateString();
        
        // Check VIP Expiry
        if (currentUser.vipExpiry && currentUser.vipLevel !== 'NONE' && currentUser.vipLevel !== 'LIFETIME') {
            if (Date.now() > currentUser.vipExpiry) {
                setCurrentUser(prev => prev ? ({ ...prev, vipLevel: 'NONE', vipExpiry: undefined }) : null);
                setNotification("VIP của bạn đã hết hạn.");
                setTimeout(() => setNotification(null), 5000);
            }
        }

        // Daily Bonus
        if (currentUser.lastLogin !== todayStr) {
            let newCredits = currentUser.credits;
            let bonusApplied = false;
            let addedAmount = 0;

            if (currentUser.vipLevel === 'NONE') {
                if (newCredits < 69) {
                    const bonus = 30;
                    const potential = newCredits + bonus;
                    const final = Math.min(potential, 69);
                    addedAmount = final - newCredits;
                    newCredits = final;
                    bonusApplied = addedAmount > 0;
                }
            } else {
                addedAmount = 30;
                newCredits += addedAmount;
                bonusApplied = true;
            }

            if (bonusApplied) {
                setNotification(`Bạn đã được +${addedAmount} sao free`);
                setTimeout(() => setNotification(null), 8000);
            }
            
            setCurrentUser(prev => prev ? ({
                ...prev,
                credits: newCredits,
                lastLogin: todayStr,
                dailyChatCount: 0
            }) : null);
        }
    }
  }, [currentUser?.username]);

  // Handle Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) { handleRedo(); } else { handleUndo(); }
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        handleRedo();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  // Handle Progress Simulation
  useEffect(() => {
    if (appState === AppState.PROCESSING) {
      setProgress(0);
      const isPro = ['1240p', '1440p', '2K', '4K', '8K'].includes(resolution);
      const increment = isPro ? 0.5 : 1.5; 
      const intervalTime = 100;

      progressInterval.current = window.setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev < 95 ? prev + 0.1 : 95;
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

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

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
    addToHistory(DEFAULT_PROMPT, '1040p'); 
  };

  // Helper to calculate storage size of an item
  const calculateItemSize = (item: ProcessedHistoryItem) => {
      // Crude approximation: string length = bytes (simplified)
      return item.resultImage.length + item.originalImage.base64.length + item.prompt.length + 100;
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

    const isProModel = ['1240p', '1440p', '2K', '4K', '8K'].includes(resolution);
    
    if (isProModel && window.aistudio) {
      try {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          setNeedsApiKey(true);
          return; 
        }
      } catch (e) {
        console.warn("Failed to check API key status", e);
      }
    }

    setNeedsApiKey(false);
    setAppState(AppState.PROCESSING);
    setError(null);

    try {
      const generatedImageBase64 = await generateSeparatedImage(
        uploadedImage.base64,
        uploadedImage.mimeType,
        prompt,
        resolution
      );
      
      // Deduct credits
      setCurrentUser(prev => prev ? ({
          ...prev,
          credits: Math.max(0, prev.credits - cost)
      }) : null);

      setResultImage(generatedImageBase64);
      setAppState(AppState.SUCCESS);

      // --- SAVE TO HISTORY WITH LIMITS ---
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
          sizeBytes: 0 // placeholder
      };
      
      // Calculate Size
      newItem.sizeBytes = calculateItemSize(newItem);

      // Manage Storage
      let updatedHistory = [newItem, ...processedHistory];
      const maxBytes = STORAGE_LIMITS[currentUser.vipLevel];
      
      // Remove old items until we fit under the limit
      while (calculateTotalHistorySize(updatedHistory) > maxBytes && updatedHistory.length > 0) {
          updatedHistory.pop(); // Remove oldest (last item)
      }

      setProcessedHistory(updatedHistory);
      
      // Try saving to localStorage (handle QuotaExceededError)
      try {
          localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updatedHistory));
      } catch (e) {
          console.warn("Storage quota exceeded. Removing more items.");
          // If browser quota exceeded, aggressively remove last half
          const half = Math.floor(updatedHistory.length / 2);
          updatedHistory = updatedHistory.slice(0, half);
          try {
             localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updatedHistory));
             setProcessedHistory(updatedHistory);
          } catch (retryError) {
             console.error("Critical storage failure", retryError);
             setNotification("Bộ nhớ đầy! Không thể lưu lịch sử.");
          }
      }

    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi không mong muốn khi xử lý ảnh.");
      setAppState(AppState.ERROR);
      setProgress(0);
    }
  };

  const handleSelectApiKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setNeedsApiKey(false);
      handleGenerate();
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

  const handlePromptBlur = () => {
    addToHistory(prompt, resolution);
  };

  const handlePurchase = (itemType: 'CREDIT' | 'VIP', amountOrDuration: number, level: VipLevel | null, pricePaid: number) => {
    if (!currentUser) return;
    setCurrentUser(prev => {
        if (!prev) return null;
        let newCredits = prev.credits;
        let newVipLevel = prev.vipLevel;
        let newVipExpiry = prev.vipExpiry || Date.now();

        if (itemType === 'CREDIT') {
            newCredits += amountOrDuration;
        } else if (itemType === 'VIP' && level) {
            const levels = ['NONE', 'VIP', 'SSVIP', 'ULTRA_INFINITY', 'LIFETIME', 'MODERATOR'];
            const currentIdx = levels.indexOf(prev.vipLevel);
            const newIdx = levels.indexOf(level);
            if (newIdx > currentIdx) {
                newVipLevel = level;
                newVipExpiry = Date.now() + (amountOrDuration * 24 * 60 * 60 * 1000);
            } else if (newIdx === currentIdx && level !== 'LIFETIME') {
                if (newVipExpiry < Date.now()) newVipExpiry = Date.now();
                newVipExpiry += (amountOrDuration * 24 * 60 * 60 * 1000);
            }
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

  // HISTORY HANDLERS
  const handleHistorySelect = (item: ProcessedHistoryItem) => {
      setUploadedImage(item.originalImage);
      setResultImage(item.resultImage);
      setPrompt(item.prompt);
      setResolution(item.resolution);
      setAppState(AppState.SUCCESS);
      setCurrentView('HOME');
  };

  const handleHistoryClear = () => {
      if(confirm("Xóa toàn bộ lịch sử?")) {
          setProcessedHistory([]);
          localStorage.removeItem(STORAGE_KEY_HISTORY);
      }
  };

  const handleHistoryDeleteOne = (id: string) => {
      const updated = processedHistory.filter(item => item.id !== id);
      setProcessedHistory(updated);
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
  };

  // Profile Management Handlers
  const handleUpdateAvatar = (url: string) => {
     setCurrentUser(prev => prev ? ({ ...prev, profile: { ...prev.profile, avatarUrl: url } }) : null);
  };

  const handleEquipFrame = (frameId: string) => {
     setCurrentUser(prev => prev ? ({ ...prev, profile: { ...prev.profile, currentFrameId: frameId } }) : null);
  };

  const handleBuyFrame = (frame: Frame) => {
      if (!currentUser) return;
      if (frame.cost && currentUser.credits >= frame.cost) {
          setCurrentUser(prev => {
              if (!prev) return null;
              return {
                  ...prev,
                  credits: prev.credits - (frame.cost || 0),
                  profile: {
                      ...prev.profile,
                      ownedFrameIds: [...prev.profile.ownedFrameIds, frame.id],
                      currentFrameId: frame.id
                  }
              };
          });
      }
  };

  const handleWatchAd = (frame: Frame) => {
      const btn = confirm("Đang xem quảng cáo... (Giả lập 3s)");
      if(btn) {
          setTimeout(() => {
              setCurrentUser(prev => {
                  if (!prev) return null;
                  return {
                      ...prev,
                      profile: {
                          ...prev.profile,
                          ownedFrameIds: [...prev.profile.ownedFrameIds, frame.id],
                          currentFrameId: frame.id
                      }
                  };
              });
              alert("Chúc mừng! Bạn đã nhận được khung mới.");
          }, 3000);
      }
  };

  // Auth Handlers
  const handleLogin = (user: User) => {
      setCurrentUser(user);
      setCurrentView('HOME');
  };

  const handleLogout = () => {
      localStorage.removeItem('styleExtract_remember_user');
      setCurrentUser(null);
  };

  // Styles
  const getContainerStyle = () => {
    if (!currentUser) return "mythical-container";
    if (currentUser.vipLevel === 'MODERATOR') return "mythical-container moderator-border";
    if (currentUser.vipLevel === 'LIFETIME') return "mythical-container lifetime-border";
    if (currentUser.vipLevel === 'ULTRA_INFINITY') return "mythical-container ultra-border";
    if (currentUser.vipLevel === 'SSVIP') return "mythical-container ssvip-border";
    return "mythical-container"; 
  };

  // Helper to format remaining time
  const getVipTimeRemaining = () => {
     if (!currentUser || !currentUser.vipExpiry || currentUser.vipLevel === 'NONE' || currentUser.vipLevel === 'LIFETIME') return null;
     const diff = currentUser.vipExpiry - Date.now();
     if (diff <= 0) return "Hết hạn";
     const days = Math.floor(diff / (1000 * 60 * 60 * 24));
     if (days > 30) return `${Math.floor(days / 30)} tháng`;
     return `${days} ngày`;
  };

  // IF NOT LOGGED IN, SHOW AUTH
  if (!currentUser) {
      return <Auth onLogin={handleLogin} />;
  }

  // Render Image Generator View (Original Home)
  const renderHome = () => (
    <div className="grid lg:grid-cols-2 gap-8 items-start animate-in fade-in duration-500">
      {/* LEFT COLUMN: Input & Controls */}
      <div className="space-y-6">
        <div className="bg-[#131B2C] border border-gray-800 rounded-3xl p-4 md:p-6 shadow-2xl relative overflow-hidden group hover:border-purple-500/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              Ảnh Gốc
            </h2>
            {uploadedImage && (
              <button onClick={handleReset} className="text-xs text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1 p-2">
                <Trash2 className="w-4 h-4" /> Xóa ảnh
              </button>
            )}
          </div>
          {!uploadedImage ? (
            <ImageUploader onUpload={handleUpload} />
          ) : (
            <div className="relative rounded-2xl overflow-hidden bg-black/40 aspect-square group">
              <img src={uploadedImage.previewUrl} alt="Original" className="w-full h-full object-contain"/>
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button variant="secondary" onClick={handleReset} icon={<RefreshCw className="w-4 h-4" />}>
                  Chọn ảnh khác
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Prompt Controls */}
        <div className={`bg-[#131B2C] border border-gray-800 rounded-3xl p-4 md:p-6 shadow-2xl transition-all duration-300 ${!uploadedImage ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
           {/* ... Header and Undo/Redo Buttons ... */}
           <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Wand2 className="w-5 h-5 text-purple-400" />
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">Tuỳ Chỉnh Xử Lý</span>
                    </h2>
                    <div className="flex items-center gap-1">
                      <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"><Undo2 className="w-4 h-4" /></button>
                      <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"><Redo2 className="w-4 h-4" /></button>
                    </div>
                  </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-purple-400" />
                  Chất Lượng & Tốn Tín Dụng
                </label>
                <span className="text-xs text-yellow-500 font-bold">Chi phí: {COST_MAP[resolution]} Stars</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {RESOLUTIONS.map((res) => (
                  <button
                    key={res}
                    onClick={() => changeResolution(res)}
                    className={`px-2 py-2 text-xs font-medium rounded-lg border transition-all flex flex-col items-center justify-center gap-1 ${
                      resolution === res ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/50' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700/80 hover:text-gray-200'
                    }`}
                  >
                    <span>{res}</span>
                    <span className="text-[10px] opacity-70 flex items-center gap-0.5">{COST_MAP[res]} <Star className="w-2 h-2 fill-current" /></span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Gợi ý mẫu:</label>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((p, idx) => (
                  <button key={idx} onClick={() => selectPrompt(p.value)} className="text-xs px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 transition-colors">
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onBlur={handlePromptBlur}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-xl p-4 text-gray-200 focus:outline-none focus:border-purple-500 transition-all resize-none h-28 text-sm leading-relaxed"
              placeholder="Mô tả chi tiết phần bạn muốn giữ lại..."
            />
            
            {needsApiKey ? (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center animate-pulse">
                <p className="text-yellow-200 text-sm mb-3">Để sử dụng độ phân giải cao {resolution}, bạn cần chọn API Key.</p>
                <Button onClick={handleSelectApiKey} variant="secondary" className="w-full" icon={<Key className="w-4 h-4" />}>Chọn API Key</Button>
              </div>
            ) : (
              <Button 
                onClick={handleGenerate} 
                isLoading={appState === AppState.PROCESSING}
                className="w-full mt-4 text-lg py-4 relative overflow-hidden group"
                disabled={currentUser.credits < COST_MAP[resolution]}
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></span>
                {appState === AppState.PROCESSING ? 'Đang Xử Lý...' : (
                  <span className="flex items-center gap-2">Tách Đối Tượng <span className="bg-black/20 px-2 py-0.5 rounded text-sm flex items-center gap-1">-{COST_MAP[resolution]} <Star className="w-3 h-3 fill-white" /></span></span>
                )}
              </Button>
            )}
            {currentUser.credits < COST_MAP[resolution] && appState !== AppState.PROCESSING && (
              <div className="text-center">
                <button onClick={() => setShowShop(true)} className="text-sm text-yellow-500 hover:text-yellow-400 underline decoration-dashed underline-offset-4">Không đủ tín dụng? Mua thêm ngay</button>
              </div>
            )}
            {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm mt-4">Lỗi: {error}</div>}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Result */}
      <div className="lg:sticky lg:top-8 h-full min-h-[500px]">
        <div className="bg-[#131B2C] border border-gray-800 rounded-3xl p-4 md:p-6 shadow-2xl h-full flex flex-col relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Kết Quả
            </h2>
          </div>
          <div className="flex-1 rounded-2xl bg-[url('https://assets.codepen.io/1480814/checkerboard.svg')] bg-repeat bg-center relative flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-800 min-h-[300px] md:min-h-[400px]">
            {appState === AppState.IDLE && !resultImage && (
              <div className="text-center p-8 opacity-40">
                <Layers className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <p className="text-gray-400">Tải ảnh lên và nhấn xử lý để xem kết quả</p>
              </div>
            )}
            {appState === AppState.PROCESSING && (
              <div className="absolute inset-0 bg-[#0B0F19]/90 backdrop-blur-md z-10 flex flex-col items-center justify-center p-8">
                <div className="w-full max-w-xs relative mb-6">
                  <div className="mini-spirit-container"><div className="mini-spirit mini-phoenix"></div></div>
                  <div className="h-4 w-full bg-gray-900 rounded-full border border-gray-700 overflow-hidden relative z-10 box-content">
                    <div className="h-full neon-progress-fill transition-all duration-300 ease-out" style={{width: `${progress}%`}}></div>
                  </div>
                </div>
                <div className="text-4xl font-black neon-text-rainbow mb-2 tracking-widest">{Math.round(progress)}%</div>
                <p className="text-purple-200 font-medium animate-pulse text-center">Gemini đang tách đối tượng...</p>
                <p className="text-gray-500 text-xs mt-2 font-mono">Mode: {['1240p', '1440p', '2K', '4K', '8K'].includes(resolution) ? 'Gemini 3 Pro (High-Res)' : 'Gemini 2.5 Flash (Fast)'}</p>
              </div>
            )}
            {resultImage && uploadedImage ? (
              <div className="w-full h-full animate-in fade-in zoom-in duration-500">
                 <ImageComparison beforeImage={uploadedImage.previewUrl} afterImage={resultImage} />
              </div>
            ) : (resultImage && (
              <img src={resultImage} alt="Result" className="w-full h-full object-contain max-h-[700px] animate-in fade-in zoom-in duration-500"/>
            ))}
          </div>
          {resultImage && (
            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <Button onClick={downloadImage} className="flex-1 py-4" icon={<Download className="w-5 h-5"/>}>Tải Ảnh Về Máy ({resolution})</Button>
              <Button variant="outline" onClick={() => setAppState(AppState.IDLE)} icon={<RefreshCw className="w-5 h-5"/>}>Làm Mới</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 selection:bg-purple-500/30 font-sans pb-10 overflow-x-hidden">
      {/* NOTIFICATION POPUP */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-10">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.5)] border border-purple-400 flex items-center gap-3">
            <Gift className="w-5 h-5 animate-bounce" />
            <span className="font-bold">{notification}</span>
          </div>
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
        currentView={currentView}
        onChangeView={setCurrentView}
        onOpenShop={() => setShowShop(true)}
        vipLevel={currentUser.vipLevel}
        totalRecharged={currentUser.totalRecharged || 0}
      />

      <div className="fixed inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
         <div className="ambient-glow w-[150vw] h-[150vw]"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 z-10">
        
        {/* Header Section */}
        <header className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4 relative">
          
          {/* Hamburger Button */}
          <div className="absolute top-0 left-0 md:static flex items-center gap-2">
             <button 
               onClick={() => setIsSidebarOpen(true)}
               className="p-3 bg-gray-800 rounded-full text-white hover:bg-gray-700 transition-colors border border-gray-700"
             >
                <Menu size={24} />
             </button>
             <button
               onClick={handleLogout}
               className="md:hidden p-3 bg-cyan-900/20 text-cyan-200 border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.3)] hover:bg-cyan-900/40 rounded-full transition-colors border"
               title="Đăng xuất"
             >
               <LogOut size={20} />
             </button>
          </div>

          {/* User Info / Logout */}
          <div className="hidden md:flex items-center gap-4">
             <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-white">{currentUser.username}</span>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-purple-400">{currentUser.vipLevel === 'NONE' ? 'MEMBER' : currentUser.vipLevel}</span>
                    {getVipTimeRemaining() && (
                        <span className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-300 flex items-center gap-1">
                            <Clock size={10} /> {getVipTimeRemaining()}
                        </span>
                    )}
                </div>
             </div>
             <button 
               onClick={handleLogout} 
               className="p-2 bg-cyan-950/30 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-900/50 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.4)] rounded-lg transition-all"
               title="Đăng xuất"
             >
               <LogOut size={20} />
             </button>
          </div>

          {/* Credit Display */}
          <div className="absolute top-0 right-0 md:static">
             <button 
               onClick={() => setShowShop(true)}
               className={`group flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                 currentUser.vipLevel === 'LIFETIME' ? 'bg-gradient-to-r from-cyan-900 to-blue-950 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)]' :
                 currentUser.vipLevel === 'MODERATOR' ? 'bg-gradient-to-r from-emerald-900 to-black border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' :
                 currentUser.vipLevel === 'ULTRA_INFINITY' ? 'bg-gradient-to-r from-purple-900 to-pink-900 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]' :
                 currentUser.vipLevel === 'SSVIP' ? 'bg-gradient-to-r from-yellow-900 to-amber-900 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]' :
                 'bg-cyan-950/30 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.3)] text-cyan-100'
               }`}
             >
               <div className="relative">
                 <Star className={`w-5 h-5 ${
                   currentUser.vipLevel === 'LIFETIME' ? 'text-cyan-400 fill-cyan-400 animate-pulse' :
                   currentUser.vipLevel === 'MODERATOR' ? 'text-emerald-500 fill-emerald-500 animate-pulse' :
                   currentUser.vipLevel === 'ULTRA_INFINITY' ? 'text-purple-400 fill-purple-400' :
                   currentUser.vipLevel === 'SSVIP' ? 'text-yellow-400 fill-yellow-400' :
                   'text-cyan-400 fill-cyan-400'
                 }`} />
                 {currentUser.vipLevel === 'LIFETIME' && <span className="absolute -top-1 -right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span></span>}
               </div>
               <span className={`font-bold text-lg ${
                 currentUser.vipLevel === 'LIFETIME' ? 'bg-gradient-to-r from-cyan-200 to-white bg-clip-text text-transparent' :
                 currentUser.vipLevel === 'MODERATOR' ? 'bg-gradient-to-r from-emerald-300 to-white bg-clip-text text-transparent' :
                 currentUser.vipLevel === 'ULTRA_INFINITY' ? 'bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent' :
                 currentUser.vipLevel === 'SSVIP' ? 'text-yellow-200' :
                 'text-cyan-100'
               }`}>
                 {formatStarBalance(currentUser.credits)}
               </span>
               <div className="bg-white/20 rounded-full p-0.5 group-hover:bg-white/40 transition-colors">
                  <Plus className="w-3 h-3" />
               </div>
             </button>
          </div>

          <div className="text-center flex-1 mt-12 md:mt-0">
            <h1 className="text-3xl md:text-5xl font-extrabold mb-2 tracking-tight neon-text-rainbow drop-shadow-lg">
              {currentView === 'HOME' ? 'StyleExtract AI' :
               currentView === 'PROFILE' ? 'Hồ Sơ Của Tôi' :
               currentView === 'DRAW' ? 'Vẽ Tranh Tự Do' : 
               currentView === 'HISTORY' ? 'Lịch Sử Tách' :
               currentView === 'AUTO_PAINT' ? 'Họa Sĩ AI' :
               currentView === 'ADMIN_CHAT' ? 'Hỗ Trợ 1-1' :
               currentView === 'PUBLIC_CHAT' ? 'Phòng Chat Chung' :
               currentView === 'ADMIN' ? 'Admin Panel' : 'StyleExtract AI'}
            </h1>
          </div>

          {installPrompt && (
              <button 
                onClick={handleInstall}
                className="hidden md:flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:shadow-emerald-500/20 transition-all active:scale-95"
              >
                <Smartphone className="w-4 h-4" />
                Cài App Android
              </button>
          )}
        </header>

        {/* MAIN APP CONTAINER */}
        <div className={getContainerStyle()}>
          {/* Dragon & Phoenix Spirit Trails */}
          <div className="spirit-path">
             <div className="spirit phoenix-spirit"></div>
             <div className="spirit dragon-spirit"></div>
          </div>

          {/* Special VIP Borders CSS */}
          <style>{`
            .ssvip-border::before {
              background: linear-gradient(45deg, #ffd700, #ffaa00, #ffec8b, #DAA520, #ffd700);
              background-size: 200%;
            }
            .ultra-border::before {
              filter: hue-rotate(90deg) brightness(1.5);
              animation: border-rotate 2s linear infinite;
            }
            .lifetime-border::before {
              background: linear-gradient(45deg, #00d2ff, #000000, #3a7bd5, #00d2ff);
              background-size: 300%;
              animation: border-rotate 3s linear infinite;
              filter: brightness(1.3);
            }
            .moderator-border::before {
              background: linear-gradient(45deg, #059669, #10b981, #34d399, #059669);
              background-size: 200%;
              animation: border-rotate 3s linear infinite;
              filter: brightness(1.2);
            }
          `}</style>

          <div className={`bg-[#0f1522] rounded-[1.3rem] p-4 md:p-8 relative z-10 ${currentView === 'DRAW' || currentView === 'ADMIN_CHAT' || currentView === 'PUBLIC_CHAT' || currentView === 'HISTORY' ? 'h-[80vh]' : ''}`}>
             
             {currentView === 'HOME' && renderHome()}

             {currentView === 'PROFILE' && (
                <ProfileView 
                   profile={currentUser.profile}
                   vipLevel={currentUser.vipLevel}
                   credits={currentUser.credits}
                   onUpdateAvatar={handleUpdateAvatar}
                   onEquipFrame={handleEquipFrame}
                   onBuyFrame={handleBuyFrame}
                   onWatchAd={handleWatchAd}
                />
             )}

             {currentView === 'HISTORY' && (
                <HistoryView 
                   history={processedHistory}
                   onSelect={handleHistorySelect}
                   onClear={handleHistoryClear}
                   onDeleteItem={handleHistoryDeleteOne}
                   vipLevel={currentUser.vipLevel}
                   maxStorageBytes={STORAGE_LIMITS[currentUser.vipLevel]}
                   usedStorageBytes={calculateTotalHistorySize(processedHistory)}
                   onOpenShop={() => setShowShop(true)}
                />
             )}

             {currentView === 'DRAW' && <FreeDraw 
                 vipLevel={currentUser.vipLevel} 
                 onOpenShop={() => setShowShop(true)}
             />}
             
             {currentView === 'AUTO_PAINT' && (
                <AutoPainter 
                   vipLevel={currentUser.vipLevel} 
                   onOpenShop={() => setShowShop(true)}
                />
             )}

             {currentView === 'ADMIN_CHAT' && (
                <AdminChat 
                   currentUser={currentUser} 
                   onOpenShop={() => setShowShop(true)}
                />
             )}

             {currentView === 'PUBLIC_CHAT' && (
                <PublicChat 
                   currentUser={currentUser}
                   onUpdateUser={setCurrentUser}
                   onOpenShop={() => setShowShop(true)}
                />
             )}
             
             {currentView === 'ADMIN' && <AdminPanel currentUser={currentUser} />}
          </div>
        </div>

        {/* FOOTER */}
        <footer className="mt-12 text-center pb-8">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0f1522] border border-gray-800 shadow-lg">
              <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
              <span className="text-gray-400 text-sm font-medium">
                Powered by <span className="neon-text-rainbow text-base ml-1">光虎 Master G</span>
              </span>
            </div>
        </footer>

      </div>
    </div>
  );
};

export default App;