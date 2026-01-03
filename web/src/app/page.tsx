"use client";

import { 
  TrendingDown, Wallet, RefreshCw, Trash2, Zap, TrendingUp, 
  Edit2, Save, X, Calendar, ChevronLeft, ChevronRight, Lock, 
  Plus, User, Key, ArrowUpRight, ArrowDownRight, CreditCard, 
  Bot, Send, Menu, Target, CheckCircle, Settings, Download, Moon, Sun
} from 'lucide-react';
import { useEffect, useState, useRef } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Registra componentes do gráfico
ChartJS.register(ArcElement, Tooltip, Legend);

export default function Home() {
  // ==========================================
  // ESTADOS GERAIS
  // ==========================================
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // TEMA (Padrão Dark)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // ==========================================
  // DADOS DO SISTEMA
  // ==========================================
  const [data, setData] = useState({ 
    balance: 0, 
    expenses: 0, 
    invested_total: 0, 
    portfolio_value: 0, 
    transactions: [], 
    investments: [], 
    categories: {} 
  });
  const [cards, setCards] = useState([]); 
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  // ==========================================
  // ESTADOS DA IA
  // ==========================================
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<null | HTMLDivElement>(null);

  // ==========================================
  // ESTADOS DOS MODAIS
  // ==========================================
  const [showModal, setShowModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false); 
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState<{show: boolean, goalId: number | null, current: number}>({
    show: false, goalId: null, current: 0
  });

  // ==========================================
  // INPUTS DE FORMULÁRIOS
  // ==========================================
  const [newItem, setNewItem] = useState({ 
    type: 'expense', desc: '', amount: '', price: '', cat: 'Outros', paymentMethod: 'cash', cardId: '' 
  });
  const [newCard, setNewCard] = useState({ name: '', limit: '' });
  const [newGoal, setNewGoal] = useState({ name: '', target: '', current: '', deadline: '' });
  const [depositAmount, setDepositAmount] = useState("");

  // ==========================================
  // ESTADOS DE EDIÇÃO
  // ==========================================
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCat, setEditCat] = useState("");

  // Helper de Data
  const getMonthStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // ==========================================
  // BUSCA DE DADOS (FETCH)
  // ==========================================
  const fetchDashboard = async () => {
    try {
      if (!editingId && isAuthenticated) {
        // Dashboard
        const resDash = await fetch(`https://zenith-finance-1.onrender.com/dashboard?month=${getMonthStr(currentDate)}`);
        setData(await resDash.json());
        
        // Cartões
        const resCards = await fetch(`https://zenith-finance-1.onrender.com/cards`);
        setCards(await resCards.json());

        // Metas
        const resGoals = await fetch(`https://zenith-finance-1.onrender.com/goals`);
        setGoals(await resGoals.json());
        
        setLoading(false);
      }
    } catch (error) { console.error(error); }
  };

  // ==========================================
  // FUNÇÃO GERAR PDF
  // ==========================================
  const generatePDF = async () => {
    const element = document.getElementById('report-content');
    if (!element) return;
    
    const btn = document.getElementById('btn-pdf');
    if(btn) btn.innerText = "Gerando...";

    try {
        const canvas = await html2canvas(element, { 
            scale: 2, 
            backgroundColor: theme === 'dark' ? '#050505' : '#ffffff' 
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Zenith_Relatorio_${getMonthStr(currentDate)}.pdf`);
    } catch (err) {
        alert("Erro ao gerar PDF");
    }

    if(btn) btn.innerHTML = "📥 BAIXAR RELATÓRIO PDF";
  };

  // ==========================================
  // AÇÕES CRUD (CRIAR / DELETAR / EDITAR)
  // ==========================================
  
  const handleCreateGoal = async (e: any) => {
    e.preventDefault();
    await fetch('https://zenith-finance-1.onrender.com/goals', {
        method: 'POST', 
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            name: newGoal.name, 
            target: parseFloat(newGoal.target), 
            current: parseFloat(newGoal.current || "0"), 
            deadline: newGoal.deadline 
        })
    });
    setShowGoalModal(false); 
    setNewGoal({name:'', target:'', current:'', deadline:''}); 
    fetchDashboard();
  }

  const handleDepositGoal = async (e: any) => {
    e.preventDefault();
    if (!showDepositModal.goalId) return;
    const newTotal = showDepositModal.current + parseFloat(depositAmount);
    
    await fetch(`https://zenith-finance-1.onrender.com/goals/${showDepositModal.goalId}`, {
        method: 'PUT', 
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ current: newTotal })
    });
    setShowDepositModal({show: false, goalId: null, current: 0}); 
    setDepositAmount(""); 
    fetchDashboard();
  }
  
  const deleteGoal = async (id: number) => {
     if(!confirm("Excluir meta?")) return;
     await fetch(`https://zenith-finance-1.onrender.com/goals/${id}`, { method: 'DELETE' }); 
     fetchDashboard();
  }

  const handleCreateCard = async (e: any) => {
    e.preventDefault();
    await fetch('https://zenith-finance-1.onrender.com/cards', {
        method: 'POST', 
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name: newCard.name, limit_amount: parseFloat(newCard.limit) })
    });
    setShowCardModal(false); 
    setNewCard({name:'', limit:''}); 
    fetchDashboard();
  }
  
  const handleCreate = async (e: any) => {
    e.preventDefault(); 
    const dateStr = `${getMonthStr(currentDate)}-01`; 
    try {
        if (newItem.type === 'investment') {
            await fetch('https://zenith-finance-1.onrender.com/investments', { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({ 
                    ticker: newItem.desc, 
                    quantity: parseFloat(newItem.amount), 
                    price: parseFloat(newItem.price || "0"), 
                    date: dateStr 
                }) 
            });
        } else {
            const isCard = newItem.paymentMethod === 'credit';
            const amount = newItem.type === 'income' ? parseFloat(newItem.amount) : -parseFloat(newItem.amount);
            
            await fetch('https://zenith-finance-1.onrender.com/transactions', { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({ 
                    description: newItem.desc, 
                    amount, 
                    category: newItem.cat, 
                    date: dateStr, 
                    card_id: isCard ? parseInt(newItem.cardId) : null 
                }) 
            });
        }
        setShowModal(false); 
        setNewItem({ type: 'expense', desc: '', amount: '', price: '', cat: 'Outros', paymentMethod: 'cash', cardId: '' }); 
        fetchDashboard();
    } catch (error) { alert("Erro ao salvar."); }
  };

  const deleteItem = async (type: string, id: number) => { 
    if (!confirm("Deletar registro?")) return; 
    await fetch(`https://zenith-finance-1.onrender.com/${type}/${id}`, { method: 'DELETE' }); 
    fetchDashboard(); 
  };

  const startEditing = (item: any, type: string) => { 
    setEditingId(item.id); 
    if (type === 'investments') { 
        setEditDesc(item.ticker); 
        setEditAmount(item.quantity.toString()); 
        setEditPrice((item.purchase_price || 0).toString()); 
    } else { 
        setEditDesc(item.description); 
        setEditAmount(item.amount.toString()); 
        setEditCat(item.category || "Outros"); 
    } 
  };

  const saveEdit = async () => { 
    if (!editingId) return; 
    const isInvest = activeTab === 'investments'; 
    const endpoint = isInvest ? 'investments' : 'transactions'; 
    const body = isInvest 
        ? { ticker: editDesc, quantity: parseFloat(editAmount), price: parseFloat(editPrice) } 
        : { description: editDesc, amount: parseFloat(editAmount), category: editCat }; 
    
    await fetch(`https://zenith-finance-1.onrender.com/${endpoint}/${editingId}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(body) 
    }); 
    setEditingId(null); 
    fetchDashboard(); 
  };

  const handleSendMessage = async (e: any) => {
    e.preventDefault();
    if(!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput(""); 
    setAiLoading(true);

    try {
        const res = await fetch('https://zenith-finance-1.onrender.com/chat', { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({ message: userMsg }) 
        });
        const json = await res.json();
        setChatHistory(prev => [...prev, { role: 'ai', text: json.response }]);
    } catch { 
        setChatHistory(prev => [...prev, { role: 'ai', text: "Erro ao conectar com o cérebro." }]); 
    }
    setAiLoading(false);
  };
  
  // ==========================================
  // EFEITOS (UseEffect)
  // ==========================================
  useEffect(() => { 
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [chatHistory]);
  
  useEffect(() => { 
    if(isAuthenticated) { 
        fetchDashboard(); 
        const interval = setInterval(fetchDashboard, 10000); 
        return () => clearInterval(interval); 
    } 
  }, [isAuthenticated, editingId, currentDate]);

  const changeMonth = (offset: number) => { 
    const newDate = new Date(currentDate); 
    newDate.setMonth(newDate.getMonth() + offset); 
    setCurrentDate(newDate); 
    setLoading(true); 
  };

  const navigate = (tab: string) => { 
    setActiveTab(tab); 
    setIsMobileOpen(false); 
  }

  // Se não autenticado, mostra Login
  if (!isAuthenticated) return <LoginPage onLogin={() => setIsAuthenticated(true)} theme={theme} />;

  // ==========================================
  // PREPARAÇÃO DE VARIÁVEIS DE TEMA
  // ==========================================
  const isDark = theme === 'dark';
  
  // Cores de Fundo
  const bgMain = isDark ? "bg-cyber-darkest" : "bg-gray-100";
  const bgCard = isDark ? "bg-cyber-dark border-white/10" : "bg-white border-gray-200 shadow-sm";
  const bgInput = isDark ? "bg-black/50 border-white/20 text-white" : "bg-gray-50 border-gray-300 text-gray-900";
  
  // Cores de Texto
  const textMain = isDark ? "text-white" : "text-gray-800";
  const textSub = isDark ? "text-gray-400" : "text-gray-500";
  
  // Dados do Gráfico
  const chartData = { 
    labels: Object.keys(data.categories), 
    datasets: [{ 
        data: Object.values(data.categories), 
        backgroundColor: ['#ff0055', '#00f3ff', '#00ff9f', '#fcee0a', '#bc13fe'], 
        borderColor: isDark ? '#000' : '#fff', 
        borderWidth: 2 
    }], 
  };

  return (
    <main className={`min-h-screen font-sans ${bgMain} ${textMain} md:pl-64 transition-all duration-300`} style={{ fontFamily: 'var(--font-rajdhani)' }}>
      
      {/* ========================================== */}
      {/* MOBILE HEADER */}
      {/* ========================================== */}
      <div className={`md:hidden fixed top-0 left-0 right-0 h-16 ${isDark ? 'bg-cyber-dark border-white/10' : 'bg-white border-gray-200'} border-b flex items-center justify-between px-4 z-40 shadow-lg`}>
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-cyber-blue rounded flex items-center justify-center">
                <Zap size={18} className="text-black"/>
            </div>
            <h1 className="font-bold font-orbitron tracking-wider">ZENITH</h1>
         </div>
         <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="p-2 hover:text-cyber-blue">
            <Menu size={28}/>
         </button>
      </div>
      
      {/* Overlay Mobile */}
      {isMobileOpen && <div onClick={()=>setIsMobileOpen(false)} className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm" />}

      {/* ========================================== */}
      {/* SIDEBAR (Barra Lateral) */}
      {/* ========================================== */}
      <aside className={`fixed inset-y-0 left-0 w-64 ${isDark ? 'bg-cyber-dark border-white/5' : 'bg-white border-gray-200'} border-r flex flex-col p-6 z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-cyber-blue rounded-lg flex items-center justify-center shadow-[0_0_15px_#00f3ff]">
                <Zap size={24} className="text-black" />
            </div>
            <h1 className={`text-2xl font-bold font-orbitron tracking-wider ${textMain}`}>ZENITH</h1>
        </div>
        
        <nav className="space-y-2 flex-1">
            <SidebarBtn icon={<Wallet size={20}/>} label="Dashboard" active={activeTab==='dashboard'} onClick={()=>navigate('dashboard')} isDark={isDark}/>
            <SidebarBtn icon={<TrendingUp size={20}/>} label="Investimentos" active={activeTab==='investments'} onClick={()=>navigate('investments')} isDark={isDark}/>
            <SidebarBtn icon={<CreditCard size={20}/>} label="Cartões" active={activeTab==='cards'} onClick={()=>navigate('cards')} isDark={isDark}/>
            <SidebarBtn icon={<Target size={20}/>} label="Metas" active={activeTab==='goals'} onClick={()=>navigate('goals')} isDark={isDark}/>
            <SidebarBtn icon={<Bot size={20}/>} label="AI Advisor" active={activeTab==='ai'} onClick={()=>navigate('ai')} isDark={isDark}/>
            <SidebarBtn icon={<RefreshCw size={20}/>} label="Relatórios" active={activeTab==='reports'} onClick={()=>navigate('reports')} isDark={isDark}/>
        </nav>
        
        <div className={`pt-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
             <SidebarBtn icon={<Settings size={20}/>} label="Configurações" active={activeTab==='settings'} onClick={()=>navigate('settings')} isDark={isDark}/>
        </div>
      </aside>
      
      {/* ========================================== */}
      {/* MODAL GASTO/INVESTIMENTO */}
      {/* ========================================== */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
            <motion.div initial={{scale:0.9}} animate={{scale:1}} className={`${isDark ? 'bg-cyber-dark border-cyber-blue' : 'bg-white border-gray-300'} p-6 md:p-8 rounded-2xl border w-full max-w-md shadow-2xl`}>
                <h3 className={`text-xl font-bold mb-6 font-orbitron text-center ${textMain}`}>NOVO REGISTRO</h3>
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="text-xs text-cyber-blue font-bold tracking-widest block mb-1">TIPO</label>
                        <select className={`w-full ${bgInput} border rounded p-3 focus:border-cyber-blue outline-none`} value={newItem.type} onChange={e=>setNewItem({...newItem, type: e.target.value})}>
                            <option value="expense">💸 Gasto</option>
                            <option value="income">💰 Entrada</option>
                            <option value="investment">📈 Investimento</option>
                        </select>
                    </div>

                    {newItem.type === 'investment' ? (
                        <>
                            <div>
                                <label className="text-xs text-cyber-green font-bold tracking-widest block mb-1">TICKER</label>
                                <input required className={`w-full ${bgInput} border rounded p-3 uppercase`} value={newItem.desc} onChange={e=>setNewItem({...newItem, desc: e.target.value.toUpperCase()})} placeholder="PETR4.SA" />
                            </div>
                            <div className="flex gap-2">
                                <input required type="number" className={`w-full ${bgInput} border rounded p-3`} value={newItem.amount} onChange={e=>setNewItem({...newItem, amount: e.target.value})} placeholder="Qtd" />
                                <input required type="number" className={`w-full ${bgInput} border rounded p-3`} value={newItem.price} onChange={e=>setNewItem({...newItem, price: e.target.value})} placeholder="Preço" />
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="text-xs text-cyber-blue font-bold tracking-widest block mb-1">DESCRIÇÃO</label>
                                <input required className={`w-full ${bgInput} border rounded p-3`} value={newItem.desc} onChange={e=>setNewItem({...newItem, desc: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs text-cyber-blue font-bold tracking-widest block mb-1">VALOR (R$)</label>
                                <input required type="number" step="0.01" className={`w-full ${bgInput} border rounded p-3`} value={newItem.amount} onChange={e=>setNewItem({...newItem, amount: e.target.value})} />
                            </div>
                            {newItem.type === 'expense' && (
                                <>
                                    <div>
                                        <label className="text-xs text-cyber-blue font-bold tracking-widest block mb-1">PAGAMENTO</label>
                                        <select className={`w-full ${bgInput} border rounded p-3`} value={newItem.paymentMethod} onChange={e=>setNewItem({...newItem, paymentMethod: e.target.value})}>
                                            <option value="cash">💵 Dinheiro / Pix</option>
                                            <option value="credit">💳 Cartão de Crédito</option>
                                        </select>
                                    </div>
                                    {newItem.paymentMethod === 'credit' && (
                                        <div>
                                            <label className="text-xs text-cyber-blue font-bold tracking-widest block mb-1">CARTÃO</label>
                                            <select required className={`w-full ${bgInput} border rounded p-3`} value={newItem.cardId} onChange={e=>setNewItem({...newItem, cardId: e.target.value})}>
                                                <option value="">Selecione...</option>
                                                {cards.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-xs text-cyber-blue font-bold tracking-widest block mb-1">CATEGORIA</label>
                                        <select className={`w-full ${bgInput} border rounded p-3`} value={newItem.cat} onChange={e=>setNewItem({...newItem, cat: e.target.value})}>
                                            <option>Alimentação</option>
                                            <option>Transporte</option>
                                            <option>Casa</option>
                                            <option>Lazer</option>
                                            <option>Renda</option>
                                            <option>Outros</option>
                                        </select>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={()=>setShowModal(false)} className="flex-1 py-3 rounded bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 font-bold">CANCELAR</button>
                        <button type="submit" className="flex-1 py-3 rounded bg-cyber-blue text-black font-bold">SALVAR</button>
                    </div>
                </form>
            </motion.div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL CARTÃO */}
      {/* ========================================== */}
      {showCardModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
            <motion.div initial={{scale:0.9}} animate={{scale:1}} className={`${isDark ? 'bg-cyber-dark border-cyber-blue' : 'bg-white border-gray-300'} p-8 rounded-2xl border w-full max-w-md`}>
                <h3 className={`text-xl font-bold mb-6 font-orbitron text-center ${textMain}`}>NOVO CARTÃO</h3>
                <form onSubmit={handleCreateCard} className="space-y-4">
                    <div>
                        <label className="text-xs text-cyber-blue font-bold tracking-widest block mb-1">NOME</label>
                        <input required className={`w-full ${bgInput} border rounded p-3`} value={newCard.name} onChange={e=>setNewCard({...newCard, name: e.target.value})} placeholder="Ex: Nubank" />
                    </div>
                    <div>
                        <label className="text-xs text-cyber-blue font-bold tracking-widest block mb-1">LIMITE (R$)</label>
                        <input required type="number" className={`w-full ${bgInput} border rounded p-3`} value={newCard.limit} onChange={e=>setNewCard({...newCard, limit: e.target.value})} />
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={()=>setShowCardModal(false)} className="flex-1 py-3 rounded bg-gray-500/10 text-gray-400 font-bold">CANCELAR</button>
                        <button type="submit" className="flex-1 py-3 rounded bg-cyber-blue text-black font-bold">CRIAR</button>
                    </div>
                </form>
            </motion.div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL META (GOAL) */}
      {/* ========================================== */}
      {showGoalModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
            <motion.div initial={{scale:0.9}} animate={{scale:1}} className={`${isDark ? 'bg-cyber-dark border-cyber-green' : 'bg-white border-green-500'} p-8 rounded-2xl border w-full max-w-md`}>
                <h3 className={`text-xl font-bold mb-6 font-orbitron text-center ${textMain}`}>NOVA META</h3>
                <form onSubmit={handleCreateGoal} className="space-y-4">
                    <div><label className="text-xs text-cyber-green font-bold tracking-widest block mb-1">NOME DA META</label><input required className={`w-full ${bgInput} border rounded p-3`} value={newGoal.name} onChange={e=>setNewGoal({...newGoal, name: e.target.value})} placeholder="Ex: Viagem Europa" /></div>
                    <div><label className="text-xs text-cyber-green font-bold tracking-widest block mb-1">VALOR ALVO (R$)</label><input required type="number" className={`w-full ${bgInput} border rounded p-3`} value={newGoal.target} onChange={e=>setNewGoal({...newGoal, target: e.target.value})} /></div>
                    <div><label className="text-xs text-cyber-green font-bold tracking-widest block mb-1">JÁ GUARDADO (R$)</label><input required type="number" className={`w-full ${bgInput} border rounded p-3`} value={newGoal.current} onChange={e=>setNewGoal({...newGoal, current: e.target.value})} /></div>
                    <div><label className="text-xs text-cyber-green font-bold tracking-widest block mb-1">DATA ALVO</label><input required type="date" className={`w-full ${bgInput} border rounded p-3`} value={newGoal.deadline} onChange={e=>setNewGoal({...newGoal, deadline: e.target.value})} /></div>
                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={()=>setShowGoalModal(false)} className="flex-1 py-3 rounded bg-gray-500/10 text-gray-400 font-bold">CANCELAR</button>
                        <button type="submit" className="flex-1 py-3 rounded bg-cyber-green text-black font-bold">CRIAR</button>
                    </div>
                </form>
            </motion.div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL DEPOSITAR EM META */}
      {/* ========================================== */}
      {showDepositModal.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
            <motion.div initial={{scale:0.9}} animate={{scale:1}} className={`${isDark ? 'bg-cyber-dark border-cyber-green' : 'bg-white border-green-500'} p-8 rounded-2xl border w-full max-w-sm`}>
                <h3 className={`text-xl font-bold mb-6 font-orbitron text-center ${textMain}`}>ADICIONAR ECONOMIA</h3>
                <form onSubmit={handleDepositGoal} className="space-y-4">
                    <div>
                        <label className="text-xs text-cyber-green font-bold tracking-widest block mb-1">VALOR (R$)</label>
                        <input required autoFocus type="number" className={`w-full ${bgInput} border rounded p-3 text-2xl text-center`} value={depositAmount} onChange={e=>setDepositAmount(e.target.value)} />
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={()=>setShowDepositModal({show:false, goalId:null, current:0})} className="flex-1 py-3 rounded bg-gray-500/10 text-gray-400 font-bold">CANCELAR</button>
                        <button type="submit" className="flex-1 py-3 rounded bg-cyber-green text-black font-bold">DEPOSITAR</button>
                    </div>
                </form>
            </motion.div>
        </div>
      )}

      {/* ========================================== */}
      {/* CONTEÚDO PRINCIPAL (ABAS) */}
      {/* ========================================== */}
      <div className="p-4 md:p-10 pt-20 md:pt-10 max-w-7xl mx-auto space-y-8">
        
        {/* HEADER DA PÁGINA */}
        {activeTab !== 'ai' && (
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-end border-b ${isDark ? 'border-white/5' : 'border-gray-200'} pb-6 gap-4`}>
                <div>
                    <h2 className={`text-3xl md:text-4xl font-bold mb-1 tracking-wider font-orbitron ${textMain}`}>{activeTab.toUpperCase()}</h2>
                    {activeTab === 'dashboard' && (
                        <div className="flex items-center gap-4 mt-2">
                            <button onClick={() => changeMonth(-1)} className="p-1 hover:text-cyber-blue"><ChevronLeft/></button>
                            <span className={`text-cyber-blue font-mono text-sm md:text-lg border border-cyber-blue/30 px-3 py-1 rounded bg-cyber-blue/5 flex items-center gap-2`}>
                                <Calendar size={16}/> {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                            </span>
                            <button onClick={() => changeMonth(1)} className="p-1 hover:text-cyber-blue"><ChevronRight/></button>
                        </div>
                    )}
                </div>
                {activeTab !== 'settings' && activeTab !== 'reports' && (
                    <div className="flex gap-2 md:gap-4 w-full md:w-auto">
                        <button onClick={()=>{if(activeTab==='cards') setShowCardModal(true); else if(activeTab==='goals') setShowGoalModal(true); else setShowModal(true)}} className="flex-1 md:flex-none flex justify-center items-center gap-2 px-6 py-2 bg-cyber-green/10 border border-cyber-green text-cyber-green rounded hover:bg-cyber-green hover:text-black font-bold tracking-widest text-xs uppercase">
                            <Plus size={16}/> {activeTab==='cards'?'CARTÃO':activeTab==='goals'?'META':'NOVO'}
                        </button>
                        <button onClick={fetchDashboard} className="flex justify-center items-center gap-2 px-6 py-2 bg-cyber-blue/10 border border-cyber-blue text-cyber-blue rounded hover:bg-cyber-blue hover:text-black font-bold tracking-widest text-xs uppercase">
                            <RefreshCw size={16}/>
                        </button>
                    </div>
                )}
            </div>
        )}

        {/* --- ABA DASHBOARD --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                <NeonCard icon={<Wallet size={32} />} label="Saldo Líquido" value={data.balance} color="blue" isDark={isDark} />
                <NeonCard icon={<TrendingDown size={32} />} label="Gastos do Mês" value={data.expenses} color="red" isDark={isDark} />
                <NeonCard icon={<TrendingUp size={32} />} label="Patrimônio" value={data.portfolio_value} color="green" isDark={isDark} />
            </div>
            
            <div className={`rounded-xl border ${bgCard} overflow-hidden`}>
              <div className={`p-6 border-b ${isDark ? 'border-white/5 bg-white/5' : 'border-gray-200 bg-gray-50'} flex justify-between items-center`}>
                  <h3 className={`text-lg md:text-xl font-bold tracking-wide flex items-center gap-2 ${textMain}`}><Zap className="text-cyber-yellow"/> Transações Recentes</h3>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {data.transactions.map((t: any) => (
                    <div key={t.id} className={`flex justify-between items-center p-4 border-b ${isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'} transition-colors`}>
                        <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                            <div className="flex gap-1 md:gap-2">
                                <button onClick={()=>deleteItem('transactions', t.id)} className="p-2 bg-gray-500/10 rounded text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                            </div>
                            <div className="truncate">
                                <span className={`font-bold block text-base md:text-lg truncate ${textMain}`}>{t.description}</span>
                                <span className="text-xs text-gray-500 bg-gray-500/10 px-2 py-0.5 rounded tracking-wider">{t.category} • {t.date} {t.card_id && `💳`}</span>
                            </div>
                        </div>
                        <span className={`text-lg md:text-xl font-bold font-mono whitespace-nowrap ${t.type === 'receita' ? 'text-cyber-green' : 'text-cyber-red'}`}>
                            {t.type === 'receita' ? '+' : ''} {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- ABA RELATÓRIOS (COM PDF) --- */}
        {activeTab === 'reports' && (
            <div className="space-y-8">
                 <div className="flex justify-end">
                    <button id="btn-pdf" onClick={generatePDF} className="flex items-center gap-2 px-8 py-4 bg-cyber-red/10 border border-cyber-red text-cyber-red rounded-xl hover:bg-cyber-red hover:text-white font-bold tracking-widest shadow-lg transition-all">
                        <Download size={20}/> BAIXAR RELATÓRIO PDF
                    </button>
                 </div>

                 <div id="report-content" className={`p-8 rounded-2xl border ${bgCard} flex flex-col items-center relative`}>
                    <h3 className={`font-bold mb-2 tracking-widest text-lg ${textMain}`}>RELATÓRIO MENSAL - {currentDate.toLocaleDateString('pt-BR', {month:'long', year:'numeric'}).toUpperCase()}</h3>
                    <p className="text-sm text-gray-500 mb-8">Gerado automaticamente pelo Zenith Finance</p>
                    
                    <div className="grid grid-cols-2 gap-10 w-full mb-10">
                        <div className={`p-4 rounded border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                            <p className="text-gray-500 text-xs uppercase">Entradas</p>
                            <p className="text-2xl font-mono text-cyber-green">R$ {(data.balance - data.expenses).toFixed(2)}</p>
                        </div>
                        <div className={`p-4 rounded border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                            <p className="text-gray-500 text-xs uppercase">Saídas</p>
                            <p className="text-2xl font-mono text-cyber-red">R$ {data.expenses.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="w-full md:w-96 h-96">
                        <Doughnut data={chartData} options={{ plugins: { legend: { labels: { color: isDark?'white':'black', font: { family: "'Courier New', monospace" } }, position: 'bottom' } } }} />
                    </div>
                    
                    <div className="w-full mt-10">
                        <h4 className={`text-sm font-bold uppercase mb-4 border-b pb-2 ${textMain}`}>Top Gastos</h4>
                        {data.transactions.slice(0, 5).map((t:any) => (
                            <div key={t.id} className="flex justify-between py-2 border-b border-gray-500/10 text-sm">
                                <span className={textMain}>{t.description}</span>
                                <span className="text-gray-500">{t.amount.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
                            </div>
                        ))}
                    </div>
                 </div>
            </div>
        )}

        {/* --- ABA CONFIGURAÇÕES (NOVA) --- */}
        {activeTab === 'settings' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className={`p-8 rounded-2xl border ${bgCard}`}>
                    <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${textMain}`}><Settings size={24}/> PREFERÊNCIAS</h3>
                    <div className="space-y-6">
                        <div>
                            <label className={`text-xs font-bold tracking-widest block mb-3 ${textSub}`}>TEMA DO SISTEMA</label>
                            <div className="flex gap-4">
                                <button onClick={()=>setTheme('dark')} className={`flex-1 py-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${theme==='dark' ? 'bg-cyber-blue/20 border-cyber-blue text-cyber-blue' : 'bg-transparent border-gray-600 text-gray-500'}`}>
                                    <Moon size={24}/>
                                    <span className="text-xs font-bold">CYBER DARK</span>
                                </button>
                                <button onClick={()=>setTheme('light')} className={`flex-1 py-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${theme==='light' ? 'bg-cyber-blue/20 border-cyber-blue text-cyber-blue' : 'bg-transparent border-gray-300 text-gray-400'}`}>
                                    <Sun size={24}/>
                                    <span className="text-xs font-bold">CLEAN LIGHT</span>
                                </button>
                            </div>
                        </div>
                        <div className="pt-6 border-t border-gray-500/20">
                            <p className="text-xs text-gray-500 mb-2">VERSÃO DO SISTEMA</p>
                            <p className={`font-mono ${textMain}`}>v3.5.0 (Beta)</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- ABA CARTÕES --- */}
        {activeTab === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {cards.map((c: any) => { 
                    const percent = Math.min((c.used / c.limit) * 100, 100); 
                    return (
                        <div key={c.id} className={`bg-gradient-to-br ${isDark ? 'from-cyber-dark to-gray-900 border-white/10' : 'from-white to-gray-50 border-gray-200'} border p-6 rounded-2xl relative overflow-hidden group hover:border-cyber-blue/50 transition-all shadow-lg`}>
                            <div className="absolute top-0 right-0 p-4 opacity-10"><CreditCard size={100}/></div>
                            <h3 className={`text-xl font-bold mb-1 font-orbitron tracking-widest ${textMain}`}>{c.name}</h3>
                            <p className="text-gray-400 text-xs tracking-widest mb-6">LIMIT: {c.limit.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</p>
                            <div className="space-y-4 relative z-10">
                                <div className="flex justify-between text-sm font-bold">
                                    <span className="text-cyber-red">Fatura: {c.used.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
                                    <span className="text-cyber-green">Disp: {c.available.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
                                </div>
                                <div className="h-3 bg-black/50 rounded-full overflow-hidden border border-white/5">
                                    <div className={`h-full ${percent > 80 ? 'bg-cyber-red' : 'bg-cyber-blue'} transition-all duration-1000`} style={{ width: `${percent}%` }}></div>
                                </div>
                            </div>
                        </div>
                    ) 
                })}
            </div>
        )}
        
        {/* --- ABA METAS --- */}
        {activeTab === 'goals' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {goals.map((g: any) => {
                    const pct = Math.min((g.current_amount / g.target_amount) * 100, 100);
                    return (
                        <div key={g.id} className={`${bgCard} border rounded-2xl p-6 relative overflow-hidden group hover:border-cyber-green/50 transition-all`}>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div><h3 className={`text-xl font-bold tracking-wide ${textMain}`}>{g.name}</h3><p className="text-xs text-gray-400 mt-1">Alvo: {new Date(g.deadline).toLocaleDateString('pt-BR')}</p></div>
                                <button onClick={()=>deleteGoal(g.id)} className="text-gray-500 hover:text-red-500"><Trash2 size={18}/></button>
                            </div>
                            <div className="flex justify-between items-end mb-2 relative z-10"><div><span className="text-2xl font-bold font-mono text-cyber-green">{g.current_amount.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span></div><div className="text-xs text-gray-400 font-mono">de {g.target_amount.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</div></div>
                            <div className="h-4 bg-black/50 rounded-full overflow-hidden border border-white/5 mb-6 relative z-10"><div className="h-full bg-gradient-to-r from-green-600 to-cyber-green transition-all duration-1000" style={{width: `${pct}%`}}></div></div>
                            <button onClick={()=>setShowDepositModal({show: true, goalId: g.id, current: g.current_amount})} className="w-full py-3 rounded bg-cyber-green/10 border border-cyber-green text-cyber-green font-bold hover:bg-cyber-green hover:text-black transition-all flex items-center justify-center gap-2 relative z-10"><Plus size={18}/> DEPOSITAR</button>
                        </div>
                    )
                })}
             </div>
        )}
        
        {/* --- ABA INVESTIMENTOS --- */}
        {activeTab === 'investments' && (
          <div className="space-y-8">
            <div className={`p-6 md:p-8 rounded-2xl border ${bgCard} flex flex-col md:flex-row items-start md:items-center justify-between shadow-lg gap-6 transition-colors duration-500`}>
                <div>
                    <h2 className={`text-xl md:text-2xl font-bold mb-4 tracking-wide flex items-center gap-2 ${textMain}`}><Wallet className="text-cyber-blue"/> PERFORMANCE</h2>
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
                        <div><p className="text-gray-400 text-[10px] font-bold tracking-widest uppercase mb-1">CUSTO TOTAL</p><p className="text-xl md:text-2xl font-mono text-gray-300">{data.invested_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                        <div className={`px-4 py-2 rounded border`}>
                            <p className={`text-[10px] font-bold tracking-widest uppercase mb-1`}>VALOR ATUAL</p>
                            <p className={`text-lg md:text-xl font-mono font-bold ${textMain}`}>{data.portfolio_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`rounded-xl border ${bgCard} overflow-hidden`}>
                <div className={`p-6 border-b ${isDark ? 'border-white/5 bg-white/5' : 'border-gray-200 bg-gray-50'} flex justify-between items-center`}><h3 className={`text-lg md:text-xl font-bold tracking-wide flex items-center gap-2 ${textMain}`}><TrendingUp className="text-cyber-green"/> Seus Ativos</h3></div>
                <div className="max-h-[400px] overflow-y-auto">
                    {data.investments.map((t: any) => (
                         <div key={t.id} className={`flex justify-between items-center p-4 border-b ${isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'} transition-colors`}>
                            <div className="flex items-center gap-3 md:gap-4">
                                <div className="flex gap-1 md:gap-2">
                                    <button onClick={()=>deleteItem('investments', t.id)} className="p-2 bg-gray-500/10 rounded text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                                </div>
                                <div>
                                    <span className={`font-bold block text-base md:text-lg tracking-widest flex items-center gap-2 ${textMain}`}>{t.ticker} <span className="text-[10px] bg-gray-500/10 px-2 rounded text-gray-400 font-normal">UN: {t.quantity}</span></span>
                                    <div className="flex flex-col md:flex-row gap-1 md:gap-3 text-xs mt-1 font-mono">
                                        <span className="text-gray-500">Médio: {t.purchase_price?.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`text-lg md:text-xl font-bold font-mono block transition-colors ${textMain}`}>{(t.total_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                <span className={`text-xs font-bold flex items-center justify-end gap-1 ${(t.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{(t.profit || 0) >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>} {(t.profit || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                         </div>
                    ))}
                </div>
            </div>
          </div>
        )}
        
        {/* --- ABA IA (CHAT) --- */}
        {activeTab === 'ai' && (
            <div className={`flex flex-col h-[calc(100vh-140px)] ${bgCard} rounded-2xl border overflow-hidden relative`}>
                 <div className={`p-4 ${isDark?'bg-cyber-dark':'bg-white'} border-b ${isDark?'border-white/10':'border-gray-200'} flex items-center gap-3`}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-cyber-blue flex items-center justify-center animate-pulse"><Bot size={24} className="text-white"/></div>
                    <div><h3 className={`font-bold font-orbitron ${textMain}`}>ZENITH AI</h3><p className="text-xs text-cyber-blue">Online • Consultor Financeiro</p></div>
                 </div>
                 <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                    {chatHistory.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] md:max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-cyber-blue/10 border border-cyber-blue/30 text-black dark:text-white rounded-tr-none' : 'bg-gray-100 border border-gray-200 text-gray-800 rounded-tl-none'}`}>
                                <p className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role==='user' && isDark ? 'text-white' : 'text-gray-800'}`}>{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {aiLoading && <div className="text-gray-500 text-xs animate-pulse ml-4">Zenith está digitando...</div>}
                    <div ref={chatEndRef} />
                 </div>
                 <form onSubmit={handleSendMessage} className={`p-4 ${isDark?'bg-cyber-dark':'bg-white'} border-t ${isDark?'border-white/10':'border-gray-200'} flex gap-2`}>
                    <input value={chatInput} onChange={e=>setChatInput(e.target.value)} className={`flex-1 ${isDark?'bg-black/50 text-white':'bg-gray-100 text-gray-900'} border rounded-xl px-4 focus:border-cyber-blue outline-none`} placeholder="Digite sua pergunta..."/>
                    <button type="submit" className="p-3 bg-cyber-blue text-black rounded-xl hover:bg-cyan-300 font-bold"><Send size={20}/></button>
                 </form>
            </div>
        )}

      </div>
    </main>
  );
}

// ==========================================
// COMPONENTES VISUAIS AUXILIARES
// ==========================================

function SidebarBtn({icon, label, active, onClick, isDark}: any) {
    const activeClass = "bg-cyber-blue/10 text-cyber-blue border-r-2 border-cyber-blue";
    const inactiveClass = isDark ? "text-gray-500 hover:text-white hover:bg-white/5" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100";
    return (
        <button 
            onClick={onClick} 
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-300 mb-1 ${active ? activeClass : inactiveClass}`}
        >
            {icon} 
            <span className="text-sm font-bold tracking-widest uppercase">{label}</span>
        </button>
    );
}

function LoginPage({ onLogin, theme }: any) { 
    const [user, setUser] = useState(""); 
    const [pass, setPass] = useState(""); 
    const [error, setError] = useState("");

    const handleLogin = async (e: any) => { 
        e.preventDefault(); 
        try { 
            const res = await fetch('https://zenith-finance-1.onrender.com/login', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ username: user, password: pass }) 
            }); 
            if (res.ok) onLogin(); 
            else setError("ACESSO NEGADO"); 
        } catch { 
            setError("ERRO: SERVIDOR OFFLINE"); 
        } 
    };

    return (
        <div className={`min-h-screen flex items-center justify-center font-sans ${theme==='dark'?'bg-cyber-darkest':'bg-gray-100'}`}>
            <div className={`${theme==='dark'?'bg-cyber-dark border-cyber-blue/30':'bg-white border-gray-200'} p-10 rounded-2xl border w-full max-w-md shadow-lg`}>
                <h2 className={`text-3xl text-center font-bold mb-8 font-orbitron tracking-widest ${theme==='dark'?'text-white':'text-gray-900'}`}>ZENITH SECURITY</h2>
                <form onSubmit={handleLogin} className="space-y-6">
                    <input 
                        type="text" 
                        value={user} 
                        onChange={e=>setUser(e.target.value)} 
                        className={`w-full ${theme==='dark'?'bg-black/50 border-white/10 text-white':'bg-gray-50 border-gray-300 text-gray-900'} border rounded-lg py-3 px-4`} 
                        placeholder="Usuário" 
                    />
                    <input 
                        type="password" 
                        value={pass} 
                        onChange={e=>setPass(e.target.value)} 
                        className={`w-full ${theme==='dark'?'bg-black/50 border-white/10 text-white':'bg-gray-50 border-gray-300 text-gray-900'} border rounded-lg py-3 px-4`} 
                        placeholder="Senha" 
                    />
                    {error && <p className="text-red-500 text-center text-xs font-bold">{error}</p>}
                    <button className="w-full bg-cyber-blue/10 border border-cyber-blue text-cyber-blue py-3 rounded-lg hover:bg-cyber-blue hover:text-black font-bold">
                        AUTENTICAR
                    </button>
                </form>
            </div>
        </div>
    );
}

function NeonCard({ icon, label, value, color, isDark }: any) { 
    const colors: any = { 
        blue: 'text-cyber-blue border-cyber-blue/50', 
        red: 'text-cyber-red border-cyber-red/50', 
        green: 'text-cyber-green border-cyber-green/50' 
    }; 
    const textColors: any = { 
        blue: 'text-cyber-blue', 
        red: 'text-cyber-red', 
        green: 'text-cyber-green' 
    };
    const safeValue = value || 0; 
    
    return (
        <div className={`p-6 rounded-xl ${isDark?'bg-cyber-dark/80 border-white/10':'bg-white border-gray-200 shadow-sm'} border relative group hover:${colors[color]} transition-all duration-500`}>
            <div className={`absolute right-4 top-4 opacity-20 group-hover:opacity-100 transition-all duration-500 ${textColors[color]}`}>{icon}</div>
            <p className={`${isDark?'text-gray-400':'text-gray-500'} text-xs font-bold tracking-widest uppercase mb-1`}>{label}</p>
            <h3 className={`text-4xl font-bold font-mono ${textColors[color]}`}>{safeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
        </div>
    ); 
}