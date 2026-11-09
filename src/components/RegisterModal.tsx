import React, { useState } from 'react';
import { Shield, HelpCircle } from 'lucide-react';
import { UserProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import GoogleSignInButton from './GoogleSignInButton';
import { GoogleJwtPayload } from '../utils/googleAuth';
import FooterMain from './FooterMain';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile, isNewRegistration?: boolean) => void;
  onSwitchToLogin?: () => void;
}

export default function RegisterModal({ isOpen, onClose, onAuthSuccess, onSwitchToLogin }: RegisterModalProps) {
  const { language, setLanguage } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogleSignInSuccess = (payload: GoogleJwtPayload) => {
    const emailKey = payload.email.trim().toLowerCase();

    let accounts: { [key: string]: any } = {};
    try {
      const saved = localStorage.getItem('cinemanova_accounts');
      if (saved) accounts = JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }

    let isBlocked = false;
    try {
      const novaUsersStr = localStorage.getItem('nova_users');
      if (novaUsersStr) {
        const novaUsers = JSON.parse(novaUsersStr);
        const matched = novaUsers.find((u: any) => u.email.trim().toLowerCase() === emailKey);
        if (matched && matched.isBlocked) isBlocked = true;
      }
    } catch (e) {
      console.error(e);
    }

    const existingAccount = accounts[emailKey];
    if (isBlocked || (existingAccount && (existingAccount.status === 'Заблокований' || existingAccount.isBlocked))) {
      setErrorMsg(language === 'UA' ? 'Ваш обліковий запис заблоковано адміністрацією.' : 'Your account has been blocked by administration.');
      return;
    }

    if (!existingAccount) {
      const newAcc = {
        name: payload.name || payload.given_name || emailKey.split('@')[0],
        email: payload.email,
        password: 'PUBLIC_DEMO_ONLY',
        avatarUrl: payload.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
        plan: 'VIP',
        joined: new Date().toLocaleDateString(language === 'UA' ? 'uk-UA' : 'en-US'),
        role: 'user'
      };
      accounts[emailKey] = newAcc;
      localStorage.setItem('cinemanova_accounts', JSON.stringify(accounts));

      try {
        const savedNovaStr = localStorage.getItem('nova_users');
        let novaUsers = savedNovaStr ? JSON.parse(savedNovaStr) : [];
        if (!Array.isArray(novaUsers)) novaUsers = [];
        const idx = novaUsers.findIndex((u: any) => (u.email || '').trim().toLowerCase() === emailKey);
        const googleUserObj = {
          id: 'usr_g_' + (payload.sub || emailKey.replace(/[@.]/g, '_')),
          name: newAcc.name,
          email: newAcc.email,
          plan: 'VIP',
          status: 'Активний',
          joined: newAcc.joined,
          role: emailKey === 'admin@example.invalid' ? 'admin' : 'user',
          avatarUrl: newAcc.avatarUrl,
          isBlocked: false
        };
        if (idx >= 0) {
          novaUsers[idx] = { ...novaUsers[idx], ...googleUserObj };
        } else {
          novaUsers.push(googleUserObj);
        }
        localStorage.setItem('nova_users', JSON.stringify(novaUsers));
      } catch (e) {}
    }

    const savedGoogleAvatar = localStorage.getItem(`user_avatar_${emailKey}`);
    const userProfile: UserProfile = {
      id: 'usr_g_' + (payload.sub || emailKey.replace(/[@.]/g, '_')),
      name: existingAccount?.name || payload.name || payload.given_name || emailKey.split('@')[0],
      email: payload.email,
      avatarUrl: savedGoogleAvatar || existingAccount?.avatarUrl || payload.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
      plan: 'VIP',
      favoriteGenres: ['Фантастика', 'Пригоди'],
      favorites: [],
      watchHistory: [],
      role: emailKey === 'admin@example.invalid' ? 'admin' : 'user'
    };

    setSuccessMsg(language === 'UA' ? `Вітаємо, ${userProfile.name}! Вхід через Google успішно виконано.` : `Welcome, ${userProfile.name}! Signed in via Google.`);
    setTimeout(() => {
      onAuthSuccess(userProfile, !existingAccount);
      setSuccessMsg('');
      onClose();
    }, 1200);
  };

  const handleSocialClick = (platform: 'Facebook') => {
    setSuccessMsg(language === 'UA' ? `Вхід через ${platform} виконується...` : `Signing in via ${platform}...`);
    setTimeout(() => {
      const socialUser: UserProfile = {
        id: `usr_${platform.toLowerCase()}_` + Date.now(),
        name: 'Facebook User',
        email: `facebook_user@cinemanova.com`,
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
        plan: 'VIP',
        favoriteGenres: ['Фантастика', 'Пригоди'],
        favorites: [],
        watchHistory: [],
        role: 'user'
      };
      onAuthSuccess(socialUser);
      setSuccessMsg('');
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setErrorMsg(language === 'UA' ? 'Заповніть усі обов’язкові поля.' : 'Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg(language === 'UA' ? 'Пароль повинен містити не менше 6 символів.' : 'Password must be at least 6 characters.');
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      setErrorMsg(language === 'UA' ? 'Паролі не збігаються.' : 'Passwords do not match.');
      return;
    }

    setErrorMsg('');
    const normalizedEmail = email.trim().toLowerCase();

    // Read existing accounts з localStorage
    let accounts: { [key: string]: any } = {};
    try {
      const saved = localStorage.getItem('cinemanova_accounts');
      if (saved) accounts = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to read accounts', e);
    }

    if (accounts[normalizedEmail]) {
      setErrorMsg(language === 'UA' ? 'Користувач з таким email вже існує.' : 'User with this email already exists.');
      return;
    }

    const avatarUrl = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop';
    const newAcc = {
      name: name.trim(),
      email: normalizedEmail,
      password: password,
      avatarUrl: avatarUrl,
      plan: 'VIP',
      joined: new Date().toLocaleDateString(language === 'UA' ? 'uk-UA' : 'en-US'),
      role: normalizedEmail === 'admin@example.invalid' ? 'admin' : 'user'
    };

    accounts[normalizedEmail] = newAcc;
    try {
      localStorage.setItem('cinemanova_accounts', JSON.stringify(accounts));
      // Clear from deleted blacklist if previously deleted
      const deletedStr = localStorage.getItem('cinemanova_deleted_emails');
      if (deletedStr) {
        let deletedEmails = JSON.parse(deletedStr);
        if (Array.isArray(deletedEmails)) {
          deletedEmails = deletedEmails.filter((em: string) => em !== normalizedEmail);
          localStorage.setItem('cinemanova_deleted_emails', JSON.stringify(deletedEmails));
        }
      }
    } catch (e) {
      console.error('Failed to save user account', e);
    }

    // Also Синхронізація to nova_users database
    try {
      const savedNovaStr = localStorage.getItem('nova_users');
      let novaUsers = savedNovaStr ? JSON.parse(savedNovaStr) : [];
      if (!Array.isArray(novaUsers)) novaUsers = [];
      const idx = novaUsers.findIndex((u: any) => (u.email || '').trim().toLowerCase() === normalizedEmail);
      const novaUserObj = {
        id: 'usr_' + normalizedEmail.replace(/[@.]/g, '_'),
        name: newAcc.name,
        email: newAcc.email,
        password: password,
        plan: 'VIP',
        status: 'Активний',
        joined: newAcc.joined,
        role: newAcc.role,
        avatarUrl: newAcc.avatarUrl,
        isBlocked: false
      };
      if (idx >= 0) {
        novaUsers[idx] = { ...novaUsers[idx], ...novaUserObj };
      } else {
        novaUsers.push(novaUserObj);
      }
      localStorage.setItem('nova_users', JSON.stringify(novaUsers));
    } catch (e) {
      console.error('Failed to sync to nova_users', e);
    }

    const generatedUser: UserProfile = {
      id: 'usr_' + normalizedEmail.replace(/[@.]/g, '_'),
      name: newAcc.name,
      email: newAcc.email,
      avatarUrl: newAcc.avatarUrl,
      plan: 'VIP',
      favoriteGenres: ['Фантастика', 'Бойовик', 'Драма'],
      favorites: [],
      watchHistory: [],
      password: password,
      role: newAcc.role as 'admin' | 'user',
      joined: newAcc.joined
    };

    setSuccessMsg(language === 'UA' ? 'Реєстрація успішна! Ласкаво просимо в Cinema Nova.' : 'Registration successful! Welcome to Cinema Nova.');
    setTimeout(() => {
      onAuthSuccess(generatedUser, true);
      setSuccessMsg('');
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  // Reusable Registration Menu Картка
  const renderRegistrationMenu = () => (
    <div className="w-full flex flex-col items-center">
      <div
        className="relative w-[361px] max-w-[calc(100vw-32px)] xl:w-[660px] xl:max-w-[660px] min-h-[479px] h-auto rounded-[20px] xl:rounded-[24px] p-4 sm:p-5 xl:p-9 flex flex-col justify-between items-center transition-all z-20 overflow-hidden animate-auth-slide-in"
        style={{
          background: 'rgba(10, 10, 16, 0.42)',
          filter: 'drop-shadow(0 20px 60px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 35px rgba(255, 48, 64, 0.12))',
          WebkitFilter: 'drop-shadow(0 20px 60px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 35px rgba(255, 48, 64, 0.12))',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 35px rgba(255, 48, 64, 0.12)'
        }}
      >
        {/* Figma Exact Gradient Border: 0% #FFFFFF 100% -> 100% #D72835 100% */}
        <span
          className="absolute inset-0 rounded-[20px] xl:rounded-[24px] pointer-events-none z-[1]"
          style={{
            border: '1.5px solid transparent',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #D72835 100%) border-box',
            WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude'
          }}
        />
        <svg className="absolute inset-0 w-full h-full pointer-events-none rounded-[20px] xl:rounded-[24px] overflow-hidden z-[1]">
          <defs>
            <linearGradient id="reg-figma-border-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="100%" stopColor="#D72835" stopOpacity="1" />
            </linearGradient>
          </defs>
          <rect
            x="0.75"
            y="0.75"
            width="calc(100% - 1.5px)"
            height="calc(100% - 1.5px)"
            rx="20"
            ry="20"
            fill="none"
            stroke="url(#reg-figma-border-grad)"
            strokeWidth="1.5"
          />
        </svg>

        {/* Feedback Toast */}
        {successMsg && (
          <div className="p-2.5 xl:p-3 mb-2 xl:mb-4 text-xs xl:text-sm text-green-400 border border-green-500/30 bg-green-500/10 rounded-full flex items-center gap-2 animate-pulse w-full max-w-[595px]">
            <Shield className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-2.5 xl:p-3 mb-2 xl:mb-4 text-xs xl:text-sm text-[#FF3040] border border-[#FF3040]/30 bg-[#FF3040]/10 rounded-full flex items-center gap-2 w-full max-w-[595px]">
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Шапка сайту */}
        <div className="mb-2.5 sm:mb-4 xl:mb-6 w-full max-w-[595px] text-left">
          <h2 className="font-display font-black text-lg sm:text-2xl xl:text-3xl text-white tracking-tight leading-tight">
            {language === 'UA' ? 'Створити акаунт' : 'Create Account'}
          </h2>
          <p className="text-[11px] sm:text-xs xl:text-sm text-[#FAFAFA] mt-0.5 xl:mt-1 font-sans">
            {language === 'UA' ? 'Швидко та безкоштовно.' : 'Quick and free.'}
          </p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleRegister} className="space-y-2 sm:space-y-3 xl:space-y-4 w-full flex flex-col items-center">
          {/* Field 1: Name */}
          <div className="space-y-1 xl:space-y-1.5 w-full flex flex-col items-center">
            <div className="w-full max-w-[595px] px-1 text-left">
              <label className="text-[10px] sm:text-xs xl:text-xs text-[#FAFAFA] font-medium font-sans">
                {language === 'UA' ? 'Ім’я' : 'Name'}
              </label>
            </div>
            <div className="relative flex items-center w-full max-w-[595px]">
              <input
                id="reg-name-field"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={language === 'UA' ? 'Введіть ваше ім’я' : 'Enter your name'}
                className="w-full xl:w-[595px] h-[38px] sm:h-[46px] xl:h-[68px] px-3.5 sm:px-4 xl:px-5 pr-11 xl:pr-16 text-xs sm:text-sm xl:text-base text-white bg-transparent border border-[#FAFAFA] rounded-[8px] focus:outline-none focus:border-[#FF3040] focus:ring-1 focus:ring-[#FF3040] transition-all font-sans placeholder-[#FAFAFA]/70"
              />
              <img 
                src="/icons/Profile.png" 
                alt="Name" 
                className="w-4 h-4 sm:w-5 sm:h-5 xl:w-[30px] xl:h-[30px] object-contain absolute right-3.5 sm:right-4 xl:right-5 pointer-events-none icon-fafafa" 
              />
            </div>
          </div>

          {/* Field 2: Email */}
          <div className="space-y-1 xl:space-y-1.5 w-full flex flex-col items-center">
            <div className="w-full max-w-[595px] px-1 text-left">
              <label className="text-[10px] sm:text-xs xl:text-xs text-[#FAFAFA] font-medium font-sans">
                {language === 'UA' ? 'Email' : 'Email'}
              </label>
            </div>
            <div className="relative flex items-center w-full max-w-[595px]">
              <input
                id="reg-email-field"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={language === 'UA' ? 'Введіть ваш email' : 'Enter your email'}
                className="w-full xl:w-[595px] h-[38px] sm:h-[46px] xl:h-[68px] px-3.5 sm:px-4 xl:px-5 pr-11 xl:pr-16 text-xs sm:text-sm xl:text-base text-white bg-transparent border border-[#FAFAFA] rounded-[8px] focus:outline-none focus:border-[#FF3040] focus:ring-1 focus:ring-[#FF3040] transition-all font-sans placeholder-[#FAFAFA]/70"
              />
              <img 
                src="/icons/Notifications_sms.png" 
                alt="Email" 
                className="w-4 h-4 sm:w-5 sm:h-5 xl:w-[30px] xl:h-[30px] object-contain absolute right-3.5 sm:right-4 xl:right-5 pointer-events-none icon-fafafa" 
              />
            </div>
          </div>

          {/* Field 3: Password */}
          <div className="space-y-1 xl:space-y-1.5 w-full flex flex-col items-center">
            <div className="w-full max-w-[595px] px-1 text-left">
              <label className="text-[10px] sm:text-xs xl:text-xs text-[#FAFAFA] font-medium font-sans">
                {language === 'UA' ? 'Пароль' : 'Password'}
              </label>
            </div>
            <div className="relative flex items-center w-full max-w-[595px]">
              <input
                id="reg-pass-field"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={language === 'UA' ? 'Створіть пароль' : 'Create password'}
                className="w-full xl:w-[595px] h-[38px] sm:h-[46px] xl:h-[68px] px-3.5 sm:px-4 xl:px-5 pr-16 xl:pr-24 text-xs sm:text-sm xl:text-base text-white bg-transparent border border-[#FAFAFA] rounded-[8px] focus:outline-none focus:border-[#FF3040] focus:ring-1 focus:ring-[#FF3040] transition-all font-sans placeholder-[#FAFAFA]/70"
              />
              <div className="absolute right-3.5 sm:right-4 xl:right-5 flex items-center gap-1.5 sm:gap-2 xl:gap-2.5">
                <img src="/icons/Lock.png" alt="Lock" className="w-4 h-4 sm:w-5 sm:h-5 xl:w-[30px] xl:h-[30px] object-contain pointer-events-none icon-fafafa" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#FAFAFA] hover:text-white transition-colors cursor-pointer p-0.5"
                >
                  {showPassword ? (
                    <img src="/icons/Eye open.png" alt="Show" className="w-4 h-4 sm:w-5 sm:h-5 xl:w-[30px] xl:h-[30px] object-contain icon-fafafa" />
                  ) : (
                    <img src="/icons/Eye closed.png" alt="Hide" className="w-4 h-4 sm:w-5 sm:h-5 xl:w-[30px] xl:h-[30px] object-contain icon-fafafa" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Field 4: Confirm Password */}
          <div className="space-y-1 xl:space-y-1.5 w-full flex flex-col items-center">
            <div className="w-full max-w-[595px] px-1 text-left">
              <label className="text-[10px] sm:text-xs xl:text-xs text-[#FAFAFA] font-medium font-sans">
                {language === 'UA' ? 'Підтвердіть пароль' : 'Confirm Password'}
              </label>
            </div>
            <div className="relative flex items-center w-full max-w-[595px]">
              <input
                id="reg-confirm-pass-field"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={language === 'UA' ? 'Повторіть пароль' : 'Repeat password'}
                className="w-full xl:w-[595px] h-[38px] sm:h-[46px] xl:h-[68px] px-3.5 sm:px-4 xl:px-5 pr-11 xl:pr-16 text-xs sm:text-sm xl:text-base text-white bg-transparent border border-[#FAFAFA] rounded-[8px] focus:outline-none focus:border-[#FF3040] focus:ring-1 focus:ring-[#FF3040] transition-all font-sans placeholder-[#FAFAFA]/70"
              />
              <div className="absolute right-3.5 sm:right-4 xl:right-5 flex items-center">
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-[#FAFAFA] hover:text-white transition-colors cursor-pointer p-0.5"
                >
                  {showConfirmPassword ? (
                    <img src="/icons/Eye open.png" alt="Show" className="w-4 h-4 sm:w-5 sm:h-5 xl:w-[30px] xl:h-[30px] object-contain icon-fafafa" />
                  ) : (
                    <img src="/icons/Eye closed.png" alt="Hide" className="w-4 h-4 sm:w-5 sm:h-5 xl:w-[30px] xl:h-[30px] object-contain icon-fafafa" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Submit Кнопка */}
          <div className="w-full flex justify-center pt-1.5 xl:pt-2">
            <button
              type="submit"
              className="journey-cta-btn border-2 border-transparent hover:border-white/80 active:border-transparent text-white w-full max-w-[280px] sm:max-w-[340px] xl:w-[418px] xl:max-w-[418px] h-[40px] sm:h-[48px] xl:h-[68px] mx-auto font-display font-bold text-xs sm:text-sm xl:text-base rounded-[12px] sm:rounded-[14px] xl:rounded-[16px] flex items-center justify-center gap-2 transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-lg shadow-[#FF4D5C]/25 cursor-pointer text-center select-none"
            >
              {language === 'UA' ? 'Створити акаунт' : 'Create Account'}
            </button>
          </div>
        </form>

        {/* Divider without background, color #FAFAFA */}
        <div className="relative mt-2 sm:mt-3 xl:mt-5 mb-1.5 sm:mb-2 xl:mb-[21px] flex items-center justify-center gap-3 w-full max-w-[595px]">
          <div className="flex-1 h-[1px] bg-white/20" />
          <span className="text-[10px] sm:text-[12px] xl:text-xs font-medium text-[#FAFAFA] whitespace-nowrap bg-transparent select-none font-sans">
            {language === 'UA' ? 'або продовжити через' : 'or continue with'}
          </span>
          <div className="flex-1 h-[1px] bg-white/20" />
        </div>

        {/* Social Кнопки - No background, white border, white logo */}
        <div className="flex justify-center items-center gap-3 xl:gap-4">
          {/* Google Кнопка */}
          <GoogleSignInButton
            onSuccess={handleGoogleSignInSuccess}
            className="w-14 sm:w-16 xl:w-20"
          >
            <button
              type="button"
              className="w-14 sm:w-16 xl:w-20 h-9 sm:h-10 xl:h-11 rounded-xl border border-white bg-transparent hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer group shadow-sm"
              title="Google Sign In"
            >
              <img 
                src="/icons/google.png" 
                alt="Google" 
                className="w-4 h-4 sm:w-5 sm:h-5 object-contain icon-fafafa group-hover:scale-105 transition-transform" 
              />
            </button>
          </GoogleSignInButton>

          {/* Facebook Кнопка */}
          <button
            type="button"
            onClick={() => handleSocialClick('Facebook')}
            className="w-14 sm:w-16 xl:w-20 h-9 sm:h-10 xl:h-11 rounded-xl border border-white bg-transparent hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer group shadow-sm"
            title="Facebook Sign In"
          >
            <img 
              src="/icons/Facebook.png" 
              alt="Facebook" 
              className="w-4 h-4 sm:w-5 sm:h-5 object-contain icon-fafafa group-hover:scale-105 transition-transform" 
            />
          </button>
        </div>
      </div>

      {/* Switch to Login & Terms directly under Картка - 50px from menu, 50px between items, all text #FAFAFA */}
      <div className="w-full text-center mt-[50px] z-20 flex flex-col items-center">
        <p className="text-xs sm:text-sm text-[#FAFAFA] font-sans">
          {language === 'UA' ? 'Вже є акаунт? ' : 'Already have an account? '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-[#FF3040] hover:text-white font-bold hover:underline cursor-pointer ml-1"
          >
            {language === 'UA' ? 'Увійти' : 'Sign In'}
          </button>
        </p>

        <p className="text-[11px] sm:text-xs text-[#FAFAFA] font-sans max-w-[340px] sm:max-w-[380px] mx-auto leading-relaxed mt-[50px]">
          {language === 'UA' ? (
            <>
              Створюючи акаунт, ви погоджуєтесь з нашими{' '}
              <span className="text-[#FF3040] hover:underline cursor-pointer">Умовами використання</span> та{' '}
              <span className="text-[#FF3040] hover:underline cursor-pointer">Політикою конфіденційності</span>.
            </>
          ) : (
            <>
              By creating an account, you agree to our{' '}
              <span className="text-[#FF3040] hover:underline cursor-pointer">Terms of Use</span> and{' '}
              <span className="text-[#FF3040] hover:underline cursor-pointer">Privacy Policy</span>.
            </>
          )}
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#060609] text-white overflow-hidden font-sans">
      {/* Real Fullscreen Background Image from /backgrounds/Registerbackground.png */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <img 
          src="/backgrounds/Registerbackground.png" 
          alt="" 
          className="w-full h-full object-cover object-center pointer-events-none select-none"
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            if (!target.src.endsWith('.jpg')) {
              target.src = '/backgrounds/Registerbackground.jpg';
            }
          }}
        />
        {/* Clean subtle tint for optimal readability across all displays */}
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />
      </div>

      {/* Top Шапка сайту - Truly fixed at top, stays anchored during scroll */}
      <header 
        className="fixed top-0 left-0 right-0 z-50 w-full pl-4 md:pl-[50px] pr-4 md:pr-[91px] flex items-center justify-between transition-all select-none bg-[#060609]/85 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-b border-white/5 sm:border-none"
        style={{ paddingTop: '14px', paddingBottom: '14px', height: 'auto', minHeight: '75px' }}
      >
        <div className="w-full flex items-center justify-between">
          {/* Logo from /logo/logo.png (standard Шапка сайту logo) */}
          <div className="flex items-center cursor-pointer select-none group" onClick={onClose} title="CINEMA NOVA">
            <img 
              src="/logo/logo.png" 
              alt="CINEMA NOVA" 
              className="h-8 sm:h-9 w-auto max-w-[170px] object-contain transition-transform duration-300 group-hover:scale-105" 
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/logo/logo.svg';
              }}
            />
          </div>

          <div className="flex items-center gap-6">
            {/* Global Language Selector (like Main Шапка сайту: no outer border, inactive has no background) */}
            <div className="flex items-center justify-between w-[78px] h-[41px] bg-transparent p-0 rounded-[10px] select-none relative">
              <button
                type="button"
                onClick={() => setLanguage('UA')}
                className={`w-[41px] h-[41px] flex items-center justify-center text-[12px] font-bold transition-all cursor-pointer ${
                  language === 'UA'
                    ? 'bg-[#FF3040] text-white rounded-[10px] shadow-sm z-10'
                    : 'bg-transparent text-[#FAFAFA] hover:text-white'
                }`}
              >
                UK
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ENG')}
                className={`w-[41px] h-[41px] flex items-center justify-center text-[12px] font-bold transition-all cursor-pointer ${
                  language === 'ENG'
                    ? 'bg-[#FF3040] text-white rounded-[10px] shadow-sm z-10'
                    : 'bg-transparent text-[#FAFAFA] hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-[10px] bg-transparent hover:bg-white/10 transition-all flex items-center justify-center text-[#FAFAFA] hover:text-white cursor-pointer"
                title="Close"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Контейнер: Scrollable on mobile and desktop */}
      <div className="relative z-10 w-full h-full overflow-y-auto overflow-x-hidden flex flex-col justify-between min-h-screen pt-[85px] sm:pt-[95px] xl:pt-0">

        {/* Main Content Area: Responsive on mobile (< xl), Pixel-Exact Figma Coordinates on Desktop (>= xl) */}
        <main className="relative flex-1 w-full min-h-[960px] xl:min-h-[1280px] pb-10">
          {/* Mobile / Tablet layout (< xl): Exact Figma Coordinates (x: 16, y: 264, w: 361, h: 479) */}
          <div className="xl:hidden w-full max-w-[660px] mx-auto px-4 sm:px-6 py-4 flex flex-col items-center">
            {/* Top Text Block */}
            <div className="w-[361px] max-w-full space-y-2 sm:space-y-4 text-left mb-6 sm:mb-8">
              <span className="text-[#FF3040] text-xs sm:text-sm font-bold tracking-widest uppercase block drop-shadow-sm">
                {language === 'UA' ? 'ПРИЄДНУЙСЯ ДО CINEMA NOVA' : 'JOIN CINEMA NOVA'}
              </span>
              <h1 className="font-display font-black text-3xl sm:text-4xl md:text-5xl text-white tracking-tight leading-[0.95] drop-shadow-md">
                {language === 'UA' ? 'ТВОЇ ІСТОРІЇ.' : 'YOUR STORIES.'}
              </h1>
              <h1 className="font-display font-black text-3xl sm:text-4xl md:text-5xl text-[#FF3040] tracking-tight leading-[0.95] mt-1 drop-shadow-md">
                {language === 'UA' ? 'НЕОБМЕЖЕНО.' : 'UNLIMITED.'}
              </h1>
              <p className="text-[#FAFAFA] text-xs sm:text-sm md:text-base font-sans leading-relaxed max-w-xl pt-1 drop-shadow-sm">
                {language === 'UA'
                  ? 'Створіть акаунт і отримайте доступ до тисячі фільмів, серіалів та аніме. Персональні рекомендації, Watch Party та багато іншого чекають на вас.'
                  : 'Create an account and get access to thousands of movies, TV shows, and anime. Personal recommendations, Watch Party, and much more await you.'}
              </p>
            </div>

            {/* Registration Form Картка: w361 h479, x16 (left-4 on 393px screen) */}
            <div className="w-[361px] max-w-full flex justify-center">
              {renderRegistrationMenu()}
            </div>

            {/* Bottom Text Block: without top border */}
            <div className="w-[361px] max-w-full text-left mt-8 mb-6">
              <h3 className="font-display font-bold text-white text-base sm:text-lg drop-shadow-sm">
                {language === 'UA' ? 'Безпечно та конфіденційно.' : 'Safe and confidential.'}
              </h3>
              <p className="text-[#FAFAFA] text-xs sm:text-sm font-sans mt-1.5 leading-relaxed drop-shadow-sm">
                {language === 'UA'
                  ? 'Ми дбаємо про захист ваших даних та ніколи не передаємо їх третім особам.'
                  : 'We care about protecting your data and never transfer it to third parties.'}
              </p>
            </div>
          </div>

          {/* Desktop Exact Positioning (xl: and above) */}
          {/* 1. Блок 'приєднуйся до сінема нова' at x: 100, y: 193 */}
          <div 
            className="hidden xl:block absolute z-20 w-[470px] text-left animate-auth-left-slide-in"
            style={{ left: '100px', top: '193px' }}
          >
            <div className="space-y-4">
              <span className="text-[#FF3040] text-xs sm:text-sm font-bold tracking-widest uppercase block drop-shadow-sm">
                {language === 'UA' ? 'ПРИЄДНУЙСЯ ДО CINEMA NOVA' : 'JOIN CINEMA NOVA'}
              </span>
              <h1 className="font-display font-black text-5xl lg:text-6xl text-white tracking-tight leading-[0.95] drop-shadow-md">
                {language === 'UA' ? 'ТВОЇ ІСТОРІЇ.' : 'YOUR STORIES.'}
              </h1>
              <h1 className="font-display font-black text-5xl lg:text-6xl text-[#FF3040] tracking-tight leading-[0.95] mt-1 drop-shadow-md">
                {language === 'UA' ? 'НЕОБМЕЖЕНО.' : 'UNLIMITED.'}
              </h1>
              <p className="text-[#FAFAFA] text-base lg:text-lg font-sans leading-relaxed max-w-xl pt-2 drop-shadow-sm">
                {language === 'UA'
                  ? 'Створіть акаунт і отримайте доступ до тисячі фільмів, серіалів та аніме. Персональні рекомендації, Watch Party та багато іншого чекають на вас.'
                  : 'Create an account and get access to thousands of movies, TV shows, and anime. Personal recommendations, Watch Party, and much more await you.'}
              </p>
            </div>
          </div>

          {/* 2. Меню реєстрації at x: 612, y: 193 - width 660px to fit w595 inputs */}
          <div 
            className="hidden xl:block absolute z-20 w-[660px]"
            style={{ left: '612px', top: '193px' }}
          >
            {renderRegistrationMenu()}
          </div>

          {/* 3. Блок 'безпечно та конфіденційно' at x: 100, y: 1062 - без смужки над ним */}
          <div 
            className="hidden xl:block absolute z-20 w-[460px] text-left"
            style={{ left: '100px', top: '1062px' }}
          >
            <h3 className="font-display font-bold text-white text-base sm:text-lg drop-shadow-sm">
              {language === 'UA' ? 'Безпечно та конфіденційно.' : 'Safe and confidential.'}
            </h3>
            <p className="text-[#FAFAFA] text-xs sm:text-sm font-sans mt-1.5 leading-relaxed drop-shadow-sm">
              {language === 'UA'
                ? 'Ми дбаємо про захист ваших даних та ніколи не передаємо їх третім особам.'
                : 'We care about protecting your data and never transfer it to third parties.'}
            </p>
          </div>
        </main>

        {/* Main Footer - 100% Full Width of Screen (футор не чіпати) */}
        <div className="w-full shrink-0 relative z-30 mt-auto">
          <FooterMain language={language} />
        </div>

      </div>

    </div>
  );
}

