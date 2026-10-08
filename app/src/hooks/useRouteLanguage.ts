import { useLocation } from 'react-router-dom';
import { getLanguageFromPath } from '../lib/i18n';

export function useRouteLanguage() {
  const { pathname } = useLocation();
  return getLanguageFromPath(pathname);
}
