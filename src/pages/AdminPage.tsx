import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { adminApi, Profile, GuestEmail, AdminOrder } from '../lib/api';
import { Shield, Users, Calendar, Mail, Loader2, Settings, Download, Filter, UserCheck, BarChart3, Receipt, Coins, Trash2, BookOpen, CheckSquare, Square } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { OrderReadingModal } from '../components/OrderReadingModal';
import { formatDateTimeTW } from '../lib/dateFormat';
import { formatOrderStatus, formatPaymentType } from '../lib/orderFormat';

type UserProfile = Profile;

type Tab = 'registered' | 'guests' | 'orders';

export function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('registered');

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [occupations, setOccupations] = useState<string[]>([]);
  const [selectedOccupation, setSelectedOccupation] = useState<string>('all');

  const [guestEmails, setGuestEmails] = useState<GuestEmail[]>([]);
  const [guestLoading, setGuestLoading] = useState(false);

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [ordersSummary, setOrdersSummary] = useState<{ paid_count: number; revenue: number }>({ paid_count: 0, revenue: 0 });
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');
  const [readingOrderId, setReadingOrderId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

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
        await Promise.all([loadUsers(), loadGuestEmails(), loadOrders('all')]);
      } else {
        setIsAdmin(false);
      }
    } catch {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { users } = await adminApi.users();
      setUsers(users);
      setFilteredUsers(users);

      const uniqueOccupations = Array.from(
        new Set(
          users
            .map((u) => u.occupation)
            .filter((o): o is string => o !== null && o !== '')
        )
      ).sort();
      setOccupations(uniqueOccupations);
    } catch {
    }
  };

  const loadGuestEmails = async () => {
    setGuestLoading(true);
    try {
      const { guests } = await adminApi.guests();
      setGuestEmails(guests);
    } catch {
    } finally {
      setGuestLoading(false);
    }
  };

  const loadOrders = async (status: 'all' | 'paid' | 'pending' | 'failed') => {
    setOrdersLoading(true);
    try {
      const { orders, summary } = await adminApi.orders(status === 'all' ? undefined : status);
      setOrders(orders);
      setOrdersSummary(summary);
    } catch {
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleDeleteOrder = async (order: AdminOrder) => {
    const ok = confirm(
      `確定要刪除這筆訂單嗎？\n\n訂單號：${order.merchant_trade_no}\nEmail：${order.email}\n商品：${order.item_name}\n金額：NT$ ${order.amount.toLocaleString('en-US')}\n\n此動作無法復原。`,
    );
    if (!ok) return;
    try {
      await adminApi.deleteOrder(order.id);
      setSelectedOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
      await loadOrders(orderStatusFilter);
    } catch (error) {
      alert(error instanceof Error ? error.message : '刪除失敗，請稍後再試');
    }
  };

  const toggleOrderSelected = (id: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedOrderIds((prev) => {
      const allVisible = orders.map((o) => o.id);
      const everyChecked = allVisible.length > 0 && allVisible.every((id) => prev.has(id));
      if (everyChecked) {
        const next = new Set(prev);
        for (const id of allVisible) next.delete(id);
        return next;
      }
      const next = new Set(prev);
      for (const id of allVisible) next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedOrderIds);
    if (ids.length === 0) return;
    const sample = orders.filter((o) => selectedOrderIds.has(o.id)).slice(0, 5);
    const sampleText = sample.map((o) => `• ${o.merchant_trade_no}（${o.status}）${o.email}`).join('\n');
    const more = ids.length > sample.length ? `\n...還有 ${ids.length - sample.length} 筆` : '';
    const ok = confirm(
      `確定要刪除 ${ids.length} 筆訂單嗎？\n\n${sampleText}${more}\n\n此動作無法復原。`,
    );
    if (!ok) return;
    setBulkDeleting(true);
    try {
      const res = await adminApi.bulkDeleteOrders(ids);
      setSelectedOrderIds(new Set());
      await loadOrders(orderStatusFilter);
      if (res.failed > 0) {
        alert(`刪除完成:成功 ${res.deleted} 筆,失敗 ${res.failed} 筆`);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : '批次刪除失敗,請稍後再試');
    } finally {
      setBulkDeleting(false);
    }
  };

  const allVisibleSelected = orders.length > 0 && orders.every((o) => selectedOrderIds.has(o.id));
  const someVisibleSelected = orders.some((o) => selectedOrderIds.has(o.id));

  useEffect(() => {
    if (isAdmin) loadOrders(orderStatusFilter);
    setSelectedOrderIds(new Set());
  }, [orderStatusFilter, isAdmin]);

  const exportOrdersToCSV = () => {
    const header = ['訂單號','Email','商品','金額 (NTD)','付款狀態','付款方式','綠界交易編號','建立時間 (台北)','付款時間 (台北)'];
    const rows = orders.map((o) => [
      o.merchant_trade_no,
      o.email,
      o.item_name,
      String(o.amount),
      formatOrderStatus(o.status),
      formatPaymentType(o.ecpay_payment_type),
      o.ecpay_trade_no ?? '',
      formatDateTimeTW(o.created_at, ''),
      formatDateTimeTW(o.paid_at, ''),
    ]);
    const csv = '﻿' + [header, ...rows].map((r) =>
      r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (selectedOccupation === 'all') {
      setFilteredUsers(users);
    } else {
      setFilteredUsers(users.filter((u) => u.occupation === selectedOccupation));
    }
  }, [selectedOccupation, users]);

  const exportRegisteredToCSV = () => {
    const csvContent = [
      ['電子郵件', '年齡', '性別', '工作類型', '療癒興趣', '註冊時間'].join(','),
      ...filteredUsers.map((u) =>
        [
          u.email,
          u.age || '',
          u.gender || '',
          u.occupation || '',
          u.healing_interest || '',
          formatDate(u.created_at),
        ]
          .map((field) => `"${field}"`)
          .join(',')
      ),
    ].join('\n');

    downloadCSV(csvContent, `註冊用戶_${selectedOccupation === 'all' ? '全部' : selectedOccupation}_${today()}.csv`);
  };

  const exportGuestEmailsToCSV = () => {
    const csvContent = [
      ['電子郵件', '來源', '提交時間'].join(','),
      ...guestEmails.map((g) =>
        [g.email, g.source, formatDate(g.created_at)]
          .map((field) => `"${field}"`)
          .join(',')
      ),
    ].join('\n');

    downloadCSV(csvContent, `訪客Email名單_${today()}.csv`);
  };

  const downloadCSV = (content: string, filename: string) => {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString: string) => formatDateTimeTW(dateString);

  const today = () => new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full text-center border border-red-500/20">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-500/10 rounded-full flex items-center justify-center">
            <Shield className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-blue-100 mb-4">無權限訪問</h1>
          <p className="text-blue-300 mb-6">您沒有管理員權限，無法訪問此頁面。</p>
          <button
            onClick={() => navigate('/')}
            className="bg-slate-800 hover:bg-blue-600 text-blue-100 px-6 py-3 rounded-lg font-semibold transition-all"
          >
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white py-6 sm:py-14 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-blue-500/30 rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="pb-7 mb-6 border-b border-blue-500/15">
            <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Shield className="w-5 h-5" strokeWidth={1.4} />
                </div>
                <div>
                  <h1 className="font-serif text-2xl sm:text-3xl text-blue-100 tracking-[0.25em]">管 理 後 台</h1>
                  <p className="text-xs text-blue-300/70 tracking-[0.25em] mt-2">用 戶 管 理 系 統</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link to="/admin/kpi" className="inline-flex items-center justify-center gap-2 px-4 sm:px-8 py-2.5 sm:py-3 bg-slate-800/60 border-2 border-blue-500/30 rounded-xl hover:bg-slate-700/60 hover:border-blue-400/50 transition-all text-blue-200 !text-xs">
                  <BarChart3 className="w-4 h-4" strokeWidth={1.4} />
                  KPI 儀表板
                </Link>
                <Link to="/admin/settings" className="inline-flex items-center justify-center gap-2 px-4 sm:px-8 py-2.5 sm:py-3 bg-slate-800/60 border-2 border-blue-500/30 rounded-xl hover:bg-slate-700/60 hover:border-blue-400/50 transition-all text-blue-200 !text-xs">
                  <Settings className="w-4 h-4" strokeWidth={1.4} />
                  管理員設定
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-6 flex-wrap text-sm text-blue-200/85">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-400" strokeWidth={1.4} />
                <span className="tracking-wide">註冊用戶</span>
                <span className="font-serif text-blue-300 text-base">{users.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-400" strokeWidth={1.4} />
                <span className="tracking-wide">訪客 Email</span>
                <span className="font-serif text-blue-300 text-base">{guestEmails.length}</span>
              </div>
            </div>
          </div>

          <div className="border-b border-blue-500/15 mb-6">
            <div className="flex overflow-x-auto -mx-1 px-1 scrollbar-thin">
              <button
                onClick={() => setActiveTab('registered')}
                className={`flex items-center gap-2 px-3 sm:px-5 py-3 text-xs sm:text-sm transition-colors border-b-2 tracking-wide whitespace-nowrap ${
                  activeTab === 'registered'
                    ? 'border-blue-400 text-blue-300'
                    : 'border-transparent text-blue-300/60 hover:text-blue-100'
                }`}
              >
                <Users className="w-4 h-4" strokeWidth={1.4} />
                註冊用戶
                <span className="text-xs text-blue-400/80 font-mono ml-1">{users.length}</span>
              </button>
              <button
                onClick={() => setActiveTab('guests')}
                className={`flex items-center gap-2 px-3 sm:px-5 py-3 text-xs sm:text-sm transition-colors border-b-2 tracking-wide whitespace-nowrap ${
                  activeTab === 'guests'
                    ? 'border-blue-400 text-blue-300'
                    : 'border-transparent text-blue-300/60 hover:text-blue-100'
                }`}
              >
                <Mail className="w-4 h-4" strokeWidth={1.4} />
                訪客 Email 名單
                <span className="text-xs text-blue-400/80 font-mono ml-1">{guestEmails.length}</span>
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`flex items-center gap-2 px-3 sm:px-5 py-3 text-xs sm:text-sm transition-colors border-b-2 tracking-wide whitespace-nowrap ${
                  activeTab === 'orders'
                    ? 'border-blue-400 text-blue-300'
                    : 'border-transparent text-blue-300/60 hover:text-blue-100'
                }`}
              >
                <Receipt className="w-4 h-4" strokeWidth={1.4} />
                訂單
                <span className="text-xs text-blue-400/80 font-mono ml-1">{ordersSummary.paid_count}</span>
              </button>
            </div>
          </div>

          <div>
            {activeTab === 'registered' && (
              <>
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <Filter className="w-4 h-4 text-blue-400/80" strokeWidth={1.4} />
                    <label htmlFor="occupation-filter" className="text-blue-300 text-sm tracking-wide">
                      工作篩選:
                    </label>
                    <select
                      id="occupation-filter"
                      value={selectedOccupation}
                      onChange={(e) => setSelectedOccupation(e.target.value)}
                      className="bg-slate-900 text-blue-100 px-4 py-2 border border-blue-500/30 hover:border-blue-500/60 focus:outline-none focus:border-blue-500 transition-colors min-w-[200px] text-sm"
                    >
                      <option value="all">全部用戶</option>
                      {occupations.map((occ) => (
                        <option key={occ} value={occ}>
                          {occ}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={exportRegisteredToCSV}
                    className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-blue-500/30 rounded-xl hover:bg-slate-700/60 hover:border-blue-400/50 transition-all text-blue-200 !text-xs"
                  >
                    <Download className="w-4 h-4" strokeWidth={1.4} />
                    匯出 Excel
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-blue-700">
                        <th className="text-left py-4 px-4 text-blue-300 font-semibold">電子郵件</th>
                        <th className="text-left py-4 px-4 text-blue-300 font-semibold">年齡</th>
                        <th className="text-left py-4 px-4 text-blue-300 font-semibold">性別</th>
                        <th className="text-left py-4 px-4 text-blue-300 font-semibold">工作類型</th>
                        <th className="text-left py-4 px-4 text-blue-300 font-semibold">療癒興趣</th>
                        <th className="text-left py-4 px-4 text-blue-300 font-semibold">註冊時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((userProfile) => (
                        <tr
                          key={userProfile.id}
                          className="border-b border-blue-700/50 hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-slate-400" />
                              <span className="text-blue-200">{userProfile.email}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-blue-300">
                            {userProfile.age || <span className="text-slate-500">未填寫</span>}
                          </td>
                          <td className="py-4 px-4 text-blue-300">
                            {userProfile.gender || <span className="text-slate-500">未填寫</span>}
                          </td>
                          <td className="py-4 px-4 text-blue-300">
                            {userProfile.occupation || <span className="text-slate-500">未填寫</span>}
                          </td>
                          <td className="py-4 px-4 text-blue-300">
                            {userProfile.healing_interest || <span className="text-slate-500">未填寫</span>}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                              <Calendar className="w-4 h-4" />
                              {formatDate(userProfile.created_at)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredUsers.length === 0 && users.length > 0 && (
                    <div className="text-center py-12">
                      <Filter className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400 text-lg">沒有符合篩選條件的用戶</p>
                    </div>
                  )}

                  {users.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400 text-lg">目前沒有註冊用戶</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'guests' && (
              <>
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                  <p className="text-blue-300">
                    透過單張牌解鎖提交的訪客 Email 名單
                  </p>
                  <button
                    onClick={exportGuestEmailsToCSV}
                    className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-blue-500/30 rounded-xl hover:bg-slate-700/60 hover:border-blue-400/50 transition-all text-blue-200 !text-xs"
                  >
                    <Download className="w-4 h-4" strokeWidth={1.4} />
                    匯出 Excel
                  </button>
                </div>

                {guestLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-blue-700">
                          <th className="text-left py-4 px-4 text-blue-300 font-semibold">電子郵件</th>
                          <th className="text-left py-4 px-4 text-blue-300 font-semibold">來源</th>
                          <th className="text-left py-4 px-4 text-blue-300 font-semibold">提交時間</th>
                        </tr>
                      </thead>
                      <tbody>
                        {guestEmails.map((g) => (
                          <tr
                            key={g.id}
                            className="border-b border-blue-700/50 hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-blue-400" />
                                <span className="text-blue-200">{g.email}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className="bg-slate-800/20 text-blue-300 text-xs px-2 py-1 rounded-full">
                                {g.source}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2 text-slate-400 text-sm">
                                <Calendar className="w-4 h-4" />
                                {formatDate(g.created_at)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {guestEmails.length === 0 && (
                      <div className="text-center py-12">
                        <Mail className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400 text-lg">目前沒有訪客 Email</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === 'orders' && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-7">
                  <div className="border border-blue-500/20 px-4 py-4">
                    <div className="flex items-center gap-2 text-xs text-blue-400/80 tracking-wide mb-1">
                      <Coins className="w-3.5 h-3.5" strokeWidth={1.4} />
                      已付款訂單數
                    </div>
                    <div className="font-serif text-2xl text-blue-100 tracking-wide">{ordersSummary.paid_count}</div>
                  </div>
                  <div className="border border-blue-500/20 px-4 py-4">
                    <div className="flex items-center gap-2 text-xs text-blue-400/80 tracking-wide mb-1">
                      <Coins className="w-3.5 h-3.5" strokeWidth={1.4} />
                      累計營收
                    </div>
                    <div className="font-serif text-2xl text-blue-300 tracking-wide">
                      NT$ {ordersSummary.revenue.toLocaleString('en-US')}
                    </div>
                  </div>
                  <div className="border border-blue-500/20 px-4 py-4 col-span-2 sm:col-span-1">
                    <div className="flex items-center gap-2 text-xs text-blue-400/80 tracking-wide mb-1">
                      <Receipt className="w-3.5 h-3.5" strokeWidth={1.4} />
                      目前列表筆數
                    </div>
                    <div className="font-serif text-2xl text-blue-100 tracking-wide">{orders.length}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Filter className="w-4 h-4 text-blue-400/80" strokeWidth={1.4} />
                    <span className="text-blue-300 text-sm tracking-wide">狀態:</span>
                    {(['all', 'paid', 'pending', 'failed'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setOrderStatusFilter(s)}
                        className={`text-sm px-3 py-1 border tracking-wide transition-colors ${
                          orderStatusFilter === s
                            ? 'border-blue-500 text-blue-300 bg-blue-500/10'
                            : 'border-blue-500/25 text-blue-300/70 hover:border-blue-500/50 hover:text-blue-100'
                        }`}
                      >
                        {s === 'all' ? '全部' : s === 'paid' ? '已付款' : s === 'pending' ? '待付款' : '失敗'}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkDeleting || selectedOrderIds.size === 0}
                      title={selectedOrderIds.size === 0 ? '請先勾選要刪除的訂單' : '刪除已勾選的訂單'}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-red-600/20 border-2 border-red-500/50 rounded-xl hover:bg-red-600/30 hover:border-red-500/70 transition-all text-red-100 !text-xs disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-600/20 disabled:hover:border-red-500/50"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.4} />
                      {bulkDeleting
                        ? '刪除中⋯'
                        : selectedOrderIds.size === 0
                          ? '批次刪除'
                          : `批次刪除 (${selectedOrderIds.size})`}
                    </button>
                    <button onClick={exportOrdersToCSV} className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-blue-500/30 rounded-xl hover:bg-slate-700/60 hover:border-blue-400/50 transition-all text-blue-200 !text-xs">
                      <Download className="w-4 h-4" strokeWidth={1.4} />
                      匯出 Excel
                    </button>
                  </div>
                </div>

                {ordersLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="w-12 h-12 text-blue-400/40 mx-auto mb-4" strokeWidth={1.3} />
                    <p className="text-blue-300/60 tracking-wide">沒有符合條件的訂單</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="mystic-table">
                      <thead>
                        <tr>
                          <th className="!w-10 !text-center">
                            <button
                              onClick={toggleSelectAll}
                              title={allVisibleSelected ? '取消全選' : '全選此頁'}
                              className="text-blue-300/85 hover:text-blue-100 transition-colors inline-flex items-center justify-center"
                            >
                              {allVisibleSelected ? (
                                <CheckSquare className="w-4 h-4" strokeWidth={1.6} />
                              ) : someVisibleSelected ? (
                                <CheckSquare className="w-4 h-4 opacity-50" strokeWidth={1.6} />
                              ) : (
                                <Square className="w-4 h-4" strokeWidth={1.4} />
                              )}
                            </button>
                          </th>
                          <th>訂單號</th>
                          <th>Email</th>
                          <th>商品</th>
                          <th className="!text-right">金額</th>
                          <th>狀態</th>
                          <th>付款方式</th>
                          <th>建立時間</th>
                          <th>付款時間</th>
                          <th className="!text-center sticky-right">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o) => {
                          const checked = selectedOrderIds.has(o.id);
                          return (
                          <tr key={o.id} className={checked ? 'bg-blue-500/8' : undefined}>
                            <td className="!text-center">
                              <button
                                onClick={() => toggleOrderSelected(o.id)}
                                title={checked ? '取消選取' : '選取'}
                                className="text-blue-300/85 hover:text-blue-100 transition-colors inline-flex items-center justify-center"
                              >
                                {checked ? (
                                  <CheckSquare className="w-4 h-4" strokeWidth={1.6} />
                                ) : (
                                  <Square className="w-4 h-4" strokeWidth={1.4} />
                                )}
                              </button>
                            </td>
                            <td>
                              <span className="font-mono text-xs text-blue-300/85">{o.merchant_trade_no}</span>
                            </td>
                            <td>{o.email}</td>
                            <td>{o.item_name}</td>
                            <td className="!text-right">
                              <span className="font-serif text-blue-300">NT$ {o.amount.toLocaleString('en-US')}</span>
                            </td>
                            <td><OrderStatusBadge status={o.status} /></td>
                            <td className="text-blue-300/85">{formatPaymentType(o.ecpay_payment_type)}</td>
                            <td className="text-blue-400/70 text-xs">{formatDate(o.created_at)}</td>
                            <td className="text-blue-400/70 text-xs">{o.paid_at ? formatDate(o.paid_at) : '—'}</td>
                            <td className="!text-center sticky-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  onClick={() => setReadingOrderId(o.id)}
                                  title="查看客戶解讀紀錄"
                                  className="inline-flex items-center justify-center gap-1 h-8 px-2 border border-blue-500/30 text-blue-400/85 hover:border-blue-500/60 hover:text-blue-300 hover:bg-blue-500/10 transition-all text-xs tracking-wide"
                                >
                                  <BookOpen className="w-3.5 h-3.5" strokeWidth={1.5} />
                                  解讀
                                </button>
                                <button
                                  onClick={() => handleDeleteOrder(o)}
                                  title="刪除訂單"
                                  className="inline-flex items-center justify-center gap-1 h-8 px-2 border border-red-500/30 text-red-500/85 hover:border-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-all text-xs tracking-wide"
                                >
                                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                                  刪除
                                </button>
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ← 返回首頁
          </button>
        </div>
      </div>

      {readingOrderId && (
        <OrderReadingModal
          orderId={readingOrderId}
          onClose={() => setReadingOrderId(null)}
        />
      )}
    </div>
  );
}

function OrderStatusBadge({ status }: { status: AdminOrder['status'] }) {
  const cfg = {
    paid:      { label: '已付款', cls: 'border-blue-500/60 bg-blue-500/15 text-blue-200' },
    pending:   { label: '待付款', cls: 'border-blue-400/30 bg-blue-400/5 text-blue-300' },
    failed:    { label: '失敗',   cls: 'border-red-500/60 bg-red-600/15 text-blue-200' },
    cancelled: { label: '已取消', cls: 'border-red-500/40 bg-red-600/10 text-blue-300' },
  }[status];
  return (
    <span className={`inline-block px-2 py-0.5 border text-xs tracking-wide ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
