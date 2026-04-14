/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, logout, db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  serverTimestamp,
  Timestamp,
  getDoc,
  doc,
  setDoc,
  getDocFromServer,
  deleteDoc
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  TrendingDown, 
  TrendingUp, 
  LogOut, 
  Wallet, 
  Tag, 
  ChevronRight,
  AlertCircle,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  ShieldCheck,
  CreditCard,
  Target,
  History,
  LayoutDashboard,
  Search,
  MoreVertical
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
} from 'recharts';
import { format } from 'date-fns';
import { GoogleGenAI } from "@google/genai";
import { Expense, Income, Category, OperationType, UserProfile, Invitation } from './types';
import { handleFirestoreError } from './lib/firestoreUtils';

// --- Context ---
const AuthContext = createContext<{
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
} | null>(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

// --- Components ---

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true);
      setError(event.error);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-950 p-4 transition-colors duration-300">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-[40px] shadow-xl max-w-md w-full text-center border border-red-100 dark:border-red-900">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Something went wrong</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error?.message.startsWith('{') ? "Access denied. You might not have an invitation." : error?.message || "An unexpected error occurred."}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-500 text-white px-8 py-3 rounded-full font-bold hover:bg-red-600 transition-all active:scale-95"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const Login = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDF7FF] dark:bg-[#121212] p-4 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 p-12 rounded-[48px] shadow-2xl max-w-md w-full text-center border border-purple-100 dark:border-purple-900/30"
      >
        <div className="w-24 h-24 bg-purple-600 rounded-[32px] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-purple-200 dark:shadow-none">
          <Wallet className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">Payground</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-12 text-lg leading-relaxed font-medium">
          The expressive way to manage your LKR wealth.
        </p>
        <button 
          onClick={signInWithGoogle}
          className="w-full bg-purple-600 text-white py-5 rounded-[24px] font-black text-lg hover:bg-purple-700 transition-all shadow-xl shadow-purple-100 dark:shadow-none flex items-center justify-center gap-4 active:scale-95"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-7 h-7 bg-white rounded-full p-1.5" alt="Google" />
          Sign in with Google
        </button>
        <p className="mt-8 text-sm text-gray-400 dark:text-gray-500">
          Invitation only. Contact admin for access.
        </p>
      </motion.div>
    </div>
  );
};

const Dashboard = () => {
  const { user, profile } = useAuth();
  const [view, setView] = useState<'dashboard' | 'admin'>('dashboard');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isAddingIncome, setIsAddingIncome] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), where('userId', '==', user.uid), orderBy('date', 'desc')), 
      (s) => setExpenses(s.docs.map(d => ({ id: d.id, ...d.data() } as Expense))),
      (e) => handleFirestoreError(e, OperationType.LIST, 'expenses'));

    const unsubIncome = onSnapshot(query(collection(db, 'income'), where('userId', '==', user.uid), orderBy('date', 'desc')), 
      (s) => setIncome(s.docs.map(d => ({ id: d.id, ...d.data() } as Income))),
      (e) => handleFirestoreError(e, OperationType.LIST, 'income'));

    const unsubCategories = onSnapshot(query(collection(db, 'categories'), where('userId', '==', user.uid)), 
      (s) => setCategories(s.docs.map(d => ({ id: d.id, ...d.data() } as Category))),
      (e) => handleFirestoreError(e, OperationType.LIST, 'categories'));

    let unsubInvitations = () => {};
    if (profile?.role === 'admin') {
      unsubInvitations = onSnapshot(collection(db, 'invitations'), 
        (s) => setInvitations(s.docs.map(d => ({ id: d.id, ...d.data() } as Invitation))),
        (e) => console.error("Invitation fetch error", e));
    }

    return () => {
      unsubExpenses();
      unsubIncome();
      unsubCategories();
      unsubInvitations();
    };
  }, [user, profile]);

  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalIncome = income.reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpenses;

  const generateAIInsight = async () => {
    if (!user) return;
    setIsGeneratingInsight(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = "gemini-3-flash-preview";
      const expenseSummary = expenses.map(e => `${e.category}: LKR ${e.amount}`).join(', ');
      const incomeSummary = income.map(i => `${i.source}: LKR ${i.amount}`).join(', ');
      const prompt = `As a Sri Lankan financial expert, analyze this monthly data in LKR:
      Income: ${incomeSummary} (Total: LKR ${totalIncome})
      Expenses: ${expenseSummary} (Total: LKR ${totalExpenses})
      Provide 3 concise, actionable insights to improve savings in the current Sri Lankan economy. Keep it under 100 words.`;
      const response = await ai.models.generateContent({ model, contents: prompt });
      setAiInsight(response.text || "No insights available.");
    } catch (error) {
      setAiInsight("Failed to generate insights.");
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  const deleteInvitation = async (id: string) => {
    if (profile?.role !== 'admin') return;
    try {
      await deleteDoc(doc(db, 'invitations', id));
    } catch (error) {
      console.error("Delete invitation error", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF7FF] dark:bg-[#0A0A0A] pb-32 transition-colors duration-300">
      {/* Top Bar */}
      <div className="px-6 pt-8 pb-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white">
            {view === 'dashboard' ? 'Payground' : 'Admin Settings'}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {profile?.role === 'admin' && (
            <button 
              onClick={() => setView(view === 'dashboard' ? 'admin' : 'dashboard')} 
              className={`p-2.5 rounded-full transition-all ${view === 'admin' ? 'bg-purple-600 text-white' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}`}
            >
              <ShieldCheck className="w-5 h-5" />
            </button>
          )}
          <img src={user?.photoURL || ''} className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 shadow-sm" alt="Profile" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'dashboard' ? (
          <motion.main 
            key="dashboard"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="px-6 space-y-8"
          >
            {/* Main Card - Expressive Material 3 */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-purple-400 dark:bg-purple-600 p-8 rounded-[48px] text-black dark:text-white shadow-2xl shadow-purple-200 dark:shadow-none relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <p className="font-bold opacity-70">Available cash</p>
                  <p className="font-mono text-sm opacity-50">••• {user?.uid.slice(-4)}</p>
                </div>
                <h1 className="text-6xl font-black mb-10 tracking-tighter">
                  <span className="text-3xl font-bold mr-1">LKR</span>
                  {balance.toLocaleString()}
                </h1>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsAddingIncome(true)}
                    className="flex-1 bg-white/20 dark:bg-black/20 backdrop-blur-xl py-4 rounded-[24px] font-black text-sm hover:bg-white/30 transition-all active:scale-95"
                  >
                    Add money
                  </button>
                  <button 
                    onClick={() => setIsAddingExpense(true)}
                    className="flex-1 bg-white/20 dark:bg-black/20 backdrop-blur-xl py-4 rounded-[24px] font-black text-sm hover:bg-white/30 transition-all active:scale-95"
                  >
                    Transfer
                  </button>
                  <div className="w-16 bg-white/20 dark:bg-black/20 backdrop-blur-xl rounded-[24px] flex items-center justify-center">
                    <CreditCard className="w-6 h-6" />
                  </div>
                </div>
              </div>
              {/* Decorative shapes */}
              <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute -left-10 -top-10 w-48 h-48 bg-purple-300/20 rounded-full blur-3xl"></div>
            </motion.div>

            {/* Quick Actions / Favorites */}
            <section>
              <div className="flex items-center gap-2 mb-4 px-2">
                <div className="bg-purple-100 dark:bg-purple-900/30 px-4 py-2 rounded-full flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-black text-purple-600 uppercase tracking-widest">Cards & passes</span>
                  <span className="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full">3</span>
                </div>
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6 px-2">Favorites</h3>
              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                <FavoriteItem icon={<TrendingUp />} label="Deposit" color="bg-purple-50 dark:bg-purple-900/20" onClick={() => setIsAddingIncome(true)} />
                <FavoriteItem icon={<Target />} label="Goals" color="bg-pink-50 dark:bg-pink-900/20" onClick={() => setIsAddingCategory(true)} />
                <FavoriteItem icon={<ShieldCheck />} label="Credit score" color="bg-blue-50 dark:bg-blue-900/20" onClick={() => alert("Credit score feature coming soon!")} />
                <div className="flex flex-col items-center gap-2 min-w-[70px]">
                  <img src="https://picsum.photos/seed/pia/100" className="w-16 h-16 rounded-full object-cover grayscale" alt="Pia" />
                  <span className="text-xs font-bold text-gray-500">Pia</span>
                </div>
                <div className="flex flex-col items-center gap-2 min-w-[70px]">
                  <img src="https://picsum.photos/seed/marty/100" className="w-16 h-16 rounded-full object-cover grayscale" alt="Marty" />
                  <span className="text-xs font-bold text-gray-500">Marty</span>
                </div>
              </div>
            </section>

            {/* AI Insights Section */}
            <section className="bg-white dark:bg-gray-900 p-8 rounded-[40px] border border-purple-50 dark:border-purple-900/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-purple-500" /> AI Insights
                </h3>
                <button onClick={generateAIInsight} disabled={isGeneratingInsight} className="text-purple-600 font-black text-sm uppercase tracking-wider">
                  {isGeneratingInsight ? "Thinking..." : "Refresh"}
                </button>
              </div>
              <AnimatePresence mode="wait">
                {aiInsight ? (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium italic">
                    "{aiInsight}"
                  </motion.p>
                ) : (
                  <p className="text-gray-400 text-center py-4 font-medium">Get personalized Sri Lankan financial advice.</p>
                )}
              </AnimatePresence>
            </section>

            {/* Recent Activity */}
            <section className="bg-white dark:bg-gray-900 rounded-[48px] p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">Payments</h3>
                <MoreVertical className="w-6 h-6 text-gray-400" />
              </div>
              <div className="space-y-6">
                {[...expenses, ...income]
                  .sort((a, b) => b.date.seconds - a.date.seconds)
                  .slice(0, 8)
                  .map((item, i) => {
                    const isExpense = 'category' in item;
                    return (
                      <div key={i} className="flex items-center justify-between group">
                        <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-[24px] flex items-center justify-center ${isExpense ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-500' : 'bg-green-50 dark:bg-green-900/20 text-green-500'}`}>
                            {isExpense ? <ArrowUpRight className="w-7 h-7" /> : <ArrowDownRight className="w-7 h-7" />}
                          </div>
                          <div>
                            <p className="font-black text-lg text-gray-900 dark:text-white">{isExpense ? item.category : item.source}</p>
                            <p className="text-sm font-bold text-gray-400">{format(item.date.toDate(), 'MMM dd, HH:mm')}</p>
                          </div>
                        </div>
                        <p className={`text-xl font-black ${isExpense ? 'text-pink-500' : 'text-green-500'}`}>
                          {isExpense ? '-' : '+'}{item.amount.toLocaleString()}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </section>
          </motion.main>
        ) : (
          <motion.main 
            key="admin"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-6 space-y-8"
          >
            <section className="bg-white dark:bg-gray-900 rounded-[48px] p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">User Invitations</h3>
                <button 
                  onClick={() => setIsInviting(true)}
                  className="bg-purple-600 text-white px-6 py-3 rounded-full font-black text-sm flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" /> Invite User
                </button>
              </div>
              <div className="space-y-4">
                {invitations.length > 0 ? invitations.map((invite, i) => (
                  <div key={i} className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800/50 rounded-[32px]">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center">
                        <UserPlus className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-black text-gray-900 dark:text-white">{invite.email}</p>
                        <p className={`text-xs font-bold uppercase tracking-widest ${invite.status === 'accepted' ? 'text-green-500' : 'text-orange-500'}`}>
                          {invite.status}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => invite.id && deleteInvitation(invite.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                    >
                      <AlertCircle className="w-5 h-5" />
                    </button>
                  </div>
                )) : (
                  <p className="text-center py-12 text-gray-400 font-medium">No invitations sent yet.</p>
                )}
              </div>
            </section>

            <section className="bg-purple-50 dark:bg-purple-900/10 p-8 rounded-[40px] border border-purple-100 dark:border-purple-900/20">
              <h4 className="text-lg font-black text-purple-900 dark:text-purple-100 mb-4">Admin Notice</h4>
              <p className="text-sm text-purple-700 dark:text-purple-300 leading-relaxed">
                As an admin, you can manage who has access to the Payground app. 
                Invited users will receive an automated email notification (simulated) 
                and can log in using their Google account once their email is added to the invitation list.
              </p>
            </section>
          </motion.main>
        )}
      </AnimatePresence>

      {/* Bottom Nav Simulation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-black/80 backdrop-blur-2xl px-10 py-6 flex justify-between items-center border-t border-gray-100 dark:border-gray-800 z-40">
        <button onClick={() => alert("Dashboard is active")}><LayoutDashboard className="w-7 h-7 text-purple-600" /></button>
        <button onClick={() => alert("Search coming soon")}><Search className="w-7 h-7 text-gray-400" /></button>
        <div className="relative">
          <button 
            onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
            className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-purple-200 dark:shadow-none -mt-12 active:scale-90 transition-transform"
          >
            <Plus className={`w-8 h-8 text-white transition-transform ${isQuickAddOpen ? 'rotate-45' : ''}`} />
          </button>
          <AnimatePresence>
            {isQuickAddOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.8 }}
                className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-2xl border border-purple-50 dark:border-purple-900/20 flex flex-col gap-2 min-w-[160px]"
              >
                <button onClick={() => { setIsAddingExpense(true); setIsQuickAddOpen(false); }} className="flex items-center gap-3 p-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-2xl text-gray-700 dark:text-gray-200 font-bold">
                  <ArrowUpRight className="w-5 h-5 text-pink-500" /> Expense
                </button>
                <button onClick={() => { setIsAddingIncome(true); setIsQuickAddOpen(false); }} className="flex items-center gap-3 p-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-2xl text-gray-700 dark:text-gray-200 font-bold">
                  <ArrowDownRight className="w-5 h-5 text-green-500" /> Income
                </button>
                <button onClick={() => { setIsAddingCategory(true); setIsQuickAddOpen(false); }} className="flex items-center gap-3 p-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-2xl text-gray-700 dark:text-gray-200 font-bold">
                  <Target className="w-5 h-5 text-purple-500" /> Category
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button onClick={() => alert("History coming soon")}><History className="w-7 h-7 text-gray-400" /></button>
        <button onClick={logout}><LogOut className="w-7 h-7 text-gray-400" /></button>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {(isAddingExpense || isAddingIncome || isInviting || isAddingCategory) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[48px] p-10 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-3xl font-black text-gray-900 dark:text-white">
                  {isAddingExpense ? 'Expense' : isAddingIncome ? 'Income' : isInviting ? 'Invite' : 'Category'}
                </h3>
                <button onClick={() => { setIsAddingExpense(false); setIsAddingIncome(false); setIsInviting(false); setIsAddingCategory(false); }} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <ChevronRight className="w-6 h-6 rotate-90" />
                </button>
              </div>
              {isAddingExpense && <ExpenseForm onComplete={() => setIsAddingExpense(false)} categories={categories} />}
              {isAddingIncome && <IncomeForm onComplete={() => setIsAddingIncome(false)} />}
              {isInviting && <InviteForm onComplete={() => setIsInviting(false)} />}
              {isAddingCategory && <CategoryForm onComplete={() => setIsAddingCategory(false)} />}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FavoriteItem = ({ icon, label, color, onClick }: { icon: React.ReactNode, label: string, color: string, onClick?: () => void }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-3 min-w-[80px] active:scale-95 transition-transform">
    <div className={`w-16 h-16 ${color} rounded-[28px] flex items-center justify-center text-purple-600`}>
      {React.cloneElement(icon as React.ReactElement, { className: "w-7 h-7" })}
    </div>
    <span className="text-xs font-black text-gray-500 uppercase tracking-tighter">{label}</span>
  </button>
);

const ExpenseForm = ({ onComplete, categories }: { onComplete: () => void, categories: Category[] }) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || !category) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'expenses'), {
        userId: user.uid,
        amount: parseFloat(amount),
        category,
        date: Timestamp.now(),
        createdAt: serverTimestamp()
      });
      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'expenses');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-[24px] p-6 text-3xl font-black focus:ring-4 focus:ring-purple-500/20" placeholder="0.00" />
      <select required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-[24px] p-6 font-black focus:ring-4 focus:ring-purple-500/20">
        <option value="">Select Category</option>
        {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
        <option value="Food">Food</option>
        <option value="Transport">Transport</option>
        <option value="Leisure">Leisure</option>
      </select>
      <button type="submit" disabled={loading} className="w-full bg-purple-600 text-white py-6 rounded-[24px] font-black text-xl shadow-xl shadow-purple-200 dark:shadow-none disabled:opacity-50">
        {loading ? 'Processing...' : 'Confirm'}
      </button>
    </form>
  );
};

const IncomeForm = ({ onComplete }: { onComplete: () => void }) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || !source) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'income'), {
        userId: user.uid,
        amount: parseFloat(amount),
        source,
        date: Timestamp.now(),
        createdAt: serverTimestamp()
      });
      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'income');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-[24px] p-6 text-3xl font-black focus:ring-4 focus:ring-green-500/20" placeholder="0.00" />
      <input type="text" required value={source} onChange={(e) => setSource(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-[24px] p-6 font-black focus:ring-4 focus:ring-green-500/20" placeholder="Source (e.g. Salary)" />
      <button type="submit" disabled={loading} className="w-full bg-green-500 text-white py-6 rounded-[24px] font-black text-xl shadow-xl shadow-green-200 dark:shadow-none disabled:opacity-50">
        {loading ? 'Processing...' : 'Confirm'}
      </button>
    </form>
  );
};

const InviteForm = ({ onComplete }: { onComplete: () => void }) => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !email) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'invitations', email.toLowerCase()), {
        email: email.toLowerCase(),
        invitedBy: user.uid,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      onComplete();
    } catch (error) {
      alert("Failed to invite. You must be an admin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-[24px] p-6 font-black focus:ring-4 focus:ring-purple-500/20" placeholder="user@example.com" />
      <button type="submit" disabled={loading} className="w-full bg-purple-600 text-white py-6 rounded-[24px] font-black text-xl disabled:opacity-50">
        {loading ? 'Inviting...' : 'Send Invite'}
      </button>
    </form>
  );
};

const CategoryForm = ({ onComplete }: { onComplete: () => void }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name || !budget) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'categories'), {
        userId: user.uid,
        name,
        budget: parseFloat(budget),
        createdAt: serverTimestamp()
      });
      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'categories');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-[24px] p-6 font-black focus:ring-4 focus:ring-purple-500/20" placeholder="Category Name" />
      <input type="number" required value={budget} onChange={(e) => setBudget(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-[24px] p-6 font-black focus:ring-4 focus:ring-purple-500/20" placeholder="Monthly Budget" />
      <button type="submit" disabled={loading} className="w-full bg-purple-600 text-white py-6 rounded-[24px] font-black text-xl disabled:opacity-50">
        {loading ? 'Adding...' : 'Add Category'}
      </button>
    </form>
  );
};

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          // Check if invited or is the first admin
          const isAdminEmail = user.email === "ravindijason@gmail.com";
          const inviteRef = doc(db, 'invitations', user.email?.toLowerCase() || '');
          const inviteSnap = await getDoc(inviteRef);

          if (isAdminEmail || inviteSnap.exists()) {
            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName,
              email: user.email,
              currency: 'LKR',
              role: isAdminEmail ? 'admin' : 'user',
              isInvited: true,
              createdAt: serverTimestamp()
            };
            await setDoc(userRef, newProfile);
            if (inviteSnap.exists()) {
              await setDoc(inviteRef, { status: 'accepted' }, { merge: true });
            }
            setProfile(newProfile);
          } else {
            console.warn("Access denied: Email not in invitation list.");
            await logout();
            alert("No invitation found for this email. Please contact the administrator.");
            setProfile(null);
            setUser(null);
            setLoading(false);
            return;
          }
        } else {
          const existingProfile = userSnap.data() as UserProfile;
          // Re-verify invitation status even if profile exists (for revocation support)
          const isAdminEmail = user.email === "ravindijason@gmail.com";
          const inviteRef = doc(db, 'invitations', user.email?.toLowerCase() || '');
          const inviteSnap = await getDoc(inviteRef);

          if (isAdminEmail || inviteSnap.exists()) {
            setProfile(existingProfile);
          } else {
            console.warn("Access revoked: Invitation no longer valid.");
            await logout();
            alert("Your access has been revoked or your invitation is no longer valid.");
            setProfile(null);
            setUser(null);
          }
        }
      } else {
        setProfile(null);
      }
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

function AuthContent() {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FDF7FF] dark:bg-[#0A0A0A]"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full" /></div>;
  // Dashboard is ONLY accessible if BOTH user AND profile exist
  return (user && profile) ? <Dashboard /> : <Login />;
}
