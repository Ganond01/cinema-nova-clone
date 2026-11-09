import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Check, Loader2 } from 'lucide-react';
import { loadState, saveState } from '../data/movies';

export interface ReportItem {
  id: string;
  movieId?: string;
  movieTitle: string;
  type: 'report' | 'propose';
  issueType?: string;
  description: string;
  createdAt: string;
  status: 'new' | 'in_progress' | 'resolved';
  read?: boolean;
}

interface ReportProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieTitle: string;
  movieId?: string;
  initialTab?: 'report' | 'propose';
  language?: 'UA' | 'ENG';
}

export const ReportProblemModal: React.FC<ReportProblemModalProps> = ({
  isOpen,
  onClose,
  movieTitle,
  movieId,
  initialTab = 'report',
  language = 'UA'
}) => {
  const [tab, setTab] = useState<'report' | 'propose'>(initialTab);
  const [issueType, setIssueType] = useState<string>('player_error');
  const [description, setDescription] = useState<string>('');
  const [proposalText, setProposalText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // Синхронізація tab Стан if initialTab changes on Відкриття
  React.useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setIsSubmitted(false);
      setIsSubmitting(false);
      setDescription('');
      setProposalText('');
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const contentText = tab === 'report' ? description : proposalText;
    if (!contentText.trim() || isSubmitting) return;

    setIsSubmitting(true);

    setTimeout(() => {
      const newReport: ReportItem = {
        id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        movieId: movieId || '',
        movieTitle: movieTitle || (language === 'UA' ? 'Загальне звернення' : 'General Request'),
        type: tab,
        issueType: tab === 'report' ? issueType : 'data_proposal',
        description: contentText.trim(),
        createdAt: new Date().toISOString(),
        status: 'new',
        read: false
      };

      // Збереження report to admin_notifications and app_reports in localStorage
      const existingNotifs = loadState<ReportItem[]>('admin_notifications', []);
      saveState('admin_notifications', [newReport, ...existingNotifs]);

      const existingReports = loadState<ReportItem[]>('app_reports', []);
      saveState('app_reports', [newReport, ...existingReports]);

      // Dispatch Користувацький events for real-time listeners
      window.dispatchEvent(new Event('admin_notifications_updated'));
      window.dispatchEvent(new Event('app_reports_updated'));

      setIsSubmitting(false);
      setIsSubmitted(true);

      setTimeout(() => {
        setIsSubmitted(false);
        setDescription('');
        setProposalText('');
        onClose();
      }, 1800);
    }, 800);
  };

  const getIssueLabel = (key: string) => {
    switch (key) {
      case 'player_error':
        return language === 'UA' ? 'Плеєр не працює' : 'Player not working';
      case 'anime_mismatch':
        return language === 'UA' ? 'Аніме / фільм не відповідає' : 'Content mismatch';
      case 'wrong_episode_voice':
        return language === 'UA' ? 'Неправильна серія або озвучка' : 'Wrong episode or dub';
      case 'sound_sub_issue':
        return language === 'UA' ? 'Проблема зі звуком чи субтитрами' : 'Audio or subtitles problem';
      case 'other':
      default:
        return language === 'UA' ? 'Інше' : 'Other';
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      
      {/* =========================================================================
          DESKTOP VERSION (md:flex, exact layout provided by user)
         ========================================================================= */}
      <div className="hidden md:flex bg-[#1c1c1f] border border-zinc-800/80 rounded-[24px] w-full max-w-xl shadow-2xl relative flex-col p-6 sm:p-7 my-8 animate-fade-in text-left">
        {/* Закриття Кнопка */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-6 right-6 text-zinc-400 hover:text-white p-1.5 hover:bg-zinc-800/50 rounded-full transition-all cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Модальне вікно Заголовок & Subtitle */}
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          {tab === 'propose'
            ? (language === 'UA' ? 'Запропонувати зміни' : 'Propose Changes')
            : (language === 'UA' ? 'Повідомити про проблему' : 'Report a Problem')}
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 font-medium mt-1">
          {movieTitle}
        </p>

        {isSubmitted ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center text-emerald-400 animate-bounce">
              <Check className="w-7 h-7 stroke-[3]" />
            </div>
            <h3 className="text-lg font-bold text-white">
              {language === 'UA' ? 'Дякуємо! Звернення надіслано.' : 'Thank you! Your request has been sent.'}
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm">
              {language === 'UA'
                ? 'Адміністрація розгляне вашу інформацію найближчим часом.'
                : 'The administration will review your submission shortly.'}
            </p>
          </div>
        ) : (
          <>
            {/* Tab Навігація */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 mt-6 mb-6 pb-2">
              <button
                type="button"
                onClick={() => setTab('propose')}
                className={`pb-2 text-sm sm:text-[15px] font-semibold transition-all cursor-pointer select-none group ${
                  tab === 'propose'
                    ? 'text-[#FF3040] underline underline-offset-8 decoration-2 decoration-[#FF3040]'
                    : 'text-zinc-400 hover:text-[#FF3040] hover:underline underline-offset-8 decoration-1 decoration-[#FF3040]/70'
                }`}
              >
                {language === 'UA' ? 'Запропонувати зміни' : 'Propose Changes'}
              </button>
              <button
                type="button"
                onClick={() => setTab('report')}
                className={`pb-2 text-sm sm:text-[15px] font-semibold transition-all cursor-pointer select-none group ${
                  tab === 'report'
                    ? 'text-[#FF3040] underline underline-offset-8 decoration-2 decoration-[#FF3040]'
                    : 'text-zinc-400 hover:text-[#FF3040] hover:underline underline-offset-8 decoration-1 decoration-[#FF3040]/70'
                }`}
              >
                {language === 'UA' ? 'Повідомити про проблему' : 'Report a Problem'}
              </button>
            </div>

            {/* TAB 1: PROPOSE CHANGES */}
            {tab === 'propose' && (
              <form onSubmit={handleSubmit} className="flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-white">
                    {language === 'UA' ? 'Поле для редагування' : 'Field to Edit'}
                  </label>
                  <button
                    type="button"
                    className="text-xs font-semibold text-zinc-400 hover:text-white hover:underline underline-offset-4 decoration-1 cursor-pointer transition-colors bg-transparent border-none p-0"
                  >
                    {language === 'UA' ? 'Додати поле' : 'Add Field'}
                  </button>
                </div>

                {/* Edit Area / Поле введення Box */}
                <div>
                  <div className="bg-[#141416] border border-zinc-800/80 rounded-2xl p-4 flex flex-col focus-within:border-zinc-700 transition-all">
                    <textarea
                      value={proposalText}
                      onChange={(e) => setProposalText(e.target.value.slice(0, 600))}
                      placeholder={language === 'UA' ? 'Ваші пропозиції...' : 'Your suggestions...'}
                      className="w-full h-36 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none resize-none leading-relaxed font-sans"
                      required
                    />
                  </div>
                  <div className="text-right text-[11px] text-white font-mono mt-1.5 select-none pr-1">
                    {proposalText.length}/600
                  </div>
                </div>

                {/* Notice Text */}
                <p className="text-[11.5px] text-[#FF3040] leading-snug font-sans my-5 text-left">
                  {language === 'UA'
                    ? 'Ваше повідомлення буде використано для покращення якості сервісу. Не додавайте персональні дані або іншу конфіденційну інформацію. Ми розглянемо вашу пропозицію та використаємо її для покращення Cinema Nova.'
                    : 'Your message will be used to improve service quality. Do not add personal data or other confidential information. We will review your proposal and use it to improve Cinema Nova.'}
                </p>

                {/* Bottom Action Кнопки */}
                <div className="flex items-center justify-center gap-3 mt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-2.5 bg-gradient-to-b from-[#FF4D5C] to-[#D72835] hover:opacity-95 text-white font-bold text-sm rounded-xl cursor-pointer transition-all shadow-lg shadow-[#FF4D5C]/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>{language === 'UA' ? 'Надсилання...' : 'Sending...'}</span>
                      </>
                    ) : (
                      <span>{language === 'UA' ? 'Надіслати' : 'Submit'}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-8 py-2.5 bg-[#202024] border border-zinc-700/80 hover:bg-[#28282e] text-white font-bold text-sm rounded-xl cursor-pointer transition-all active:scale-95"
                  >
                    {language === 'UA' ? 'Скасувати' : 'Cancel'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: REPORT A PROBLEM */}
            {tab === 'report' && (
              <form onSubmit={handleSubmit} className="flex flex-col">
                {/* Field 1: Issue Type */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-white mb-2">
                    {language === 'UA' ? 'Тип проблеми' : 'Issue Type'}
                  </label>
                  <div className="relative">
                    <select
                      value={issueType}
                      onChange={(e) => setIssueType(e.target.value)}
                      className="w-full bg-[#141416] border border-zinc-800/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-700 appearance-none cursor-pointer pr-10 font-medium"
                    >
                      <option value="player_error">{getIssueLabel('player_error')}</option>
                      <option value="anime_mismatch">{getIssueLabel('anime_mismatch')}</option>
                      <option value="wrong_episode_voice">{getIssueLabel('wrong_episode_voice')}</option>
                      <option value="sound_sub_issue">{getIssueLabel('sound_sub_issue')}</option>
                      <option value="other">{getIssueLabel('other')}</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Field 2: Issue Опис */}
                <div className="mb-2">
                  <label className="block text-sm font-medium text-white mb-2">
                    {language === 'UA' ? 'Опис проблеми' : 'Issue Description'}
                  </label>
                  <div>
                    <div className="bg-[#141416] border border-zinc-800/80 rounded-2xl p-4 flex flex-col focus-within:border-zinc-700 transition-all">
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value.slice(0, 600))}
                        placeholder={language === 'UA' ? 'Опишіть проблему' : 'Describe the problem'}
                        className="w-full h-32 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none resize-none leading-relaxed font-sans"
                        required
                      />
                    </div>
                    <div className="text-right text-[11px] text-white font-mono mt-1.5 select-none pr-1">
                      {description.length}/600
                    </div>
                  </div>
                </div>

                {/* Notice Text */}
                <p className="text-[11.5px] text-[#FF3040] leading-snug font-sans my-5 text-left">
                  {language === 'UA'
                    ? 'Ваше повідомлення буде використано для покращення якості сервісу. Не додавайте персональні дані або іншу конфіденційну інформацію. Ми розглянемо вашу пропозицію та використаємо її для покращення Cinema Nova.'
                    : 'Your message will be used to improve service quality. Do not add personal data or other confidential information. We will review your proposal and use it to improve Cinema Nova.'}
                </p>

                {/* Bottom Action Кнопки */}
                <div className="flex items-center justify-center gap-3 mt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-2.5 bg-gradient-to-b from-[#FF4D5C] to-[#D72835] hover:opacity-95 text-white font-bold text-sm rounded-xl cursor-pointer transition-all shadow-lg shadow-[#FF4D5C]/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>{language === 'UA' ? 'Надсилання...' : 'Sending...'}</span>
                      </>
                    ) : (
                      <span>{language === 'UA' ? 'Надіслати' : 'Submit'}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-8 py-2.5 bg-[#202024] border border-zinc-700/80 hover:bg-[#28282e] text-white font-bold text-sm rounded-xl cursor-pointer transition-all active:scale-95"
                  >
                    {language === 'UA' ? 'Скасувати' : 'Cancel'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      {/* =========================================================================
          MOBILE VERSION (md:hidden, compact mobile layout preserved)
         ========================================================================= */}
      <div className="md:hidden bg-[#1c1c1f] border border-zinc-800/80 rounded-[16px] w-[361px] max-w-full h-[319px] shadow-2xl relative flex flex-col p-3 my-auto animate-fade-in text-left overflow-hidden justify-between">
        {/* Закриття Кнопка */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-3 right-3 text-zinc-400 hover:text-white p-1 hover:bg-zinc-800/50 rounded-full transition-all cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Модальне вікно Заголовок & Subtitle */}
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">
            {tab === 'propose'
              ? (language === 'UA' ? 'Запропонувати зміни' : 'Propose Changes')
              : (language === 'UA' ? 'Повідомити про проблему' : 'Report a Problem')}
          </h2>
          <p className="text-[10px] text-zinc-400 font-medium mt-0.5 truncate max-w-[280px]">
            {movieTitle}
          </p>
        </div>

        {isSubmitted ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center text-emerald-400 animate-bounce">
              <Check className="w-5 h-5 stroke-[3]" />
            </div>
            <h3 className="text-xs font-bold text-white">
              {language === 'UA' ? 'Дякуємо! Звернення надіслано.' : 'Thank you! Your request has been sent.'}
            </h3>
            <p className="text-[9px] text-zinc-400 max-w-sm">
              {language === 'UA'
                ? 'Адміністрація розгляне вашу інформацію найближчим часом.'
                : 'The administration will review your submission shortly.'}
            </p>
          </div>
        ) : (
          <>
            {/* Tab Навігація: gap 115px on mobile, font 8px */}
            <div className="flex items-center justify-center gap-[115px] border-b border-zinc-800/80 mt-1 mb-1.5 pb-1">
              <button
                type="button"
                onClick={() => setTab('propose')}
                className={`pb-1 text-[8px] font-semibold transition-all cursor-pointer select-none group whitespace-nowrap ${
                  tab === 'propose'
                    ? 'text-[#FF3040] underline underline-offset-4 decoration-2 decoration-[#FF3040]'
                    : 'text-zinc-400 hover:text-[#FF3040] hover:underline underline-offset-4 decoration-1 decoration-[#FF3040]/70'
                }`}
              >
                {language === 'UA' ? 'Запропонувати зміни' : 'Propose Changes'}
              </button>
              <button
                type="button"
                onClick={() => setTab('report')}
                className={`pb-1 text-[8px] font-semibold transition-all cursor-pointer select-none group whitespace-nowrap ${
                  tab === 'report'
                    ? 'text-[#FF3040] underline underline-offset-4 decoration-2 decoration-[#FF3040]'
                    : 'text-zinc-400 hover:text-[#FF3040] hover:underline underline-offset-4 decoration-1 decoration-[#FF3040]/70'
                }`}
              >
                {language === 'UA' ? 'Повідомити про проблему' : 'Report a Problem'}
              </button>
            </div>

            {/* TAB 1: PROPOSE CHANGES */}
            {tab === 'propose' && (
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 justify-between">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[8px] font-medium text-white">
                      {language === 'UA' ? 'Поле для редагування' : 'Field to Edit'}
                    </label>
                    <button
                      type="button"
                      className="text-[8px] font-semibold text-zinc-400 hover:text-white hover:underline underline-offset-4 decoration-1 cursor-pointer transition-colors bg-transparent border-none p-0"
                    >
                      {language === 'UA' ? 'Додати поле' : 'Add Field'}
                    </button>
                  </div>

                  {/* Edit Area / Поле введення Box */}
                  <div>
                    <div className="bg-[#141416] border border-zinc-800/80 rounded-xl p-2 flex flex-col focus-within:border-zinc-700 transition-all">
                      <textarea
                        value={proposalText}
                        onChange={(e) => setProposalText(e.target.value.slice(0, 600))}
                        placeholder={language === 'UA' ? 'Ваші пропозиції...' : 'Your suggestions...'}
                        className="w-full h-16 bg-transparent text-[8px] text-white placeholder-zinc-500 focus:outline-none resize-none leading-relaxed font-sans"
                        required
                      />
                    </div>
                    <div className="text-right text-[7px] text-white font-mono mt-0.5 select-none pr-1">
                      {proposalText.length}/600
                    </div>
                  </div>

                  {/* Notice Text */}
                  <p className="text-[7px] text-[#FF3040] leading-tight font-sans my-1 text-left">
                    {language === 'UA'
                      ? 'Ваше повідомлення буде використано для покращення якості сервісу. Не додавайте персональні дані або іншу конфіденційну інформацію.'
                      : 'Your message will be used to improve service quality. Do not add personal data or other confidential information.'}
                  </p>
                </div>

                {/* Bottom Action Кнопки: gap 30px on mobile, font 8px */}
                <div className="flex items-center justify-center gap-[30px] mt-1 shrink-0">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-[24px] px-4 py-0 bg-gradient-to-b from-[#FF4D5C] to-[#D72835] hover:opacity-95 text-white font-bold text-[8px] rounded-lg cursor-pointer transition-all shadow-lg shadow-[#FF4D5C]/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 min-w-[90px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-white" />
                        <span>{language === 'UA' ? 'Надсилання...' : 'Sending...'}</span>
                      </>
                    ) : (
                      <span>{language === 'UA' ? 'Надіслати' : 'Submit'}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="h-[24px] px-4 py-0 bg-[#202024] border border-zinc-700/80 hover:bg-[#28282e] text-white font-bold text-[8px] rounded-lg cursor-pointer transition-all active:scale-95 min-w-[80px]"
                  >
                    {language === 'UA' ? 'Скасувати' : 'Cancel'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: REPORT A PROBLEM */}
            {tab === 'report' && (
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 justify-between">
                <div>
                  {/* Field 1: Issue Type */}
                  <div className="mb-1.5">
                    <label className="block text-[8px] font-medium text-white mb-0.5">
                      {language === 'UA' ? 'Тип проблеми' : 'Issue Type'}
                    </label>
                    <div className="relative">
                      <select
                        value={issueType}
                        onChange={(e) => setIssueType(e.target.value)}
                        className="w-full bg-[#141416] border border-zinc-800/80 rounded-lg px-2.5 py-1 text-[8px] text-white focus:outline-none focus:border-zinc-700 appearance-none cursor-pointer pr-8 font-medium"
                      >
                        <option value="player_error">{getIssueLabel('player_error')}</option>
                        <option value="anime_mismatch">{getIssueLabel('anime_mismatch')}</option>
                        <option value="wrong_episode_voice">{getIssueLabel('wrong_episode_voice')}</option>
                        <option value="sound_sub_issue">{getIssueLabel('sound_sub_issue')}</option>
                        <option value="other">{getIssueLabel('other')}</option>
                      </select>
                      <ChevronDown className="w-3 h-3 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Field 2: Issue Опис */}
                  <div className="mb-1">
                    <label className="block text-[8px] font-medium text-white mb-0.5">
                      {language === 'UA' ? 'Опис проблеми' : 'Issue Description'}
                    </label>
                    <div>
                      <div className="bg-[#141416] border border-zinc-800/80 rounded-xl p-2 flex flex-col focus-within:border-zinc-700 transition-all">
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value.slice(0, 600))}
                          placeholder={language === 'UA' ? 'Опишіть проблему' : 'Describe the problem'}
                          className="w-full h-14 bg-transparent text-[8px] text-white placeholder-zinc-500 focus:outline-none resize-none leading-relaxed font-sans"
                          required
                        />
                      </div>
                      <div className="text-right text-[7px] text-white font-mono mt-0.5 select-none pr-1">
                        {description.length}/600
                      </div>
                    </div>
                  </div>

                  {/* Notice Text */}
                  <p className="text-[7px] text-[#FF3040] leading-tight font-sans my-1 text-left">
                    {language === 'UA'
                      ? 'Ваше повідомлення буде використано для покращення якості сервісу. Не додавайте персональні дані або іншу конфіденційну інформацію.'
                      : 'Your message will be used to improve service quality. Do not add personal data or other confidential information.'}
                  </p>
                </div>

                {/* Bottom Action Кнопки: gap 30px on mobile, font 8px */}
                <div className="flex items-center justify-center gap-[30px] mt-1 shrink-0">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-[24px] px-4 py-0 bg-gradient-to-b from-[#FF4D5C] to-[#D72835] hover:opacity-95 text-white font-bold text-[8px] rounded-lg cursor-pointer transition-all shadow-lg shadow-[#FF4D5C]/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 min-w-[90px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-white" />
                        <span>{language === 'UA' ? 'Надсилання...' : 'Sending...'}</span>
                      </>
                    ) : (
                      <span>{language === 'UA' ? 'Надіслати' : 'Submit'}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="h-[24px] px-4 py-0 bg-[#202024] border border-zinc-700/80 hover:bg-[#28282e] text-white font-bold text-[8px] rounded-lg cursor-pointer transition-all active:scale-95 min-w-[80px]"
                  >
                    {language === 'UA' ? 'Скасувати' : 'Cancel'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

    </div>,
    document.body
  );
};

export default ReportProblemModal;
