import { useState, useEffect, FormEvent, useMemo } from 'react';
import { format, parseISO, startOfToday } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Users,
  UserMinus,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  UserCheck,
  Mail,
  Info,
  Menu,
  X,
  Instagram,
  MessageSquare,
  Send,
  Plus,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ROLES, type ScheduleEntry, type Member } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabaseService } from './supabaseService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'schedule' | 'members' | 'framework' | 'contact' | 'icebreaker' | 'admin'>('home');
  const isDarkMode = false;
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduleView, setScheduleView] = useState<'cards' | 'table'>('cards');
  const [selectedDate, setSelectedDate] = useState<string>(format(startOfToday(), 'yyyy-MM-dd'));
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [tempMemberId, setTempMemberId] = useState<number | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const today = format(startOfToday(), 'yyyy-MM-dd');
  const isPast = selectedDate < today;
  const [queries, setQueries] = useState<any[]>([]);
  const [queryForm, setQueryForm] = useState({ name: '', rollNo: '', message: '' });
  const [querySubmitting, setQuerySubmitting] = useState(false);
  const [querySuccess, setQuerySuccess] = useState(false);
  const [icebreakerForm, setIcebreakerForm] = useState({ date: format(startOfToday(), 'yyyy-MM-dd'), gameName: '' });
  const [icebreakerSubmitting, setIcebreakerSubmitting] = useState(false);
  const [icebreakerSuccess, setIcebreakerSuccess] = useState(false);
  const [icebreakerBank, setIcebreakerBank] = useState<any[]>([]);
  const [newGameForm, setNewGameForm] = useState({ name: '', description: '' });
  const [newGameSubmitting, setNewGameSubmitting] = useState(false);
  const [newGameSuccess, setNewGameSuccess] = useState(false);
  const [hasUndo, setHasUndo] = useState(false);
  const [isShifting, setIsShifting] = useState(false);
  const [shiftForm, setShiftForm] = useState({ startDate: format(startOfToday(), 'yyyy-MM-dd'), reason: '' });
  const [shiftSuccess, setShiftSuccess] = useState(false);
  const [themeForm, setThemeForm] = useState({ date: format(startOfToday(), 'yyyy-MM-dd'), theme: '' });
  const [themeSubmitting, setThemeSubmitting] = useState(false);
  const [themeSuccess, setThemeSuccess] = useState(false);
  const [deleteMonthForm, setDeleteMonthForm] = useState({ month: format(startOfToday(), 'MM'), year: format(startOfToday(), 'yyyy') });
  const [isDeletingMonth, setIsDeletingMonth] = useState(false);
  const [deleteMonthSuccess, setDeleteMonthSuccess] = useState(false);

  useEffect(() => {
    fetchData();
    fetchAnnouncements();
    fetchIcebreakerBank();
    if (isAdminLoggedIn) {
      fetchQueries();
      checkUndo();
    }
  }, [isAdminLoggedIn]);

  const checkUndo = async () => {
    try {
      const hasUndoAction = await supabaseService.hasUndo();
      setHasUndo(hasUndoAction);
    } catch (e) { }
  };

  const groupedSchedule = Array.isArray(schedule) ? schedule.reduce((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = [];
    acc[entry.date].push(entry);
    return acc;
  }, {} as Record<string, any[]>) : {};

  const dates = Object.keys(groupedSchedule).sort();

  useEffect(() => {
    if (dates.length > 0) {
      // Find today's date string
      const todayStr = format(startOfToday(), 'yyyy-MM-dd');

      // Find the first date in the schedule that is TODAY or in the FUTURE
      const closestDate = dates.find(d => d >= todayStr);

      // If found, and the user hasn't manually picked a date yet, select it
      if (closestDate) {
        setSelectedDate(closestDate);
      }

      if (!dates.includes(icebreakerForm.date)) {
        setIcebreakerForm(prev => ({ ...prev, date: closestDate || dates[0] }));
        setThemeForm(prev => ({ ...prev, date: closestDate || dates[0] }));
      }
    }
  }, [dates]);

  const [isGenerating, setIsGenerating] = useState(false);

  const fetchIcebreakerBank = async () => {
    try {
      const data = await supabaseService.getIcebreakerBank();
      if (Array.isArray(data)) {
        setIcebreakerBank(data);
      }
    } catch (error) {
      console.error('Error fetching icebreaker bank:', error);
    }
  };

  const addGameToBank = async (e: FormEvent) => {
    e.preventDefault();
    setNewGameSubmitting(true);
    try {
      await supabaseService.addIcebreakerToBank(newGameForm.name, newGameForm.description);
      await fetchIcebreakerBank();
      setNewGameForm({ name: '', description: '' });
      setNewGameSuccess(true);
      setTimeout(() => setNewGameSuccess(false), 3000);
    } catch (error) {
      console.error('Error adding game to bank:', error);
    } finally {
      setNewGameSubmitting(false);
    }
  };

  const deleteGameFromBank = async (id: number) => {
    if (!confirm('Are you sure you want to delete this game from the bank?')) return;
    try {
      await supabaseService.deleteIcebreakerFromBank(id);
      await fetchIcebreakerBank();
    } catch (error) {
      console.error('Error deleting game from bank:', error);
    }
  };

  const fetchData = async () => {
    try {
      const [schedData, memData] = await Promise.all([
        supabaseService.getSchedule(),
        supabaseService.getMembers()
      ]);

      if (Array.isArray(schedData)) {
        setSchedule(schedData);
        if (schedData.length === 0 && !isGenerating) {
          setIsGenerating(true);
          await generateSchedule();
        }
      } else {
        console.error('Schedule data is not an array:', schedData);
        setSchedule([]);
      }

      if (Array.isArray(memData)) {
        setMembers(memData);
      } else {
        console.error('Members data is not an array:', memData);
        setMembers([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const data = await supabaseService.getAnnouncements();
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const fetchQueries = async () => {
    try {
      const data = await supabaseService.getQueries();
      setQueries(data || []);
    } catch (error) {
      console.error('Error fetching queries:', error);
    }
  };

  const submitQuery = async (e: FormEvent) => {
    e.preventDefault();
    setQuerySubmitting(true);
    try {
      await supabaseService.submitQuery(queryForm.name, queryForm.rollNo, queryForm.message);
      setQuerySuccess(true);
      setQueryForm({ name: '', rollNo: '', message: '' });
      setTimeout(() => setQuerySuccess(false), 5000);
    } catch (error) {
      console.error('Error submitting query:', error);
    } finally {
      setQuerySubmitting(false);
    }
  };

  const resolveQuery = async (id: number) => {
    try {
      await supabaseService.resolveQuery(id);
      fetchQueries();
    } catch (error) {
      console.error('Error resolving query:', error);
    }
  };

  const generateSchedule = async (startDate?: string) => {
    setLoading(true);
    try {
      const dateToUse = startDate || '2026-02-11';
      await supabaseService.generateSchedule(dateToUse);
      await fetchData();
    } catch (error) {
      console.error('Error generating schedule:', error);
    } finally {
      setIsGenerating(false);
      setLoading(false);
    }
  };

  const resetAllSchedule = async () => {
    if (!window.confirm("ARE YOU SURE? This will DELETE the ENTIRE schedule and all its data!")) return;
    setLoading(true);
    try {
      await supabaseService.deleteAllSchedule();
      await fetchData();
      alert("All schedule data has been cleared.");
    } catch (error) {
      console.error('Error resetting schedule:', error);
      alert("Failed to reset schedule. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const syncMembers = async () => {
    setLoading(true);
    try {
      await supabaseService.syncMembers();
      await fetchData();
      alert("Member list has been synchronized with the club database (60 members).");
    } catch (error) {
      console.error('Error syncing members:', error);
      alert("Failed to sync members. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const markAbsent = async (scheduleId: number) => {
    try {
      await supabaseService.markAbsent(scheduleId);
      await fetchData();
    } catch (error) {
      console.error('Error marking absent:', error);
    }
  };

  const markPresent = async (scheduleId: number) => {
    try {
      await supabaseService.markPresent(scheduleId);
      await fetchData();
    } catch (error) {
      console.error('Error marking present:', error);
    }
  };

  const updateSchedule = async (scheduleId: number, memberId: number) => {
    try {
      await supabaseService.updateSchedule(scheduleId, memberId);
      setEditingEntryId(null);
      await fetchData();
    } catch (error) {
      console.error('Error updating schedule:', error);
    }
  };

  const deleteMonthSchedule = async (e: FormEvent) => {
    e.preventDefault();
    if (!window.confirm(`Are you sure you want to delete the schedule for ${format(parseISO(`${deleteMonthForm.year}-${deleteMonthForm.month}-01`), 'MMMM yyyy')}? This will only delete 'scheduled' roles, not 'completed' ones.`)) return;

    setIsDeletingMonth(true);
    try {
      await supabaseService.deleteMonthSchedule(deleteMonthForm.month, deleteMonthForm.year);
      await fetchData();
      setDeleteMonthSuccess(true);
      setTimeout(() => setDeleteMonthSuccess(false), 3000);
    } catch (error) {
      console.error('Error deleting month schedule:', error);
    } finally {
      setIsDeletingMonth(false);
    }
  };

  const updateIcebreaker = async (e: FormEvent) => {
    e.preventDefault();
    setIcebreakerSubmitting(true);
    try {
      await supabaseService.updateIcebreaker(icebreakerForm.date, icebreakerForm.gameName);
      await fetchData();
      setIcebreakerForm(prev => ({ ...prev, gameName: '' }));
      setIcebreakerSuccess(true);
      setTimeout(() => setIcebreakerSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating icebreaker:', error);
    } finally {
      setIcebreakerSubmitting(false);
    }
  };

  const updateTheme = async (e: FormEvent) => {
    e.preventDefault();
    setThemeSubmitting(true);
    try {
      await supabaseService.updateTheme(themeForm.date, themeForm.theme);
      await fetchData();
      setThemeForm(prev => ({ ...prev, theme: '' }));
      setThemeSuccess(true);
      setTimeout(() => setThemeSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating theme:', error);
    } finally {
      setThemeSubmitting(false);
    }
  };

  const shiftSchedule = async (e: FormEvent) => {
    e.preventDefault();
    if (!confirm(`Are you sure you want to declare ${shiftForm.startDate} as a holiday? All subsequent meetings will be shifted forward.`)) return;
    setIsShifting(true);
    try {
      await supabaseService.shiftSchedule(shiftForm.startDate, shiftForm.reason);
      await fetchData();
      await checkUndo();
      setShiftSuccess(true);
      setTimeout(() => setShiftSuccess(false), 3000);
    } catch (error) {
      console.error('Error shifting schedule:', error);
    } finally {
      setIsShifting(false);
    }
  };

  const undoShift = async () => {
    if (!confirm('Are you sure you want to undo the last schedule shift?')) return;
    setLoading(true);
    try {
      await supabaseService.undoShift();
      await fetchData();
      await checkUndo();
    } catch (error) {
      console.error('Error undoing shift:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (password === 'ecebtms@123321') {
      setIsAdminLoggedIn(true);
      setLoginError(false);
      setPassword('');
    } else {
      setLoginError(true);
    }
  };

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
  };

  const currentDateIndex = dates.indexOf(selectedDate);

  const nextDate = () => {
    if (currentDateIndex < dates.length - 1) {
      setSelectedDate(dates[currentDateIndex + 1]);
    }
  };

  const prevDate = () => {
    if (currentDateIndex > 0) {
      setSelectedDate(dates[currentDateIndex - 1]);
    }
  };

  const backupMembers = useMemo(() => {
    if (!selectedDate || !groupedSchedule[selectedDate]) return [];

    const currentDayRoles = groupedSchedule[selectedDate] || [];

    // Filter for explicit backup roles
    return currentDayRoles
      .filter(entry => entry.roleId.startsWith('BACKUP_'))
      .map(entry => ({
        id: entry.id,
        currentMemberId: entry.currentMemberId,
        name: entry.currentMemberName,
        roleId: entry.roleId,
        status: entry.status,
        rollNo: Array.isArray(members) ? (members.find(m => m.id === entry.currentMemberId)?.rollNo || '') : ''
      }));
  }, [selectedDate, groupedSchedule, members]);

  useEffect(() => {
    if (dates.length > 0 && !dates.includes(selectedDate)) {
      setSelectedDate(dates[0]);
    }
  }, [dates, selectedDate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-[#5A5A40]" />
          <p className="text-[#5A5A40] font-serif italic">Loading schedule...</p>
        </div>
      </div>
    );
  }

  const currentDayRoles = (groupedSchedule[selectedDate] || []).filter(entry => !entry.roleId.startsWith('BACKUP_'));

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-500 font-sans selection:bg-[#5A5A40] selection:text-white",
      isDarkMode ? "bg-[#0A0A0A] text-white/90" : "bg-[#F5F5F0] text-[#1A1A1A]"
    )}>
      <header className={cn(
        "border-b sticky top-0 z-50 backdrop-blur-xl transition-colors duration-500",
        isDarkMode ? "bg-black/40 border-white/5" : "bg-white/50 border-black/5"
      )}>
        <div className="max-w-5xl mx-auto px-6 py-4 md:py-8 flex items-center justify-between gap-6">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1 md:mb-2">
              <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] font-semibold text-[#5A5A40] bg-[#5A5A40]/10 px-2 py-0.5 rounded-full">
                ECE_B Toastmasters
              </span>
            </div>
            <h1 className="text-2xl md:text-6xl font-serif font-light tracking-tighter leading-none">
              The <span className="italic font-normal">Podium</span>
            </h1>
          </div>

          <div className="flex items-center gap-4 md:gap-8">
            <nav className="hidden md:flex items-center gap-6">
              {[
                { id: 'home', label: 'Home' },
                { id: 'schedule', label: 'Schedule' },
                { id: 'members', label: 'Members' },
                { id: 'framework', label: 'Framework' },
                { id: 'contact', label: 'Contact' },
                { id: 'icebreaker', label: 'Icebreaker' },
                { id: 'admin', label: 'Admin' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "text-xs uppercase tracking-[0.2em] font-bold transition-all border-b-2 pb-1",
                    activeTab === tab.id ? "border-[#5A5A40] text-[#5A5A40]" : "border-transparent text-[#5A5A40]/40 hover:text-[#5A5A40]"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 rounded-full hover:bg-black/5 transition-colors"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={cn(
                "md:hidden border-t overflow-hidden",
                isDarkMode ? "bg-black border-white/5" : "bg-white border-black/5"
              )}
            >
              <div className="px-6 py-8 flex flex-col gap-6">
                {[
                  { id: 'home', label: 'Home' },
                  { id: 'schedule', label: 'Schedule' },
                  { id: 'members', label: 'Members' },
                  { id: 'framework', label: 'Framework' },
                  { id: 'contact', label: 'Contact' },
                  { id: 'icebreaker', label: 'Icebreaker' },
                  { id: 'admin', label: 'Admin' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setIsMenuOpen(false);
                    }}
                    className={cn(
                      "text-xl font-serif transition-all text-left",
                      activeTab === tab.id ? "text-[#5A5A40] italic" : "text-[#5A5A40]/40"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {activeTab === 'home' && (
          <div className="space-y-16 md:space-y-24">
            <section className="relative h-[400px] md:h-[600px] rounded-[32px] md:rounded-[64px] overflow-hidden bg-[#1A1A1A] text-white p-8 md:p-12 flex flex-col justify-end group">
              <motion.img
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
                src="https://picsum.photos/seed/toastmasters-hero/1600/900"
                className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity"
                alt="Club background"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-transparent to-transparent opacity-80" />

              <div className="relative z-10 max-w-3xl">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <span className="text-xs md:text-sm uppercase tracking-[0.4em] font-bold text-white/60 mb-4 md:mb-6 block">
                    Est. 2026 • ECE_B Chapter
                  </span>
                  <h2 className="text-6xl md:text-9xl font-serif font-light mb-6 md:mb-8 leading-[0.9] tracking-tighter">
                    Crafting <br />
                    <span className="italic">Confident</span> <br />
                    Voices.
                  </h2>
                  <p className="text-white/60 font-serif italic text-xl md:text-2xl max-w-xl leading-relaxed">
                    A sanctuary for the bold, a stage for the aspiring. We don't just speak; we resonate.
                  </p>
                </motion.div>
              </div>

              <div className="absolute bottom-12 right-8 md:bottom-20 md:right-12 flex flex-col items-end gap-1">
                <div className="w-8 md:w-12 h-[1px] bg-white/20" />
                <span className="text-[8px] md:text-[10px] uppercase tracking-widest font-medium text-white/40">Scroll to explore</span>
              </div>
            </section>

            {groupedSchedule[format(startOfToday(), 'yyyy-MM-dd')]?.[0]?.icebreaker && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={cn(
                  "p-8 md:p-12 rounded-[48px] border relative overflow-hidden group",
                  isDarkMode ? "bg-white/5 border-white/10" : "bg-[#F5F5F0] border-black/5"
                )}
              >
                <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
                  <MessageSquare className="w-32 h-32" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="space-y-4 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <h4 className={cn("text-xs uppercase tracking-[0.4em] font-bold", isDarkMode ? "text-white/40" : "text-[#5A5A40]")}>Today's Icebreaker</h4>
                    </div>
                    <h3 className={cn("text-5xl md:text-7xl font-serif font-medium italic leading-tight", isDarkMode ? "text-white" : "text-black")}>
                      "{groupedSchedule[format(startOfToday(), 'yyyy-MM-dd')][0].icebreaker}"
                    </h3>
                    <p className={cn("text-base md:text-lg opacity-40 font-serif italic", isDarkMode ? "text-white" : "text-black")}>
                      Join us for the first 10 minutes to break the ice and build connections.
                    </p>
                  </div>
                  <div className={cn(
                    "px-10 py-6 rounded-full border flex flex-col items-center gap-1 min-w-[200px]",
                    isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm"
                  )}>
                    <span className={cn("text-xs font-bold uppercase tracking-[0.2em]", isDarkMode ? "text-white/40" : "text-[#5A5A40]/60")}>Session Start</span>
                    <span className={cn("text-3xl font-serif font-medium", isDarkMode ? "text-white" : "text-black")}>10 Minutes</span>
                  </div>
                </div>
              </motion.div>
            )}

            {groupedSchedule[format(startOfToday(), 'yyyy-MM-dd')]?.[0]?.theme && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={cn(
                  "p-8 md:p-12 rounded-[48px] border relative overflow-hidden group",
                  isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-xl"
                )}
              >
                <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Clock className="w-32 h-32" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="space-y-4 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                      <h4 className={cn("text-xs uppercase tracking-[0.4em] font-bold", isDarkMode ? "text-white/40" : "text-[#5A5A40]")}>Today's Theme</h4>
                    </div>
                    <h3 className={cn("text-5xl md:text-7xl font-serif font-medium italic leading-tight", isDarkMode ? "text-white" : "text-black")}>
                      "{groupedSchedule[format(startOfToday(), 'yyyy-MM-dd')][0].theme}"
                    </h3>
                    <p className={cn("text-base md:text-lg opacity-40 font-serif italic", isDarkMode ? "text-white" : "text-black")}>
                      The central topic for our prepared speakers today.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
              <div className="lg:col-span-8 space-y-20">
                <section>
                  <div className="flex items-center gap-4 mb-12">
                    <div className={cn("h-[1px] w-12", isDarkMode ? "bg-white/20" : "bg-[#5A5A40]")} />
                    <h3 className={cn("text-[10px] uppercase tracking-[0.4em] font-bold", isDarkMode ? "text-white/60" : "text-[#5A5A40]")}>Latest Dispatches</h3>
                  </div>
                  <div className="space-y-8">
                    {Array.isArray(announcements) && announcements.length > 0 ? announcements.map((ann, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="group cursor-pointer"
                      >
                        <div className="flex gap-8 items-start">
                          <span className={cn("text-4xl font-serif italic transition-colors", isDarkMode ? "text-white/10 group-hover:text-white/20" : "text-[#5A5A40]/20 group-hover:text-[#5A5A40]/40")}>
                            0{i + 1}
                          </span>
                          <div className={cn("flex-1 pb-8 border-b", isDarkMode ? "border-white/5" : "border-black/5")}>
                            <div className="flex justify-between items-baseline mb-4">
                              <h4 className={cn("text-2xl font-serif font-medium group-hover:italic transition-all", isDarkMode ? "text-white/90" : "text-black/90")}>{ann.title}</h4>
                              <span className={cn("text-[10px] font-bold uppercase tracking-widest opacity-30", isDarkMode ? "text-white" : "text-black")}>{format(parseISO(ann.date), 'MMM d')}</span>
                            </div>
                            <p className={cn("text-sm leading-relaxed max-w-2xl opacity-50", isDarkMode ? "text-white" : "text-black")}>{ann.content}</p>
                          </div>
                        </div>
                      </motion.div>
                    )) : (
                      <p className={cn("font-serif italic opacity-40", isDarkMode ? "text-white" : "text-black")}>No dispatches at this time.</p>
                    )}
                  </div>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <h4 className={cn("text-xs uppercase tracking-[0.3em] font-bold", isDarkMode ? "text-white/40" : "text-[#5A5A40]")}>The Mission</h4>
                    <p className={cn("text-lg font-serif italic leading-relaxed opacity-70", isDarkMode ? "text-white" : "text-black")}>
                      "To provide a mutually supportive and positive learning environment in which every individual member has the opportunity to develop oral communication and leadership skills."
                    </p>
                  </div>
                  <div className="space-y-6">
                    <h4 className={cn("text-xs uppercase tracking-[0.3em] font-bold", isDarkMode ? "text-white/40" : "text-[#5A5A40]")}>The Vision</h4>
                    <p className={cn("text-lg font-serif italic leading-relaxed opacity-70", isDarkMode ? "text-white" : "text-black")}>
                      "To be the first-choice provider of dynamic, high-value, experiential communication and leadership skills development."
                    </p>
                  </div>
                </section>
              </div>

              <div className="lg:col-span-4">
                <div className="sticky top-32 space-y-12">
                  <div className={cn("p-10 rounded-[48px] text-white space-y-8", isDarkMode ? "bg-white/5 border border-white/10" : "bg-[#5A5A40]")}>
                    <h4 className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-60">Club Pulse</h4>
                    <div className="space-y-8">
                      <div>
                        <p className="text-6xl font-serif font-light tracking-tighter">60</p>
                        <p className="text-[10px] uppercase tracking-widest font-bold opacity-40 mt-2">Active Voices</p>
                      </div>
                      <div className={cn("h-[1px]", isDarkMode ? "bg-white/10" : "bg-white/20")} />
                      <div>
                        <p className="text-6xl font-serif font-light tracking-tighter">15</p>
                        <p className="text-[10px] uppercase tracking-widest font-bold opacity-40 mt-2">Daily Roles</p>
                      </div>
                    </div>
                  </div>

                  <a
                    href="https://instagram.com/_tms_club_ece_b_"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "p-10 rounded-[48px] border flex flex-col gap-6 group transition-all",
                      isDarkMode ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-white border-black/5 shadow-sm hover:shadow-md"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className={cn("text-[10px] uppercase tracking-[0.4em] font-bold opacity-40", isDarkMode ? "text-white" : "text-black")}>Instagram</h4>
                      <Instagram className="w-5 h-5 text-[#E1306C]" />
                    </div>
                    <div>
                      <p className={cn("text-2xl font-serif font-medium group-hover:italic transition-all", isDarkMode ? "text-white/90" : "text-black/90")}>@_tms_club_ece_b_</p>
                      <p className={cn("text-xs opacity-50 mt-2", isDarkMode ? "text-white" : "text-black")}>Follow our journey and stay updated.</p>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
              <div className="flex items-center gap-2 md:gap-4 bg-white rounded-3xl p-1.5 md:p-2 shadow-sm border border-black/5 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setScheduleView('cards')}
                  className={cn(
                    "px-4 md:px-6 py-2 rounded-2xl text-[10px] md:text-xs font-bold transition-all whitespace-nowrap",
                    scheduleView === 'cards' ? "bg-[#5A5A40] text-white" : "text-[#5A5A40]/40 hover:text-[#5A5A40]"
                  )}
                >
                  Cards
                </button>
                <button
                  onClick={() => setScheduleView('table')}
                  className={cn(
                    "px-4 md:px-6 py-2 rounded-2xl text-[10px] md:text-xs font-bold transition-all whitespace-nowrap",
                    scheduleView === 'table' ? "bg-[#5A5A40] text-white" : "text-[#5A5A40]/40 hover:text-[#5A5A40]"
                  )}
                >
                  Table
                </button>
              </div>

              <div className="flex items-center justify-between md:justify-start gap-4 bg-white rounded-3xl p-1.5 md:p-2 shadow-sm border border-black/5">
                <button
                  onClick={prevDate}
                  disabled={currentDateIndex <= 0}
                  className="p-2 rounded-xl hover:bg-[#F5F5F0] disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="px-2 md:px-4 text-center min-w-[120px] md:min-w-[160px]">
                  <p className="text-[8px] uppercase tracking-[0.2em] font-bold text-[#5A5A40]">
                    {format(parseISO(selectedDate), 'EEEE')}
                  </p>
                  <h2 className="text-xs md:text-sm font-serif font-medium">
                    {format(parseISO(selectedDate), 'MMM d, yyyy')}
                  </h2>
                </div>

                <button
                  onClick={nextDate}
                  disabled={currentDateIndex >= dates.length - 1}
                  className="p-2 rounded-xl hover:bg-[#F5F5F0] disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {groupedSchedule[selectedDate]?.[0]?.theme && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "mb-12 p-8 rounded-[40px] border flex flex-col items-center justify-center text-center",
                  isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm"
                )}
              >
                <span className="text-xs uppercase tracking-widest font-bold opacity-40 mb-2">Meeting Theme</span>
                <h3 className="text-4xl md:text-5xl font-serif italic font-medium">"{groupedSchedule[selectedDate][0].theme}"</h3>
              </motion.div>
            )}

            {groupedSchedule[selectedDate]?.[0]?.icebreaker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "mb-12 p-8 rounded-[40px] border relative overflow-hidden group",
                  isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm"
                )}
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <MessageSquare className="w-24 h-24" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-2 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#5A5A40]">Icebreaker of the Day</h4>
                    </div>
                    <h3 className="text-3xl font-serif font-medium italic">"{groupedSchedule[selectedDate][0].icebreaker}"</h3>
                    <p className="text-xs opacity-40">First 10 minutes of the session</p>
                  </div>
                  <div className="px-8 py-4 rounded-full bg-[#5A5A40]/5 border border-[#5A5A40]/10">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]">10 Minutes Duration</span>
                  </div>
                </div>
              </motion.div>
            )}

            {backupMembers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "mb-12 p-6 md:p-8 rounded-[32px] md:rounded-[40px] border flex flex-col md:flex-row items-center justify-between gap-6",
                  isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-widest">Meeting Backups</h4>
                    <p className="text-xs opacity-40">Meeting backups for today (from next batch)</p>
                  </div>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  {backupMembers.map((m, i) => {
                    const isEditing = editingEntryId === m.id;
                    const isBusy = m.status === 'absent';
                    return (
                      <div key={i} className={cn(
                        "px-4 py-3 rounded-2xl border flex flex-col items-center min-w-[140px] relative group transition-all",
                        isDarkMode ? "bg-black/20 border-white/5" : "bg-[#F5F5F0] border-black/5",
                        isEditing && "ring-2 ring-[#5A5A40]",
                        isBusy && "opacity-60"
                      )}>
                        <div className="flex flex-col items-center gap-1 w-full">
                          {isEditing ? (
                            <div className="flex flex-col gap-2 w-full">
                              <select
                                value={tempMemberId || m.currentMemberId}
                                onChange={(e) => setTempMemberId(Number(e.target.value))}
                                className={cn(
                                  "w-full p-1 rounded-lg text-[10px] border",
                                  isDarkMode ? "bg-black border-white/10 text-white" : "bg-white border-black/10 text-black"
                                )}
                              >
                                {Array.isArray(members) && members.map(member => (
                                  <option key={member.id} value={member.id}>{member.name}</option>
                                ))}
                              </select>
                              <div className="flex gap-1">
                                <button onClick={() => updateSchedule(m.id, tempMemberId || m.currentMemberId)} className="flex-1 bg-[#5A5A40] text-white py-1 rounded-lg text-[8px] font-bold">Save</button>
                                <button onClick={() => { setEditingEntryId(null); setTempMemberId(null); }} className="flex-1 bg-black/5 py-1 rounded-lg text-[8px] font-bold">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-col items-center">
                                <span className="text-xs font-serif font-medium">{m.name}</span>
                                <span className="text-[8px] font-mono opacity-40">{m.rollNo}</span>
                              </div>

                              <div className={cn(
                                "text-[7px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded-full mt-1",
                                isBusy ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"
                              )}>
                                {isBusy ? 'Substituting' : 'Available'}
                              </div>

                              {isAdminLoggedIn && (
                                <div className="mt-2 flex gap-1">
                                  <button
                                    onClick={() => { setEditingEntryId(m.id); setTempMemberId(m.currentMemberId); }}
                                    className="p-1 rounded-lg hover:bg-black/5 text-[#5A5A40]"
                                    title="Edit Backup"
                                  >
                                    <Users className="w-3 h-3" />
                                  </button>
                                  {isBusy ? (
                                    <button onClick={() => markPresent(m.id)} className="text-[7px] font-bold text-emerald-600 uppercase">Release</button>
                                  ) : (
                                    <button onClick={() => markAbsent(m.id)} className="text-[7px] font-bold text-red-500 uppercase">Absent</button>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {scheduleView === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="wait">
                  {currentDayRoles.map((entry, idx) => {
                    const role = ROLES.find(r => r.id === entry.roleId);
                    const roleName = role?.name || entry.roleId;
                    const isSub = entry.isSubstitution;
                    const isAbsent = entry.status === 'absent';
                    const isEditing = editingEntryId === entry.id;

                    return (
                      <motion.div
                        key={`${entry.id}-${selectedDate}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: idx * 0.03 }}
                        className={cn(
                          "group relative p-6 rounded-[32px] border transition-all",
                          isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm hover:shadow-md",
                          isSub && (isDarkMode ? "ring-1 ring-white/20 bg-white/10" : "ring-1 ring-[#5A5A40]/20 bg-[#F5F5F0]/30"),
                          isAbsent && "opacity-75 grayscale-[0.5]"
                        )}
                      >
                        <div className="flex flex-col h-full">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex flex-col">
                              <span className={cn("text-xs uppercase tracking-widest font-bold", isDarkMode ? "text-white/40" : "text-[#5A5A40]/60")}>
                                {roleName}
                              </span>
                              <span className={cn("text-[10px] opacity-40 mt-0.5", isDarkMode ? "text-white" : "text-black")}>
                                {role?.description}
                              </span>
                            </div>
                            {!!isSub && (
                              <div className="flex items-center gap-1 text-xs font-bold text-[#5A5A40] bg-[#5A5A40]/10 px-2 py-0.5 rounded-full">
                                <AlertCircle className="w-3 h-3" />
                                SUBSTITUTED
                              </div>
                            )}
                          </div>

                          <div className="mb-6">
                            {isEditing ? (
                              <div className="space-y-3">
                                <select
                                  value={tempMemberId || entry.currentMemberId}
                                  onChange={(e) => setTempMemberId(Number(e.target.value))}
                                  className={cn(
                                    "w-full p-2 rounded-xl text-sm border",
                                    isDarkMode ? "bg-black/40 border-white/10 text-white" : "bg-white border-black/10 text-black"
                                  )}
                                >
                                  {Array.isArray(members) && members.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                  ))}
                                </select>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => updateSchedule(entry.id, tempMemberId || entry.currentMemberId)}
                                    className="flex-1 bg-[#5A5A40] text-white py-2 rounded-xl text-xs font-bold"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingEntryId(null)}
                                    className="flex-1 bg-black/5 py-2 rounded-xl text-xs font-bold"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-baseline gap-2">
                                  <h3 className={cn("text-xl font-serif font-medium leading-tight mb-1", isDarkMode ? "text-white/90" : "text-black/90")}>
                                    {entry.currentMemberName}
                                  </h3>
                                  <span className="text-xs font-mono opacity-30">
                                    {Array.isArray(members) ? (members.find(m => m.id === entry.currentMemberId)?.rollNo) : ''}
                                  </span>
                                </div>
                                {!!isSub && (
                                  <p className={cn("text-xs italic opacity-40", isDarkMode ? "text-white" : "text-black")}>
                                    Replacing: {entry.originalMemberName}
                                  </p>
                                )}
                              </>
                            )}
                          </div>

                          <div className="mt-auto flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isAdminLoggedIn ? (
                                isAbsent ? (
                                  <button
                                    onClick={() => markPresent(entry.id)}
                                    disabled={isPast}
                                    className={cn(
                                      "flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full transition-all",
                                      isPast
                                        ? "bg-gray-500/10 text-gray-400 cursor-not-allowed"
                                        : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                                    )}
                                  >
                                    <UserCheck className="w-3 h-3" />
                                    Mark Present
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => markAbsent(entry.id)}
                                    disabled={isPast}
                                    className={cn(
                                      "flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full transition-all",
                                      isPast
                                        ? "bg-gray-500/10 text-gray-400 cursor-not-allowed"
                                        : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                    )}
                                  >
                                    <UserMinus className="w-3 h-3" />
                                    Mark Absent
                                  </button>
                                )
                              ) : (
                                <div className="flex items-center gap-2">
                                  {isAbsent ? (
                                    <span className="flex items-center gap-1 text-xs font-bold text-red-500 uppercase tracking-wider">
                                      <UserMinus className="w-3 h-3" />
                                      Absent
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 uppercase tracking-wider">
                                      <UserCheck className="w-3 h-3" />
                                      Present
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {isAdminLoggedIn && !isEditing && (
                                <button
                                  onClick={() => {
                                    setEditingEntryId(entry.id);
                                    setTempMemberId(entry.currentMemberId);
                                  }}
                                  className="p-2 rounded-xl hover:bg-black/5 transition-colors text-[#5A5A40]"
                                  title="Edit Role Player"
                                >
                                  <Users className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <div className={cn("rounded-[32px] md:rounded-[40px] border overflow-hidden", isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm")}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className={isDarkMode ? "bg-white/5" : "bg-[#F5F5F0]/50"}>
                        <th className="px-6 md:px-8 py-4 text-xs uppercase tracking-widest font-bold opacity-40">Role</th>
                        <th className="px-6 md:px-8 py-4 text-xs uppercase tracking-widest font-bold opacity-40">Member</th>
                        <th className="px-6 md:px-8 py-4 text-xs uppercase tracking-widest font-bold opacity-40">Status</th>
                        {isAdminLoggedIn && <th className="px-6 md:px-8 py-4 text-xs uppercase tracking-widest font-bold opacity-40 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {currentDayRoles.map((entry) => {
                        const role = ROLES.find(r => r.id === entry.roleId);
                        const isEditing = editingEntryId === entry.id;
                        return (
                          <tr key={entry.id} className="hover:bg-black/5 transition-colors">
                            <td className="px-6 md:px-8 py-4">
                              <p className="text-sm font-bold">{role?.name}</p>
                              <p className="text-xs opacity-40">{role?.description}</p>
                            </td>
                            <td className="px-6 md:px-8 py-4">
                              {isEditing ? (
                                <select
                                  value={tempMemberId || entry.currentMemberId}
                                  onChange={(e) => setTempMemberId(Number(e.target.value))}
                                  className={cn(
                                    "p-2 rounded-xl text-sm border",
                                    isDarkMode ? "bg-black/40 border-white/10 text-white" : "bg-white border-black/10 text-black"
                                  )}
                                >
                                  {Array.isArray(members) && members.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <div>
                                  <p className="text-base font-serif">{entry.currentMemberName}</p>
                                  <p className="text-xs font-mono opacity-30">
                                    {Array.isArray(members) ? (members.find(m => m.id === entry.currentMemberId)?.rollNo) : ''}
                                  </p>
                                  {!!entry.isSubstitution && (
                                    <p className="text-[10px] italic opacity-40">Replacing: {entry.originalMemberName}</p>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-6 md:px-8 py-4">
                              {isAdminLoggedIn ? (
                                entry.status === 'absent' ? (
                                  <button
                                    onClick={() => markPresent(entry.id)}
                                    disabled={isPast}
                                    className={cn(
                                      "text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full transition-all",
                                      isPast
                                        ? "bg-gray-500/10 text-gray-400 cursor-not-allowed"
                                        : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                                    )}
                                  >
                                    Mark Present
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => markAbsent(entry.id)}
                                    disabled={isPast}
                                    className={cn(
                                      "text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full transition-all",
                                      isPast
                                        ? "bg-gray-500/10 text-gray-400 cursor-not-allowed"
                                        : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                    )}
                                  >
                                    Mark Absent
                                  </button>
                                )
                              ) : (
                                <span className={cn(
                                  "text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full",
                                  entry.status === 'absent' ? "text-red-500 bg-red-500/10" : "text-emerald-600 bg-emerald-600/10"
                                )}>
                                  {entry.status}
                                </span>
                              )}
                            </td>
                            {isAdminLoggedIn && (
                              <td className="px-6 md:px-8 py-4 text-right">
                                {isEditing ? (
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => updateSchedule(entry.id, tempMemberId || entry.currentMemberId)} className="text-emerald-600 font-bold text-xs">SAVE</button>
                                    <button onClick={() => setEditingEntryId(null)} className="text-red-500 font-bold text-xs">CANCEL</button>
                                  </div>
                                ) : (
                                  <div className="flex justify-end gap-4">
                                    <button onClick={() => { setEditingEntryId(entry.id); setTempMemberId(entry.currentMemberId); }} className="text-[#5A5A40] font-bold text-xs">EDIT</button>
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-16 border-t border-black/5 pt-12 grid grid-cols-1 md:grid-cols-3 gap-12">
              <div>
                <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-[#5A5A40] mb-4">Absentee Rule</h4>
                <p className="text-sm text-[#5A5A40]/70 leading-relaxed font-serif">
                  If a role player is absent, their role is immediately filled by a backup from the first three available members of the next batch.
                </p>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-[#5A5A40] mb-4">Return Rule</h4>
                <p className="text-sm text-[#5A5A40]/70 leading-relaxed font-serif">
                  When the absent member returns, they take over the next scheduled role of the backup player who replaced them, ensuring fair rotation.
                </p>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-[#5A5A40] mb-4">Cycle Tracking</h4>
                <p className="text-sm text-[#5A5A40]/70 leading-relaxed font-serif">
                  The system tracks all 60 members across 15 daily roles, ensuring no repetition until the entire club has cycled through.
                </p>
              </div>
            </div>
          </>
        )}

        {activeTab === 'members' && (
          <div className={cn("rounded-[32px] md:rounded-[40px] border overflow-hidden", isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm")}>
            <div className="p-6 md:p-8 border-b border-black/5 bg-[#F5F5F0]/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-xl md:text-2xl font-serif font-medium">Club Members</h2>
                <p className="text-xs md:text-sm opacity-40">Total {members.length} active members in ECE_B Toastmasters</p>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "pl-10 pr-4 py-3 rounded-2xl text-sm border w-full md:w-64",
                    isDarkMode ? "bg-black/40 border-white/10 text-white" : "bg-white border-black/10 text-black"
                  )}
                />
                <Users className="absolute left-3 top-3.5 w-4 h-4 opacity-30" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className={isDarkMode ? "bg-white/5" : "bg-[#F5F5F0]/50"}>
                    <th className="px-6 md:px-8 py-4 text-[10px] uppercase tracking-widest font-bold opacity-40">Roll No</th>
                    <th className="px-6 md:px-8 py-4 text-[10px] uppercase tracking-widest font-bold opacity-40">Name</th>
                    <th className="px-6 md:px-8 py-4 text-[10px] uppercase tracking-widest font-bold opacity-40">Rotation Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {Array.isArray(members) && members.filter(m =>
                    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    m.rollNo.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map((member) => (
                    <tr key={member.id} className="hover:bg-black/5 transition-colors">
                      <td className="px-6 md:px-8 py-4 font-mono text-xs">{member.rollNo}</td>
                      <td className="px-6 md:px-8 py-4 font-serif text-sm">{member.name}</td>
                      <td className="px-6 md:px-8 py-4 text-xs opacity-40">#{member.attendance_order || member.order}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'framework' && (
          <div className="space-y-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <h2 className="text-5xl md:text-7xl font-serif font-light tracking-tighter">The <span className="italic">Framework</span></h2>
                <p className="text-xl opacity-60 font-serif italic">Understanding the core values and purpose of Toastmasters.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { title: 'Communication', desc: 'Master the art of expressing ideas clearly and persuasively.' },
                    { title: 'Proficiency', desc: 'Enhance your command over the English language through practice.' },
                    { title: 'Teamwork', desc: 'Collaborate with peers to run successful meetings and events.' },
                    { title: 'Confidence', desc: 'Build the self-assurance to stand on any podium and be heard.' }
                  ].map((item, i) => (
                    <div key={i} className={cn("p-6 rounded-[32px] border", isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm")}>
                      <h4 className="text-base font-bold uppercase tracking-widest mb-2">{item.title}</h4>
                      <p className="text-sm opacity-40 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                <div className={cn("p-10 rounded-[48px] border h-full flex flex-col justify-center", isDarkMode ? "bg-white/5 border-white/10" : "bg-[#5A5A40] text-white")}>
                  <h3 className="text-4xl font-serif italic mb-6">What is Toastmasters?</h3>
                  <ul className="space-y-4 opacity-80 font-serif text-xl">
                    <li>• A Global Organization for personal growth</li>
                    <li>• A platform for Public Speaking and Leadership</li>
                    <li>• A Safe Environment to experiment and fail</li>
                    <li>• Learning by doing with real responsibilities</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-12">
              <div className="text-center max-w-2xl mx-auto space-y-4">
                <h2 className="text-5xl font-serif font-medium">Leadership Roles</h2>
                <p className="text-lg opacity-60">Every meeting is run by leaders. No one is in charge of your skills but you.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    role: 'President',
                    tasks: ['Preside over every meeting', 'Lead the Club strategy', 'Monitor Project Tracker', 'Conduct Ex-comm meetings', 'Audit Club files']
                  },
                  {
                    role: 'VP Education',
                    tasks: ['Mentor-mentee sheet', 'Collect nominations', 'Ensure attendance', 'Maintain CC Manual', 'Maintain Project Tracker']
                  },
                  {
                    role: 'VP Public Relations',
                    tasks: ['Promote Club activities', 'Manage invitations/agenda', 'Fill PR Sheets', 'Creative appreciation', 'Permitted promotions']
                  },
                  {
                    role: 'Secretary',
                    tasks: ['Create Invitations/Agendas', 'Maintain MOM Sheets', 'Maintain Club file', 'Ex-comm MOMs', 'Trainers\' Remarks']
                  },
                  {
                    role: 'Sergeant At Arms',
                    tasks: ['Keep the hall ready', 'Prepare role players', 'Create timer cards', 'Manage voting slips', 'Time management']
                  },
                  {
                    role: 'Club Mentor',
                    tasks: ['Mentor-mentee sheet', 'Motivate members', 'Collect Speech Scripts', 'Toastmasters proceedings', 'Clarify doubts']
                  }
                ].map((item, i) => (
                  <div key={i} className={cn("p-8 rounded-[40px] border", isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm")}>
                    <h4 className="text-2xl font-serif font-medium mb-4">{item.role}</h4>
                    <ul className="space-y-2">
                      {item.tasks.map((task, j) => (
                        <li key={j} className="text-xs uppercase tracking-widest opacity-40 flex items-start gap-2">
                          <span className="text-[#5A5A40]">•</span>
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className={cn("p-12 rounded-[64px] border", isDarkMode ? "bg-white/5 border-white/10" : "bg-[#F5F5F0] border-black/5")}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-1 space-y-6">
                  <h3 className="text-5xl font-serif font-medium leading-none">Meeting <br /><span className="italic">Agenda</span></h3>
                  <p className="opacity-40 text-base">A structured 1-hour session designed for maximum impact.</p>
                  <div className="flex items-center gap-2 text-[#5A5A40]">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-bold uppercase tracking-widest">Total: 60 Minutes</span>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <div className="space-y-4">
                    {[
                      { time: '01 min', task: 'SAA opens the meet and invites the President' },
                      { time: '03 min', task: 'Presidential remarks and TMOD introduction' },
                      { time: '03 min', task: 'TMOD introduces theme and General Evaluator' },
                      { time: '03 min', task: 'GE introduces Evaluators and TAG Team' },
                      { time: '04 min', task: 'Timer/Ah counter/Grammarian describe roles' },
                      { time: '09 min', task: 'Prepared Speakers (3 speakers x 3 mins)' },
                      { time: '03 min', task: 'Table Topics (3 speakers x 1 min)' },
                      { time: '10 min', task: 'Evaluations and TAG Team reports' },
                      { time: '02 min', task: 'General Evaluator\'s remarks' },
                      { time: '02 min', task: 'TMOD asks for voting' },
                      { time: '03 min', task: 'SAA collects voting slips' },
                      { time: '03 min', task: 'Club Officers recognize winners' },
                      { time: '02 min', task: 'President announcements and adjournment' }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-4 group">
                        <span className="text-xs font-mono opacity-30 w-12">{item.time}</span>
                        <div className="h-[1px] flex-1 bg-black/5 group-hover:bg-[#5A5A40]/20 transition-colors" />
                        <span className="text-sm font-serif opacity-60 group-hover:opacity-100 transition-opacity">{item.task}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'icebreaker' && (
          <div className="max-w-5xl mx-auto py-24 px-6 space-y-16">
            <section>
              <div className="flex items-center gap-4 mb-12">
                <div className={cn("h-[1px] w-12", isDarkMode ? "bg-white/20" : "bg-[#5A5A40]")} />
                <h3 className={cn("text-xs uppercase tracking-[0.4em] font-bold", isDarkMode ? "text-white/60" : "text-[#5A5A40]")}>Games</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {isAdminLoggedIn && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "p-8 rounded-[40px] border border-dashed flex flex-col items-center justify-center text-center transition-all",
                      isDarkMode ? "bg-white/5 border-white/20" : "bg-white border-black/10 shadow-sm"
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-[#5A5A40]/10 flex items-center justify-center mb-4">
                      <Plus className="w-6 h-6 text-[#5A5A40]" />
                    </div>
                    <h4 className="text-base font-bold uppercase tracking-widest opacity-40">Add New Game</h4>
                    <button
                      onClick={() => {
                        const el = document.getElementById('admin-add-game');
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="mt-4 text-xs uppercase tracking-widest font-bold text-[#5A5A40] underline underline-offset-4"
                    >
                      Go to Form
                    </button>
                  </motion.div>
                )}
                {icebreakerBank.length > 0 ? icebreakerBank.map((game, i) => (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className={cn(
                      "p-8 rounded-[40px] border flex flex-col items-center justify-center text-center transition-all relative group",
                      isDarkMode ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-white border-black/5 shadow-sm hover:shadow-md"
                    )}
                  >
                    {isAdminLoggedIn && (
                      <button
                        onClick={() => deleteGameFromBank(game.id)}
                        className="absolute top-6 right-6 p-2 rounded-full bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <h4 className={cn("text-3xl font-serif font-medium", isDarkMode ? "text-white/90" : "text-black/90")}>{game.name}</h4>
                    {game.description && <p className="text-sm opacity-40 mt-2 font-serif italic">{game.description}</p>}
                  </motion.div>
                )) : (
                  <div className="col-span-2 text-center py-12 opacity-40 italic">No games in bank yet.</div>
                )}
              </div>
            </section>

            {isAdminLoggedIn && (
              <section className="space-y-12">
                <div id="admin-add-game" className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className={cn("h-[1px] w-12", isDarkMode ? "bg-white/20" : "bg-[#5A5A40]")} />
                    <h3 className={cn("text-xs uppercase tracking-[0.4em] font-bold", isDarkMode ? "text-white/60" : "text-[#5A5A40]")}>Admin: Add New Game to Bank</h3>
                  </div>
                  <div className={cn(
                    "p-8 md:p-12 rounded-[48px] border relative overflow-hidden",
                    isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-xl"
                  )}>
                    <AnimatePresence>
                      {newGameSuccess && (
                        <motion.div
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="absolute inset-x-0 top-0 bg-emerald-500 text-white py-3 text-center text-xs uppercase tracking-widest font-bold z-10"
                        >
                          Game Added to Bank Successfully
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <form onSubmit={addGameToBank} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <label className="text-xs uppercase tracking-widest font-bold opacity-40 ml-4">Game Name</label>
                          <input
                            type="text"
                            value={newGameForm.name}
                            onChange={(e) => setNewGameForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g. Mafia"
                            className={cn(
                              "w-full px-8 py-4 rounded-3xl border transition-all outline-none text-lg font-serif",
                              isDarkMode ? "bg-black/40 border-white/10 text-white" : "bg-[#F5F5F0] border-black/5 text-black"
                            )}
                            required
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-xs uppercase tracking-widest font-bold opacity-40 ml-4">Description (Optional)</label>
                          <input
                            type="text"
                            value={newGameForm.description}
                            onChange={(e) => setNewGameForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Briefly describe the game"
                            className={cn(
                              "w-full px-8 py-4 rounded-3xl border transition-all outline-none text-lg font-serif",
                              isDarkMode ? "bg-black/40 border-white/10 text-white" : "bg-[#F5F5F0] border-black/5 text-black"
                            )}
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={newGameSubmitting || !newGameForm.name}
                        className="w-full bg-[#5A5A40] text-white py-6 rounded-3xl font-bold text-sm tracking-[0.2em] uppercase hover:bg-[#4A4A30] transition-all disabled:opacity-50 shadow-lg shadow-[#5A5A40]/20"
                      >
                        {newGameSubmitting ? 'Adding...' : 'Add Game to Bank'}
                      </button>
                    </form>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className={cn("h-[1px] w-12", isDarkMode ? "bg-white/20" : "bg-[#5A5A40]")} />
                    <h3 className={cn("text-[10px] uppercase tracking-[0.4em] font-bold", isDarkMode ? "text-white/60" : "text-[#5A5A40]")}>Admin: Set Daily Game</h3>
                  </div>
                  <div className={cn(
                    "p-8 md:p-12 rounded-[48px] border relative overflow-hidden",
                    isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-xl"
                  )}>
                    <AnimatePresence>
                      {icebreakerSuccess && (
                        <motion.div
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="absolute inset-x-0 top-0 bg-emerald-500 text-white py-3 text-center text-[10px] uppercase tracking-widest font-bold z-10"
                        >
                          Icebreaker Updated Successfully
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <form onSubmit={updateIcebreaker} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 ml-4">Select Date</label>
                          <select
                            value={icebreakerForm.date}
                            onChange={(e) => setIcebreakerForm(prev => ({ ...prev, date: e.target.value }))}
                            className={cn(
                              "w-full px-8 py-4 rounded-3xl border transition-all outline-none text-lg font-serif",
                              isDarkMode ? "bg-black/40 border-white/10 text-white" : "bg-[#F5F5F0] border-black/5 text-black"
                            )}
                          >
                            {dates.length > 0 ? dates.map(d => (
                              <option key={d} value={d}>{format(parseISO(d), 'EEEE, MMM d, yyyy')}</option>
                            )) : (
                              <option disabled>No dates available</option>
                            )}
                          </select>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 ml-4">Game Name</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={icebreakerForm.gameName}
                              onChange={(e) => setIcebreakerForm(prev => ({ ...prev, gameName: e.target.value }))}
                              placeholder="e.g. Electric Pulse"
                              className={cn(
                                "w-full px-8 py-4 rounded-3xl border transition-all outline-none text-xl font-serif",
                                isDarkMode ? "bg-black/40 border-white/10 text-white" : "bg-[#F5F5F0] border-black/5 text-black"
                              )}
                            />
                            {icebreakerBank.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {icebreakerBank.slice(0, 6).map(game => (
                                  <button
                                    key={game.id}
                                    type="button"
                                    onClick={() => setIcebreakerForm(prev => ({ ...prev, gameName: game.name }))}
                                    className={cn(
                                      "px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all",
                                      icebreakerForm.gameName === game.name
                                        ? "bg-[#5A5A40] text-white"
                                        : isDarkMode ? "bg-white/10 text-white/60 hover:bg-white/20" : "bg-black/5 text-black/40 hover:bg-black/10"
                                    )}
                                  >
                                    {game.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={icebreakerSubmitting || !icebreakerForm.gameName || dates.length === 0}
                        className="w-full bg-[#5A5A40] text-white py-6 rounded-3xl font-bold text-sm tracking-[0.2em] uppercase hover:bg-[#4A4A30] transition-all disabled:opacity-50 shadow-lg shadow-[#5A5A40]/20"
                      >
                        {icebreakerSubmitting ? 'Updating...' : 'Confirm Icebreaker for this Day'}
                      </button>
                    </form>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="max-w-4xl mx-auto">
            {!isAdminLoggedIn ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "max-w-md mx-auto p-12 rounded-[48px] border space-y-8",
                  isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-xl"
                )}
              >
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-serif font-medium">Admin Access</h2>
                  <p className="text-sm opacity-40">Enter credentials to manage the club</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 ml-4">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={cn(
                        "w-full px-6 py-4 rounded-3xl border transition-all outline-none focus:ring-2 ring-[#5A5A40]/20",
                        isDarkMode ? "bg-black/40 border-white/10 text-white" : "bg-[#F5F5F0] border-black/5 text-black"
                      )}
                    />
                    {loginError && <p className="text-red-500 text-[10px] font-bold ml-4 uppercase tracking-widest">Invalid password</p>}
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#5A5A40] text-white py-4 rounded-3xl font-bold text-sm tracking-widest uppercase hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20"
                  >
                    Login
                  </button>
                </form>
              </motion.div>
            ) : (
              <div className="space-y-12">
                <div className="flex items-center justify-between">
                  <h2 className="text-4xl font-serif font-medium">Admin Panel</h2>
                  <button
                    onClick={handleLogout}
                    className="text-[10px] uppercase tracking-widest font-bold opacity-40 hover:opacity-100 transition-opacity"
                  >
                    Logout
                  </button>
                </div>
                <div className={cn(
                  "p-8 rounded-[40px] border space-y-6",
                  isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm"
                )}>
                  <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-[#5A5A40]">Quick Actions</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => generateSchedule()}
                      className={cn(
                        "flex items-center justify-center gap-3 p-6 rounded-3xl border transition-all text-sm font-medium",
                        isDarkMode ? "border-white/10 hover:bg-white/5" : "border-black/5 hover:bg-[#5A5A40]/5"
                      )}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Regenerate Current
                    </button>
                    <button
                      onClick={() => generateSchedule('2026-03-01')}
                      className={cn(
                        "flex items-center justify-center gap-3 p-6 rounded-3xl border transition-all text-sm font-medium bg-[#5A5A40] text-white",
                        isDarkMode ? "hover:bg-[#4A4A30]" : "hover:bg-[#4A4A30]"
                      )}
                    >
                      <CalendarIcon className="w-4 h-4" />
                      Generate March 2026
                    </button>
                    <button
                      onClick={() => generateSchedule('2026-04-01')}
                      className={cn(
                        "flex items-center justify-center gap-3 p-6 rounded-3xl border transition-all text-sm font-medium bg-[#5A5A40] text-white",
                        isDarkMode ? "hover:bg-[#4A4A30]" : "hover:bg-[#4A4A30]"
                      )}
                    >
                      <CalendarIcon className="w-4 h-4" />
                      Generate April 2026
                    </button>
                    <button
                      onClick={resetAllSchedule}
                      className={cn(
                        "flex items-center justify-center gap-3 p-6 rounded-3xl border border-red-500/20 text-red-500 transition-all text-sm font-bold uppercase tracking-widest",
                        isDarkMode ? "hover:bg-red-500/10" : "hover:bg-red-500/5"
                      )}
                    >
                      <Trash2 className="w-4 h-4" />
                      Reset Everything
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm("This will RESET and REGENERATE everything from Feb to April. Proceed?")) {
                          try {
                            setLoading(true);
                            await supabaseService.deleteAllSchedule();
                            await supabaseService.syncMembers();
                            await supabaseService.generateSchedule("2026-02-11");
                            await supabaseService.generateSchedule("2026-03-01");
                            await supabaseService.generateSchedule("2026-04-01");
                            alert("Master Setup Complete! Feb, March, and April are scheduled.");
                            window.location.reload();
                          } catch (err) {
                            alert("Master Setup Failed.");
                            console.error(err);
                          } finally {
                            setLoading(false);
                          }
                        }
                      }}
                      className={cn(
                        "flex items-center justify-center gap-3 p-6 rounded-3xl border border-purple-500/20 text-purple-600 transition-all text-sm font-bold uppercase tracking-widest bg-purple-50",
                        isDarkMode ? "hover:bg-purple-900/20" : "hover:bg-purple-100"
                      )}
                    >
                      🚀 RUN MASTER SETUP
                    </button>
                    <button
                      onClick={syncMembers}
                      className={cn(
                        "flex items-center justify-center gap-3 p-6 rounded-3xl border border-[#5A5A40]/20 text-[#5A5A40] transition-all text-sm font-bold uppercase tracking-widest",
                        isDarkMode ? "hover:bg-white/5" : "hover:bg-[#5A5A40]/5"
                      )}
                    >
                      <Users className="w-4 h-4" />
                      Repair Members List
                    </button>
                    {hasUndo && (
                      <button
                        onClick={undoShift}
                        className={cn(
                          "flex items-center justify-center gap-3 p-6 rounded-3xl border border-red-500/20 text-red-500 transition-all text-sm font-medium hover:bg-red-500/5"
                        )}
                      >
                        <RefreshCw className="w-4 h-4" />
                        Undo Last Shift
                      </button>
                    )}
                    <button className={cn(
                      "flex items-center justify-center gap-3 p-6 rounded-3xl border transition-all text-sm font-medium",
                      isDarkMode ? "border-white/10 hover:bg-white/5" : "border-black/5 hover:bg-[#5A5A40]/5"
                    )}>
                      <Users className="w-4 h-4" />
                      Add Member
                    </button>
                  </div>
                </div>

                <div className={cn(
                  "p-8 rounded-[40px] border space-y-6 relative overflow-hidden",
                  isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm"
                )}>
                  <AnimatePresence>
                    {shiftSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute inset-x-0 top-0 bg-emerald-500 text-white py-2 text-center text-[8px] uppercase tracking-widest font-bold z-10"
                      >
                        Schedule Shifted Successfully
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-[#5A5A40]">Declare Unexpected Holiday</h4>
                  </div>
                  <p className="text-[10px] opacity-40 leading-relaxed">
                    Use this when a meeting day is cancelled (e.g., rain). All roles for that day and future days will move forward to the next working day.
                  </p>
                  <form onSubmit={shiftSchedule} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 ml-4">Holiday Date</label>
                        <select
                          value={shiftForm.startDate}
                          onChange={(e) => setShiftForm(prev => ({ ...prev, startDate: e.target.value }))}
                          className={cn(
                            "w-full px-6 py-3 rounded-2xl border transition-all outline-none",
                            isDarkMode ? "bg-black/40 border-white/10 text-white" : "bg-[#F5F5F0] border-black/5 text-black"
                          )}
                        >
                          {dates.map(d => (
                            <option key={d} value={d}>{format(parseISO(d), 'MMM d, yyyy')}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 ml-4">Reason</label>
                        <input
                          type="text"
                          value={shiftForm.reason}
                          onChange={(e) => setShiftForm(prev => ({ ...prev, reason: e.target.value }))}
                          placeholder="e.g. Heavy Rain"
                          className={cn(
                            "w-full px-6 py-3 rounded-2xl border transition-all outline-none",
                            isDarkMode ? "bg-black/40 border-white/10 text-white" : "bg-[#F5F5F0] border-black/5 text-black"
                          )}
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isShifting}
                      className="w-full bg-amber-500 text-white py-3 rounded-2xl font-bold text-xs tracking-widest uppercase hover:bg-amber-600 transition-all disabled:opacity-50"
                    >
                      {isShifting ? 'Shifting Schedule...' : 'Declare Holiday & Shift Schedule'}
                    </button>
                  </form>
                </div>

                <div className={cn(
                  "p-8 rounded-[40px] border space-y-6 relative overflow-hidden",
                  isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm"
                )}>
                  <AnimatePresence>
                    {deleteMonthSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute inset-x-0 top-0 bg-red-500 text-white py-2 text-center text-[8px] uppercase tracking-widest font-bold z-10"
                      >
                        Month Schedule Deleted Successfully
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-5 h-5 text-red-500" />
                    <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-[#5A5A40]">Delete Month Schedule</h4>
                  </div>
                  <p className="text-[10px] opacity-40 leading-relaxed">
                    Clear all generated roles for a specific month. This will only remove 'scheduled' entries.
                  </p>
                  <form onSubmit={deleteMonthSchedule} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 ml-4">Month</label>
                        <select
                          value={deleteMonthForm.month}
                          onChange={(e) => setDeleteMonthForm(prev => ({ ...prev, month: e.target.value }))}
                          className={cn(
                            "w-full px-6 py-3 rounded-2xl border transition-all outline-none",
                            isDarkMode ? "bg-black/40 border-white/10 text-white" : "bg-[#F5F5F0] border-black/5 text-black"
                          )}
                        >
                          {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                            <option key={m} value={m}>{format(parseISO(`2026-${m}-01`), 'MMMM')}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 ml-4">Year</label>
                        <select
                          value={deleteMonthForm.year}
                          onChange={(e) => setDeleteMonthForm(prev => ({ ...prev, year: e.target.value }))}
                          className={cn(
                            "w-full px-6 py-3 rounded-2xl border transition-all outline-none",
                            isDarkMode ? "bg-black/40 border-white/10 text-white" : "bg-[#F5F5F0] border-black/5 text-black"
                          )}
                        >
                          {['2026', '2027'].map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isDeletingMonth}
                      className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold text-xs tracking-widest uppercase hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                    >
                      {isDeletingMonth ? 'Deleting...' : 'Delete Month Schedule'}
                    </button>
                  </form>
                </div>

                {Array.isArray(queries) && queries.length > 0 && (
                  <div className="space-y-8">
                    <div className="flex items-center gap-4">
                      <MessageSquare className="w-6 h-6 text-[#5A5A40]" />
                      <h3 className="text-2xl font-serif font-medium">Member Queries</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                      {queries.map((q) => (
                        <div
                          key={q.id}
                          className={cn(
                            "p-8 rounded-[40px] border space-y-4 relative overflow-hidden",
                            isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm",
                            q.status === 'resolved' && "opacity-50"
                          )}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-lg font-serif font-medium">{q.name}</h4>
                              <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Roll No: {q.rollNo}</p>
                            </div>
                            <span className={cn(
                              "text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-full",
                              q.status === 'resolved' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                            )}>
                              {q.status}
                            </span>
                          </div>
                          <p className="text-sm opacity-60 leading-relaxed">{q.message}</p>
                          <div className="flex justify-between items-center pt-4 border-t border-black/5">
                            <span className="text-[10px] font-mono opacity-30">{q.date}</span>
                            {q.status !== 'resolved' && (
                              <button
                                onClick={() => resolveQuery(q.id)}
                                className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40] hover:underline"
                              >
                                Mark as Resolved
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <section className="space-y-12 mt-12">
                  <div className="flex items-center gap-4">
                    <div className={cn("h-[1px] w-12", isDarkMode ? "bg-white/20" : "bg-[#5A5A40]")} />
                    <h3 className={cn("text-xs uppercase tracking-[0.4em] font-bold", isDarkMode ? "text-white/60" : "text-[#5A5A40]")}>Admin: Daily Theme</h3>
                  </div>
                  <div className={cn(
                    "p-8 md:p-12 rounded-[48px] border relative overflow-hidden",
                    isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-xl"
                  )}>
                    <AnimatePresence>
                      {themeSuccess && (
                        <motion.div
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="absolute inset-x-0 top-0 bg-emerald-500 text-white py-3 text-center text-xs uppercase tracking-widest font-bold z-10"
                        >
                          Theme Updated Successfully
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <form onSubmit={updateTheme} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <label className="text-xs uppercase tracking-widest font-bold opacity-40 ml-4">Select Date</label>
                          <select
                            value={themeForm.date}
                            onChange={(e) => setThemeForm(prev => ({ ...prev, date: e.target.value }))}
                            className={cn(
                              "w-full px-8 py-4 rounded-3xl border transition-all outline-none text-lg font-serif",
                              isDarkMode ? "bg-black/40 border-white/10 text-white" : "bg-[#F5F5F0] border-black/5 text-black"
                            )}
                          >
                            {dates.length > 0 ? dates.map(d => (
                              <option key={d} value={d}>{format(parseISO(d), 'EEEE, MMM d, yyyy')}</option>
                            )) : (
                              <option disabled>No dates available</option>
                            )}
                          </select>
                        </div>
                        <div className="space-y-3">
                          <label className="text-xs uppercase tracking-widest font-bold opacity-40 ml-4">Theme Name</label>
                          <input
                            type="text"
                            value={themeForm.theme}
                            onChange={(e) => setThemeForm(prev => ({ ...prev, theme: e.target.value }))}
                            placeholder="e.g. The Power of Vulnerability"
                            className={cn(
                              "w-full px-8 py-4 rounded-3xl border transition-all outline-none text-xl font-serif",
                              isDarkMode ? "bg-black/40 border-white/10 text-white" : "bg-[#F5F5F0] border-black/5 text-black"
                            )}
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={themeSubmitting || !themeForm.theme || dates.length === 0}
                        className="w-full bg-[#5A5A40] text-white py-6 rounded-3xl font-bold text-sm tracking-[0.2em] uppercase hover:bg-[#4A4A30] transition-all disabled:opacity-50 shadow-lg shadow-[#5A5A40]/20"
                      >
                        {themeSubmitting ? 'Updating...' : 'Set Theme for this Day'}
                      </button>
                    </form>
                  </div>
                </section>
              </div>
            )}
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="space-y-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              <div className="space-y-12">
                <h2 className="text-4xl md:text-6xl font-serif font-light tracking-tighter">Connect with <br /><span className="italic">Leadership</span></h2>
                <p className="opacity-60 text-lg font-serif italic max-w-md">Our executive committee is here to support your growth and ensure every meeting is a success.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { role: 'President', name: 'SAKTHI DIVASHKAR M', roll: '25UEC032' },
                  { role: 'VP Education (1)', name: 'YOGAHARANI A', roll: '25UEC083' },
                  { role: 'VP Education (2)', name: 'BOOPESH K V', roll: '25UEC052' },
                  { role: 'VP Public Relations (1)', name: 'SHARMILA J', roll: '25UEC014' },
                  { role: 'VP Public Relations (2)', name: 'ALLEN VICTOR A', roll: '25UEC004' },
                  { role: 'Secretary', name: 'SUJITHA J T', roll: '25UEC048' },
                  { role: 'Sergeant At Arms', name: 'SANTHOSHKANNA S', roll: '25UEC074' },
                  { role: 'Club Mentor', name: 'HARSHITHAA SHREE R', roll: '25UEC006' }
                ].map((leader, i) => (
                  <div key={i} className={cn("p-8 rounded-[40px] border flex flex-col justify-between group hover:border-[#5A5A40]/30 transition-all", isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm")}>
                    <div>
                      <p className="text-[8px] uppercase tracking-[0.3em] font-bold text-[#5A5A40] mb-4">{leader.role}</p>
                      <h4 className="text-lg font-serif font-medium leading-tight group-hover:italic transition-all">{leader.name}</h4>
                    </div>
                    <p className="text-[10px] font-mono opacity-30 mt-4">{leader.roll}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={cn("p-8 md:p-12 rounded-[48px] border", isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm")}>
              <h3 className="text-2xl font-serif font-medium mb-8">Queries & Suggestions</h3>
              <form onSubmit={submitQuery} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 ml-4">Name</label>
                    <input
                      type="text"
                      required
                      value={queryForm.name}
                      onChange={(e) => setQueryForm({ ...queryForm, name: e.target.value })}
                      placeholder="Your Name"
                      className={cn(
                        "w-full px-6 py-4 rounded-3xl border transition-all outline-none focus:ring-2 ring-[#5A5A40]/20",
                        isDarkMode ? "bg-black/40 border-white/10 text-white" : "bg-[#F5F5F0] border-black/5 text-black"
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 ml-4">Roll Number</label>
                    <input
                      type="text"
                      required
                      value={queryForm.rollNo}
                      onChange={(e) => setQueryForm({ ...queryForm, rollNo: e.target.value })}
                      placeholder="e.g. 25UEC001"
                      className={cn(
                        "w-full px-6 py-4 rounded-3xl border transition-all outline-none focus:ring-2 ring-[#5A5A40]/20",
                        isDarkMode ? "bg-black/40 border-white/10 text-white" : "bg-[#F5F5F0] border-black/5 text-black"
                      )}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 ml-4">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={queryForm.message}
                    onChange={(e) => setQueryForm({ ...queryForm, message: e.target.value })}
                    placeholder="Share your thoughts..."
                    className={cn(
                      "w-full px-6 py-4 rounded-3xl border transition-all outline-none focus:ring-2 ring-[#5A5A40]/20 resize-none",
                      isDarkMode ? "bg-black/40 border-white/10 text-white" : "bg-[#F5F5F0] border-black/5 text-black"
                    )}
                  />
                </div>
                <button
                  type="submit"
                  disabled={querySubmitting}
                  className="w-full bg-[#5A5A40] text-white py-4 rounded-3xl font-bold text-sm tracking-widest uppercase hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20 flex items-center justify-center gap-2"
                >
                  {querySubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {querySubmitting ? 'Sending...' : 'Send Message'}
                </button>
                {querySuccess && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-emerald-600 text-[10px] font-bold text-center uppercase tracking-widest"
                  >
                    Thank you! Your message has been shared with the admin.
                  </motion.p>
                )}
              </form>
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-black/5 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#5A5A40]" />
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-40 text-center md:text-left">
            ECE_B Toastmasters Club © 2026
          </span>
        </div>
        <div className="flex gap-6">
          <Users className="w-4 h-4 opacity-20" />
          <CalendarIcon className="w-4 h-4 opacity-20" />
          <Clock className="w-4 h-4 opacity-20" />
        </div>
      </footer>
    </div>
  );
}
