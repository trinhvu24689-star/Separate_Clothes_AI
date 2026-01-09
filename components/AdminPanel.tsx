import React, { useState, useEffect } from 'react';
import { User, VipLevel, AccountStatus } from '../types';
import { Trash2, Save, ShieldAlert, Star, Zap, Lock, Unlock, AlertTriangle, Search, Activity, Skull, Database, UserCog, Plus } from 'lucide-react';
import { Button } from './Button';

interface AdminPanelProps {
  currentUser: User;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [buffAmount, setBuffAmount] = useState<number>(1000);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [adminLog, setAdminLog] = useState<string[]>([]);

  // Check if moderator (restricted access)
  const isModerator = currentUser.vipLevel === 'MODERATOR';

  useEffect(() => {
    const usersStr = localStorage.getItem('styleExtract_users_db');
    if (usersStr) {
      setUsers(JSON.parse(usersStr));
    }
  }, []);

  const addLog = (msg: string) => {
      const timestamp = new Date().toLocaleTimeString();
      setAdminLog(prev => [`[${timestamp}] ${msg}`, ...prev].slice(0, 50));
  };

  const saveUsers = (updatedUsers: User[]) => {
    setUsers(updatedUsers);
    localStorage.setItem('styleExtract_users_db', JSON.stringify(updatedUsers));
  };

  // --- TOOLS ---

  const handleBuffStars = (username: string) => {
     const amount = Number(buffAmount);
     
     if (isModerator && amount > 1000) {
         alert("Người Kiểm Duyệt chỉ được buff tối đa 1000 sao/lần.");
         return;
     }

     if (isNaN(amount) || amount < 1) {
         alert("Số lượng sao không hợp lệ.");
         return;
     }

     // Admin unlimited, Mod limited logic applied above
     if (!isModerator && amount > 999999999) {
          alert("Số lượng quá lớn.");
          return;
     }

     const updated = users.map(u => {
         if (u.username === username) {
             const newCredits = Math.min(u.credits + amount, 99999999999); // Cap at reasonable max
             addLog(`Buffed ${amount} stars to ${username}. Total: ${newCredits} (By ${currentUser.username})`);
             return { ...u, credits: newCredits };
         }
         return u;
     });
     saveUsers(updated);
  };

  const handleStatusChange = (username: string, newStatus: AccountStatus) => {
      // Moderator cannot BAN
      if (isModerator && newStatus === 'BANNED') {
          alert("Bạn không có quyền BAN vĩnh viễn user.");
          return;
      }

      const updated = users.map(u => {
          if (u.username === username) {
              addLog(`Changed status of ${username} to ${newStatus} (By ${currentUser.username})`);
              return { ...u, status: newStatus };
          }
          return u;
      });
      saveUsers(updated);
  };

  const handleVipUpgrade = (username: string, level: VipLevel) => {
      if (isModerator) {
          const allowedLevels = ['NONE', 'VIP', 'SSVIP'];
          if (!allowedLevels.includes(level)) {
              alert("Người Kiểm Duyệt chỉ có thể set VIP hoặc SSVIP.");
              return;
          }
      }

      const updated = users.map(u => {
          if (u.username === username) {
              addLog(`Upgraded ${username} to ${level} (By ${currentUser.username})`);
              return { ...u, vipLevel: level };
          }
          return u;
      });
      saveUsers(updated);
  };

  const handleCheatStrike = (username: string) => {
      const updated = users.map(u => {
          if (u.username === username) {
              const newStrikes = (u.cheatStrikes || 0) + 1;
              let newStatus = u.status;
              
              if (newStrikes >= 3) {
                  addLog(`⚠️ WARNING: ${username} reached ${newStrikes} strikes. Account Limited.`);
                  newStatus = 'LIMITED';
                  alert(`Cảnh báo: User ${username} đã vi phạm lần 3. Giới hạn tài khoản.`);
              }
              if (newStrikes >= 5) {
                   // Moderators cannot ban, so it just caps at 5 strikes and alerts admin in log
                  addLog(`🚫 CRITICAL: ${username} reached ${newStrikes} strikes. Escalation required.`);
                  if (!isModerator) {
                      newStatus = 'BANNED';
                      // Add simulated IP ban
                      const bannedIps = JSON.parse(localStorage.getItem('styleExtract_banned_ips') || '[]');
                      if (u.ipAddress && !bannedIps.includes(u.ipAddress)) {
                          bannedIps.push(u.ipAddress);
                          localStorage.setItem('styleExtract_banned_ips', JSON.stringify(bannedIps));
                      }
                  } else {
                      alert("User đã đạt 5 gậy. Vui lòng báo cáo Admin cấp cao để BAN.");
                  }
              }

              return { ...u, cheatStrikes: newStrikes, status: newStatus };
          }
          return u;
      });
      saveUsers(updated);
  };

  const handleDeleteUser = (username: string) => {
    if (isModerator) return; // Hidden in UI, but double check
    if (confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn user ${username}?`)) {
       const updated = users.filter(u => u.username !== username);
       saveUsers(updated);
       addLog(`Deleted user ${username}`);
    }
  };

  const handleScanIntegrity = () => {
      if (isModerator) {
          alert("Tính năng này yêu cầu quyền Admin cấp cao.");
          return;
      }
      addLog("Starting System Integrity Scan...");
      let foundCheaters = 0;
      const updated = users.map(u => {
          // Detect anomaly: High credits but Low VIP (Suspicious)
          if (u.credits > 5000 && u.vipLevel === 'NONE' && u.cheatStrikes < 3) {
              addLog(`Detected anomaly on ${u.username}: Excessive credits for Member.`);
              foundCheaters++;
              return { ...u, cheatStrikes: (u.cheatStrikes || 0) + 1 };
          }
          return u;
      });
      if (foundCheaters > 0) {
          saveUsers(updated);
          alert(`Đã quét xong. Phát hiện ${foundCheaters} tài khoản nghi vấn.`);
      } else {
          addLog("System Clean. No anomalies detected.");
          alert("Hệ thống an toàn. Không phát hiện bất thường.");
      }
  };

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className={`border p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl ${isModerator ? 'bg-gradient-to-r from-emerald-900/40 to-black border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'bg-gradient-to-r from-red-900/40 to-black border-red-500/50 shadow-[0_0_30px_rgba(220,38,38,0.2)]'}`}>
        <div className="flex items-center gap-4">
            <div className={`p-4 rounded-full shadow-lg animate-pulse ${isModerator ? 'bg-emerald-600 shadow-emerald-500/50' : 'bg-red-600 shadow-red-500/50'}`}>
                {isModerator ? <UserCog className="text-white w-8 h-8" /> : <ShieldAlert className="text-white w-8 h-8" />}
            </div>
            <div>
                <h2 className={`text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r uppercase tracking-widest ${isModerator ? 'from-emerald-400 to-green-400' : 'from-red-400 to-orange-400'}`}>
                    {isModerator ? 'Moderator Panel' : 'Admin Control Center'}
                </h2>
                <p className={`font-mono text-xs mt-1 ${isModerator ? 'text-emerald-300' : 'text-red-300'}`}>
                    {isModerator ? 'ACCESS LEVEL: MODERATOR (30% POWER)' : 'ACCESS LEVEL: GOD MODE | SYSTEM SECURE'}
                </p>
            </div>
        </div>
        {!isModerator && (
            <div className="flex gap-2">
                <Button onClick={handleScanIntegrity} variant="danger" icon={<Activity className="w-4 h-4" />}>
                    Quét Gian Lận
                </Button>
            </div>
        )}
      </div>

      {/* TOOLBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search */}
          <div className="bg-[#131B2C] p-4 rounded-2xl border border-gray-800 flex items-center gap-3">
              <Search className="text-gray-500" />
              <input 
                  type="text" 
                  placeholder="Tìm kiếm user..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent w-full text-white outline-none"
              />
          </div>

          {/* Buff Config */}
          <div className="bg-[#131B2C] p-4 rounded-2xl border border-gray-800 flex items-center gap-3">
              <Star className="text-yellow-500" />
              <input 
                  type="number" 
                  value={buffAmount}
                  onChange={(e) => setBuffAmount(parseInt(e.target.value) || 0)}
                  className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white w-24 text-center font-bold"
              />
              <span className="text-gray-400 text-sm">Amount to Buff</span>
          </div>

          {/* Logs */}
          <div className="bg-black/50 p-4 rounded-2xl border border-gray-800 h-24 overflow-y-auto font-mono text-[10px] text-green-400">
              {adminLog.length === 0 ? <span className="opacity-50">System Logs initialized...</span> : adminLog.map((log, i) => (
                  <div key={i}>{log}</div>
              ))}
          </div>
      </div>

      {/* USER TABLE */}
      <div className="overflow-x-auto bg-[#131B2C] rounded-3xl border border-gray-800 shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-wider">
              <th className="p-5">User Info</th>
              <th className="p-5">Status / Security</th>
              <th className="p-5">VIP / Credits</th>
              <th className="p-5">Quick Actions</th>
              {!isModerator && <th className="p-5 text-right">Danger Zone</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredUsers.map(user => (
              <tr key={user.username} className={`group hover:bg-gray-800/30 transition-colors ${user.status === 'BANNED' ? 'bg-red-900/10' : ''}`}>
                
                {/* USER INFO */}
                <td className="p-5">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${user.status === 'BANNED' ? 'bg-red-600' : 'bg-gradient-to-br from-purple-500 to-indigo-500'}`}>
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="font-bold text-white text-base">{user.username}</div>
                            <div className="font-mono text-gray-500 text-xs">{user.password}</div>
                            <div className="text-[10px] text-gray-600">IP: {user.ipAddress || 'Unknown'}</div>
                        </div>
                    </div>
                </td>

                {/* STATUS & SECURITY */}
                <td className="p-5">
                    <div className="flex flex-col gap-2">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold w-fit ${
                            user.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400' :
                            user.status === 'BANNED' ? 'bg-red-500/20 text-red-500 animate-pulse' :
                            'bg-yellow-500/10 text-yellow-400'
                        }`}>
                            {user.status === 'BANNED' ? <Skull size={12} /> : user.status === 'LOCKED' ? <Lock size={12} /> : <Unlock size={12} />}
                            {user.status}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                            <AlertTriangle size={12} className={user.cheatStrikes > 0 ? 'text-orange-500' : 'text-gray-700'} />
                            Strikes: <span className={`font-bold ${user.cheatStrikes >= 3 ? 'text-red-500' : 'text-white'}`}>{user.cheatStrikes}/5</span>
                        </div>
                    </div>
                </td>

                {/* VIP & CREDITS */}
                <td className="p-5">
                    <div className="space-y-2">
                         {/* VIP Select */}
                         <div className="flex items-center gap-2">
                            <select 
                                value={user.vipLevel}
                                onChange={(e) => handleVipUpgrade(user.username, e.target.value as VipLevel)}
                                className="bg-gray-900 border border-gray-700 text-white text-xs rounded px-2 py-1 outline-none focus:border-purple-500"
                            >
                                <option value="NONE">MEMBER</option>
                                <option value="VIP">VIP</option>
                                <option value="SSVIP">SSVIP</option>
                                {!isModerator && (
                                    <>
                                        <option value="ULTRA_INFINITY">ULTRA</option>
                                        <option value="LIFETIME">LIFETIME</option>
                                        <option value="MODERATOR">MODERATOR</option>
                                    </>
                                )}
                            </select>
                            {!isModerator && (
                                <button 
                                    onClick={() => handleVipUpgrade(user.username, 'LIFETIME')}
                                    className="p-1 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/40"
                                    title="Max Upgrade"
                                >
                                    <Zap size={12} />
                                </button>
                            )}
                         </div>

                         {/* Credits & Prominent Buff Button */}
                         <div className="flex items-center gap-3 whitespace-nowrap">
                            <span className="font-mono font-bold text-yellow-400 min-w-[50px]">
                                {user.credits.toLocaleString()}
                            </span>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation(); // Stop row click
                                    handleBuffStars(user.username);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-green-900/50 transition-all active:scale-95 border border-green-500/50"
                                title={`Cộng ngay ${buffAmount.toLocaleString()} sao`}
                            >
                                <Plus size={12} strokeWidth={3} /> Buff {buffAmount.toLocaleString()}
                            </button>
                         </div>
                    </div>
                </td>

                {/* QUICK ACTIONS */}
                <td className="p-5">
                    <div className="flex gap-2">
                        {user.status !== 'LOCKED' && user.status !== 'BANNED' ? (
                            <button onClick={() => handleStatusChange(user.username, 'LOCKED')} className="p-2 bg-gray-800 text-yellow-500 rounded hover:bg-yellow-900/30" title="Lock Account">
                                <Lock size={16} />
                            </button>
                        ) : (
                            <button onClick={() => handleStatusChange(user.username, 'ACTIVE')} className="p-2 bg-gray-800 text-green-500 rounded hover:bg-green-900/30" title="Unlock Account">
                                <Unlock size={16} />
                            </button>
                        )}
                        
                        <button onClick={() => handleStatusChange(user.username, 'LIMITED')} className="p-2 bg-gray-800 text-orange-500 rounded hover:bg-orange-900/30" title="Limit Account">
                            <AlertTriangle size={16} />
                        </button>

                        <button onClick={() => handleCheatStrike(user.username)} className="p-2 bg-red-900/30 text-red-400 rounded hover:bg-red-900/50 border border-red-900" title="Add Cheat Strike">
                            <ShieldAlert size={16} />
                        </button>
                    </div>
                </td>

                {/* DANGER ZONE (Admin Only) */}
                {!isModerator && (
                    <td className="p-5 text-right">
                        <div className="flex justify-end gap-2">
                            <button 
                                onClick={() => handleStatusChange(user.username, 'BANNED')} 
                                className="p-2 bg-red-600 text-white rounded hover:bg-red-700 shadow-lg shadow-red-900/20" 
                                title="BAN DEVICE & ACCOUNT"
                            >
                                <Skull size={16} />
                            </button>
                            <button 
                                onClick={() => handleDeleteUser(user.username)}
                                className="p-2 bg-gray-800 text-gray-400 rounded hover:text-red-400 hover:bg-gray-700"
                                title="Delete Data"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </td>
                )}

              </tr>
            ))}
            {filteredUsers.length === 0 && (
                <tr>
                    <td colSpan={isModerator ? 4 : 5} className="p-8 text-center text-gray-500">
                        No users found matching "{searchTerm}"
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Instructions */}
      <div className="grid md:grid-cols-2 gap-4 text-xs text-gray-500 bg-black/20 p-4 rounded-xl">
          <div>
              <strong className="text-gray-300">Role Capabilities:</strong>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                  <li><strong>Admin:</strong> 100% Power (Ban, Delete, System Scan, All VIPs).</li>
                  <li><strong>Moderator:</strong> 30% Power (Lock/Unlock, Limited Buff, Limit Status). Cannot Ban/Delete.</li>
              </ul>
          </div>
          <div>
              <strong className="text-gray-300">Tools Guide:</strong>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                  <li><strong>Buff:</strong> Moderator limit is 1000 stars. Admin unlimited.</li>
                  <li><strong>Strikes:</strong> 3 Strikes = Auto Limit. 5 Strikes = Warning (Mod) or Auto Ban (Admin).</li>
              </ul>
          </div>
      </div>
    </div>
  );
};