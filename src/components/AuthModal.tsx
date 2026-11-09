import React, { useState, useEffect } from 'react';
import { Mail, Lock, Shield, Sparkles, LogIn, UserPlus, HelpCircle, Chrome, Facebook, X, Eye, EyeOff, ChevronRight, PlaySquare, Heart, Check } from 'lucide-react';
import { UserProfile } from '../types';
import { PRESET_AVATARS } from '../data/movies';
import { useLanguage } from '../context/LanguageContext';
import GoogleSignInButton from './GoogleSignInButton';
import { GoogleJwtPayload } from '../utils/googleAuth';
import RegisterModal from './RegisterModal';
import FooterMain from './FooterMain';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'signin' | 'signup' | 'recover';
  initialEmail?: string;
  initialRecoveryStep?: 'email' | 'code' | 'password';
  onAuthSuccess: (user: UserProfile, isNewRegistration?: boolean) => void;
}

export default function AuthModal({ 
  isOpen, 
  onClose, 
  initialTab = 'signin', 
  initialEmail = '', 
  initialRecoveryStep = 'email',
  onAuthSuccess 
}: AuthModalProps) {
  const { language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'recover'>(initialTab);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [recoveryEmail, setRecoveryEmail] = useState(initialEmail);
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0].url);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Локальний стан збережених облікових записів
  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      if (initialEmail) {
        setEmail(initialEmail);
        setRecoveryEmail(initialEmail);
      }
      if (initialRecoveryStep) {
        setRecoveryStep(initialRecoveryStep);
      } else if (initialTab === 'recover') {
        setRecoveryStep('email');
      }
      setErrorMsg('');
      setSuccessMsg('');
      setNewPassword('');
      setConfirmNewPassword('');
    }
  }, [isOpen, initialTab, initialEmail, initialRecoveryStep]);

  const [accounts, setAccounts] = useState<{ [email: string]: any }>(() => {
    try {
      const saved = localStorage.getItem('cinemanova_accounts');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load accounts:', e);
    }
    return {
      'premium@example.invalid': {
        name: 'Андрій',
        email: 'premium@example.invalid',
        password: 'PUBLIC_DEMO_ONLY',
        avatarUrl: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=150&auto=format&fit=crop',
        plan: 'Premium',
        role: 'user'
      },
      'admin@example.invalid': {
        name: 'Адмін',
        email: 'admin@example.invalid',
        password: 'PUBLIC_DEMO_ONLY',
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop',
        plan: 'VIP',
        role: 'admin'
      },
      'viewer@example.invalid': {
        name: 'Користувач',
        email: 'viewer@example.invalid',
        password: 'PUBLIC_DEMO_ONLY',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
        plan: 'Premium',
        role: 'user'
      }
    };
  });

  const saveAccounts = (newAccounts: { [email: string]: any }) => {
    setAccounts(newAccounts);
    try {
      localStorage.setItem('cinemanova_accounts', JSON.stringify(newAccounts));
    } catch (e) {
      console.error('Failed to save accounts:', e);
    }
  };

  // Синхронізація акаунтів при відкритті модального вікна
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('cinemanova_accounts');
        if (saved) {
          setAccounts(JSON.parse(saved));
        } else {
          const defaults = {
            'premium@example.invalid': {
              name: 'Андрій',
              email: 'premium@example.invalid',
              password: 'PUBLIC_DEMO_ONLY',
              avatarUrl: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=150&auto=format&fit=crop',
              plan: 'Premium',
              role: 'user'
            },
            'admin@example.invalid': {
              name: 'Адмін',
              email: 'admin@example.invalid',
              password: 'PUBLIC_DEMO_ONLY',
              avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop',
              plan: 'VIP',
              role: 'admin'
            },
            'viewer@example.invalid': {
              name: 'Користувач',
              email: 'viewer@example.invalid',
              password: 'PUBLIC_DEMO_ONLY',
              avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
              plan: 'Premium',
              role: 'user'
            }
          };
          localStorage.setItem('cinemanova_accounts', JSON.stringify(defaults));
          setAccounts(defaults);
        }
      } catch (e) {
        console.error('Failed to dynamically sync accounts:', e);
      }
    }
  }, [isOpen]);

  // Стани відновлення пароля
  const [recoveryStep, setRecoveryStep] = useState<'email' | 'code' | 'password'>('email');
  const [generatedCode, setGeneratedCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showMailToast, setShowMailToast] = useState(false);

  if (!isOpen) return null;

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg(language === 'UA' ? 'Будь ласка, заповніть усі поля.' : 'Please fill in all fields.');
      return;
    }
    setErrorMsg('');

    const rawInput = email.trim();
    let normalizedEmail = rawInput.toLowerCase();
    if (normalizedEmail === 'admin') {
      normalizedEmail = 'admin@example.invalid';
    }

    // 1. Отримання свіжих акаунтів з localStorage
    let freshAccounts: { [email: string]: any } = {};
    try {
      const saved = localStorage.getItem('cinemanova_accounts');
      if (saved) freshAccounts = JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load cinemanova_accounts:", e);
    }

    // 2. Завантаження nova_users
    let novaUsersList: any[] = [];
    try {
      const novaUsersStr = localStorage.getItem('nova_users');
      if (novaUsersStr) {
        const parsed = JSON.parse(novaUsersStr);
        if (Array.isArray(parsed)) novaUsersList = parsed;
      }
    } catch (e) {
      console.error("Failed to load nova_users:", e);
    }

    // 3. Перевірка списку видалених користувачів
    let deletedEmails: string[] = [];
    try {
      const deletedStr = localStorage.getItem('cinemanova_deleted_emails');
      if (deletedStr) deletedEmails = JSON.parse(deletedStr);
    } catch (e) {}

    const isDeletedUser = Array.isArray(deletedEmails) && (
      deletedEmails.includes(normalizedEmail) || 
      deletedEmails.includes(rawInput.toLowerCase())
    );

    let foundAccount: any = null;

    if (!isDeletedUser) {
      if (freshAccounts[normalizedEmail]) {
        foundAccount = freshAccounts[normalizedEmail];
      } else {
        for (const k of Object.keys(freshAccounts)) {
          if (k.trim().toLowerCase() === normalizedEmail) {
            foundAccount = freshAccounts[k];
            break;
          }
        }
      }

      if (!foundAccount) {
        const matched = novaUsersList.find((u: any) => 
          (u.email || '').trim().toLowerCase() === normalizedEmail ||
          (u.email || '').trim().toLowerCase() === rawInput.toLowerCase() ||
          ((u.name || '').trim().toLowerCase() === rawInput.toLowerCase() && rawInput.length > 1)
        );
        if (matched) {
          foundAccount = {
            name: matched.name,
            email: matched.email || normalizedEmail,
            password: matched.password || 'PUBLIC_DEMO_ONLY',
            avatarUrl: matched.avatarUrl,
            plan: matched.plan || 'Premium',
            role: matched.role || 'user',
            isBlocked: matched.isBlocked === true || matched.status === 'Заблокований'
          };
        }
      }

      if (!foundAccount) {
        const defaultAccounts: { [key: string]: any } = {
          'premium@example.invalid': {
            name: 'Андрій',
            email: 'premium@example.invalid',
            password: 'PUBLIC_DEMO_ONLY',
            avatarUrl: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=150&auto=format&fit=crop',
            plan: 'Premium',
            role: 'user'
          },
          'admin@example.invalid': {
            name: 'Адмін',
            email: 'admin@example.invalid',
            password: 'PUBLIC_DEMO_ONLY',
            avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop',
            plan: 'VIP',
            role: 'admin'
          },
          'viewer@example.invalid': {
            name: 'Користувач',
            email: 'viewer@example.invalid',
            password: 'PUBLIC_DEMO_ONLY',
            avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
            plan: 'Premium',
            role: 'user'
          }
        };
        if (defaultAccounts[normalizedEmail]) {
          foundAccount = defaultAccounts[normalizedEmail];
        }
      }
    }

    if (!foundAccount) {
      setErrorMsg(
        language === 'UA' 
          ? 'Здається, такого акаунту не існує, створіть акаунт' 
          : "It looks like this account doesn't exist, please create an account"
      );
      return;
    }

    if (foundAccount.isBlocked === true || foundAccount.status === 'Заблокований') {
      setErrorMsg(language === 'UA' ? 'Ваш обліковий запис заблоковано адміністрацією.' : 'Your account has been blocked by the administration.');
      return;
    }

    const isMatchingPassword = foundAccount.password === password || 
      (normalizedEmail === 'admin@example.invalid' && (password === 'PUBLIC_DEMO_ONLY' || password === 'PUBLIC_DEMO_ONLY' || password === 'PUBLIC_DEMO_ONLY'));
    if (foundAccount.password && !isMatchingPassword) {
      setErrorMsg(language === 'UA' ? 'Невірний пароль для цього облікового запису.' : 'Incorrect password for this account.');
      return;
    }

    if (!freshAccounts[normalizedEmail]) {
      freshAccounts[normalizedEmail] = foundAccount;
      saveAccounts(freshAccounts);
    }

    const loggedUser: UserProfile = {
      id: normalizedEmail === 'premium@example.invalid'
        ? 'user-001'
        : (foundAccount.id || 'usr_' + normalizedEmail.replace(/[@.]/g, '_')),
      name: localStorage.getItem(`user_name_${normalizedEmail}`) || foundAccount.name,
      email: foundAccount.email,
      avatarUrl: localStorage.getItem(`user_avatar_${normalizedEmail}`) || foundAccount.avatarUrl,
      plan: (foundAccount.plan || 'Premium') as 'Premium' | 'VIP' | 'Standard',
      favoriteGenres: foundAccount.favoriteGenres || ['Екшн', 'Фантастика', 'Детектив'],
      favorites: foundAccount.favorites || [],
      watchHistory: foundAccount.watchHistory || [],
      password: foundAccount.password,
      role: foundAccount.role || (normalizedEmail === 'admin@example.invalid' ? 'admin' : 'user'),
      handle: localStorage.getItem(`user_handle_${normalizedEmail}`) || foundAccount.handle || ('@' + (foundAccount.name || 'User').replace(/\s+/g, '')),
      birthDate: localStorage.getItem(`user_birthDate_${normalizedEmail}`) || foundAccount.birthDate || '23.07.1999',
      gender: (localStorage.getItem(`user_gender_${normalizedEmail}`) || foundAccount.gender || 'Жіноча') as any,
      location: localStorage.getItem(`user_location_${normalizedEmail}`) || foundAccount.location || 'Львів, Україна',
      aboutMe: localStorage.getItem(`user_aboutMe_${normalizedEmail}`) || foundAccount.aboutMe || '',
      joined: foundAccount.joined
    };

    setSuccessMsg(language === 'UA' ? 'Вхід виконано успішно! Ласкаво просимо.' : 'Successfully logged in! Welcome.');
    setTimeout(() => {
      onAuthSuccess(loggedUser);
      setSuccessMsg('');
      onClose();
    }, 1200);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !name.trim()) {
      setErrorMsg(language === 'UA' ? 'Вкажіть ім’я, пошту та пароль.' : 'Please enter your name, email, and password.');
      return;
    }
    setErrorMsg('');

    const normalizedEmail = email.trim().toLowerCase();

    let currentAccounts: { [email: string]: any } = {};
    try {
      const saved = localStorage.getItem('cinemanova_accounts');
      if (saved) currentAccounts = JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }

    const newAcc = {
      name: name.trim(),
      email: normalizedEmail,
      password: password,
      avatarUrl: selectedAvatar,
      plan: 'VIP',
      joined: new Date().toLocaleDateString(language === 'UA' ? 'uk-UA' : 'en-US'),
      role: normalizedEmail === 'admin@example.invalid' ? 'admin' : 'user',
      isBlocked: false
    };

    currentAccounts[normalizedEmail] = newAcc;
    saveAccounts(currentAccounts);

    try {
      const deletedStr = localStorage.getItem('cinemanova_deleted_emails');
      if (deletedStr) {
        let deletedEmails = JSON.parse(deletedStr);
        if (Array.isArray(deletedEmails)) {
          deletedEmails = deletedEmails.filter((em: string) => em !== normalizedEmail);
          localStorage.setItem('cinemanova_deleted_emails', JSON.stringify(deletedEmails));
        }
      }
    } catch (e) {}

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
      id: normalizedEmail === 'premium@example.invalid'
        ? 'user-001'
        : 'usr_' + normalizedEmail.replace(/[@.]/g, '_'),
      name: name.trim(),
      email: normalizedEmail,
      avatarUrl: selectedAvatar,
      plan: 'VIP',
      favoriteGenres: ['Фантастика', 'Бойовик', 'Драма'],
      favorites: [],
      watchHistory: [],
      password: password,
      role: normalizedEmail === 'admin@example.invalid' ? 'admin' : 'user',
      joined: newAcc.joined
    };

    setSuccessMsg(language === 'UA' ? 'Реєстрація успішна! Раді бачити у Cinema Nova.' : 'Registration successful! Welcome to Cinema Nova.');
    setTimeout(() => {
      onAuthSuccess(generatedUser, true);
      setSuccessMsg('');
      onClose();
    }, 1200);
  };

  const handleRecoverEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = recoveryEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorMsg(language === 'UA' ? 'Вкажіть пошту для відновлення.' : 'Please provide your recovery email.');
      return;
    }
    setErrorMsg('');

    const exists = accounts[normalizedEmail];
    if (!exists) {
      const username = normalizedEmail.split('@')[0];
      const newAcc = {
        name: username.charAt(0).toUpperCase() + username.slice(1),
        email: normalizedEmail,
        password: 'PUBLIC_DEMO_ONLY',
        avatarUrl: PRESET_AVATARS[0].url,
        plan: 'Premium'
      };
      const updated = { ...accounts, [normalizedEmail]: newAcc };
      saveAccounts(updated);
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    setEnteredCode('');
    setNewPassword('');
    setConfirmNewPassword('');

    setSuccessMsg(language === 'UA' ? 'Код відновлення успішно сформовано та надіслано!' : 'Recovery code successfully generated and sent!');
    setShowMailToast(true);

    setTimeout(() => {
      setRecoveryStep('code');
      setSuccessMsg('');
    }, 1500);
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredCode.trim() !== generatedCode) {
      setErrorMsg(language === 'UA' ? 'Невірний або застарілий код підтвердження. Спробуйте ще раз.' : 'Invalid or expired confirmation code. Try again.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg(language === 'UA' ? 'Код успішно підтверджено!' : 'Code successfully verified!');
    setTimeout(() => {
      setRecoveryStep('password');
      setSuccessMsg('');
    }, 1200);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg(language === 'UA' ? 'Пароль занадто короткий (мінімум 6 символів).' : 'Password is too short (minimum 6 characters).');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg(language === 'UA' ? 'Паролі не співпадають.' : 'Passwords do not match.');
      return;
    }

    setErrorMsg('');
    const normalizedEmail = (recoveryEmail || email || '').trim().toLowerCase();
    let existingAcc = accounts[normalizedEmail];

    if (!existingAcc) {
      try {
        const rawAccounts = localStorage.getItem('cinemanova_accounts');
        if (rawAccounts) {
          const parsed = JSON.parse(rawAccounts);
          if (parsed && parsed[normalizedEmail]) existingAcc = parsed[normalizedEmail];
        }
      } catch (e) {}
    }

    if (!existingAcc) {
      try {
        const rawActive = localStorage.getItem('active_user');
        if (rawActive) {
          const parsedActive = JSON.parse(rawActive);
          if (parsedActive && (parsedActive.email || '').trim().toLowerCase() === normalizedEmail) {
            existingAcc = {
              name: parsedActive.name || 'Користувач',
              email: parsedActive.email,
              avatarUrl: parsedActive.avatarUrl,
              plan: parsedActive.plan || 'Premium',
              role: parsedActive.role || 'user'
            };
          }
        }
      } catch (e) {}
    }

    if (!existingAcc && normalizedEmail) {
      existingAcc = {
        name: localStorage.getItem(`user_name_${normalizedEmail}`) || 'Користувач',
        email: normalizedEmail,
        plan: 'Premium',
        role: 'user'
      };
    }

    if (existingAcc) {
      const updatedAcc = { ...existingAcc, password: newPassword };
      const updatedAccounts = { ...accounts, [normalizedEmail]: updatedAcc };
      saveAccounts(updatedAccounts);
      try {
        localStorage.setItem(`user_password_${normalizedEmail}`, newPassword);
      } catch (e) {}

      const loggedUser: UserProfile = {
        id: normalizedEmail === 'premium@example.invalid'
          ? 'user-001'
          : (existingAcc.id || 'usr_' + normalizedEmail.replace(/[@.]/g, '_')),
        name: localStorage.getItem(`user_name_${normalizedEmail}`) || existingAcc.name,
        email: existingAcc.email,
        avatarUrl: localStorage.getItem(`user_avatar_${normalizedEmail}`) || existingAcc.avatarUrl,
        plan: (existingAcc.plan || 'Premium') as 'Premium' | 'VIP' | 'Standard',
        favoriteGenres: existingAcc.favoriteGenres || ['Екшн', 'Фантастика', 'Детектив'],
        favorites: existingAcc.favorites || [],
        watchHistory: existingAcc.watchHistory || [],
        password: newPassword,
        role: existingAcc.role || (normalizedEmail === 'admin@example.invalid' ? 'admin' : 'user'),
        handle: localStorage.getItem(`user_handle_${normalizedEmail}`) || existingAcc.handle || ('@' + (existingAcc.name || 'User').replace(/\s+/g, '')),
        birthDate: localStorage.getItem(`user_birthDate_${normalizedEmail}`) || existingAcc.birthDate || '23.07.1999',
        gender: (localStorage.getItem(`user_gender_${normalizedEmail}`) || existingAcc.gender || 'Жіноча') as any,
        location: localStorage.getItem(`user_location_${normalizedEmail}`) || existingAcc.location || 'Львів, Україна',
        aboutMe: localStorage.getItem(`user_aboutMe_${normalizedEmail}`) || existingAcc.aboutMe || '',
        joined: existingAcc.joined
      };

      setSuccessMsg(language === 'UA' ? 'Пароль успішно оновлено! Вхід у систему...' : 'Password successfully updated! Logging in...');
      setShowMailToast(false);
      setTimeout(() => {
        onAuthSuccess(loggedUser);
        setSuccessMsg('');
        setRecoveryStep('email');
        setActiveTab('signin');
        onClose();
      }, 1500);
    } else {
      setErrorMsg(language === 'UA' ? 'Помилка відновлення. Спробуйте розпочати спочатку.' : 'Recovery error. Try starting over.');
      setRecoveryStep('email');
    }
  };

  const handleGoogleSignInSuccess = (payload: GoogleJwtPayload) => {
    const emailKey = payload.email.trim().toLowerCase();
    if (!emailKey || emailKey.includes('google.user@cinemanova.com')) {
      setErrorMsg(language === 'UA' ? 'Недійсний обліковий запис Google' : 'Invalid Google account');
      return;
    }

    let isBlockedByNovaUsers = false;
    try {
      const novaUsersStr = localStorage.getItem('nova_users');
      if (novaUsersStr) {
        const novaUsers = JSON.parse(novaUsersStr);
        const matchedUser = novaUsers.find((u: any) => u.email.trim().toLowerCase() === emailKey);
        if (matchedUser && matchedUser.isBlocked === true) {
          isBlockedByNovaUsers = true;
        }
      }
    } catch (e) {
      console.error(e);
    }

    const existingAccount = accounts[emailKey];
    if (isBlockedByNovaUsers || (existingAccount && (existingAccount.status === 'Заблокований' || existingAccount.isBlocked === true))) {
      setErrorMsg(language === 'UA' ? 'Ваш обліковий запис заблоковано адміністрацією.' : 'Your account has been blocked by administration.');
      return;
    }

    if (!existingAccount) {
      const newAcc = {
        name: payload.name || payload.given_name || emailKey.split('@')[0],
        email: payload.email,
        avatarUrl: payload.picture || PRESET_AVATARS[0].url,
        plan: 'VIP',
        joined: new Date().toLocaleDateString(language === 'UA' ? 'uk-UA' : 'en-US')
      };
      saveAccounts({ ...accounts, [emailKey]: newAcc });

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
      id: 'usr_google_' + (payload.sub || emailKey.replace(/[@.]/g, '_')),
      name: localStorage.getItem(`user_name_${emailKey}`) || existingAccount?.name || payload.name || payload.given_name || emailKey.split('@')[0],
      email: payload.email,
      avatarUrl: savedGoogleAvatar || existingAccount?.avatarUrl || payload.picture || PRESET_AVATARS[0].url,
      plan: (existingAccount?.plan || 'Premium') as any,
      favoriteGenres: existingAccount?.favoriteGenres || ['Екшн', 'Пригоди', 'Фантастика'],
      favorites: existingAccount?.favorites || [],
      watchHistory: existingAccount?.watchHistory || [],
      role: emailKey === 'admin@example.invalid' ? 'admin' : 'user',
      handle: localStorage.getItem(`user_handle_${emailKey}`) || existingAccount?.handle || ('@' + (existingAccount?.name || payload.name || 'User').replace(/\s+/g, '')),
      birthDate: localStorage.getItem(`user_birthDate_${emailKey}`) || existingAccount?.birthDate || '23.07.1999',
      gender: (localStorage.getItem(`user_gender_${emailKey}`) || existingAccount?.gender || 'Жіноча') as any,
      location: localStorage.getItem(`user_location_${emailKey}`) || existingAccount?.location || 'Львів, Україна',
      aboutMe: localStorage.getItem(`user_aboutMe_${emailKey}`) || existingAccount?.aboutMe || ''
    };

    setSuccessMsg(language === 'UA' ? `Вітаємо, ${userProfile.name}! Вхід через Google успішно виконано.` : `Welcome, ${userProfile.name}! Signed in via Google.`);
    setTimeout(() => {
      onAuthSuccess(userProfile);
      setSuccessMsg('');
      onClose();
    }, 1200);
  };

  const handleSocialLogin = (platform: 'Google' | 'Facebook') => {
    const socialUser: UserProfile = {
      id: 'usr_' + platform.toLowerCase() + '_' + Date.now(),
      name: `${platform} User`,
      email: `${platform.toLowerCase()}@novacinema.com`,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop',
      plan: 'Premium',
      favoriteGenres: ['Екшн', 'Популярне'],
      favorites: [],
      watchHistory: []
    };

    setSuccessMsg(language === 'UA' ? `Успішний вхід через ${platform}!` : `Signed in via ${platform}!`);
    setTimeout(() => {
      onAuthSuccess(socialUser);
      setSuccessMsg('');
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  if (activeTab === 'signup') {
    return (
      <RegisterModal
        isOpen={isOpen}
        onClose={onClose}
        onAuthSuccess={onAuthSuccess}
        onSwitchToLogin={() => setActiveTab('signin')}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#08080c] text-white overflow-hidden font-sans">
      {/* ========================================================================= */}
      {/* 1. ФОНОВІ ЕФЕКТИ (ДЛЯ МОБІЛЬНОЇ ТА ДЕСКТОПНОЇ ВЕРСІЙ)                     */}
      {/* ========================================================================= */}
      {/* Mobile Background Effect for Auth Модальне вікно - Fullscreen */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden sm:hidden select-none">
        <img
          src={
            activeTab === 'signin'
              ? '/effects/VhidMobile.png'
              : recoveryStep === 'code'
              ? '/effects/VhidMobile.png'
              : recoveryStep === 'password'
              ? '/effects/VhidMobile.png'
              : '/effects/VhidMobile.png'
          }
          alt=""
          decoding="async"
          className="w-full h-full object-cover object-center opacity-100 pointer-events-none"
        />
      </div>

      {/* Червоне фонове світіння та світловий ефект для десктопу */}
      <div className="hidden sm:flex fixed inset-0 pointer-events-none overflow-hidden z-0 justify-center items-start pt-8 sm:pt-16">
        <img 
          src="/effects/AuthEllipse.webp" 
          alt="" 
          decoding="async"
          className="absolute w-[750px] sm:w-[980px] lg:w-[1100px] max-w-none opacity-50 pointer-events-none mix-blend-screen"
          style={{ filter: 'brightness(1.2) contrast(1.05)' }}
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            if (!target.src.endsWith('.png')) {
              target.src = '/effects/AuthEllipse.webp';
            } else {
              target.style.display = 'none';
            }
          }}
        />
        <div
          className="w-[600px] sm:w-[850px] lg:w-[1000px] h-[600px] sm:h-[850px] lg:h-[1000px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, rgba(255, 48, 64, 0.22) 0%, rgba(255, 48, 64, 0.1) 40%, transparent 75%)',
            filter: 'blur(80px)',
            transform: 'translate3d(0, 0, 0)'
          }}
        />
      </div>

      {/* ========================================================================= */}
      {/* 2. ДЕСКТОПНА ВЕРСІЯ (hidden lg:flex) - ТОЧНИЙ ДИЗАЙН ЗА FIGMA              */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex relative z-10 w-full h-full overflow-y-auto flex-col justify-between min-h-screen">
        {/* Top Header Bar - Exact Main Header Design */}
        <header 
          className="w-full shrink-0 cinema-header pl-4 md:pl-[50px] pr-4 md:pr-[91px] flex items-center justify-between transition-all select-none z-30"
          style={{ paddingTop: '14px', paddingBottom: '14px', height: 'auto', minHeight: '75px' }}
        >
          <div className="w-full flex items-center justify-between">
            {/* Logo from /logo/logo.png */}
            <div className="flex items-center cursor-pointer select-none group" onClick={onClose}>
              <img 
                src="/logo/logo.png" 
                alt="CINEMA NOVA" 
                className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-105" 
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/logo/logo.svg';
                }}
              />
            </div>

            {/* Right Header Controls: Language Switcher + Close Button */}
            <div className="flex items-center gap-6">
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

              <button
                onClick={onClose}
                className="p-2 rounded-[10px] text-[#FAFAFA] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-6 h-6 stroke-[2]" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area: Centered Container */}
        <main className="flex-1 flex items-center justify-center w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-16 py-6 sm:py-10 my-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center w-full">

            {/* Left Column: 5 Movie & Anime Poster Stack with Text Overlaid Directly On Bottom */}
            <div className="lg:col-span-6 flex flex-col justify-center items-center lg:items-start w-full animate-auth-left-slide-in">
              {/* Poster Collage Container - Fluid aspect-ratio container maintaining exact 869x814 Figma spec */}
              <div className="relative w-full max-w-[869px] aspect-[869/814] select-none">

                {/* Poster Rectangle 283: W213 H324 X178 Y154 (Rel: Left 9.55%, Top 0%, W 24.51%, H 39.80%) */}
                <div
                  className="absolute rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-white/10 z-0 opacity-100 transition-all duration-300"
                  style={{ left: '9.55%', top: '0%', width: '24.51%', height: '39.80%' }}
                >
                  <img
                    src="/posters/Rectangle 283.png"
                    alt="Rectangle 283 Anime Mask"
                    className="w-full h-full object-cover opacity-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop';
                    }}
                  />
                </div>

                {/* Poster Rectangle 282: W295 H452 X513 Y154 (Rel: Left 48.10%, Top 0%, W 33.95%, H 55.53%) - z-[8] so it sits in front of Rectangle 281 */}
                <div
                  className="absolute rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-white/10 z-[8] opacity-100 transition-all duration-300"
                  style={{ left: '48.10%', top: '0%', width: '33.95%', height: '55.53%' }}
                >
                  <img
                    src="/posters/Rectangle 282.png"
                    alt="Rectangle 282 Breaking Bad"
                    className="w-full h-full object-cover opacity-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://image.tmdb.org/t/p/w500/ggFH193233LA9I4LqA21P34.jpg';
                    }}
                  />
                </div>

                {/* Poster Rectangle 280: W327 H498 X302 Y379.99 (Rel: Left 23.82%, Top 27.76%, W 37.63%, H 61.18%) */}
                <div
                  className="absolute rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-white/15 z-[10] opacity-100 transition-all duration-300"
                  style={{ left: '23.82%', top: '27.76%', width: '37.63%', height: '61.18%' }}
                >
                  <img
                    src="/posters/Rectangle 280.png"
                    alt="Rectangle 280 The Last of Us"
                    className="w-full h-full object-cover opacity-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://image.tmdb.org/t/p/w500/u3bZgnGQ9T01sWNhyve4z0wH0Hl.jpg';
                    }}
                  />
                </div>

                {/* Poster Rectangle 281: W259 H395 X705 Y460.99 (Rel: Left 70.20%, Top 37.71%, W 29.80%, H 48.53%) - z-[2] so it sits behind Rectangle 282 */}
                <div
                  className="absolute rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-white/10 z-[2] opacity-100 transition-all duration-300"
                  style={{ left: '70.20%', top: '37.71%', width: '29.80%', height: '48.53%' }}
                >
                  <img
                    src="/posters/Rectangle 281.png"
                    alt="Rectangle 281 Anime Red Glow"
                    className="w-full h-full object-cover opacity-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=600&auto=format&fit=crop';
                    }}
                  />
                </div>

                {/* Poster Frame 10: W348 H529 X95 Y438.99 (Rel: Left 0%, Top 35.01%, W 40.05%, H 64.99%) */}
                <div
                  className="absolute rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.95)] border border-white/20 z-[20] opacity-100 transition-all duration-300"
                  style={{ left: '0%', top: '35.01%', width: '40.05%', height: '64.99%' }}
                >
                  <img
                    src="/posters/Frame 10.png"
                    alt="Frame 10 IT Pennywise"
                    className="w-full h-full object-cover opacity-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://image.tmdb.org/t/p/w500/9E2yT82M21e2f9024021.jpg';
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                </div>

                {/* Overlaid Text Box */}
                <div
                  className="absolute z-[30] flex flex-col justify-end space-y-0.5 sm:space-y-1 pointer-events-none drop-shadow-[0_10px_25px_rgba(0,0,0,0.95)]"
                  style={{ left: '0.58%', top: '61.18%', width: '81.47%', height: '34.15%' }}
                >
                  <h1 className="font-display font-black text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-white tracking-tight leading-[0.92] drop-shadow-2xl">
                    {language === 'UA' ? 'ТВОЇ ІСТОРІЇ.' : 'YOUR STORIES.'}
                  </h1>
                  <h1 className="font-display font-black text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-[#FF3040] tracking-tight leading-[0.92] drop-shadow-2xl">
                    {language === 'UA' ? 'НЕОБМЕЖЕНО.' : 'UNLIMITED.'}
                  </h1>
                  <p className="text-gray-100 text-xs sm:text-sm md:text-base lg:text-lg font-sans pt-1 leading-snug drop-shadow-lg max-w-[92%] font-medium">
                    {language === 'UA'
                      ? 'Дивіться найкращі фільми, серіали та аніме. Будь-де, будь-коли.'
                      : 'Watch the best movies, TV shows, and anime. Anywhere, anytime.'}
                  </p>
                </div>

              </div>
            </div>

            {/* Right Column: Fully Transparent Glass Login Window */}
            <div className="lg:col-span-6 flex justify-center lg:justify-end relative w-full">
              <div
                id="auth-modal-container"
                className="relative w-full max-w-[580px] lg:max-w-[540px] xl:max-w-[580px] rounded-[24px] sm:rounded-[32px] p-6 sm:p-9 md:p-10 flex flex-col justify-between transition-all z-20 overflow-hidden animate-auth-slide-in"
                style={{
                  background: 'rgba(0, 0, 0, 0.45)',
                  filter: 'drop-shadow(0 20px 50px rgba(0, 0, 0, 0.35))',
                  WebkitFilter: 'drop-shadow(0 20px 50px rgba(0, 0, 0, 0.35))',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)'
                }}
              >
                {/* Figma Exact Gradient Border: 0% #FFFFFF 100% -> 100% #D72835 100% */}
                <span
                  className="absolute inset-0 rounded-[24px] sm:rounded-[32px] pointer-events-none z-[1]"
                  style={{
                    border: '1.5px solid transparent',
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #D72835 100%) border-box',
                    WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude'
                  }}
                />
                <svg className="absolute inset-0 w-full h-full pointer-events-none rounded-[24px] sm:rounded-[32px] overflow-hidden z-[1]">
                  <defs>
                    <linearGradient id="auth-figma-border-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                      <stop offset="100%" stopColor="#D72835" stopOpacity="1" />
                    </linearGradient>
                  </defs>
                  <rect
                    x="0.75"
                    y="0.75"
                    width="calc(100% - 1.5px)"
                    height="calc(100% - 1.5px)"
                    rx="24"
                    ry="24"
                    fill="none"
                    stroke="url(#auth-figma-border-grad)"
                    strokeWidth="1.5"
                  />
                </svg>
                {/* Feedback messages */}
                {successMsg && (
                  <div className="p-3 mb-3 text-xs sm:text-sm text-green-400 border border-green-500/30 bg-green-500/10 rounded-2xl flex items-center gap-2 animate-pulse">
                    <Shield className="w-4 h-4 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}
                {errorMsg && (
                  <div className="p-3.5 mb-3 text-xs sm:text-sm text-[#FF3040] border border-[#FF3040]/30 bg-[#FF3040]/10 rounded-2xl flex items-center gap-2.5 shadow-lg shadow-[#FF3040]/10 animate-in fade-in zoom-in-95">
                    <HelpCircle className="w-4 h-4 shrink-0 text-[#FF3040]" />
                    <span className="font-medium">{errorMsg}</span>
                  </div>
                )}

                {/* Form Content depending on tab */}
                {activeTab === 'signin' && (
                  <form onSubmit={handleSignIn} className="flex-1 flex flex-col justify-between space-y-5">
                    {/* Title & Subtitle */}
                    <div>
                      <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight leading-tight">
                        {language === 'UA' ? 'Ваші історії чекають!' : 'Your stories are waiting!'}
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-400 mt-1.5 font-sans">
                        {language === 'UA' ? 'Увійдіть, щоб продовжити перегляд.' : 'Sign in to continue watching.'}
                      </p>
                    </div>

                    {/* Input Fields */}
                    <div className="space-y-3.5 my-auto">
                      {/* Email Input */}
                      <div className="relative">
                        <input
                          id="signin-email-or-username-desktop"
                          name="signin-email-or-username"
                          type="text"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email address"
                          className="w-full py-3.5 px-5 text-sm sm:text-base text-white bg-transparent border border-[#FAFAFA] rounded-[16px] focus:outline-none focus:border-[#FF3040] focus:ring-1 focus:ring-[#FF3040] transition-all font-sans placeholder-gray-400"
                        />
                      </div>

                      {/* Password Input */}
                      <div className="relative">
                        <input
                          id="signin-password-desktop"
                          name="signin-password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Password"
                          className="w-full py-3.5 pl-5 pr-12 text-sm sm:text-base text-white bg-transparent border border-[#FAFAFA] rounded-[16px] focus:outline-none focus:border-[#FF3040] focus:ring-1 focus:ring-[#FF3040] transition-all font-sans placeholder-gray-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer p-1"
                          aria-label="Toggle password visibility"
                        >
                          {showPassword ? (
                            <img src="/icons/Eye open.png" alt="Show password" className="w-5 h-5 object-contain icon-fafafa" />
                          ) : (
                            <img src="/icons/Eye closed.png" alt="Hide password" className="w-5 h-5 object-contain icon-fafafa" />
                          )}
                        </button>
                      </div>

                      {/* Remember me & Forgot Password */}
                      <div className="flex items-center justify-between px-1 pt-0.5">
                        <label 
                          className="flex items-center gap-2.5 cursor-pointer text-xs text-gray-300 hover:text-white transition-colors select-none group"
                          onClick={(e) => {
                            e.preventDefault();
                            setRememberMe(!rememberMe);
                          }}
                        >
                          <div 
                            className={`w-4 h-4 rounded-[4px] border transition-all duration-150 flex items-center justify-center ${
                              rememberMe 
                                ? 'bg-white border-white text-black shadow-sm' 
                                : 'bg-transparent border-white hover:border-white'
                            }`}
                          >
                            {rememberMe && (
                              <Check className="w-3 h-3 text-black stroke-[3.5]" />
                            )}
                          </div>
                          <span>{language === 'UA' ? "Запам'ятати мене" : 'Remember me'}</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setActiveTab('recover')}
                          className="text-xs text-[#FF3040] hover:text-[#FF4D5C] hover:underline cursor-pointer font-sans font-medium"
                        >
                          {language === 'UA' ? 'Забули пароль?' : 'Forgot password?'}
                        </button>
                      </div>

                      {/* CTA Button */}
                      <button
                        type="submit"
                        className="journey-cta-btn border-2 border-transparent hover:border-white/80 active:border-transparent text-white w-full max-w-[418px] h-[68px] mx-auto rounded-[16px] font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-lg shadow-[#FF4D5C]/25 cursor-pointer mt-2 select-none group"
                        style={{ width: '418px', maxWidth: '100%', height: '68px' }}
                      >
                        <span>{language === 'UA' ? 'Розпочніть свою подорож' : 'Start your journey'}</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform stroke-[2.5]" />
                      </button>
                    </div>

                    {/* Social Login Section */}
                    <div className="pt-1">
                      <div className="relative flex items-center justify-center gap-3 mt-2 mb-[21px] w-full">
                        <div className="flex-1 h-[1px] bg-white/20" />
                        <span className="text-[12px] sm:text-xs font-medium text-[#FAFAFA] whitespace-nowrap bg-transparent select-none">
                          {language === 'UA' ? 'або продовжити через' : 'or continue via'}
                        </span>
                        <div className="flex-1 h-[1px] bg-white/20" />
                      </div>

                      {/* Social Buttons: Google & Facebook - No background, white border, white logo */}
                      <div className="flex justify-center gap-4">
                        <GoogleSignInButton
                          onSuccess={handleGoogleSignInSuccess}
                          className="w-16 sm:w-20"
                        >
                          <button
                            type="button"
                            className="w-16 sm:w-20 h-11 rounded-xl border border-white bg-transparent hover:bg-white/10 transition-all flex items-center justify-center cursor-pointer group shadow-sm"
                            title="Google"
                          >
                            <img 
                              src="/icons/google.png" 
                              alt="Google" 
                              className="w-5 h-5 object-contain icon-fafafa group-hover:scale-105 transition-transform" 
                            />
                          </button>
                        </GoogleSignInButton>

                        <button
                          type="button"
                          onClick={() => handleSocialLogin('Facebook')}
                          className="w-16 sm:w-20 h-11 rounded-xl border border-white bg-transparent hover:bg-white/10 transition-all flex items-center justify-center cursor-pointer group shadow-sm"
                          title="Facebook"
                        >
                          <img 
                            src="/icons/Facebook.png" 
                            alt="Facebook" 
                            className="w-5 h-5 object-contain icon-fafafa group-hover:scale-105 transition-transform" 
                          />
                        </button>
                      </div>

                      <p className="text-center text-xs text-gray-400 pt-1 font-sans">
                        {language === 'UA' ? 'Немає аккаунту? ' : "Don't have an account? "}
                        <button
                          type="button"
                          onClick={() => setActiveTab('signup')}
                          className="text-[#FF3040] hover:text-white font-semibold hover:underline cursor-pointer ml-0.5"
                        >
                          {language === 'UA' ? 'Зареєструватись' : 'Register'}
                        </button>
                      </p>
                    </div>
                  </form>
                )}

                {activeTab === 'recover' && (
                  <div className="flex-1 flex flex-col justify-between space-y-4 font-sans relative">
                    {/* Back to sign‑in */}
                    <button
                      onClick={() => setActiveTab('signin')}
                      className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors cursor-pointer"
                      aria-label={language === 'UA' ? 'Назад до входу' : 'Back to Sign‑In'}
                    >
                      <X className="w-5 h-5" />
                    </button>
                    {recoveryStep === 'email' && (
                      <form onSubmit={handleRecoverEmail} className="space-y-0">
                        <div className="text-center space-y-1.5 mb-6">
                          <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight leading-tight">
                            {language === 'UA' ? 'Забули пароль?' : 'Forgot password?'}
                          </h2>
                          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-sm mx-auto">
                            {language === 'UA'
                              ? 'Не хвилюйтеся! Введіть свою електронну адресу, і ми надішлемо вам лист для його скидання.'
                              : "Don't worry! Enter your email address and we will send you a code to reset it."}
                          </p>
                        </div>

                        <div className="space-y-1.5 pt-2">
                          <label className="text-xs sm:text-sm text-white font-medium block">
                            Email
                          </label>
                          <input
                            id="recovery-email-desktop"
                            name="recovery-email"
                            type="email"
                            required
                            value={recoveryEmail}
                            onChange={(e) => setRecoveryEmail(e.target.value)}
                            placeholder="Email address"
                            className="w-full py-3.5 px-4 text-sm sm:text-base text-white bg-transparent border border-[#FAFAFA] rounded-[16px] focus:outline-none focus:border-[#FF3040] focus:ring-1 focus:ring-[#FF3040] transition-colors"
                          />
                        </div>

                        {/* Submit Button: 50px from input, less wide (300px) */}
                        <div className="mt-[50px] flex justify-center w-full">
                          <button
                            type="submit"
                            className="journey-cta-btn border-2 border-transparent hover:border-white/80 active:border-transparent text-white w-[300px] max-w-full h-[60px] mx-auto rounded-[16px] font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-lg shadow-[#FF4D5C]/25 cursor-pointer select-none"
                            style={{ width: '300px', maxWidth: '100%', height: '60px' }}
                          >
                            {language === 'UA' ? 'Надіслати код' : 'Send code'}
                          </button>
                        </div>

                        {/* Divider: 50px from button with lines and 'або' / 'or' text */}
                        <div className="relative flex items-center justify-center gap-3 mt-[50px] w-full">
                          <div className="flex-1 h-[1px] bg-white/20" />
                          <span className="text-[12px] sm:text-xs font-medium text-[#FAFAFA] whitespace-nowrap bg-transparent select-none">
                            {language === 'UA' ? 'або' : 'or'}
                          </span>
                          <div className="flex-1 h-[1px] bg-white/20" />
                        </div>

                        {/* Back to sign-in button: 50px from 'або', less wide (300px) */}
                        <div className="mt-[50px] flex justify-center w-full">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('signin');
                              setErrorMsg('');
                              setSuccessMsg('');
                            }}
                            className="relative w-[300px] max-w-full h-[60px] mx-auto rounded-[16px] font-bold text-sm sm:text-base text-white bg-transparent active:scale-98 transition-all flex items-center justify-center cursor-pointer select-none group hover:bg-white/[0.04]"
                            style={{ width: '300px', maxWidth: '100%', height: '60px' }}
                          >
                            <span
                              className="absolute inset-0 rounded-[16px] pointer-events-none"
                              style={{
                                border: '1.5px solid transparent',
                                background: 'linear-gradient(135deg, #FFFFFF 0%, #D72835 100%) border-box',
                                WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
                                WebkitMaskComposite: 'xor',
                                maskComposite: 'exclude'
                              }}
                            />
                            <span className="relative z-10">{language === 'UA' ? 'Назад до входу' : 'Back to sign-in'}</span>
                          </button>
                        </div>
                      </form>
                    )}

                    {recoveryStep === 'code' && (
                      <form onSubmit={handleVerifyCode} className="space-y-0">
                        <div className="text-center space-y-1.5 mb-6">
                          <h3 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight leading-tight">
                            {language === 'UA' ? 'Підтвердження коду' : 'Confirm Code'}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-sm mx-auto">
                            {language === 'UA' ? 'Введіть 6-значний код, надісланий на ' : 'Enter the 6-digit code sent to '}
                            <strong className="text-white">{recoveryEmail}</strong>
                          </p>
                        </div>

                        <div className="flex justify-end mb-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRecoveryStep('email');
                              setErrorMsg('');
                              setSuccessMsg('');
                            }}
                            className="flex items-center gap-1.5 text-white group cursor-pointer text-left shrink-0 select-none"
                          >
                            <ChevronRight className="w-3.5 h-3.5 text-[#FF3040] stroke-[2.5] shrink-0 group-hover:translate-x-0.5 transition-transform" />
                            <span className="group-hover:underline group-active:underline underline-offset-4 decoration-1 decoration-white text-xs">
                              {language === 'UA' ? 'Змінити пошту' : 'Change email'}
                            </span>
                          </button>
                        </div>

                        <input
                          id="recovery-code-desktop"
                          name="recovery-code"
                          type="text"
                          maxLength={6}
                          required
                          placeholder="000000"
                          value={enteredCode}
                          onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full text-center py-3.5 text-xl tracking-[1em] pl-[1em] font-mono text-white bg-transparent border border-[#FAFAFA] rounded-[16px] focus:outline-none focus:border-[#FF3040] focus:ring-1 focus:ring-[#FF3040] transition-colors"
                        />

                        {/* Confirm Code Button: 50px from input, less wide (300px) */}
                        <div className="mt-[50px] flex justify-center w-full">
                          <button
                            type="submit"
                            className="journey-cta-btn border-2 border-transparent hover:border-white/80 active:border-transparent text-white w-[300px] max-w-full h-[60px] mx-auto rounded-[16px] font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-lg shadow-[#FF4D5C]/25 cursor-pointer select-none"
                            style={{ width: '300px', maxWidth: '100%', height: '60px' }}
                          >
                            {language === 'UA' ? 'Підтвердити код' : 'Confirm Code'}
                          </button>
                        </div>

                        {/* Divider: 50px from button */}
                        <div className="relative flex items-center justify-center gap-3 mt-[50px] w-full">
                          <div className="flex-1 h-[1px] bg-white/20" />
                          <span className="text-[12px] sm:text-xs font-medium text-[#FAFAFA] whitespace-nowrap bg-transparent select-none">
                            {language === 'UA' ? 'або' : 'or'}
                          </span>
                          <div className="flex-1 h-[1px] bg-white/20" />
                        </div>

                        {/* Back to sign-in: 50px from 'або', less wide (300px) */}
                        <div className="mt-[50px] flex justify-center w-full">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('signin');
                              setRecoveryStep('email');
                              setErrorMsg('');
                              setSuccessMsg('');
                            }}
                            className="relative w-[300px] max-w-full h-[60px] mx-auto rounded-[16px] font-bold text-sm sm:text-base text-white bg-transparent active:scale-98 transition-all flex items-center justify-center cursor-pointer select-none group hover:bg-white/[0.04]"
                            style={{ width: '300px', maxWidth: '100%', height: '60px' }}
                          >
                            <span
                              className="absolute inset-0 rounded-[16px] pointer-events-none"
                              style={{
                                border: '1.5px solid transparent',
                                background: 'linear-gradient(135deg, #FFFFFF 0%, #D72835 100%) border-box',
                                WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
                                WebkitMaskComposite: 'xor',
                                maskComposite: 'exclude'
                              }}
                            />
                            <span className="relative z-10">{language === 'UA' ? 'Назад до входу' : 'Back to sign-in'}</span>
                          </button>
                        </div>
                      </form>
                    )}

                    {recoveryStep === 'password' && (
                      <form onSubmit={handleResetPassword} className="space-y-0">
                        <div className="text-center space-y-1.5 mb-6">
                          <h3 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight leading-tight">
                            {language === 'UA' ? 'Новий пароль' : 'New Password'}
                          </h3>
                        </div>

                        <div className="space-y-4">
                          <input
                            id="new-password-desktop"
                            name="new-password"
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder={language === 'UA' ? 'Новий пароль' : 'New Password'}
                            className="w-full py-3.5 px-4 text-sm sm:text-base text-white bg-transparent border border-[#FAFAFA] rounded-[16px] focus:outline-none focus:border-[#FF3040] focus:ring-1 focus:ring-[#FF3040] transition-colors"
                          />

                          <input
                            id="confirm-new-password-desktop"
                            name="confirm-new-password"
                            type="password"
                            required
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            placeholder={language === 'UA' ? 'Підтвердження пароля' : 'Confirm Password'}
                            className="w-full py-3.5 px-4 text-sm sm:text-base text-white bg-transparent border border-[#FAFAFA] rounded-[16px] focus:outline-none focus:border-[#FF3040] focus:ring-1 focus:ring-[#FF3040] transition-colors"
                          />
                        </div>

                        {/* Update Password button: 50px from input, less wide (300px) */}
                        <div className="mt-[50px] flex justify-center w-full">
                          <button
                            type="submit"
                            className="journey-cta-btn border-2 border-transparent hover:border-white/80 active:border-transparent text-white w-[300px] max-w-full h-[60px] mx-auto rounded-[16px] font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-lg shadow-[#FF4D5C]/25 cursor-pointer select-none"
                            style={{ width: '300px', maxWidth: '100%', height: '60px' }}
                          >
                            {language === 'UA' ? 'Оновити пароль' : 'Update Password'}
                          </button>
                        </div>

                        {/* Divider: 50px from button */}
                        <div className="relative flex items-center justify-center gap-3 mt-[50px] w-full">
                          <div className="flex-1 h-[1px] bg-white/20" />
                          <span className="text-[12px] sm:text-xs font-medium text-[#FAFAFA] whitespace-nowrap bg-transparent select-none">
                            {language === 'UA' ? 'або' : 'or'}
                          </span>
                          <div className="flex-1 h-[1px] bg-white/20" />
                        </div>

                        {/* Back to sign-in / Back: 50px from 'або', less wide (300px) */}
                        <div className="mt-[50px] flex justify-center w-full">
                          <button
                            type="button"
                            onClick={() => {
                              if (initialRecoveryStep === 'password') {
                                onClose();
                              } else {
                                setActiveTab('signin');
                                setRecoveryStep('email');
                              }
                              setErrorMsg('');
                              setSuccessMsg('');
                            }}
                            className="relative w-[300px] max-w-full h-[60px] mx-auto rounded-[16px] font-bold text-sm sm:text-base text-white bg-transparent active:scale-98 transition-all flex items-center justify-center cursor-pointer select-none group hover:bg-white/[0.04]"
                            style={{ width: '300px', maxWidth: '100%', height: '60px' }}
                          >
                            <span
                              className="absolute inset-0 rounded-[16px] pointer-events-none"
                              style={{
                                border: '1.5px solid transparent',
                                background: 'linear-gradient(135deg, #FFFFFF 0%, #D72835 100%) border-box',
                                WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
                                WebkitMaskComposite: 'xor',
                                maskComposite: 'exclude'
                              }}
                            />
                            <span className="relative z-10">
                              {initialRecoveryStep === 'password'
                                ? (language === 'UA' ? 'Назад' : 'Back')
                                : (language === 'UA' ? 'Назад до входу' : 'Back to sign-in')}
                            </span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Quote & Features Bar - STRETCHED FULL WIDTH Across Site */}
        <section
          className="relative z-10 w-full bg-[#121212] border-t border-b border-white/10 py-10 sm:py-14 px-6 sm:px-12 lg:px-20 mt-10 sm:mt-16"
          style={{ backgroundColor: '#121212', opacity: 1 }}
        >
          <div className="max-w-[1700px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Quote */}
            <div className="md:col-span-7 flex items-start gap-5">
              <svg
                className="w-[76px] h-[54px] shrink-0 text-[#FF3040] fill-current"
                viewBox="0 0 76 54"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0 54V33.2C0 14.6 10.8 3.2 32.4 0L35.6 9.4C23.6 12 18.2 18.8 17.4 28H33.4V54H0ZM42.6 54V33.2C42.6 14.6 53.4 3.2 75 0L78.2 9.4C66.2 12 60.8 18.8 60 28H76V54H42.6Z"
                  fill="currentColor"
                />
              </svg>
              <div>
                <p
                  className="text-gray-100 font-medium leading-snug"
                  style={{ fontFamily: "'Montserrat Alternates', sans-serif", fontWeight: 500, fontSize: '24px' }}
                >
                  {language === 'UA'
                    ? 'Кіно — це питання того, що знаходиться в кадрі і що залишається за його межами.'
                    : 'Cinema is a matter of what\'s in the frame and what\'s out.'}
                </p>
                <p className="text-sm text-gray-400 mt-2 font-semibold font-sans">
                  — Мартін Скорсезе
                </p>
              </div>
            </div>

            {/* Features Grid - larger icons without backgrounds or circular wrappers */}
            <div className="md:col-span-5 grid grid-cols-2 gap-6 sm:gap-7">
              <div className="flex items-center gap-3.5 text-xs sm:text-sm text-gray-200 font-bold">
                <img src="/icons/Film.png" alt="" className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0" />
                <span>{language === 'UA' ? 'Дивіться будь-де.' : 'Watch anywhere.'}</span>
              </div>

              <div className="flex items-center gap-3.5 text-xs sm:text-sm text-gray-200 font-bold">
                <img src="/icons/Ad-free.png" alt="" className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0" />
                <span>{language === 'UA' ? 'Без обмежень.' : 'No limits.'}</span>
              </div>

              <div className="flex items-center gap-3.5 text-xs sm:text-sm text-gray-200 font-bold">
                <img src="/icons/Novinky.png" alt="" className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0" />
                <span>{language === 'UA' ? 'Преміум-контент.' : 'Premium content.'}</span>
              </div>

              <div className="flex items-center gap-3.5 text-xs sm:text-sm text-gray-200 font-bold">
                <img src="/icons/Like.png" alt="" className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0" />
                <span>{language === 'UA' ? 'Ваш досвід.' : 'Your experience.'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Full Footer Section - Standard Project Footer */}
        <div className="w-full mt-16 sm:mt-24">
          <FooterMain language={language} onNavigate={() => {}} />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. МОБІЛЬНА ВЕРСІЯ (flex lg:hidden) - АБСОЛЮТНО НЕДОТОРКАНА               */}
      {/* ========================================================================= */}
      <div className="flex lg:hidden relative z-10 w-full h-full overflow-y-auto overflow-x-hidden flex-col justify-between min-h-screen">
        {/* Top Шапка сайту Bar - Transparent, no background, logo and language selector stay in place */}
        <header 
          className="w-full shrink-0 px-4 sm:pl-4 md:pl-[50px] sm:pr-4 md:pr-[91px] flex items-center justify-between transition-all select-none z-30 py-3 sm:py-[14px] bg-transparent border-none"
          style={{ height: 'auto', minHeight: '60px' }}
        >
          <div className="w-full flex items-center justify-between">
            {/* Logo from /logo/logo.png */}
            <div className="flex items-center cursor-pointer select-none group" onClick={onClose}>
              <img 
                src="/logo/logo.png" 
                alt="CINEMA NOVA" 
                className="h-6 sm:h-9 w-auto object-contain transition-transform group-hover:scale-105" 
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/logo/logo.svg';
                }}
              />
            </div>

            {/* Right Шапка сайту Controls: Language Switcher + Закриття Кнопка */}
            <div className="flex items-center gap-3 sm:gap-6">
              <div className="flex items-center justify-between w-[68px] sm:w-[78px] h-[32px] sm:h-[41px] bg-transparent p-0 rounded-[10px] select-none relative">
                <button
                  type="button"
                  onClick={() => setLanguage('UA')}
                  className={`w-[34px] sm:w-[41px] h-[32px] sm:h-[41px] flex items-center justify-center text-[10px] sm:text-[12px] font-bold transition-all cursor-pointer ${
                    language === 'UA'
                      ? 'bg-[#FF3040] text-white rounded-[8px] sm:rounded-[10px] shadow-sm z-10'
                      : 'bg-transparent text-[#FAFAFA] hover:text-white'
                  }`}
                >
                  UK
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('ENG')}
                  className={`w-[34px] sm:w-[41px] h-[32px] sm:h-[41px] flex items-center justify-center text-[10px] sm:text-[12px] font-bold transition-all cursor-pointer ${
                    language === 'ENG'
                      ? 'bg-[#FF3040] text-white rounded-[8px] sm:rounded-[10px] shadow-sm z-10'
                      : 'bg-transparent text-[#FAFAFA] hover:text-white'
                  }`}
                >
                  EN
                </button>
              </div>

              {/* Закриття Кнопка hidden on mobile in Screenshot 2 */}
              <button
                onClick={onClose}
                className="hidden sm:flex p-2 rounded-[10px] text-[#FAFAFA] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-6 h-6 stroke-[2]" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area: Centered Контейнер */}
        <main className="flex-1 flex flex-col items-center justify-center w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-16 py-4 sm:py-10 my-auto">
          {/* Mobile Hero Заголовок Block (Matching Screenshot 2 - Sign in only) */}
          {activeTab === 'signin' && (
            <div className="lg:hidden flex flex-col items-center text-center w-full mb-6 pt-1 select-none">
              <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight leading-none uppercase">
                {language === 'UA' ? 'ТВОЇ ІСТОРІЇ.' : 'YOUR STORIES.'}
              </h1>
              <h1 className="font-display font-black text-2xl sm:text-3xl text-[#FF3040] tracking-tight leading-none uppercase mt-1">
                {language === 'UA' ? 'НЕОБМЕЖЕНО.' : 'UNLIMITED.'}
              </h1>
              <p className="text-gray-200 text-xs sm:text-sm font-sans pt-2 leading-relaxed max-w-xs font-normal">
                {language === 'UA' ? (
                  <>
                    Дивіться найкращі фільми, серіали та аніме.<br />
                    Будь-де, будь-коли.
                  </>
                ) : (
                  <>
                    Watch the best movies, TV shows, and anime.<br />
                    Anywhere, anytime.
                  </>
                )}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center w-full">
            {/* Right Колонка: Fully Transparent Glass Login Window */}
            <div className="lg:col-span-12 flex justify-center relative w-full">
              <div
                id="auth-modal-container-mobile"
                className="relative w-[362px] max-w-[calc(100vw-32px)] sm:w-full sm:max-w-[540px] xl:max-w-[580px] h-[407px] sm:h-auto sm:min-h-0 mx-auto rounded-[20px] sm:rounded-[32px] px-[30px] py-[22px] sm:p-9 md:p-10 flex flex-col justify-between transition-all z-20 overflow-hidden animate-auth-slide-in"
                style={{
                  background: 'rgba(0, 0, 0, 0.45)',
                  filter: 'drop-shadow(0 20px 50px rgba(0, 0, 0, 0.35))',
                  WebkitFilter: 'drop-shadow(0 20px 50px rgba(0, 0, 0, 0.35))',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)'
                }}
              >
                {/* Figma Exact Gradient Border: 0% #FFFFFF 100% -> 100% #D72835 100% */}
                <span
                  className="absolute inset-0 rounded-[20px] sm:rounded-[32px] pointer-events-none z-[1]"
                  style={{
                    border: '1.5px solid transparent',
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #D72835 100%) border-box',
                    WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude'
                  }}
                />
                <svg className="absolute inset-0 w-full h-full pointer-events-none rounded-[20px] sm:rounded-[32px] overflow-hidden z-[1]">
                  <defs>
                    <linearGradient id="auth-figma-border-grad-mobile" x1="0%" y1="0%" x2="100%" y2="100%">
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
                    stroke="url(#auth-figma-border-grad-mobile)"
                    strokeWidth="1.5"
                  />
                </svg>
                {/* Feedback messages */}
                {successMsg && (
                  <div className="p-2 sm:p-3 mb-2 sm:mb-3 text-[10px] sm:text-sm text-green-400 border border-green-500/30 bg-green-500/10 rounded-2xl flex items-center gap-2 animate-pulse">
                    <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}
                {errorMsg && (
                  <div className="p-2 sm:p-3.5 mb-2 sm:mb-3 text-[10px] sm:text-sm text-[#FF3040] border border-[#FF3040]/30 bg-[#FF3040]/10 rounded-2xl flex items-center gap-2 sm:gap-2.5 shadow-lg shadow-[#FF3040]/10 animate-in fade-in zoom-in-95">
                    <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-[#FF3040]" />
                    <span className="font-medium">{errorMsg}</span>
                  </div>
                )}

                {/* Form Content depending on tab */}
                {activeTab === 'signin' && (
                  <form onSubmit={handleSignIn} className="flex-1 flex flex-col justify-between">
                    {/* Заголовок & Subtitle */}
                    <div className="text-left">
                      <h2 className="w-[196px] h-[20px] sm:w-auto sm:h-auto font-display font-black text-[16px] sm:text-3xl text-white tracking-tight leading-[20px] truncate">
                        {language === 'UA' ? 'Ваші історії чекають!' : 'Your stories are waiting!'}
                      </h2>
                      <p className="text-[11px] sm:text-sm text-[#FAFAFA] mt-[5px] sm:mt-1.5 font-sans leading-tight">
                        {language === 'UA' ? 'Увійдіть, щоб продовжити перегляд.' : 'Sign in to continue watching.'}
                      </p>
                    </div>

                    {/* Поле введення Fields */}
                    <div className="my-auto">
                      {/* Email Поле введення */}
                      <div className="relative w-[302px] sm:w-full mt-[30px] sm:mt-0 mx-auto">
                        <input
                          id="signin-email-or-username-mobile"
                          name="signin-email-or-username"
                          type="text"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email address"
                          className="w-[302px] sm:w-full h-[26px] sm:h-[50px] py-0 px-2.5 sm:py-3.5 sm:px-4 text-[11px] sm:text-base text-[#FAFAFA] bg-transparent border border-[#FAFAFA] rounded-[6px] sm:rounded-[16px] focus:outline-none focus:border-[#FF3040] focus:ring-1 focus:ring-[#FF3040] transition-all font-sans placeholder-[#FAFAFA]/70"
                        />
                      </div>

                      {/* Password Поле введення */}
                      <div className="relative w-[302px] sm:w-full mt-[15px] sm:mt-3.5 mx-auto">
                        <input
                          id="signin-password-mobile"
                          name="signin-password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Password"
                          className="w-[302px] sm:w-full h-[26px] sm:h-[50px] py-0 pl-2.5 pr-8 sm:py-3.5 sm:pl-4 sm:pr-10 text-[11px] sm:text-base text-[#FAFAFA] bg-transparent border border-[#FAFAFA] rounded-[6px] sm:rounded-[16px] focus:outline-none focus:border-[#FF3040] focus:ring-1 focus:ring-[#FF3040] transition-all font-sans placeholder-[#FAFAFA]/70"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 sm:right-3.5 top-1/2 -translate-y-1/2 text-[#FAFAFA] hover:text-white transition-colors cursor-pointer p-0.5 sm:p-1"
                          aria-label="Toggle password visibility"
                        >
                          {showPassword ? (
                            <img src="/icons/Eye open.png" alt="Show password" className="w-3.5 h-3.5 sm:w-5 sm:h-5 object-contain icon-fafafa" />
                          ) : (
                            <img src="/icons/Eye closed.png" alt="Hide password" className="w-3.5 h-3.5 sm:w-5 sm:h-5 object-contain icon-fafafa" />
                          )}
                        </button>
                      </div>

                      {/* Remember me & Forgot Password */}
                      <div className="flex items-center justify-between w-[302px] sm:w-full mt-[18px] sm:mt-0 px-0.5 sm:px-1 pt-0 sm:pt-0.5 text-[8px] sm:text-xs mx-auto">
                        <label 
                          className="flex items-center gap-1.5 sm:gap-2 cursor-pointer text-[8px] sm:text-xs text-gray-300 hover:text-white transition-colors select-none group"
                          onClick={(e) => {
                            e.preventDefault();
                            setRememberMe(!rememberMe);
                          }}
                        >
                          <div 
                            className={`w-[15px] h-[15px] sm:w-4 sm:h-4 rounded-[3px] sm:rounded-[4px] border transition-all duration-150 flex items-center justify-center shrink-0 ${
                              rememberMe 
                                ? 'bg-white border-white text-black shadow-sm' 
                                : 'bg-transparent border-white hover:border-white'
                            }`}
                          >
                            {rememberMe && (
                              <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-black stroke-[3.5]" />
                            )}
                          </div>
                          <span className="w-[69px] h-[10px] sm:w-auto sm:h-auto text-[8px] sm:text-xs leading-[10px] whitespace-nowrap overflow-hidden flex items-center">
                            {language === 'UA' ? "Запам'ятати мене" : 'Remember me'}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setActiveTab('recover')}
                          className="w-[64px] h-[10px] sm:w-auto sm:h-auto text-[8px] sm:text-xs leading-[10px] text-[#FF3040] hover:text-[#FF4D5C] hover:underline cursor-pointer font-sans font-medium whitespace-nowrap overflow-hidden flex items-center justify-end ml-[149px] sm:ml-0"
                        >
                          {language === 'UA' ? 'Забули пароль?' : 'Forgot password?'}
                        </button>
                      </div>

                      {/* CTA Кнопка */}
                      <div className="w-full flex justify-center mt-4 sm:mt-2">
                        <button
                          type="submit"
                          className="journey-cta-btn border-2 border-transparent hover:border-white/80 active:border-transparent text-white w-[175px] sm:w-full sm:max-w-[418px] h-[28px] sm:h-[68px] mx-auto rounded-[6px] sm:rounded-[16px] font-bold text-[10px] sm:text-base flex items-center justify-center gap-1 sm:gap-2 transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-lg shadow-[#FF4D5C]/25 cursor-pointer select-none group"
                        >
                          <span>{language === 'UA' ? 'Розпочніть свою подорож' : 'Start your journey'}</span>
                          <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform stroke-[2.5]" />
                        </button>
                      </div>
                    </div>

                    {/* Social Login Section */}
                    <div>
                      <div className="relative flex items-center justify-center gap-3 mt-[30px] sm:mt-2 mb-0 sm:mb-[21px] w-[302px] sm:w-full mx-auto">
                        <div className="flex-1 h-[1px] bg-white/20" />
                        <span className="text-[10px] sm:text-xs font-medium text-[#FAFAFA] whitespace-nowrap bg-transparent select-none">
                          {language === 'UA' ? 'або продовжити через' : 'or continue via'}
                        </span>
                        <div className="flex-1 h-[1px] bg-white/20" />
                      </div>

                      {/* Social Кнопки: Google & Facebook */}
                      <div className="flex justify-center items-center gap-[36px] sm:gap-4 mt-[15px] sm:mt-0">
                        <GoogleSignInButton
                          onSuccess={handleGoogleSignInSuccess}
                          className="w-[30px] sm:w-20"
                        >
                          <button
                            type="button"
                            className="w-[30px] sm:w-20 h-[21px] sm:h-11 rounded-[4px] sm:rounded-xl border border-white/60 sm:border-white bg-transparent hover:bg-white/10 transition-all flex items-center justify-center cursor-pointer group shadow-sm"
                            title="Google"
                          >
                            <img 
                              src="/icons/google.png" 
                              alt="Google" 
                              className="w-3 h-3 sm:w-5 sm:h-5 object-contain icon-fafafa group-hover:scale-105 transition-transform" 
                            />
                          </button>
                        </GoogleSignInButton>

                        <button
                          type="button"
                          onClick={() => handleSocialLogin('Facebook')}
                          className="w-[30px] sm:w-20 h-[21px] sm:h-11 rounded-[4px] sm:rounded-xl border border-white/60 sm:border-white bg-transparent hover:bg-white/10 transition-all flex items-center justify-center cursor-pointer group shadow-sm"
                          title="Facebook"
                        >
                          <img 
                            src="/icons/Facebook.png" 
                            alt="Facebook" 
                            className="w-3 h-3 sm:w-5 sm:h-5 object-contain icon-fafafa group-hover:scale-105 transition-transform" 
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-center pt-2 sm:pt-2 font-sans">
                        <span className="w-[99px] h-[15px] sm:w-auto sm:h-auto text-[12px] sm:text-xs leading-[15px] text-gray-400 whitespace-nowrap inline-flex items-center">
                          {language === 'UA' ? 'Немає аккаунту?' : "Don't have an account?"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('signup')}
                          className="w-[104px] h-[15px] sm:w-auto sm:h-auto text-[12px] sm:text-xs leading-[15px] text-[#FF3040] hover:text-white font-semibold hover:underline cursor-pointer ml-1 inline-flex items-center justify-start whitespace-nowrap"
                        >
                          {language === 'UA' ? 'Зареєструватись' : 'Register'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {activeTab === 'recover' && (
                  <div className="flex-1 flex flex-col justify-between space-y-4 font-sans relative">
                    {/* Back to sign‑in */}
                    <button
                      onClick={() => setActiveTab('signin')}
                      className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors cursor-pointer"
                      aria-label={language === 'UA' ? 'Назад до входу' : 'Back to Sign‑In'}
                    >
                      <X className="w-5 h-5" />
                    </button>
                    {recoveryStep === 'email' && (
                      <form onSubmit={handleRecoverEmail} className="space-y-0">
                        <div className="text-center space-y-1.5 mb-6">
                          <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight leading-tight">
                            {language === 'UA' ? 'Забули пароль?' : 'Forgot password?'}
                          </h2>
                          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-sm mx-auto">
                            {language === 'UA'
                              ? 'Не хвилюйтеся! Введіть свою електронну адресу, і ми надішлемо вам лист для його скидання.'
                              : "Don't worry! Enter your email address and we will send you a code to reset it."}
                          </p>
                        </div>

                        <div className="space-y-1.5 pt-2">
                          <label className="text-xs sm:text-sm text-white font-medium block">
                            Email
                          </label>
                          <input
                            id="recovery-email-mobile"
                            name="recovery-email"
                            type="email"
                            required
                            value={recoveryEmail}
                            onChange={(e) => setRecoveryEmail(e.target.value)}
                            placeholder="Email address"
                            className="w-full py-3.5 px-4 text-sm sm:text-base text-white bg-transparent border border-[#FAFAFA] rounded-[16px] focus:outline-none focus:border-[#FF3040] focus:ring-1 focus:ring-[#FF3040] transition-colors"
                          />
                        </div>

                        {/* Submit Кнопка: 50px from Поле введення, less wide (300px) */}
                        <div className="mt-[50px] flex justify-center w-full">
                          <button
                            type="submit"
                            className="journey-cta-btn border-2 border-transparent hover:border-white/80 active:border-transparent text-white w-[300px] max-w-full h-[60px] mx-auto rounded-[16px] font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-lg shadow-[#FF4D5C]/25 cursor-pointer select-none"
                            style={{ width: '300px', maxWidth: '100%', height: '60px' }}
                          >
                            {language === 'UA' ? 'Надіслати' : 'Send'}
                          </button>
                        </div>

                        {/* Divider: 50px from Кнопка */}
                        <div className="relative flex items-center justify-center gap-3 mt-[50px] w-full">
                          <div className="flex-1 h-[1px] bg-white/20" />
                          <span className="text-[12px] sm:text-xs font-medium text-[#FAFAFA] whitespace-nowrap bg-transparent select-none">
                            {language === 'UA' ? 'або' : 'or'}
                          </span>
                          <div className="flex-1 h-[1px] bg-white/20" />
                        </div>

                        {/* Back to sign-in Кнопка: less wide (300px) */}
                        <div className="mt-[50px] flex justify-center w-full">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('signin');
                              setErrorMsg('');
                              setSuccessMsg('');
                            }}
                            className="relative w-[300px] max-w-full h-[60px] mx-auto rounded-[16px] font-bold text-sm sm:text-base text-white bg-transparent active:scale-98 transition-all flex items-center justify-center cursor-pointer select-none group hover:bg-white/[0.04]"
                            style={{ width: '300px', maxWidth: '100%', height: '60px' }}
                          >
                            <span
                              className="absolute inset-0 rounded-[16px] pointer-events-none"
                              style={{
                                border: '1.5px solid transparent',
                                background: 'linear-gradient(135deg, #FFFFFF 0%, #D72835 100%) border-box',
                                WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
                                WebkitMaskComposite: 'xor',
                                maskComposite: 'exclude'
                              }}
                            />
                            <span className="relative z-10">{language === 'UA' ? 'Назад до входу' : 'Back to sign-in'}</span>
                          </button>
                        </div>
                      </form>
                    )}

                    {recoveryStep === 'code' && (
                      <form onSubmit={handleVerifyCode} className="space-y-0">
                        <div className="text-center space-y-1.5 mb-6">
                          <h3 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight leading-tight">
                            {language === 'UA' ? 'Підтвердження коду' : 'Confirm Code'}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-sm mx-auto">
                            {language === 'UA' ? 'Введіть 6-значний код, надісланий на ' : 'Enter the 6-digit code sent to '}
                            <strong className="text-white">{recoveryEmail}</strong>
                          </p>
                        </div>

                        <div className="flex justify-end mb-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRecoveryStep('email');
                              setErrorMsg('');
                              setSuccessMsg('');
                            }}
                            className="flex items-center gap-1.5 text-white group cursor-pointer text-left shrink-0 select-none"
                          >
                            <ChevronRight className="w-3.5 h-3.5 text-[#FF3040] stroke-[2.5] shrink-0 group-hover:translate-x-0.5 transition-transform" />
                            <span className="group-hover:underline group-active:underline underline-offset-4 decoration-1 decoration-white text-xs">
                              {language === 'UA' ? 'Змінити пошту' : 'Change email'}
                            </span>
                          </button>
                        </div>

                        <input
                          id="recovery-code-mobile"
                          name="recovery-code"
                          type="text"
                          maxLength={6}
                          required
                          placeholder="000000"
                          value={enteredCode}
                          onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full text-center py-3.5 text-xl tracking-[1em] pl-[1em] font-mono text-white bg-transparent border border-[#FAFAFA] rounded-[16px] focus:outline-none focus:border-[#FF3040] focus:ring-1 focus:ring-[#FF3040] transition-colors"
                        />

                        {/* Confirm Code Кнопка: 50px from Поле введення, less wide (300px) */}
                        <div className="mt-[50px] flex justify-center w-full">
                          <button
                            type="submit"
                            className="journey-cta-btn border-2 border-transparent hover:border-white/80 active:border-transparent text-white w-[300px] max-w-full h-[60px] mx-auto rounded-[16px] font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-lg shadow-[#FF4D5C]/25 cursor-pointer select-none"
                            style={{ width: '300px', maxWidth: '100%', height: '60px' }}
                          >
                            {language === 'UA' ? 'Підтвердити код' : 'Confirm Code'}
                          </button>
                        </div>

                        {/* Divider: 50px from Кнопка */}
                        <div className="relative flex items-center justify-center gap-3 mt-[50px] w-full">
                          <div className="flex-1 h-[1px] bg-white/20" />
                          <span className="text-[12px] sm:text-xs font-medium text-[#FAFAFA] whitespace-nowrap bg-transparent select-none">
                            {language === 'UA' ? 'або' : 'or'}
                          </span>
                          <div className="flex-1 h-[1px] bg-white/20" />
                        </div>

                        {/* Back to sign-in: 50px from 'або', less wide (300px) */}
                        <div className="mt-[50px] flex justify-center w-full">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('signin');
                              setRecoveryStep('email');
                              setErrorMsg('');
                              setSuccessMsg('');
                            }}
                            className="relative w-[300px] max-w-full h-[60px] mx-auto rounded-[16px] font-bold text-sm sm:text-base text-white bg-transparent active:scale-98 transition-all flex items-center justify-center cursor-pointer select-none group hover:bg-white/[0.04]"
                            style={{ width: '300px', maxWidth: '100%', height: '60px' }}
                          >
                            <span
                              className="absolute inset-0 rounded-[16px] pointer-events-none"
                              style={{
                                border: '1.5px solid transparent',
                                background: 'linear-gradient(135deg, #FFFFFF 0%, #D72835 100%) border-box',
                                WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
                                WebkitMaskComposite: 'xor',
                                maskComposite: 'exclude'
                              }}
                            />
                            <span className="relative z-10">{language === 'UA' ? 'Назад до входу' : 'Back to sign-in'}</span>
                          </button>
                        </div>
                      </form>
                    )}

                    {recoveryStep === 'password' && (
                      <form onSubmit={handleResetPassword} className="space-y-0">
                        <div className="text-center space-y-1.5 mb-6">
                          <h3 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight leading-tight">
                            {language === 'UA' ? 'Новий пароль' : 'New Password'}
                          </h3>
                        </div>

                        <div className="space-y-4">
                          <input
                            id="new-password-mobile"
                            name="new-password"
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder={language === 'UA' ? 'Новий пароль' : 'New Password'}
                            className="w-full py-3.5 px-4 text-sm sm:text-base text-white bg-transparent border border-[#FAFAFA] rounded-[16px] focus:outline-none focus:border-[#FF3040] focus:ring-1 focus:ring-[#FF3040] transition-colors"
                          />

                          <input
                            id="confirm-new-password-mobile"
                            name="confirm-new-password"
                            type="password"
                            required
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            placeholder={language === 'UA' ? 'Підтвердження пароля' : 'Confirm Password'}
                            className="w-full py-3.5 px-4 text-sm sm:text-base text-white bg-transparent border border-[#FAFAFA] rounded-[16px] focus:outline-none focus:border-[#FF3040] focus:ring-1 focus:ring-[#FF3040] transition-colors"
                          />
                        </div>

                        {/* Оновлення Password Кнопка: 50px from Поле введення, less wide (300px) */}
                        <div className="mt-[50px] flex justify-center w-full">
                          <button
                            type="submit"
                            className="journey-cta-btn border-2 border-transparent hover:border-white/80 active:border-transparent text-white w-[300px] max-w-full h-[60px] mx-auto rounded-[16px] font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-lg shadow-[#FF4D5C]/25 cursor-pointer select-none"
                            style={{ width: '300px', maxWidth: '100%', height: '60px' }}
                          >
                            {language === 'UA' ? 'Оновити пароль' : 'Update Password'}
                          </button>
                        </div>

                        {/* Divider: 50px from Кнопка */}
                        <div className="relative flex items-center justify-center gap-3 mt-[50px] w-full">
                          <div className="flex-1 h-[1px] bg-white/20" />
                          <span className="text-[12px] sm:text-xs font-medium text-[#FAFAFA] whitespace-nowrap bg-transparent select-none">
                            {language === 'UA' ? 'або' : 'or'}
                          </span>
                          <div className="flex-1 h-[1px] bg-white/20" />
                        </div>

                        {/* Back to sign-in / Back: 50px from 'або', less wide (300px) */}
                        <div className="mt-[50px] flex justify-center w-full">
                          <button
                            type="button"
                            onClick={() => {
                              if (initialRecoveryStep === 'password') {
                                onClose();
                              } else {
                                setActiveTab('signin');
                                setRecoveryStep('email');
                              }
                              setErrorMsg('');
                              setSuccessMsg('');
                            }}
                            className="relative w-[300px] max-w-full h-[60px] mx-auto rounded-[16px] font-bold text-sm sm:text-base text-white bg-transparent active:scale-98 transition-all flex items-center justify-center cursor-pointer select-none group hover:bg-white/[0.04]"
                            style={{ width: '300px', maxWidth: '100%', height: '60px' }}
                          >
                            <span
                              className="absolute inset-0 rounded-[16px] pointer-events-none"
                              style={{
                                border: '1.5px solid transparent',
                                background: 'linear-gradient(135deg, #FFFFFF 0%, #D72835 100%) border-box',
                                WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
                                WebkitMaskComposite: 'xor',
                                maskComposite: 'exclude'
                              }}
                            />
                            <span className="relative z-10">
                              {initialRecoveryStep === 'password'
                                ? (language === 'UA' ? 'Назад' : 'Back')
                                : (language === 'UA' ? 'Назад до входу' : 'Back to sign-in')}
                            </span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Quote & Features Bar */}
        <section
          className="relative z-10 w-full bg-[#121212] border-t border-b border-white/10 py-4 sm:py-14 px-4 sm:px-12 lg:px-20 mt-6 sm:mt-16"
          style={{ backgroundColor: '#121212', opacity: 1 }}
        >
          <div className="max-w-[1700px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-8 items-center">
            {/* Quote */}
            <div className="md:col-span-7 flex items-start gap-2.5 sm:gap-5">
              <svg
                className="w-5 h-4 sm:w-[76px] sm:h-[54px] shrink-0 text-[#FF3040] fill-current mt-0.5 sm:mt-0"
                viewBox="0 0 76 54"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0 54V33.2C0 14.6 10.8 3.2 32.4 0L35.6 9.4C23.6 12 18.2 18.8 17.4 28H33.4V54H0ZM42.6 54V33.2C42.6 14.6 53.4 3.2 75 0L78.2 9.4C66.2 12 60.8 18.8 60 28H76V54H42.6Z"
                  fill="currentColor"
                />
              </svg>
              <div>
                <p
                  className="text-gray-100 font-medium leading-snug text-[10px] sm:text-[24px]"
                  style={{ fontFamily: "'Montserrat Alternates', sans-serif" }}
                >
                  {language === 'UA'
                    ? 'Кіно — це питання того, що знаходиться в кадрі і що залишається за його межами.'
                    : 'Cinema is a matter of what\'s in the frame and what\'s out.'}
                </p>
                <p className="text-[8.5px] sm:text-sm text-gray-400 mt-0.5 sm:mt-2 font-semibold font-sans">
                  — Мартін Скорсезе
                </p>
              </div>
            </div>

            {/* Features Сітка */}
            <div className="md:col-span-5 grid grid-cols-2 gap-2 sm:gap-7">
              <div className="flex items-center gap-2 sm:gap-3.5 text-[8.5px] sm:text-sm text-gray-200 font-bold">
                <img src="/icons/Film.png" alt="" className="w-3.5 h-3.5 sm:w-9 sm:h-9 object-contain shrink-0" />
                <span>{language === 'UA' ? 'Дивіться будь-де.' : 'Watch anywhere.'}</span>
              </div>

              <div className="flex items-center gap-2 sm:gap-3.5 text-[8.5px] sm:text-sm text-gray-200 font-bold">
                <img src="/icons/Ad-free.png" alt="" className="w-3.5 h-3.5 sm:w-9 sm:h-9 object-contain shrink-0" />
                <span>{language === 'UA' ? 'Без обмежень.' : 'No limits.'}</span>
              </div>

              <div className="flex items-center gap-2 sm:gap-3.5 text-[8.5px] sm:text-sm text-gray-200 font-bold">
                <img src="/icons/Novinky.png" alt="" className="w-3.5 h-3.5 sm:w-9 sm:h-9 object-contain shrink-0" />
                <span>{language === 'UA' ? 'Преміум-контент.' : 'Premium content.'}</span>
              </div>

              <div className="flex items-center gap-2 sm:gap-3.5 text-[8.5px] sm:text-sm text-gray-200 font-bold">
                <img src="/icons/Like.png" alt="" className="w-3.5 h-3.5 sm:w-9 sm:h-9 object-contain shrink-0" />
                <span>{language === 'UA' ? 'Ваш досвід.' : 'Your experience.'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Full Підвал сайту Section - Standard Project Підвал сайту */}
        <div className="w-full mt-6 sm:mt-24">
          <FooterMain language={language} onNavigate={() => {}} />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. СПІЛЬНЕ СПОВІЩЕННЯ ПРО КОД ВІДНОВЛЕННЯ (Mail Toast)                    */}
      {/* ========================================================================= */}
      {showMailToast && (
        <div className="fixed top-6 right-6 z-[999] max-w-sm w-full bg-[#0d0d12] border border-[#E50914]/40 rounded-xl p-4 shadow-2xl text-white font-sans pointer-events-auto">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[#E50914]/15 text-[#E50914] rounded-lg shrink-0">
              <Mail className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                  {language === 'UA' ? 'Поштовий Сервер Нова' : 'Nova Mail Server'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowMailToast(false)}
                  className="text-zinc-500 hover:text-zinc-300 text-xs p-0.5 cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <h4 className="text-sm font-bold text-white mt-1 truncate">
                {language === 'UA' ? 'Лист для:' : 'Email for:'} {recoveryEmail}
              </h4>
              <p className="text-xs text-zinc-400 mt-2 font-sans leading-normal">
                {language === 'UA'
                  ? 'Ви надіслали запит на скидання пароля. Ваш 6-значний код відновлення:'
                  : 'You requested a password reset. Your 6-digit recovery code is:'}
              </p>
              <div className="mt-3 flex items-center justify-between bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                <span className="text-xl font-mono font-extrabold tracking-widest text-[#E50914]">
                  {generatedCode}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedCode);
                    setSuccessMsg(language === 'UA' ? 'Код відновлення скопійовано!' : 'Recovery code copied!');
                    setTimeout(() => {
                      setSuccessMsg('');
                    }, 2000);
                  }}
                  className="text-[10px] bg-zinc-800 text-white hover:bg-[#E50914] px-2 py-1 rounded transition-colors uppercase font-bold cursor-pointer"
                >
                  {language === 'UA' ? 'Скопіювати' : 'Copy'}
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 mt-2 leading-tight font-sans">
                {language === 'UA'
                  ? '* Введіть цей код на екрані авторизації для оновлення вашого паролю.'
                  : '* Enter this code on the authorization screen to reset your password.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
