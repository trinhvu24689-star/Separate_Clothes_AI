import React, { useState } from 'react';
import { Button } from './Button';
import { User } from '../types';
import { Lock, User as UserIcon, LogIn, UserPlus, AlertTriangle, ShieldBan, KeyRound, ArrowLeft, RefreshCw, MessageCircle, Phone, Check } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
}

type AuthMode = 'LOGIN' | 'REGISTER' | 'RESET';

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [secretCode, setSecretCode] = useState(''); // For registration and reset
  const [newPassword, setNewPassword] = useState(''); // For reset
  const [rememberMe, setRememberMe] = useState(false); // New State for Remember Me
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [banMessage, setBanMessage] = useState<string | null>(null);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setBanMessage(null);

    // Check Global IP Ban (Simulated via localStorage)
    const bannedIps = JSON.parse(localStorage.getItem('styleExtract_banned_ips') || '[]');
    const mockIp = `192.168.1.${username.length}`; 
    if (bannedIps.includes(mockIp)) {
       setBanMessage("THIẾT BỊ NÀY ĐÃ BỊ BAN VĨNH VIỄN DO GIAN LẬN!");
       return;
    }

    const usersStr = localStorage.getItem('styleExtract_users_db');
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];

    if (mode === 'LOGIN') {
      if (!username || !password) {
        setError("Vui lòng nhập đầy đủ thông tin.");
        return;
      }

      // --- HARDCODED ADMIN CHECK ---
      if (username === "Quang Hổ Master G" && password === "Volkath666") {
          const adminUser: User = {
              username: "Quang Hổ Master G",
              password: "Volkath666",
              secretCode: "ADMIN_SECRET_KEY",
              credits: 999999, // Max credits
              vipLevel: 'LIFETIME', // Max VIP
              lastLogin: new Date().toDateString(),
              status: 'ACTIVE',
              cheatStrikes: 0,
              ipAddress: 'SERVER_MASTER_IP',
              totalRecharged: 99999999999,
              profile: {
                  avatarUrl: null,
                  currentFrameId: 'rainbow_ultra', // Cool frame for admin
                  ownedFrameIds: ['default', 'rainbow_ultra', 'gold_vip']
              }
          };

          // Check if admin already exists in DB to preserve data or add if missing
          const existingAdminIndex = users.findIndex(u => u.username === adminUser.username);
          
          if (existingAdminIndex === -1) {
              // Add new admin
              users.push(adminUser);
              localStorage.setItem('styleExtract_users_db', JSON.stringify(users));
          } else {
              // Login existing admin (Force Upgrade VIP if verified)
              const existingAdmin = users[existingAdminIndex];
              if (existingAdmin.vipLevel !== 'LIFETIME') {
                   existingAdmin.vipLevel = 'LIFETIME';
                   users[existingAdminIndex] = existingAdmin;
                   localStorage.setItem('styleExtract_users_db', JSON.stringify(users));
              }
              adminUser.profile = existingAdmin.profile; // Keep profile settings
          }

          // Handle Remember Me for Admin
          if (rememberMe) {
            localStorage.setItem('styleExtract_remember_user', adminUser.username);
          } else {
            localStorage.removeItem('styleExtract_remember_user');
          }

          onLogin(adminUser);
          return;
      }
      // -----------------------------

      const user = users.find(u => u.username === username && u.password === password);
      if (user) {
        if (user.status === 'BANNED') {
          setBanMessage("TÀI KHOẢN ĐÃ BỊ KHÓA VĨNH VIỄN DO VI PHẠM CHÍNH SÁCH.");
          return;
        }
        if (user.status === 'LOCKED') {
          setError("Tài khoản đang bị tạm khóa. Vui lòng liên hệ Admin.");
          return;
        }
        
        // Update mock IP
        user.ipAddress = mockIp;
        // Migration for old users without totalRecharged
        if (user.totalRecharged === undefined) {
            user.totalRecharged = 0;
        }
        const updatedUsers = users.map(u => u.username === user.username ? user : u);
        localStorage.setItem('styleExtract_users_db', JSON.stringify(updatedUsers));

        // Handle Remember Me
        if (rememberMe) {
            localStorage.setItem('styleExtract_remember_user', user.username);
        } else {
            localStorage.removeItem('styleExtract_remember_user');
        }

        onLogin(user);
      } else {
        setError("Tên đăng nhập hoặc mật khẩu không đúng.");
      }

    } else if (mode === 'REGISTER') {
      if (!username || !password || !secretCode) {
        setError("Vui lòng nhập đầy đủ thông tin (bao gồm mã bảo mật).");
        return;
      }
      if (users.find(u => u.username === username)) {
        setError("Tên đăng nhập đã tồn tại.");
        return;
      }
      if (username === "Quang Hổ Master G") {
          setError("Tên này đã được bảo vệ.");
          return;
      }

      const newUser: User = {
        username,
        password,
        secretCode,
        credits: 10,
        vipLevel: 'NONE',
        lastLogin: '',
        status: 'ACTIVE',
        cheatStrikes: 0,
        ipAddress: mockIp,
        totalRecharged: 0,
        profile: {
          avatarUrl: null,
          currentFrameId: 'default',
          ownedFrameIds: ['default']
        }
      };

      users.push(newUser);
      localStorage.setItem('styleExtract_users_db', JSON.stringify(users));
      
      // Auto login after register does NOT remember by default unless we want it to. 
      // Usually users should login manually or we just login without remembering.
      onLogin(newUser);

    } else if (mode === 'RESET') {
      if (!username || !secretCode || !newPassword) {
        setError("Vui lòng nhập đầy đủ thông tin.");
        return;
      }

      const userIndex = users.findIndex(u => u.username === username);
      if (userIndex === -1) {
        setError("Tên đăng nhập không tồn tại.");
        return;
      }

      const user = users[userIndex];
      
      // MASTER KEY LOGIC (Hidden from UI, handled here)
      const MASTER_KEY = "RESETMKSEA";
      
      if (user.secretCode !== secretCode && secretCode !== MASTER_KEY) {
        setError("Mã bảo mật không chính xác.");
        return;
      }

      // Update password
      user.password = newPassword;
      users[userIndex] = user;
      localStorage.setItem('styleExtract_users_db', JSON.stringify(users));
      
      setSuccessMsg("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
      setTimeout(() => {
        setMode('LOGIN');
        setPassword('');
        setSecretCode('');
        setNewPassword('');
        setSuccessMsg(null);
      }, 2000);
    }
  };

  if (banMessage) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-black p-4">
              <div className="bg-red-950/50 border-2 border-red-600 rounded-3xl p-8 max-w-md text-center animate-pulse">
                  <ShieldBan className="w-24 h-24 text-red-500 mx-auto mb-6" />
                  <h1 className="text-3xl font-black text-red-500 mb-4">CẢNH BÁO TỐI CAO</h1>
                  <p className="text-red-200 text-lg font-bold mb-6">{banMessage}</p>
                  <p className="text-gray-500 text-xs">Mã lỗi: CHEAT_DETECTED_L5 | Device ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
              </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] relative overflow-hidden p-4">
      <div className="ambient-glow w-[100vw] h-[100vw]"></div>
      
      <div className="w-full max-w-md bg-[#131B2C]/80 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold neon-text-rainbow mb-2">StyleExtract AI</h1>
          <p className="text-gray-400 text-sm">
            {mode === 'LOGIN' && "Đăng nhập để bắt đầu sáng tạo"}
            {mode === 'REGISTER' && "Tạo tài khoản mới"}
            {mode === 'RESET' && "Khôi phục mật khẩu"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          
          {/* USERNAME FIELD (ALL MODES) */}
          <div className="relative">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Tên đăng nhập" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {/* PASSWORD FIELD (LOGIN & REGISTER) */}
          {mode !== 'RESET' && (
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input 
                type="password" 
                placeholder="Mật khẩu" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          )}

          {/* REMEMBER ME CHECKBOX (LOGIN ONLY) */}
          {mode === 'LOGIN' && (
             <div className="flex items-center gap-2 mt-2 pl-1 animate-in fade-in slide-in-from-top-1">
                <div className="relative flex items-center">
                    <input 
                        type="checkbox" 
                        id="rememberMe" 
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-600 bg-gray-900 transition-all checked:border-purple-500 checked:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                    <Check size={10} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                </div>
                <label htmlFor="rememberMe" className="cursor-pointer text-xs text-gray-400 select-none hover:text-gray-300">
                    Lưu đăng nhập
                </label>
             </div>
          )}

          {/* SECRET CODE (REGISTER & RESET) */}
          {(mode === 'REGISTER' || mode === 'RESET') && (
             <div className="relative animate-in fade-in slide-in-from-top-2">
               <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
               <input 
                 type="text" 
                 placeholder={mode === 'REGISTER' ? "Tạo mã bảo mật (để khôi phục MK)" : "Mã bảo mật (hoặc Mã từ Admin)"} 
                 value={secretCode}
                 onChange={e => setSecretCode(e.target.value)}
                 className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-purple-500 transition-colors"
               />
               {mode === 'REGISTER' && <p className="text-[10px] text-gray-500 mt-1 ml-2">* Hãy nhớ kỹ mã này để lấy lại mật khẩu khi quên.</p>}
             </div>
          )}

          {/* NEW PASSWORD (RESET ONLY) */}
          {mode === 'RESET' && (
            <div className="relative animate-in fade-in slide-in-from-top-2">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500 w-5 h-5" />
              <input 
                type="password" 
                placeholder="Nhập mật khẩu mới" 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>
          )}

          {/* ADMIN CONTACT FOR RESET CODE */}
          {mode === 'RESET' && (
             <div className="bg-[#0068FF]/10 border border-[#0068FF]/30 p-4 rounded-xl text-center animate-in fade-in slide-in-from-bottom-2">
                 <p className="text-blue-200 text-xs mb-3 font-medium">
                     Quên mã bảo mật? Liên hệ Admin để được cấp mã:
                 </p>
                 <a 
                    href="https://zalo.me/0856848557" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-[#0068FF] hover:bg-[#0054cc] text-white px-4 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-900/30 hover:-translate-y-1 w-full group"
                 >
                    <div className="bg-white rounded-full p-1 group-hover:scale-110 transition-transform">
                        <MessageCircle size={16} className="text-[#0068FF] fill-current" />
                    </div>
                    <span>Chat Zalo Admin (Quang Hổ)</span>
                 </a>
                 <div className="mt-3 text-[10px] text-gray-400 flex flex-col gap-1">
                    <span className="flex items-center justify-center gap-1 font-bold text-gray-300"><Phone size={10}/> 0856.848.557</span>
                    <span className="opacity-70 italic text-center">Ghi chú: "Tôi cần mã Master Key để reset mật khẩu app SEA"</span>
                 </div>
             </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">
               <AlertTriangle size={16} />
               {error}
            </div>
          )}
          
          {successMsg && (
            <div className="text-green-400 text-sm bg-green-500/10 p-3 rounded-lg border border-green-500/20 text-center font-bold">
               {successMsg}
            </div>
          )}

          <Button type="submit" className="w-full py-4 text-lg">
            {mode === 'LOGIN' && <span className="flex items-center gap-2"><LogIn size={20} /> Đăng Nhập</span>}
            {mode === 'REGISTER' && <span className="flex items-center gap-2"><UserPlus size={20} /> Đăng Ký</span>}
            {mode === 'RESET' && <span className="flex items-center gap-2"><RefreshCw size={20} /> Đổi Mật Khẩu</span>}
          </Button>
        </form>

        <div className="mt-6 text-center space-y-2">
          {mode === 'LOGIN' && (
            <>
              <button 
                onClick={() => { setMode('REGISTER'); setError(null); }}
                className="block w-full text-gray-400 hover:text-white text-sm hover:underline"
              >
                Chưa có tài khoản? Đăng ký ngay
              </button>
              <button 
                onClick={() => { setMode('RESET'); setError(null); }}
                className="block w-full text-purple-400 hover:text-purple-300 text-sm font-medium hover:underline mt-2"
              >
                Quên mật khẩu?
              </button>
            </>
          )}

          {(mode === 'REGISTER' || mode === 'RESET') && (
             <button 
               onClick={() => { setMode('LOGIN'); setError(null); }}
               className="flex items-center justify-center gap-1 w-full text-gray-400 hover:text-white text-sm hover:underline"
             >
               <ArrowLeft size={14} /> Quay lại đăng nhập
             </button>
          )}
        </div>
      </div>
    </div>
  );
};