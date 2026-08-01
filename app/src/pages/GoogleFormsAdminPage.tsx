import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Edit3,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Plus,
  Save,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  adminApi,
  ButtonLinkSetting,
  GoogleFormAdmin,
} from '../lib/api';

const ACTIVITY_BUTTON_KEY = 'resonance-ai-tarot-design';

interface FormDraft {
  name: string;
  url: string;
  is_active: boolean;
}

const EMPTY_DRAFT: FormDraft = {
  name: '',
  url: '',
  is_active: true,
};

function validateGoogleFormUrl(url: string): string | null {
  const raw = url.trim();
  if (!raw) return '請輸入 Google 表單網址';
  if (!raw.toLowerCase().startsWith('https://')) {
    return 'Google 表單網址必須以 https:// 開頭';
  }
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    const valid = (host === 'forms.gle' && parsed.pathname.length > 1)
      || (host === 'docs.google.com'
        && (parsed.pathname === '/forms' || parsed.pathname.startsWith('/forms/')));
    return valid ? null : '僅允許 forms.gle 或 docs.google.com/forms 的網址';
  } catch {
    return 'Google 表單網址格式錯誤';
  }
}

export function GoogleFormsAdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forms, setForms] = useState<GoogleFormAdmin[]>([]);
  const [setting, setSetting] = useState<ButtonLinkSetting | null>(null);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [savingSetting, setSavingSetting] = useState(false);
  const [draft, setDraft] = useState<FormDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const activeForms = useMemo(
    () => forms.filter((form) => form.is_active),
    [forms],
  );

  const loadData = useCallback(async () => {
    const [{ forms: nextForms }, { settings }] = await Promise.all([
      adminApi.googleForms(),
      adminApi.buttonLinkSettings(),
    ]);
    const nextSetting = settings.find(
      (item) => item.button_key === ACTIVITY_BUTTON_KEY,
    ) ?? null;
    setForms(nextForms);
    setSetting(nextSetting);
    const selectedIsActive = nextForms.some(
      (form) => form.id === nextSetting?.google_form_id && form.is_active,
    );
    setSelectedFormId(selectedIsActive ? (nextSetting?.google_form_id ?? '') : '');
  }, []);

  const initialize = useCallback(async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    try {
      const { isAdmin: allowed } = await adminApi.check();
      setIsAdmin(allowed);
      if (allowed) await loadData();
    } catch {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [loadData, navigate, user]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const resetDraft = () => {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!draft.name.trim()) {
      setError('請輸入表單名稱');
      return;
    }
    const urlError = validateGoogleFormUrl(draft.url);
    if (urlError) {
      setError(urlError);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        url: draft.url.trim(),
        is_active: draft.is_active,
      };
      if (editingId) {
        await adminApi.updateGoogleForm(editingId, payload);
        setSuccess('Google 表單已更新');
      } else {
        await adminApi.createGoogleForm(payload);
        setSuccess('Google 表單已新增');
      }
      resetDraft();
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '儲存 Google 表單失敗');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (form: GoogleFormAdmin) => {
    setEditingId(form.id);
    setDraft({
      name: form.name,
      url: form.url,
      is_active: form.is_active,
    });
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleForm = async (form: GoogleFormAdmin) => {
    setError('');
    setSuccess('');
    try {
      await adminApi.updateGoogleForm(form.id, {
        name: form.name,
        url: form.url,
        is_active: !form.is_active,
      });
      setSuccess(form.is_active ? '表單已停用' : '表單已啟用');
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '更新狀態失敗');
    }
  };

  const deleteForm = async (form: GoogleFormAdmin) => {
    const isSelected = setting?.google_form_id === form.id;
    const warning = isSelected
      ? '\n\n此表單目前連結到前台活動按鈕，刪除後按鈕將顯示「報名尚未開放」。'
      : '';
    if (!window.confirm(`確定要刪除「${form.name}」嗎？此動作無法復原。${warning}`)) {
      return;
    }
    if (!window.confirm(`請再次確認：確定刪除「${form.name}」？`)) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      await adminApi.deleteGoogleForm(form.id);
      setSuccess('Google 表單已刪除');
      if (editingId === form.id) resetDraft();
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '刪除 Google 表單失敗');
    }
  };

  const saveButtonSetting = async () => {
    if (!selectedFormId) {
      setError('請選擇一份啟用中的 Google 表單');
      return;
    }
    setError('');
    setSuccess('');
    setSavingSetting(true);
    try {
      await adminApi.updateButtonLinkSetting(ACTIVITY_BUTTON_KEY, selectedFormId);
      setSuccess('按鈕連結設定已儲存，前台將使用選中的 Google 表單');
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '儲存按鈕連結設定失敗');
    } finally {
      setSavingSetting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white flex items-center justify-center px-4">
        <div className="bg-slate-900/80 border border-red-500/40 rounded-2xl p-8 max-w-md text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl text-blue-100 mb-3">無權限訪問</h1>
          <p className="text-blue-200/70">此頁面僅限管理員使用。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-7">
        <button
          onClick={() => navigate('/admin')}
          className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-100 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          返回後台
        </button>

        <header className="border border-blue-500/30 bg-slate-900/70 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 border border-blue-400/40 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif text-blue-100">Google 表單管理</h1>
              <p className="text-sm text-blue-300/70 mt-1">管理表單並指定前台活動按鈕連結</p>
            </div>
          </div>
        </header>

        {error && (
          <div className="border border-red-500/40 bg-red-500/10 px-4 py-3 flex gap-3 items-center">
            <X className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-100">{error}</p>
          </div>
        )}
        {success && (
          <div className="border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 flex gap-3 items-center">
            <Check className="w-4 h-4 text-emerald-300 flex-shrink-0" />
            <p className="text-sm text-emerald-100">{success}</p>
          </div>
        )}

        <section className="border border-blue-500/25 bg-slate-900/70 rounded-2xl p-5 sm:p-7">
          <h2 className="text-xl text-blue-100 font-semibold mb-5 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-300" />
            {editingId ? '編輯 Google 表單' : '新增 Google 表單'}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <label className="grid gap-2 text-sm text-blue-200">
              表單名稱
              <input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                maxLength={120}
                placeholder="例如：AI 塔羅設計學說明會"
                className="bg-slate-950 border border-blue-500/30 px-4 py-3 text-blue-50 placeholder-blue-300/30 outline-none focus:border-blue-400"
              />
            </label>
            <label className="grid gap-2 text-sm text-blue-200">
              Google 表單網址
              <input
                value={draft.url}
                onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
                placeholder="https://forms.gle/..."
                className="bg-slate-950 border border-blue-500/30 px-4 py-3 text-blue-50 placeholder-blue-300/30 outline-none focus:border-blue-400"
              />
              <span className="text-xs text-blue-300/55">僅允許 forms.gle 或 docs.google.com/forms，且必須使用 https://</span>
            </label>
            <label className="inline-flex items-center gap-3 text-sm text-blue-200 w-fit">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(event) => setDraft((current) => ({ ...current, is_active: event.target.checked }))}
                className="w-4 h-4 accent-blue-500"
              />
              建立後立即啟用
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingId ? '儲存修改' : '新增表單'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetDraft}
                  className="px-6 py-3 border border-blue-500/30 hover:bg-blue-500/10 rounded-xl text-blue-200"
                >
                  取消編輯
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="border border-blue-500/25 bg-slate-900/70 rounded-2xl p-5 sm:p-7">
          <h2 className="text-xl text-blue-100 font-semibold mb-5">已建立的 Google 表單</h2>
          <div className="space-y-4">
            {forms.map((form) => (
              <article key={form.id} className="border border-blue-500/20 bg-slate-950/50 p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-blue-50 font-semibold">{form.name}</h3>
                      <span className={`text-xs px-2 py-1 border ${form.is_active ? 'text-emerald-300 border-emerald-500/40' : 'text-blue-300/60 border-blue-500/20'}`}>
                        {form.is_active ? '啟用' : '停用'}
                      </span>
                      {setting?.google_form_id === form.id && (
                        <span className="text-xs px-2 py-1 border border-amber-500/40 text-amber-200">
                          目前按鈕連結
                        </span>
                      )}
                    </div>
                    <p className="text-blue-300/60 text-xs mt-2 break-all">{form.url}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 flex-shrink-0">
                    <a
                      href={form.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-blue-500/30 hover:bg-blue-500/10 text-blue-200 text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      測試連結
                    </a>
                    <button
                      onClick={() => startEdit(form)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-blue-500/30 hover:bg-blue-500/10 text-blue-200 text-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      編輯
                    </button>
                    <button
                      onClick={() => void toggleForm(form)}
                      className="px-3 py-2 border border-blue-500/30 hover:bg-blue-500/10 text-blue-200 text-xs"
                    >
                      {form.is_active ? '停用' : '啟用'}
                    </button>
                    <button
                      onClick={() => void deleteForm(form)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-500/30 hover:bg-red-500/10 text-red-300 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      刪除
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {forms.length === 0 && (
              <p className="text-center text-blue-300/50 py-8 border border-dashed border-blue-500/20">
                尚未建立 Google 表單
              </p>
            )}
          </div>
        </section>

        <section className="border border-blue-500/25 bg-slate-900/70 rounded-2xl p-5 sm:p-7">
          <h2 className="text-xl text-blue-100 font-semibold mb-2 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-300" />
            按鈕連結設定
          </h2>
          <p className="text-sm text-blue-300/65 mb-5">
            附件中的「解密 AI 塔羅設計學」活動按鈕
          </p>
          {setting?.warning && (
            <div className="mb-4 border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex gap-3 items-center">
              <AlertTriangle className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <p className="text-sm text-amber-100">{setting.warning}</p>
            </div>
          )}
          <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <label className="grid gap-2 text-sm text-blue-200">
              選擇連結表單
              <select
                value={selectedFormId}
                onChange={(event) => setSelectedFormId(event.target.value)}
                className="bg-slate-950 border border-blue-500/30 px-4 py-3 text-blue-50 outline-none focus:border-blue-400"
              >
                <option value="">請選擇啟用中的表單</option>
                {activeForms.map((form) => (
                  <option key={form.id} value={form.id}>{form.name}</option>
                ))}
              </select>
            </label>
            <button
              onClick={() => void saveButtonSetting()}
              disabled={savingSetting || !selectedFormId}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl disabled:opacity-50"
            >
              {savingSetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              儲存設定
            </button>
          </div>
          <p className="text-xs text-blue-300/50 mt-3">
            新增或修改其他表單不會改變目前連結；只有重新選擇並儲存後才會更新前台按鈕。
          </p>
        </section>
      </div>
    </div>
  );
}
