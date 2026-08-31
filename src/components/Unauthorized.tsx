import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from 'react-i18next';

export function Unauthorized() {
  const navigate = useNavigate();
  const { signOut } = useAuthStore();
  const { t } = useTranslation();

  const handleLogout = () => {
    signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
        <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('unauthorized.title')}</h1>
        <p className="text-gray-600 mb-6">
          {t('unauthorized.message')}
        </p>
        <p className="text-sm text-gray-500 mb-8">
          {t('unauthorized.contact')}
        </p>
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {t('unauthorized.logout')}
        </button>
      </div>
    </div>
  );
}
