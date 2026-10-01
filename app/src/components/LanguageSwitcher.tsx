import { useLocation, useNavigate } from 'react-router-dom';
import { getLanguageFromPath, getLocalizedPath, localeLabels } from '../lib/i18n';

export default function LanguageSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentLanguage = getLanguageFromPath(location.pathname);

  const handleToggle = () => {
    const nextLanguage = currentLanguage === 'en' ? 'zh-Hant' : 'en';
    const targetPath = getLocalizedPath(location.pathname, nextLanguage);
    navigate(`${targetPath}${location.search}${location.hash}`);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label="Toggle language"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 12px',
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(255,255,255,0.02)',
        color: '#e2e8f0',
        fontSize: 11,
        letterSpacing: '0.04em',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {localeLabels[currentLanguage === 'en' ? 'zh-Hant' : 'en']}｜{localeLabels[currentLanguage]}
    </button>
  );
}
