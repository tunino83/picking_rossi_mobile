import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { Box } from 'lucide-react';
import Swal from 'sweetalert2';
import { APP_CONFIG } from '../config/app.config';

export function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'credentials' | 'verification'>('credentials');
  const navigate = useNavigate();
  const { signIn, verify2FA , loadUserProfile } = useAuthStore((state) => ({
    signIn: state.signIn,
    verify2FA: state.verify2FA,
      loadUserProfile: state.loadUserProfile

  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (step === 'credentials') {
        await signIn(email, password);
        await loadUserProfile(); // <--- aggiungi questa riga
        // Check if we need to show 2FA step
        const { tempEmail } = useAuthStore.getState();
        if (APP_CONFIG.ENABLE_2FA && tempEmail) {
          setStep('verification');
        } else {
          // Direct login successful (2FA disabled or dummy server)
          navigate('/');
        }
      } else {
        await verify2FA(verificationCode);
        await loadUserProfile(); // <--- aggiungi questa riga
        navigate('/');
      }
    } catch (err) {
      console.error('🔴 Login error caught:', err);
      console.log('🔴 Displaying Swal error dialog');
      
      // Estrai il messaggio di errore dalla risposta
      let errorMessage = step === 'credentials' ? 'Invalid credentials' : 'Invalid verification code';

      if (err instanceof Error) {
        console.log('🔴 Error message:', err.message);
        // Prova a parsare come JSON
        try {
          // Se il messaggio di errore contiene JSON
          const jsonMatch = err.message.match(/\{.*\}/);
          if (jsonMatch) {
            const errorData = JSON.parse(jsonMatch[0]);
            if (errorData.error) {
              errorMessage = errorData.error;
            }
          } else if (err.message.includes('User account is disabled')) {
            errorMessage = 'User account is disabled';
          } else {
            errorMessage = err.message;
          }
        } catch {
          // Se non è JSON, usa il messaggio così com'è
          errorMessage = err.message || errorMessage;
        }
      }
      
      console.log('🔴 Final error message:', errorMessage);
      setError(errorMessage);
      
      // Mostra Swal con il messaggio di errore (senza await)
      Swal.fire({
        icon: 'error',
        title: 'Login Error',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div>
         <div className="flex justify-center">
            <img
              src="/rossi-logo.png"
              alt="ROSSI Logo"
              className="h-32 w-auto mx-auto"
              style={{ maxHeight: 160 }}
            />
          </div>
          <h2 className="mt-6 text-center text-4xl font-extrabold text-gray-900">
            Warehouse Picking System
          </h2>
          <div className="mt-2 text-center text-base text-gray-600">
            {step === 'credentials' 
              ? t('login.enterEmail')
              : t('login.enterCode')
            }
            {APP_CONFIG.USE_DUMMY_SERVER && (
              <span className="block mt-1 text-sm text-blue-600">
                🧪 {t('login.using')}
              </span>
            )}
            {!APP_CONFIG.ENABLE_2FA && (
              <span className="block mt-1 text-sm text-green-600">
                🔓 2FA is disabled
              </span>
            )}
           
          </div>
        </div>
        
        {APP_CONFIG.USE_DUMMY_SERVER && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-6">
            <h3 className="text-lg font-medium text-blue-800 mb-3">🧪 {t('login.dummyCredentials')}:</h3>
            <div className="text-base text-blue-700 space-y-2">
              <div>• admin@rossi.com / admin123</div>
              <div>• test@rossi.com / test123</div>
              <div>• warehouse@rossi.com / warehouse123</div>
              <div>• orders@rossi.com / orders123</div>
            </div>
          </div>
        )}
        
        <form className="mt-8 space-y-8" onSubmit={handleSubmit}>
          {step === 'credentials' ? (
            <div className="rounded-lg shadow-sm space-y-6">
              <div>
                <label htmlFor="email-address" className="block text-lg font-medium text-gray-700 mb-2">
                  {t('login.email')}
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-6 py-4 touch-input border-2 border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-red-500 focus:border-red-500 text-lg"
                  placeholder={t('login.enterEmail')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-lg font-medium text-gray-700 mb-2">
                  {t('login.password')}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none block w-full px-6 py-4 touch-input border-2 border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-red-500 focus:border-red-500 text-lg"
                  placeholder={t('login.password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="verification-code" className="block text-lg font-medium text-gray-700 mb-2">
                {t('login.verificationCode')}
              </label>
              <input
                id="verification-code"
                name="code"
                type="text"
                required
                className="appearance-none block w-full px-6 py-4 touch-input border-2 border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-red-500 focus:border-red-500 text-lg text-center tracking-widest"
                placeholder={t('login.enterCode')}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
                pattern="[0-9]{6}"
              />
            </div>
          )}

          {error && (
            <div className="text-red-600 text-lg text-center font-medium">{error}</div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center btn py-4 px-6 border border-transparent text-xl font-bold rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              {step === 'credentials' ? t('login.signIn') : t('login.verify')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}