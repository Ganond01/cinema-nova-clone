import React, { useEffect, useRef, useState } from 'react';
import { parseJwt, GOOGLE_CLIENT_ID, GoogleJwtPayload } from '../utils/googleAuth';
import { useLanguage } from '../context/LanguageContext';

interface GoogleSignInButtonProps {
  onSuccess: (payload: GoogleJwtPayload, credentialToken: string) => void;
  onError?: (error: any) => void;
  onClick?: () => void;
  text?: string;
  className?: string;
  children?: React.ReactNode;
}

declare global {
  interface Window {
    google?: any;
    handleCredentialResponse?: (response: any) => void;
  }
}

export default function GoogleSignInButton({
  onSuccess,
  onError,
  onClick,
  text,
  className,
  children
}: GoogleSignInButtonProps) {
  const { language } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Purge any legacy fake google_user accounts that might have been saved in localStorage
    try {
      const novaUsersStr = localStorage.getItem('nova_users');
      if (novaUsersStr) {
        const novaUsers = JSON.parse(novaUsersStr);
        const cleaned = novaUsers.filter((u: any) => !u.email?.includes('google.user@') && !u.id?.includes('google_user'));
        if (cleaned.length !== novaUsers.length) {
          localStorage.setItem('nova_users', JSON.stringify(cleaned));
        }
      }
      const accountsStr = localStorage.getItem('accounts');
      if (accountsStr) {
        const accounts = JSON.parse(accountsStr);
        delete accounts['google.user@cinemanova.com'];
        localStorage.setItem('accounts', JSON.stringify(accounts));
      }
      const currentUserStr = localStorage.getItem('current_user');
      if (currentUserStr) {
        const cu = JSON.parse(currentUserStr);
        if (cu?.email?.includes('google.user@') || cu?.id?.includes('google_user')) {
          localStorage.removeItem('current_user');
        }
      }
    } catch {
      // ignore
    }

    if (!GOOGLE_CLIENT_ID) return;

    const initializeGSI = () => {
      if (window.google?.accounts?.id && GOOGLE_CLIENT_ID) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response: any) => {
              if (response && response.credential) {
                const payload = parseJwt(response.credential);
                if (payload) {
                  onSuccess(payload, response.credential);
                } else if (onError) {
                  onError(language === 'UA' ? 'Не вдалося обробити відповідь Google' : 'Failed to parse Google response');
                }
              }
            },
            error_callback: (err: any) => {
              console.warn('Google Identity Services notice:', err);
              if (onError) onError(err);
            },
            auto_prompt: false,
          });

          if (containerRef.current) {
            containerRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(containerRef.current, {
              type: 'standard',
              theme: 'filled_black',
              size: 'large',
              text: 'signin_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: '400',
            });
          }
        } catch (err) {
          console.warn('Google Identity Services initialization notice:', err);
        }
      }
    };

    if (window.google?.accounts) {
      initializeGSI();
    } else {
      const scriptId = 'google-gsi-client';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          initializeGSI();
        };
        document.head.appendChild(script);
      } else {
        initializeGSI();
      }
    }
  }, [onSuccess, onError, language]);

  const handleManualClick = async () => {
    if (onClick) {
      onClick();
      return;
    }

    if (!GOOGLE_CLIENT_ID) {
      const msg = language === 'UA' 
        ? 'Для входу через Google необхідний налаштований VITE_GOOGLE_CLIENT_ID. Скористайтеся звичайним входом через Email/Пароль.'
        : 'Google Sign-In requires configured VITE_GOOGLE_CLIENT_ID. Please use standard Email/Password sign in.';
      if (onError) onError(msg);
      return;
    }

    setIsLoading(true);

    try {
      // Use OAuth2 token client popup flow for reliable in-browser authorization
      if (window.google?.accounts?.oauth2) {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'email profile openid',
          callback: async (tokenResponse: any) => {
            setIsLoading(false);
            if (tokenResponse && tokenResponse.access_token) {
              try {
                // Fetch real Користувач info from Google UserInfo endpoint
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: {
                    Authorization: `Bearer ${tokenResponse.access_token}`
                  }
                });
                if (!res.ok) {
                  throw new Error('Failed to fetch userinfo from Google');
                }
                const userInfo = await res.json();
                const realPayload: GoogleJwtPayload = {
                  sub: userInfo.sub,
                  email: userInfo.email,
                  name: userInfo.name,
                  given_name: userInfo.given_name,
                  family_name: userInfo.family_name,
                  picture: userInfo.picture,
                  email_verified: userInfo.email_verified
                };
                onSuccess(realPayload, tokenResponse.access_token);
              } catch (err: any) {
                console.error('Error fetching Google user profile:', err);
                if (onError) onError(language === 'UA' ? 'Не вдалося отримати профіль Google' : 'Failed to retrieve Google profile');
              }
            } else if (tokenResponse?.error) {
              if (onError) onError(tokenResponse.error);
            }
          },
          error_callback: (err: any) => {
            setIsLoading(false);
            const errStr = typeof err === 'string' ? err : (err?.message || err?.type || JSON.stringify(err || ''));
            if (
              err?.type === 'popup_closed' || 
              err?.type === 'popup_failed_to_open' ||
              errStr.toLowerCase().includes('popup window closed') ||
              errStr.toLowerCase().includes('popup_closed') ||
              errStr.toLowerCase().includes('user_cancel') ||
              errStr.toLowerCase().includes('closed')
            ) {
              // Normal Користувач action - Користувач closed the Google popup window without choosing an account
              console.log('Google OAuth popup window closed by user.');
              return;
            }
            console.error('Google OAuth error:', err);
            if (onError) onError(language === 'UA' ? 'Помилка авторизації Google' : 'Google authorization error');
          }
        });

        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      }

      // If GIS One Tap Prompt is available
      if (window.google?.accounts?.id) {
        window.google.accounts.id.prompt((notification: any) => {
          setIsLoading(false);
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            const reason = notification.getNotDisplayedReason?.() || notification.getSkippedReason?.() || 'popup_blocked';
            console.warn('Google prompt not displayed/skipped:', reason);
            if (onError) {
              onError(language === 'UA' 
                ? 'Вікно авторизації Google заблоковано браузером або недоступне у фреймі. Скористайтеся входом за Email/Паролем.' 
                : 'Google login window was blocked or unavailable in frame. Please use Email/Password.');
            }
          }
        });
        return;
      }

      setIsLoading(false);
      if (onError) {
        onError(language === 'UA' ? 'Службу Google Sign-In ще не завантажено. Зачекайте або використайте Email/Пароль.' : 'Google Sign-In is loading. Please wait or use Email/Password.');
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('Google Sign In click error:', error);
      if (onError) {
        onError(language === 'UA' ? 'Помилка входу через Google' : 'Google sign-in error');
      }
    }
  };

  const buttonLabel = text || (language === 'UA' ? 'Увійти через Google' : 'Sign in with Google');

  return (
    <div 
      onClick={handleManualClick}
      className={`relative overflow-hidden cursor-pointer group ${className || 'w-full'}`}
    >
      {children ? (
        children
      ) : (
        /* Custom styled button matching Cinema Nova dark theme */
        <button
          type="button"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 text-xs font-semibold text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-lg group-hover:bg-zinc-800 group-hover:border-zinc-700 transition-all duration-200 shadow-sm disabled:opacity-60 cursor-pointer"
        >
          <img src="/icons/google.png" alt="Google" className="w-4 h-4 shrink-0 object-contain" onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }} />
          <span>{isLoading ? (language === 'UA' ? 'Підключення...' : 'Connecting...') : buttonLabel}</span>
        </button>
      )}

      {/* Hidden Контейнер for Google GSI rendered Кнопка if used */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 opacity-0 pointer-events-none overflow-hidden" 
      />
    </div>
  );
}
