"use client";

import { 
  TrendingDown, Wallet, RefreshCw, Trash2, Zap, TrendingUp, 
  Edit2, Save, X, Calendar, ChevronLeft, ChevronRight, Lock, 
  Plus, User, Key, ArrowUpRight, ArrowDownRight, CreditCard, Bot, Send, Menu
} from 'lucide-react';
import { useEffect, useState, useRef } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { motion, AnimatePresence } from "framer-motion";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Home() {
  // --- ESTADOS GERAIS ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [currentDate, setCurrentDate] = useState(new Date()); 
  
  // --- ESTADO MOBILE ---
  const [isMobileOpen, setIsMobileOpen] = useState(false); // Controle do Menu no Celular

  // --- DADOS DO SISTEMA ---
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
  const [loading, setLoading] = useState(true);

  // --- ESTADOS DA IA ---
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<null | HTMLDivElement>(null);

  // --- MODAIS ---
  const [showModal, setShowModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false); 

  // --- NOVO ITEM ---
  const [newItem, setNewItem] = useState({ 
      type: 'expense', desc: '', amount: '', price: '', cat: 'Outros',
      paymentMethod: 'cash', cardId: ''             
  });

  // --- NOVO CARTÃO ---
  const [newCard, setNewCard] = useState({ name: '', limit: '' });

  // --- ESTADOS DE EDIÇÃO ---
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCat, setEditCat] = useState("");

  const getMonthStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // --- BUSCA DE DADOS ---
  const fetchDashboard = async () => {
    try {
      if (!editingId && isAuthenticated) {
        const resDash = await fetch(`https://zenith-finance-1.onrender.com/dashboard?month=${getMonthStr(currentDate)}`);
        const jsonDash = await resDash.json();
        setData(jsonDash);
        
        const resCards = await fetch(`https://zenith-finance-1.onrender.com/cards`);
        const jsonCards = await resCards.json();
        setCards(jsonCards);
        setLoading(false);
      }
    } catch (error) { console.error(error); }
  };

  // --- CHAT IA ---
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

  // --- AÇÕES CRUD ---
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

  // --- NAVEGAÇÃO MOBILE INTELIGENTE ---
  const navigate = (tab: string) => {
    setActiveTab(tab);
    setIsMobileOpen(false); // Fecha o menu ao clicar
  }

  if (!isAuthenticated) return <LoginPage onLogin={() => setIsAuthenticated(true)} />;

  const chartData = { 
    labels: Object.keys(data.categories), 
    datasets: [{ 
        data: Object.values(data.categories), 
        backgroundColor: ['#ff0055', '#00f3ff', '#00ff9f', '#fcee0a', '#bc13fe'], 
        borderColor: '#000', 
        borderWidth: 2 
    }], 
  };
  
  const totalProfit = data.portfolio_value - data.invested_total; 
  const isProfit = totalProfit >= 0;

  return (
    <main className="min-h-screen font-sans bg-cyber-darkest text-white md:pl-64 transition-all duration-300" style={{ fontFamily: 'var(--font-rajdhani)' }}>
      
      {/* --- HEADER MOBILE (SÓ APARECE NO CELULAR) --- */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-cyber-dark border-b border-white/10 flex items-center justify-between px-4 z-40 shadow-lg">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-cyber-blue rounded flex items-center justify-center"><Zap size={18} className="text-black"/></div>
            <h1 className="font-bold font-orbitron tracking-wider">ZENITH</h1>
         </div>
         <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="p-2 text-white hover:text-cyber-blue"><Menu size={28}/></button>
      </div>

      {/* --- OVERLAY (FUNDO PRETO QUANDO MENU ABRE) --- */}
      {isMobileOpen && <div onClick={()=>setIsMobileOpen(false)} className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm" />}

      {/* --- SIDEBAR RESPONSIVA --- */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-cyber-dark border-r border-white/5 flex flex-col p-6 z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-cyber-blue rounded-lg flex items-center justify-center shadow-[0_0_15px_#00f3ff]"><Zap size={24} className="text-black" /></div>
            <h1 className="text-2xl font-bold font-orbitron tracking-wider text-white">ZENITH</h1>
        </div>
        <nav className="space-y-2 flex-1">
            <SidebarBtn icon={<Wallet size={20}/>} label="Dashboard" active={activeTab==='dashboard'} onClick={()=>navigate('dashboard')}/>
            <SidebarBtn icon={<TrendingUp size={20}/>} label="Investimentos" active={activeTab==='investments'} onClick={()=>navigate('investments')}/>
            <SidebarBtn icon={<CreditCard size={20}/>} label="Cartões" active={activeTab==='cards'} onClick={()=>navigate('cards')}/>
            <SidebarBtn icon={<Bot size={20}/>} label="AI Advisor" active={activeTab==='ai'} onClick={()=>navigate('ai')}/>
            <SidebarBtn icon={<RefreshCw size={20}/>} label="Relatórios" active={activeTab==='reports'} onClick={()=>navigate('reports')}/>
        </nav>
        <div className="mt-auto pt-6 border-t border-white/10 text-center text-xs text-gray-600 font-mono">
            V 3.0 // MOBILE READY
        </div>
      </aside>
      
      {/* MODAL TRANSAÇÃO */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
            <motion.div initial={{scale:0.9}} animate={{scale:1}} className="bg-cyber-dark p-6 md:p-8 rounded-2xl border border-cyber-blue w-full max-w-md shadow-[0_0_50px_rgba(0,243,255,0.2)]">
                <h3 className="text-xl font-bold text-white mb-6 font-orbitron text-center">NOVO REGISTRO</h3>
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="text-xs text-cyber-blue font-bold tracking-widest block mb-1">TIPO</label>
                        <select className="w-full bg-black/50 border border-white/20 rounded p-3 text-white focus:border-cyber-blue" value={newItem.type} onChange={e=>setNewItem({...newItem, type: e.target.value})}>
                            <option value="expense">💸 Gasto</option>
                            <option value="income">💰 Entrada</option>
                            <option value="investment">📈 Investimento</option>
                        </select>
                    </div>
                    {newItem.type === 'investment' ? (
                        <>
                            <div>
                                <label className="text-xs text-cyber-green font-bold tracking-widest block mb-1">TICKER</label>
                                <input required className="w-full bg-black/50 border border-white/20 rounded p-3 text-white uppercase" value={newItem.desc} onChange={e=>setNewItem({...newItem, desc: e.target.value.toUpperCase()})} placeholder="PETR4.SA" />
                            </div>
                            <div className="flex gap-2">
                                <input required type="number" className="w-full bg-black/50 border border-white/20 rounded p-3 text-white" value={newItem.amount} onChange={e=>setNewItem({...newItem, amount: e.target.value})} placeholder="Qtd" />
                                <input required type="number" className="w-full bg-black/50 border border-white/20 rounded p-3 text-white" value={newItem.price} onChange={e=>setNewItem({...newItem, price: e.target.value})} placeholder="Preço" />
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="text-xs text-cyber-blue font-bold tracking-widest block mb-1">DESCRIÇÃO</label>
                                <input required className="w-full bg-black/50 border border-white/20 rounded p-3 text-white" value={newItem.desc} onChange={e=>setNewItem({...newItem, desc: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs text-cyber-blue font-bold tracking-widest block mb-1">VALOR (R$)</label>
                                <input required type="number" step="0.01" className="w-full bg-black/50 border border-white/20 rounded p-3 text-white" value={newItem.amount} onChange={e=>setNewItem({...newItem, amount: e.target.value})} />
                            </div>
                            {newItem.type === 'expense' && (
                                <>
                                    <div>
                                        <label className="text-xs text-cyber-blue font-bold tracking-widest block mb-1">PAGAMENTO</label>
                                        <select className="w-full bg-black/50 border border-white/20 rounded p-3 text-white" value={newItem.paymentMethod} onChange={e=>setNewItem({...newItem, paymentMethod: e.target.value})}>
                                            <option value="cash">💵 Dinheiro / Pix</option>
                                            <option value="credit">💳 Cartão de Crédito</option>
                                        </select>
                                    </div>
                                    {newItem.paymentMethod === 'credit' && (
                                        <div>
                                            <label className="text-xs text-cyber-blue font-bold tracking-widest block mb-1">CARTÃO</label>
                                            <select required className="w-full bg-black/50 border border-white/20 rounded p-3 text-white" value={newItem.cardId} onChange={e=>setNewItem({...newItem, cardId: e.target.value})}>
                                                <option value="">Selecione...</option>
                                                {cards.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-xs text-cyber-blue font-bold tracking-widest block mb-1">CATEGORIA</label>
                                        <select className="w-full bg-black/50 border border-white/20 rounded p-3 text-white" value={newItem.cat} onChange={e=>setNewItem({...newItem, cat: e.target.value})}>
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
                        <button type="button" onClick={()=>setShowModal(false)} className="flex-1 py-3 rounded bg-white/5 hover:bg-white/10 text-gray-400 font-bold">CANCELAR</button>
                        <button type="submit" className="flex-1 py-3 rounded bg-cyber-blue text-black font-bold">SALVAR</button>
                    </div>
                </form>
            </motion.div>
        </div>
      )}

      {/* MODAL NOVO CARTÃO */}
      {showCardModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
            <motion.div initial={{scale:0.9}} animate={{scale:1}} className="bg-cyber-dark p-8 rounded-2xl border border-cyber-blue w-full max-w-md">
                <h3 className="text-xl font-bold text-white mb-6 font-orbitron text-center">NOVO CARTÃO</h3>
                <form onSubmit={handleCreateCard} className="space-y-4">
                    <div>
                        <label className="text-xs text-cyber-blue font-bold tracking-widest block mb-1">NOME</label>
                        <input required className="w-full bg-black/50 border border-white/20 rounded p-3 text-white" value={newCard.name} onChange={e=>setNewCard({...newCard, name: e.target.value})} placeholder="Ex: Nubank" />
                    </div>
                    <div>
                        <label className="text-xs text-cyber-blue font-bold tracking-widest block mb-1">LIMITE (R$)</label>
                        <input required type="number" className="w-full bg-black/50 border border-white/20 rounded p-3 text-white" value={newCard.limit} onChange={e=>setNewCard({...newCard, limit: e.target.value})} />
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={()=>setShowCardModal(false)} className="flex-1 py-3 rounded bg-white/5 hover:bg-white/10 text-gray-400 font-bold">CANCELAR</button>
                        <button type="submit" className="flex-1 py-3 rounded bg-cyber-blue text-black font-bold">CRIAR</button>
                    </div>
                </form>
            </motion.div>
        </div>
      )}

      <div className="p-4 md:p-10 pt-20 md:pt-10 max-w-7xl mx-auto space-y-8">
        
        {/* HEADER DA PÁGINA (Desktop e Mobile) */}
        {activeTab !== 'ai' && (
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/5 pb-6 gap-4">
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-1 tracking-wider font-orbitron">{activeTab.toUpperCase()}</h2>
                    {activeTab === 'dashboard' && (
                        <div className="flex items-center gap-4 mt-2">
                            <button onClick={() => changeMonth(-1)} className="p-1 hover:text-cyber-blue"><ChevronLeft/></button>
                            <span className="text-cyber-blue font-mono text-sm md:text-lg border border-cyber-blue/30 px-3 py-1 rounded bg-cyber-blue/5 flex items-center gap-2">
                                <Calendar size={16}/> {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                            </span>
                            <button onClick={() => changeMonth(1)} className="p-1 hover:text-cyber-blue"><ChevronRight/></button>
                        </div>
                    )}
                </div>
                <div className="flex gap-2 md:gap-4 w-full md:w-auto">
                    {activeTab === 'cards' ? (
                        <button onClick={()=>setShowCardModal(true)} className="flex-1 md:flex-none flex justify-center items-center gap-2 px-6 py-2 bg-cyber-green/10 border border-cyber-green text-cyber-green rounded hover:bg-cyber-green hover:text-black font-bold tracking-widest text-xs uppercase">
                            <Plus size={16}/> CARTÃO
                        </button>
                    ) : (
                        <button onClick={()=>setShowModal(true)} className="flex-1 md:flex-none flex justify-center items-center gap-2 px-6 py-2 bg-cyber-green/10 border border-cyber-green text-cyber-green rounded hover:bg-cyber-green hover:text-black font-bold tracking-widest text-xs uppercase">
                            <Plus size={16}/> NOVO
                        </button>
                    )}
                    <button onClick={fetchDashboard} className="flex justify-center items-center gap-2 px-6 py-2 bg-cyber-blue/10 border border-cyber-blue text-cyber-blue rounded hover:bg-cyber-blue hover:text-black font-bold tracking-widest text-xs uppercase">
                        <RefreshCw size={16}/>
                    </button>
                </div>
            </div>
        )}

        {/* --- ABA DASHBOARD --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
              <NeonCard icon={<Wallet size={32} />} label="Saldo Líquido" value={data.balance} color="blue" />
              <NeonCard icon={<TrendingDown size={32} />} label="Gastos do Mês" value={data.expenses} color="red" />
              <NeonCard icon={<TrendingUp size={32} />} label="Patrimônio" value={data.portfolio_value} color="green" />
            </div>
            
            <div className="rounded-xl border border-white/10 bg-cyber-dark/40 backdrop-blur-md overflow-hidden">
              <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                  <h3 className="text-lg md:text-xl text-white font-bold tracking-wide flex items-center gap-2"><Zap className="text-cyber-yellow"/> Transações Recentes</h3>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {data.transactions.map((t: any) => (
                    <div key={t.id} className={`flex justify-between items-center p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${editingId === t.id ? 'bg-cyber-blue/10' : ''}`}>
                        {editingId === t.id ? (
                           <div className="flex flex-col md:flex-row w-full gap-2 items-center">
                               <input value={editDesc} onChange={e=>setEditDesc(e.target.value)} className="bg-black/50 border border-white/20 text-white px-3 py-1 rounded w-full"/>
                               <div className="flex w-full gap-2">
                                  <input value={editAmount} type="number" onChange={e=>setEditAmount(e.target.value)} className="bg-black/50 border border-white/20 text-white px-3 py-1 rounded w-full"/>
                                  <button onClick={saveEdit} className="p-2 text-cyber-green hover:bg-cyber-green/20 rounded"><Save size={18}/></button>
                               </div>
                           </div>
                        ) : (
                           <>
                            <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                                <div className="flex gap-1 md:gap-2">
                                    <button onClick={()=>deleteItem('transactions', t.id)} className="p-2 bg-white/5 rounded text-gray-400 hover:bg-cyber-red hover:text-white"><Trash2 size={16}/></button>
                                    <button onClick={()=>startEditing(t, 'transactions')} className="p-2 bg-white/5 rounded text-gray-400 hover:bg-cyber-blue hover:text-white"><Edit2 size={16}/></button>
                                </div>
                                <div className="truncate">
                                    <span className="text-white font-bold block text-base md:text-lg truncate">{t.description}</span>
                                    <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/5 tracking-wider">{t.category} • {t.date} {t.card_id && `💳`}</span>
                                </div>
                            </div>
                            <span className={`text-lg md:text-xl font-bold font-mono whitespace-nowrap ${t.type === 'receita' ? 'text-cyber-green' : 'text-cyber-red'}`}>
                                {t.type === 'receita' ? '+' : ''} {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                           </>
                        )}
                    </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- ABA INVESTIMENTOS (COMPLETA) --- */}
        {activeTab === 'investments' && (
          <div className="space-y-8">
            <div className={`p-6 md:p-8 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between shadow-lg gap-6 transition-colors duration-500 ${isProfit ? 'bg-green-900/10 border-green-500/30' : 'bg-red-900/10 border-red-500/30'}`}>
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-white mb-4 tracking-wide flex items-center gap-2"><Wallet className="text-cyber-blue"/> PERFORMANCE</h2>
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
                        <div>
                            <p className="text-gray-400 text-[10px] font-bold tracking-widest uppercase mb-1">CUSTO TOTAL</p>
                            <p className="text-xl md:text-2xl font-mono text-gray-300">{data.invested_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                        <div className={`px-4 py-2 rounded border ${isProfit ? 'bg-green-500/10 border-green-500/50' : 'bg-red-500/10 border-red-500/50'}`}>
                            <p className={`text-[10px] font-bold tracking-widest uppercase mb-1 ${isProfit ? 'text-green-400' : 'text-red-400'}`}>{isProfit ? 'LUCRO' : 'PREJUÍZO'}</p>
                            <p className={`text-lg md:text-xl font-mono font-bold ${isProfit ? 'text-green-300' : 'text-red-300'}`}>{Math.abs(totalProfit).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                    </div>
                </div>
                <div className="text-left md:text-right w-full md:w-auto">
                    <p className="text-cyber-blue text-xs font-bold tracking-widest uppercase mb-1 animate-pulse">VALOR ATUAL</p>
                    <div className="text-4xl md:text-5xl font-bold text-white font-mono drop-shadow-[0_0_15px_rgba(0,243,255,0.3)]">{data.portfolio_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-cyber-dark/40 backdrop-blur-md overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center"><h3 className="text-lg md:text-xl text-white font-bold tracking-wide flex items-center gap-2"><TrendingUp className="text-cyber-green"/> Seus Ativos</h3></div>
                <div className="max-h-[400px] overflow-y-auto">
                    {!Array.isArray(data.investments) || data.investments.length === 0 ? (<div className="p-10 text-center text-gray-600">Nenhum investimento cadastrado.</div>) : (
                        data.investments.map((t: any) => (
                             <div key={t.id} className={`flex justify-between items-center p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${editingId === t.id ? 'bg-cyber-blue/10' : ''}`}>
                                {editingId === t.id ? (
                                    <div className="flex flex-col md:flex-row w-full gap-2 items-center">
                                        <input value={editDesc} onChange={e=>setEditDesc(e.target.value.toUpperCase())} className="bg-black/50 border border-white/20 text-white px-3 py-1 rounded w-full md:w-32 font-mono uppercase" placeholder="Ticker"/>
                                        <div className="flex w-full gap-2">
                                            <input value={editAmount} type="number" onChange={e=>setEditAmount(e.target.value)} className="bg-black/50 border border-white/20 text-white px-3 py-1 rounded w-full" placeholder="Qtd"/>
                                            <input value={editPrice} type="number" onChange={e=>setEditPrice(e.target.value)} className="bg-black/50 border border-white/20 text-white px-3 py-1 rounded w-full" placeholder="Preço"/>
                                            <button onClick={saveEdit} className="p-2 text-cyber-green hover:bg-cyber-green/20 rounded"><Save size={18}/></button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3 md:gap-4">
                                            <div className="flex gap-1 md:gap-2">
                                                <button onClick={()=>deleteItem('investments', t.id)} className="p-2 bg-white/5 rounded text-gray-400 hover:bg-cyber-red hover:text-white"><Trash2 size={16}/></button>
                                                <button onClick={()=>startEditing(t, 'investments')} className="p-2 bg-white/5 rounded text-gray-400 hover:bg-cyber-blue hover:text-white"><Edit2 size={16}/></button>
                                            </div>
                                            <div>
                                                <span className="text-white font-bold block text-base md:text-lg tracking-widest flex items-center gap-2">{t.ticker} <span className="text-[10px] bg-white/10 px-2 rounded text-gray-400 font-normal">UN: {t.quantity}</span></span>
                                                <div className="flex flex-col md:flex-row gap-1 md:gap-3 text-xs mt-1 font-mono">
                                                    <span className="text-gray-500">Médio: {t.purchase_price?.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
                                                    <span className="text-gray-400 md:border-l border-gray-700 md:pl-3">Investido: {((t.quantity||0)*(t.purchase_price||0)).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-lg md:text-xl font-bold font-mono text-white block group-hover:text-cyber-blue transition-colors">{(t.total_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                            <span className={`text-xs font-bold flex items-center justify-end gap-1 ${(t.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{(t.profit || 0) >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>} {(t.profit || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                        </div>
                                    </>
                                )}
                             </div>
                        ))
                    )}
                </div>
            </div>
          </div>
        )}

        {/* --- ABA CARTÕES --- */}
        {activeTab === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {cards.length === 0 && <div className="text-gray-500 col-span-1 md:col-span-3 text-center p-10">Nenhum cartão cadastrado.</div>}
                {cards.map((c: any) => {
                    const percent = Math.min((c.used / c.limit) * 100, 100);
                    return (
                        <div key={c.id} className="bg-gradient-to-br from-cyber-dark to-gray-900 border border-white/10 p-6 rounded-2xl relative overflow-hidden group hover:border-cyber-blue/50 transition-all">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><CreditCard size={100}/></div>
                            <h3 className="text-xl font-bold text-white mb-1 font-orbitron tracking-widest">{c.name}</h3>
                            <p className="text-gray-400 text-xs tracking-widest mb-6">LIMIT: {c.limit.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</p>
                            <div className="space-y-4 relative z-10">
                                <div className="flex justify-between text-sm font-bold">
                                    <span className="text-cyber-red">Fatura: {c.used.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
                                    <span className="text-cyber-green">Disp: {c.available.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
                                </div>
                                <div className="h-3 bg-black/50 rounded-full overflow-hidden border border-white/5">
                                    <div className={`h-full ${percent > 80 ? 'bg-cyber-red' : 'bg-cyber-blue'} transition-all duration-1000`} style={{ width: `${percent}%` }}></div>
                                </div>
                                <p className="text-right text-[10px] text-gray-500">{percent.toFixed(1)}% UTILIZADO</p>
                            </div>
                        </div>
                    )
                })}
            </div>
        )}

        {/* --- ABA AI ADVISOR --- */}
        {activeTab === 'ai' && (
            <div className="flex flex-col h-[calc(100vh-140px)] bg-cyber-dark/30 rounded-2xl border border-white/10 overflow-hidden relative">
                 <div className="p-4 bg-cyber-dark border-b border-white/10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-cyber-blue flex items-center justify-center animate-pulse"><Bot size={24} className="text-white"/></div>
                    <div><h3 className="text-white font-bold font-orbitron">ZENITH AI</h3><p className="text-xs text-cyber-blue">Online • Consultor Financeiro</p></div>
                 </div>
                 <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                    {chatHistory.length === 0 && (<div className="text-center text-gray-500 mt-20"><Bot size={48} className="mx-auto mb-4 opacity-20"/><p>Olá! Sou sua inteligência financeira.</p><p className="text-sm">Pergunte: "Quanto gastei com Uber?" ou "Como estão meus investimentos?"</p></div>)}
                    {chatHistory.map((msg, i) => (<div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] md:max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-cyber-blue/10 border border-cyber-blue/30 text-white rounded-tr-none' : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-none'}`}><p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p></div></div>))}
                    {aiLoading && <div className="text-gray-500 text-xs animate-pulse ml-4">Zenith está digitando...</div>}
                    <div ref={chatEndRef} />
                 </div>
                 <form onSubmit={handleSendMessage} className="p-4 bg-cyber-dark border-t border-white/10 flex gap-2">
                    <input value={chatInput} onChange={e=>setChatInput(e.target.value)} className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 text-white focus:border-cyber-blue outline-none" placeholder="Digite sua pergunta..."/>
                    <button type="submit" className="p-3 bg-cyber-blue text-black rounded-xl hover:bg-cyan-300 font-bold"><Send size={20}/></button>
                 </form>
            </div>
        )}

        {/* --- ABA RELATÓRIOS --- */}
        {activeTab === 'reports' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 rounded-2xl bg-cyber-dark/50 border border-white/10 flex flex-col items-center relative">
                    <h3 className="text-white font-bold mb-6 tracking-widest text-lg">DISTRIBUIÇÃO</h3>
                    <div className="w-full md:w-80 h-80">
                        <Doughnut data={chartData} options={{ plugins: { legend: { labels: { color: 'white', font: { family: "'Courier New', monospace" } }, position: 'bottom' } } }} />
                    </div>
                </div>
            </div>
        )}

      </div>
    </main>
  );
}

// --- COMPONENTES AUXILIARES EXPANDIDOS ---

function SidebarBtn({icon, label, active, onClick}:any) {
    return (
        <button 
            onClick={onClick} 
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-300 mb-1 ${active ? 'bg-cyber-blue/10 text-cyber-blue border-r-2 border-cyber-blue' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
        >
            {icon} 
            <span className="text-sm font-bold tracking-widest uppercase">{label}</span>
        </button>
    );
}

function LoginPage({ onLogin }: any) { 
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
        <div className="min-h-screen bg-cyber-darkest flex items-center justify-center font-sans">
            <div className="bg-cyber-dark p-10 rounded-2xl border border-cyber-blue/30 w-full max-w-md shadow-lg">
                <h2 className="text-3xl text-center font-bold text-white mb-8 font-orbitron tracking-widest">ZENITH SECURITY</h2>
                <form onSubmit={handleLogin} className="space-y-6">
                    <input 
                        type="text" 
                        value={user} 
                        onChange={e=>setUser(e.target.value)} 
                        className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white" 
                        placeholder="Usuário" 
                    />
                    <input 
                        type="password" 
                        value={pass} 
                        onChange={e=>setPass(e.target.value)} 
                        className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white" 
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

function NeonCard({ icon, label, value, color }: any) { 
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
        <div className={`p-6 rounded-xl bg-cyber-dark/80 border border-white/10 backdrop-blur-xl relative group hover:${colors[color]} transition-all duration-500`}>
            <div className={`absolute right-4 top-4 opacity-20 group-hover:opacity-100 transition-all duration-500 ${textColors[color]}`}>{icon}</div>
            <p className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-1 group-hover:text-white transition-colors">{label}</p>
            <h3 className={`text-4xl font-bold font-mono ${textColors[color]}`}>{safeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
        </div>
    ); 
}