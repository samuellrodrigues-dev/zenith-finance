"use client";
import Sidebar from "@/components/Sidebar";
import { TrendingDown, Wallet, RefreshCw, Trash2, Zap, TrendingUp, Edit2, Save, X, Calendar, ChevronLeft, ChevronRight, Lock, Plus, User, Key } from 'lucide-react';
import { useEffect, useState } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { motion } from "framer-motion";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Home() {
  // ESTADOS DE AUTENTICAÇÃO E NAVEGAÇÃO
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [currentDate, setCurrentDate] = useState(new Date()); 
  
  // DADOS DO SISTEMA
  const [data, setData] = useState({ 
    balance: 0, 
    expenses: 0, 
    invested_month: 0, 
    invested_global: 0, 
    transactions: [], 
    investments: [], 
    categories: {} 
  });
  const [loading, setLoading] = useState(true);

  // ESTADOS DO MODAL "NOVO REGISTRO"
  const [showModal, setShowModal] = useState(false);
  const [newItem, setNewItem] = useState({ type: 'expense', desc: '', amount: '', cat: 'Outros' });

  // ESTADOS DE EDIÇÃO
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCat, setEditCat] = useState("");

  // AUXILIAR: Formata data YYYY-MM
  const getMonthStr = (date: Date) => date.toISOString().slice(0, 7);

  // BUSCA DADOS
  const fetchDashboard = async () => {
    try {
      if (!editingId && isAuthenticated) {
        const response = await fetch(`http://127.0.0.1:8000/dashboard?month=${getMonthStr(currentDate)}`);
        const jsonData = await response.json();
        setData(jsonData);
        setLoading(false);
      }
    } catch (error) { console.error(error); }
  };

  // AUTO-REFRESH
  useEffect(() => { 
    if(isAuthenticated) {
        fetchDashboard(); 
        const interval = setInterval(fetchDashboard, 5000);
        return () => clearInterval(interval);
    }
  }, [isAuthenticated, editingId, currentDate]);

  // NAVEGAR NOS MESES
  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
    setLoading(true);
  };

  // --- FUNÇÕES DE AÇÃO (CRIAR, EDITAR, DELETAR) ---

  // 1. CRIAR NOVO (Manual)
  const handleCreate = async (e: any) => {
    e.preventDefault();
    // Define a data como o dia 01 do mês que está na tela (para inserção retroativa)
    const dateStr = `${getMonthStr(currentDate)}-01`; 
    
    try {
        if (newItem.type === 'investment') {
            await fetch('http://127.0.0.1:8000/investments', {
                method: 'POST', 
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ asset: newItem.desc, amount: parseFloat(newItem.amount), date: dateStr })
            });
        } else {
            // Se for Entrada, valor positivo. Se for Gasto, valor negativo.
            const amount = newItem.type === 'income' ? parseFloat(newItem.amount) : -parseFloat(newItem.amount);
            await fetch('http://127.0.0.1:8000/transactions', {
                method: 'POST', 
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ description: newItem.desc, amount, category: newItem.cat, date: dateStr })
            });
        }
        setShowModal(false);
        setNewItem({ type: 'expense', desc: '', amount: '', cat: 'Outros' });
        fetchDashboard();
    } catch (error) { alert("Erro ao salvar."); }
  };

  // 2. DELETAR
  const deleteItem = async (type: string, id: number) => {
    if (!confirm("Deletar registro?")) return;
    await fetch(`http://127.0.0.1:8000/${type}/${id}`, { method: 'DELETE' });
    fetchDashboard();
  };

  // 3. INICIAR EDIÇÃO
  const startEditing = (item: any, type: string) => {
    setEditingId(item.id); 
    setEditDesc(type === 'investments' ? item.asset : item.description);
    setEditAmount(item.amount.toString());
    setEditCat(item.category || "Outros");
  };

  // 4. SALVAR EDIÇÃO
  const saveEdit = async () => {
    if (!editingId) return;
    const isInvest = activeTab === 'investments';
    const endpoint = isInvest ? 'investments' : 'transactions';
    
    const body = isInvest 
        ? { asset: editDesc, amount: parseFloat(editAmount) } 
        : { description: editDesc, amount: parseFloat(editAmount), category: editCat };

    await fetch(`http://127.0.0.1:8000/${endpoint}/${editingId}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(body) 
    });
    setEditingId(null); fetchDashboard();
  };

  // TELA DE LOGIN (Se não autenticado)
  if (!isAuthenticated) return <LoginPage onLogin={() => setIsAuthenticated(true)} />;

  // DADOS DO GRÁFICO
  const chartData = {
    labels: Object.keys(data.categories),
    datasets: [{
      data: Object.values(data.categories),
      backgroundColor: ['#ff0055', '#00f3ff', '#00ff9f', '#fcee0a', '#bc13fe'],
      borderColor: '#000', borderWidth: 2,
    }],
  };

  return (
    <main className="min-h-screen pl-64 font-sans bg-cyber-darkest text-white" style={{ fontFamily: 'var(--font-rajdhani)' }}>
      <Sidebar activeTab={activeTab} onNavigate={setActiveTab} />
      
      {/* --- MODAL DE CRIAÇÃO (+ NOVO) --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.div initial={{scale:0.9, opacity: 0}} animate={{scale:1, opacity: 1}} className="bg-cyber-dark p-8 rounded-2xl border border-cyber-blue w-96 shadow-[0_0_50px_rgba(0,243,255,0.2)]">
                <h3 className="text-xl font-bold text-white mb-6 font-orbitron tracking-wider text-center">NOVO REGISTRO</h3>
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="text-xs text-cyber-blue font-bold tracking-widest block mb-1">TIPO DE OPERAÇÃO</label>
                        <select className="w-full bg-black/50 border border-white/20 rounded p-3 text-white focus:border-cyber-blue outline-none" value={newItem.type} onChange={e=>setNewItem({...newItem, type: e.target.value})}>
                            <option value="expense">💸 Gasto (Despesa)</option>
                            <option value="income">💰 Entrada (Saldo)</option>
                            <option value="investment">📈 Investimento</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-cyber-blue font-bold tracking-widest block mb-1">DESCRIÇÃO</label>
                        <input required className="w-full bg-black/50 border border-white/20 rounded p-3 text-white focus:border-cyber-blue outline-none" value={newItem.desc} onChange={e=>setNewItem({...newItem, desc: e.target.value})} placeholder="Ex: Salário, Pizza, Bitcoin" />
                    </div>
                    <div>
                        <label className="text-xs text-cyber-blue font-bold tracking-widest block mb-1">VALOR (R$)</label>
                        <input required type="number" step="0.01" className="w-full bg-black/50 border border-white/20 rounded p-3 text-white focus:border-cyber-blue outline-none" value={newItem.amount} onChange={e=>setNewItem({...newItem, amount: e.target.value})} placeholder="0.00" />
                    </div>
                    
                    {newItem.type === 'expense' && (
                        <div>
                            <label className="text-xs text-cyber-blue font-bold tracking-widest block mb-1">CATEGORIA</label>
                            <select className="w-full bg-black/50 border border-white/20 rounded p-3 text-white focus:border-cyber-blue outline-none" value={newItem.cat} onChange={e=>setNewItem({...newItem, cat: e.target.value})}>
                                <option>Alimentação</option>
                                <option>Transporte</option>
                                <option>Casa</option>
                                <option>Lazer</option>
                                <option>Renda</option>
                                <option>Outros</option>
                            </select>
                        </div>
                    )}

                    <div className="flex gap-3 mt-8 pt-4 border-t border-white/10">
                        <button type="button" onClick={()=>setShowModal(false)} className="flex-1 py-3 rounded bg-white/5 hover:bg-white/10 text-gray-400 font-bold transition-colors">CANCELAR</button>
                        <button type="submit" className="flex-1 py-3 rounded bg-cyber-blue text-black font-bold hover:bg-cyan-300 transition-colors shadow-[0_0_15px_rgba(0,243,255,0.4)]">SALVAR</button>
                    </div>
                </form>
            </motion.div>
        </div>
      )}

      <div className="p-10 max-w-7xl mx-auto space-y-8">
        
        {/* HEADER PRINCIPAL */}
        <div className="flex justify-between items-end border-b border-white/5 pb-6">
            <div>
                <h2 className="text-4xl font-bold text-white mb-1 tracking-wider font-orbitron">
                    {activeTab === 'dashboard' ? 'VISÃO GERAL' : activeTab === 'investments' ? 'CARTEIRA' : 'RELATÓRIOS'}
                </h2>
                <div className="flex items-center gap-4 mt-2">
                    <button onClick={() => changeMonth(-1)} className="p-1 hover:text-cyber-blue transition-colors"><ChevronLeft/></button>
                    <div className="flex items-center gap-2 text-cyber-blue font-mono text-lg border border-cyber-blue/30 px-4 py-1 rounded bg-cyber-blue/5">
                        <Calendar size={18} />
                        {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                    </div>
                    <button onClick={() => changeMonth(1)} className="p-1 hover:text-cyber-blue transition-colors"><ChevronRight/></button>
                </div>
            </div>
            
            <div className="flex gap-4">
                {/* BOTÃO + NOVO */}
                <button onClick={()=>setShowModal(true)} className="flex items-center gap-2 px-6 py-2 bg-cyber-green/10 border border-cyber-green text-cyber-green rounded hover:bg-cyber-green hover:text-black transition-all duration-300 font-bold tracking-widest text-xs uppercase shadow-[0_0_15px_rgba(0,255,159,0.3)] hover:shadow-[0_0_25px_rgba(0,255,159,0.6)]">
                    <Plus size={16}/> NOVO
                </button>
                
                {/* BOTÃO SINCRONIZAR */}
                <button onClick={fetchDashboard} className="flex items-center gap-2 px-6 py-2 bg-cyber-blue/10 border border-cyber-blue text-cyber-blue rounded hover:bg-cyber-blue hover:text-black transition-all duration-300 font-bold tracking-widest text-xs uppercase shadow-[0_0_15px_rgba(0,243,255,0.3)] hover:shadow-[0_0_25px_rgba(0,243,255,0.6)]">
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                </button>
            </div>
        </div>

        {/* --- ABA DASHBOARD --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <NeonCard icon={<Wallet size={32} />} label="Saldo Líquido (Mês)" value={data.balance} color="blue" />
              <NeonCard icon={<TrendingDown size={32} />} label="Gastos do Mês" value={data.expenses} color="red" />
              <NeonCard icon={<TrendingUp size={32} />} label="Total Investido (Global)" value={data.invested_global} color="green" />
            </div>
            
            <div className="rounded-xl border border-white/10 bg-cyber-dark/40 backdrop-blur-md overflow-hidden">
              <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                  <h3 className="text-xl text-white font-bold tracking-wide flex items-center gap-2"><Zap className="text-cyber-yellow"/> Transações do Mês</h3>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {data.transactions.length === 0 ? <div className="p-10 text-center text-gray-600">Nenhum registro encontrado neste mês.</div> : data.transactions.map((t: any) => (
                    <div key={t.id} className={`flex justify-between items-center p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${editingId === t.id ? 'bg-cyber-blue/10' : ''}`}>
                        {editingId === t.id ? (
                           // MODO EDIÇÃO (DASHBOARD)
                           <div className="flex w-full gap-2 items-center">
                               <input value={editDesc} onChange={e=>setEditDesc(e.target.value)} className="bg-black/50 border border-white/20 text-white px-3 py-1 rounded w-full"/>
                               <input value={editAmount} type="number" onChange={e=>setEditAmount(e.target.value)} className="bg-black/50 border border-white/20 text-white px-3 py-1 rounded w-32"/>
                               <select value={editCat} onChange={e=>setEditCat(e.target.value)} className="bg-black/50 border border-white/20 text-white px-3 py-1 rounded">
                                   <option>Alimentação</option><option>Transporte</option><option>Casa</option><option>Lazer</option><option>Renda</option><option>Outros</option>
                               </select>
                               <button onClick={saveEdit} className="p-2 text-cyber-green hover:bg-cyber-green/20 rounded"><Save size={18}/></button>
                           </div>
                        ) : (
                           // MODO VISUALIZAÇÃO (DASHBOARD)
                           <>
                            <div className="flex items-center gap-4">
                                <div className="flex gap-2">
                                    <button onClick={()=>deleteItem('transactions', t.id)} className="p-2 bg-white/5 rounded text-gray-400 hover:bg-cyber-red hover:text-white transition-all"><Trash2 size={16}/></button>
                                    <button onClick={()=>startEditing(t, 'transactions')} className="p-2 bg-white/5 rounded text-gray-400 hover:bg-cyber-blue hover:text-white transition-all"><Edit2 size={16}/></button>
                                </div>
                                <div>
                                    <span className="text-white font-bold block text-lg">{t.description}</span>
                                    <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/5 tracking-wider">{t.category} • {t.date}</span>
                                </div>
                            </div>
                            <span className={`text-xl font-bold font-mono ${t.amount < 0 ? 'text-cyber-red' : 'text-cyber-blue'}`}>
                                {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                           </>
                        )}
                    </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- ABA INVESTIMENTOS --- */}
        {activeTab === 'investments' && (
          <div className="space-y-8">
            <div className="p-8 rounded-2xl bg-gradient-to-r from-green-900/20 to-cyber-dark border border-green-500/30 flex items-center justify-between shadow-[0_0_30px_rgba(0,255,159,0.1)]">
                <div>
                    <h2 className="text-3xl font-bold text-cyber-green mb-2">Aportes em {currentDate.toLocaleDateString('pt-BR', { month: 'long' })}</h2>
                    <p className="text-gray-400">Total investido apenas neste mês</p>
                </div>
                <div className="text-5xl font-bold text-white font-mono drop-shadow-[0_0_10px_rgba(0,255,159,0.5)]">
                    {data.invested_month.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-cyber-dark/40 backdrop-blur-md overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                    <h3 className="text-xl text-white font-bold tracking-wide flex items-center gap-2"><TrendingUp className="text-cyber-green"/> Ativos do Mês</h3>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                    {data.investments.length === 0 ? <div className="p-10 text-center text-gray-600">Nenhum aporte neste mês.</div> : data.investments.map((t: any) => (
                        <div key={t.id} className={`flex justify-between items-center p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${editingId === t.id ? 'bg-cyber-blue/10' : ''}`}>
                            {editingId === t.id ? (
                                // MODO EDIÇÃO (INVESTIMENTOS)
                                <div className="flex w-full gap-2 items-center">
                                    <input value={editDesc} onChange={e=>setEditDesc(e.target.value)} className="bg-black/50 border border-white/20 text-white px-3 py-1 rounded w-full"/>
                                    <input value={editAmount} type="number" onChange={e=>setEditAmount(e.target.value)} className="bg-black/50 border border-white/20 text-white px-3 py-1 rounded w-32"/>
                                    <button onClick={saveEdit} className="p-2 text-cyber-green hover:bg-cyber-green/20 rounded"><Save size={18}/></button>
                                </div>
                            ) : (
                                // MODO VISUALIZAÇÃO (INVESTIMENTOS)
                                <>
                                    <div className="flex items-center gap-4">
                                        <div className="flex gap-2">
                                            <button onClick={()=>deleteItem('investments', t.id)} className="p-2 bg-white/5 rounded text-gray-400 hover:bg-cyber-red hover:text-white transition-all"><Trash2 size={16}/></button>
                                            <button onClick={()=>startEditing(t, 'investments')} className="p-2 bg-white/5 rounded text-gray-400 hover:bg-cyber-blue hover:text-white transition-all"><Edit2 size={16}/></button>
                                        </div>
                                        <span className="text-white font-bold block text-lg">{t.asset}</span>
                                    </div>
                                    <span className="text-xl font-bold font-mono text-cyber-green">
                                        {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
          </div>
        )}

        {/* --- ABA RELATÓRIOS --- */}
        {activeTab === 'reports' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl bg-cyber-dark/50 border border-white/10 flex flex-col items-center relative">
               <h3 className="text-white font-bold mb-6 tracking-widest text-lg">DISTRIBUIÇÃO DE GASTOS</h3>
               <div className="w-80 h-80">
                   <Doughnut data={chartData} options={{ plugins: { legend: { labels: { color: 'white', font: { family: "'Courier New', monospace" } }, position: 'bottom' } } }} />
               </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

// --- COMPONENTES VISUAIS (LOGIN & CARDS) ---

function LoginPage({ onLogin }: any) { 
    const [user, setUser] = useState(""); 
    const [pass, setPass] = useState(""); 
    const [error, setError] = useState("");

    const handleLogin = async (e: any) => { 
        e.preventDefault(); 
        try { 
            const res = await fetch('http://127.0.0.1:8000/login', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ username: user, password: pass }) 
            }); 
            if (res.ok) onLogin(); 
            else setError("ACESSO NEGADO: CREDENCIAIS INVÁLIDAS"); 
        } catch { setError("ERRO: SERVIDOR OFFLINE"); } 
    };

    return (
        <div className="min-h-screen bg-cyber-darkest flex items-center justify-center font-sans relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,243,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px]" />
            
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-cyber-dark p-10 rounded-2xl border border-cyber-blue/30 relative z-10 w-full max-w-md shadow-[0_0_60px_rgba(0,243,255,0.15)]">
                <div className="flex justify-center mb-8">
                    <div className="w-20 h-20 bg-cyber-blue rounded-2xl flex items-center justify-center shadow-[0_0_25px_#00f3ff]">
                        <Lock size={40} className="text-black" />
                    </div>
                </div>
                <h2 className="text-3xl text-center font-bold text-white mb-2 font-orbitron tracking-widest">ZENITH SECURITY</h2>
                <p className="text-center text-cyber-blue/60 font-mono text-xs mb-8">PROTOCOL v4.2 // AUTHENTICATION REQUIRED</p>
                
                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs text-cyber-blue font-bold tracking-widest ml-1">USUÁRIO</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-cyber-blue/50" size={18} />
                            <input type="text" value={user} onChange={e=>setUser(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 text-white focus:outline-none focus:border-cyber-blue transition-colors font-mono" placeholder="Identificação" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-cyber-blue font-bold tracking-widest ml-1">SENHA</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-3 text-cyber-blue/50" size={18} />
                            <input type="password" value={pass} onChange={e=>setPass(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 text-white focus:outline-none focus:border-cyber-blue transition-colors font-mono" placeholder="••••••••" />
                        </div>
                    </div>
                    {error && <p className="text-cyber-red text-center text-xs font-bold animate-pulse bg-cyber-red/10 p-2 rounded">{error}</p>}
                    <button className="w-full bg-cyber-blue/10 border border-cyber-blue text-cyber-blue py-3 rounded-lg hover:bg-cyber-blue hover:text-black transition-all duration-300 font-bold tracking-widest shadow-[0_0_15px_rgba(0,243,255,0.2)]">
                        AUTENTICAR
                    </button>
                </form>
            </motion.div>
        </div>
    );
}

function NeonCard({ icon, label, value, color }: any) { 
    const colors: any = { blue: 'text-cyber-blue border-cyber-blue/50', red: 'text-cyber-red border-cyber-red/50', green: 'text-cyber-green border-cyber-green/50' }; 
    const textColors: any = { blue: 'text-cyber-blue', red: 'text-cyber-red', green: 'text-cyber-green' };
    const safeValue = value || 0; 
    
    return (
        <div className={`p-6 rounded-xl bg-cyber-dark/80 border border-white/10 backdrop-blur-xl relative group hover:${colors[color]} transition-all duration-500`}>
            <div className={`absolute right-4 top-4 opacity-20 group-hover:opacity-100 transition-all duration-500 ${textColors[color]}`}>{icon}</div>
            <p className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-1 group-hover:text-white transition-colors">{label}</p>
            <h3 className={`text-4xl font-bold font-mono ${textColors[color]}`}>{safeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
        </div>
    ); 
}