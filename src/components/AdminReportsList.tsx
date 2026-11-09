import React, { useState, useEffect } from 'react';
import { 
  Inbox, AlertTriangle, Lightbulb, Trash2, CheckCircle2, 
  Clock, Search, RefreshCw
} from 'lucide-react';
import { loadState, saveState } from '../data/movies';

export interface AdminNotificationItem {
  id: string;
  movieId?: string;
  movieTitle: string;
  type: 'report' | 'propose';
  issueType?: string;
  description: string;
  createdAt: string;
  status?: 'new' | 'in_progress' | 'resolved';
  read?: boolean;
}

interface AdminReportsListProps {
  language?: 'UA' | 'ENG';
}

export const AdminReportsList: React.FC<AdminReportsListProps> = ({ language = 'UA' }) => {
  const [items, setItems] = useState<AdminNotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'report' | 'propose'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<AdminNotificationItem | null>(null);

  // Завантаження записів із localStorage
  const refreshList = () => {
    try {
      const adminNotifs = loadState<AdminNotificationItem[]>('admin_notifications', []);
      const appReports = loadState<AdminNotificationItem[]>('app_reports', []);
      
      // Об'єднання унікальних записів за ID
      const map = new Map<string, AdminNotificationItem>();
      [...adminNotifs, ...appReports].forEach(item => {
        if (item && item.id) {
          map.set(item.id, item);
        }
      });

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setItems(merged);
    } catch (e) {
      console.error('Error loading admin notifications:', e);
    }
  };

  useEffect(() => {
    refreshList();

    const handleUpdate = () => refreshList();
    window.addEventListener('admin_notifications_updated', handleUpdate);
    window.addEventListener('app_reports_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('admin_notifications_updated', handleUpdate);
      window.removeEventListener('app_reports_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handleDeleteItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const updated = items.filter(item => item.id !== id);
    setItems(updated);
    saveState('admin_notifications', updated);
    saveState('app_reports', updated);

    if (selectedItem?.id === id) {
      setSelectedItem(null);
    }

    window.dispatchEvent(new Event('admin_notifications_updated'));
  };

  const handleClearAll = () => {
    if (items.length === 0) return;
    if (window.confirm(language === 'UA' ? 'Очистити всі повідомлення?' : 'Clear all notifications?')) {
      setItems([]);
      saveState('admin_notifications', []);
      saveState('app_reports', []);
      setSelectedItem(null);
      window.dispatchEvent(new Event('admin_notifications_updated'));
    }
  };

  const handleToggleStatus = (id: string, newStatus: 'new' | 'in_progress' | 'resolved', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = items.map(item => {
      if (item.id === id) {
        return { ...item, status: newStatus, read: true };
      }
      return item;
    });
    setItems(updated);
    saveState('admin_notifications', updated);
    saveState('app_reports', updated);
    if (selectedItem?.id === id) {
      setSelectedItem(prev => prev ? { ...prev, status: newStatus, read: true } : null);
    }
  };

  // Фільтрація items
  const filteredItems = items.filter(item => {
    if (activeTab !== 'all' && item.type !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (item.movieTitle || '').toLowerCase().includes(q);
      const matchDesc = (item.description || '').toLowerCase().includes(q);
      return matchTitle || matchDesc;
    }
    return true;
  });

  const getIssueTypeName = (issueType?: string) => {
    switch (issueType) {
      case 'player_error':
        return language === 'UA' ? 'Плеєр не працює' : 'Player not working';
      case 'anime_mismatch':
        return language === 'UA' ? 'Аніме / фільм не відповідає' : 'Content mismatch';
      case 'wrong_episode_voice':
        return language === 'UA' ? 'Неправильна серія або озвучка' : 'Wrong episode or dub';
      case 'sound_sub_issue':
        return language === 'UA' ? 'Проблема зі звуком чи субтитрами' : 'Audio or subtitles problem';
      case 'data_proposal':
        return language === 'UA' ? 'Пропозиція змін' : 'Data Proposal';
      default:
        return language === 'UA' ? 'Загальне повідомлення' : 'General Notice';
    }
  };

  return (
    <div className="space-y-6 text-left font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-[#FF4D5C]/20 to-[#D72835]/10 border border-[#FF4D5C]/30 rounded-xl text-[#FF4D5C]">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{language === 'UA' ? 'Звернення та пропозиції' : 'Reports & Proposals'}</span>
              <span className="px-2 py-0.5 bg-[#FF4D5C]/20 text-[#FF4D5C] text-xs font-mono font-bold rounded-full border border-[#FF4D5C]/30">
                {items.length}
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              {language === 'UA' ? 'Список усіх отриманих скарг на плеєр та пропозицій редагування' : 'All user issue reports and data edit proposals'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshList}
            className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl transition cursor-pointer text-xs flex items-center gap-1.5"
            title={language === 'UA' ? 'Оновити список' : 'Refresh list'}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{language === 'UA' ? 'Оновити' : 'Refresh'}</span>
          </button>
          {items.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-900/60 text-red-400 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{language === 'UA' ? 'Очистити все' : 'Clear All'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center bg-[#18181b] border border-zinc-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              activeTab === 'all' ? 'bg-[#FF4D5C] text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {language === 'UA' ? 'Всі' : 'All'} ({items.length})
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'report' ? 'bg-[#FF4D5C] text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{language === 'UA' ? 'Проблеми' : 'Problems'}</span>
          </button>
          <button
            onClick={() => setActiveTab('propose')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'propose' ? 'bg-[#FF4D5C] text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>{language === 'UA' ? 'Пропозиції' : 'Proposals'}</span>
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'UA' ? 'Пошук за назвою або текстом...' : 'Search title or text...'}
            className="w-full bg-[#18181b] border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 font-sans"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="py-12 border border-dashed border-zinc-800/80 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
            <Inbox className="w-10 h-10 text-zinc-600 stroke-[1.5]" />
            <p className="text-sm font-bold text-zinc-400">
              {language === 'UA' ? 'Повідомлень немає' : 'No notifications'}
            </p>
            <p className="text-xs text-zinc-600 max-w-xs">
              {language === 'UA' 
                ? 'Коли користувачі надішлють звіт або пропозицію, вони з\'являться у цьому списку.' 
                : 'User feedback and content issue reports will appear here.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 max-h-[520px] overflow-y-auto pr-1">
            {filteredItems.map((item) => {
              const isReport = item.type === 'report';
              const formattedDate = new Date(item.createdAt).toLocaleString('uk-UA', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-4 bg-[#18181b] hover:bg-[#202025] border rounded-2xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group relative ${
                    item.status === 'resolved' 
                      ? 'border-emerald-950/60 opacity-80' 
                      : isReport 
                        ? 'border-red-950/60 hover:border-red-800/60' 
                        : 'border-amber-950/60 hover:border-amber-800/60'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                      isReport 
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {isReport ? <AlertTriangle className="w-4 h-4" /> : <Lightbulb className="w-4 h-4" />}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white truncate group-hover:text-[#FF4D5C] transition-colors">
                          {item.movieTitle}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                          isReport 
                            ? 'bg-red-950/80 text-red-400 border border-red-900/50' 
                            : 'bg-amber-950/80 text-amber-400 border border-amber-900/50'
                        }`}>
                          {getIssueTypeName(item.issueType)}
                        </span>
                        {item.status === 'resolved' && (
                          <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-400 border border-emerald-900/50 rounded-md text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{language === 'UA' ? 'Вирішено' : 'Resolved'}</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-300 font-sans line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-2 pt-0.5">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        <span>{formattedDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center border-t sm:border-t-0 border-zinc-800/60 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                    {item.status !== 'resolved' ? (
                      <button
                        onClick={(e) => handleToggleStatus(item.id, 'resolved', e)}
                        className="px-2.5 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-400 text-xs font-medium rounded-lg transition cursor-pointer flex items-center gap-1"
                        title={language === 'UA' ? 'Позначити як вирішене' : 'Mark as resolved'}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="text-[11px]">{language === 'UA' ? 'Вирішено' : 'Resolve'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleToggleStatus(item.id, 'new', e)}
                        className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white text-xs font-medium rounded-lg transition cursor-pointer text-[11px]"
                      >
                        {language === 'UA' ? 'Відновити' : 'Reopen'}
                      </button>
                    )}

                    <button
                      onClick={(e) => handleDeleteItem(item.id, e)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg border border-transparent hover:border-red-900/50 transition cursor-pointer"
                      title={language === 'UA' ? 'Видалити повідомлення' : 'Delete message'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1c1c1f] border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-4 animate-fade-in text-left">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                {selectedItem.type === 'report' ? (
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                ) : (
                  <Lightbulb className="w-5 h-5 text-amber-400" />
                )}
                <h4 className="font-bold text-base text-white">
                  {selectedItem.type === 'report'
                    ? (language === 'UA' ? 'Повідомлення про проблему' : 'Issue Report')
                    : (language === 'UA' ? 'Пропозиція змін' : 'Edit Proposal')}
                </h4>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-zinc-400 text-[11px] block">
                  {language === 'UA' ? 'Фільм / Аніме:' : 'Movie / Anime:'}
                </span>
                <p className="font-bold text-white text-sm mt-0.5">{selectedItem.movieTitle}</p>
              </div>

              <div>
                <span className="text-zinc-400 text-[11px] block">
                  {language === 'UA' ? 'Тип звернення:' : 'Type:'}
                </span>
                <span className="inline-block mt-1 px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-white font-medium">
                  {getIssueTypeName(selectedItem.issueType)}
                </span>
              </div>

              <div>
                <span className="text-zinc-400 text-[11px] block mb-1">
                  {language === 'UA' ? 'Текст звернення:' : 'Details:'}
                </span>
                <div className="bg-[#121214] border border-zinc-800 rounded-xl p-3.5 text-zinc-200 leading-relaxed font-sans text-sm whitespace-pre-wrap">
                  {selectedItem.description}
                </div>
              </div>

              <div className="text-[11px] text-zinc-500 font-mono pt-1">
                {language === 'UA' ? 'Дата надсилання: ' : 'Submitted: '}
                {new Date(selectedItem.createdAt).toLocaleString('uk-UA')}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <button
                onClick={() => handleDeleteItem(selectedItem.id)}
                className="px-4 py-2 bg-red-950/50 hover:bg-red-900/80 border border-red-900/80 text-red-400 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'UA' ? 'Видалити після перегляду' : 'Delete message'}</span>
              </button>

              <button
                onClick={() => setSelectedItem(null)}
                className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {language === 'UA' ? 'Закрити' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
