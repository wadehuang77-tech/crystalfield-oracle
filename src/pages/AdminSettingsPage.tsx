import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { adminApi } from '../lib/api';
import { Shield, UserPlus, Trash2, Loader2, Mail, Check, X, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Admin {
  id: string;
  email: string;
  created_at: string;
}

export function AdminSettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      const { isAdmin } = await adminApi.check();
      if (isAdmin) {
        setIsAdmin(true);
        await loadAdmins();
      } else {
        setIsAdmin(false);
      }
    } catch {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const loadAdmins = async () => {
    try {
      const { admins } = await adminApi.admins();
      setAdmins(admins);
    } catch {
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setAdding(true);

    try {
      await adminApi.addAdmin(newAdminEmail.toLowerCase().trim());
      setSuccess(`成功添加 ${newAdminEmail} 為管理員`);
      setNewAdminEmail('');
      await loadAdmins();
    } catch (error) {
      setError(error instanceof Error ? error.message : '添加管理員失敗，請稍後再試');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveAdmin = async (adminId: string, email: string) => {
    if (adminId === user?.id) {
      setError('無法移除自己的管理員權限');
      return;
    }

    if (!confirm(`確定要移除 ${email} 的管理員權限嗎？`)) {
      return;
    }

    try {
      await adminApi.removeAdmin(adminId);
      setSuccess(`成功移除 ${email} 的管理員權限`);
      await loadAdmins();
    } catch (error) {
      setError(error instanceof Error ? error.message : '移除管理員失敗，請稍後再試');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white min-h-screen flex items-center justify-center px-4">
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-blue-500/30 rounded-2xl p-6 shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 border border-red-500/40 flex items-center justify-center text-red-500">
            <Shield className="w-7 h-7" strokeWidth={1.4} />
          </div>
          <h1 className="font-serif text-2xl text-blue-100 tracking-[0.25em] mb-4">無權限訪問</h1>
          <p className="text-blue-300/80 mb-7 tracking-wide">您沒有管理員權限，無法訪問此頁面。</p>
          <button onClick={() => navigate('/')} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-blue-500/30 rounded-xl hover:bg-slate-700/60 hover:border-blue-400/50 transition-all text-blue-200 !text-xs">
            返　回　首　頁
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white py-6 sm:py-14 px-3 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/admin')}
          className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 transition-colors text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.4} />
          返　回　用　戶　列　表
        </button>

        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-blue-500/30 rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="pb-7 mb-7 border-b border-blue-500/15">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 border border-blue-500/40 flex items-center justify-center text-blue-400 flex-shrink-0">
                <Shield className="w-5 h-5" strokeWidth={1.4} />
              </div>
              <div>
                <h1 className="font-serif text-xl sm:text-3xl text-blue-100 tracking-[0.2em] sm:tracking-[0.25em]">管 理 員 設 定</h1>
                <p className="text-xs text-blue-300/70 tracking-[0.25em] mt-2">系 統 權 限 管 理</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-5 border border-red-500/40 bg-red-500/8 px-4 py-3 flex items-center gap-3">
              <X className="w-4 h-4 text-red-500 flex-shrink-0" strokeWidth={1.6} />
              <p className="text-blue-200 text-sm tracking-wide">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-5 border border-blue-500/40 bg-blue-500/8 px-4 py-3 flex items-center gap-3">
              <Check className="w-4 h-4 text-blue-300 flex-shrink-0" strokeWidth={1.6} />
              <p className="text-blue-200 text-sm tracking-wide">{success}</p>
            </div>
          )}

          <div className="mb-9">
            <h2 className="font-serif text-base text-blue-100 tracking-[0.22em] mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-400" strokeWidth={1.4} />
              添加新管理員
            </h2>
            <form onSubmit={handleAddAdmin} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500/70" strokeWidth={1.4} />
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="輸入用戶的電子郵件"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-blue-500/30 hover:border-blue-500/55 focus:border-blue-500 text-blue-100 placeholder-ivory-300/40 text-sm tracking-wide outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={adding}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-blue-500/30 rounded-xl hover:bg-slate-700/60 hover:border-blue-400/50 transition-all text-blue-200 !text-xs disabled:opacity-50 disabled:cursor-not-allowed sm:min-w-[7rem] justify-center"
              >
                {adding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.4} />
                    添 加 中
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" strokeWidth={1.4} />
                    添　加
                  </>
                )}
              </button>
            </form>
          </div>

          <div>
            <h2 className="font-serif text-base text-blue-100 tracking-[0.22em] mb-4 flex items-center gap-3">
              <span>當前管理員</span>
              <span className="text-blue-300 font-mono text-sm">{admins.length}</span>
            </h2>
            <div className="space-y-3">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="border border-blue-500/20 px-4 py-4 flex items-center justify-between gap-4 hover:border-blue-500/45 hover:bg-blue-500/5 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 border border-blue-500/35 flex items-center justify-center text-blue-400 flex-shrink-0">
                      <Shield className="w-4 h-4" strokeWidth={1.4} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-blue-100 text-sm tracking-wide flex items-center gap-2 flex-wrap">
                        <span className="truncate">{admin.email}</span>
                        {admin.id === user?.id && (
                          <span className="text-[10px] border border-blue-400/55 text-blue-300 px-1.5 py-0.5 tracking-[0.18em]">
                            您
                          </span>
                        )}
                      </p>
                      <p className="text-blue-400/65 text-xs tracking-wide mt-1">
                        加入時間：{formatDate(admin.created_at)}
                      </p>
                    </div>
                  </div>
                  {admin.id !== user?.id && (
                    <button
                      onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                      className="text-red-500/85 hover:text-red-500 hover:bg-red-500/10 p-2 border border-red-500/30 hover:border-red-500/55 transition-all flex-shrink-0"
                      title="移除管理員"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              ))}

              {admins.length === 0 && (
                <div className="text-center py-12 border border-dashed border-blue-500/15">
                  <Shield className="w-10 h-10 text-blue-400/30 mx-auto mb-3" strokeWidth={1.3} />
                  <p className="text-blue-300/60 text-sm tracking-wide">目前沒有管理員</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-7 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-blue-400/60 hover:text-blue-300 text-sm tracking-[0.18em] transition-colors"
          >
            ← 返 回 首 頁
          </button>
        </div>
      </div>
    </div>
  );
}
