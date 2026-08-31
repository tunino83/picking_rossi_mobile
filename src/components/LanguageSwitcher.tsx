import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'it' ? 'en' : 'it';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 flex items-center gap-2"
    >
      <Languages className="h-6 w-6" />
      <span className="text-sm font-medium">{i18n.language.toUpperCase()}</span>
    </button>
  );
}