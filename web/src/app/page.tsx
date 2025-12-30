"use client";
import Sidebar from "@/components/Sidebar";
import { TrendingDown, Wallet, RefreshCw, Trash2, Zap, TrendingUp, Edit2, Save, X, Calendar, ChevronLeft, ChevronRight, Lock, Plus, User, Key, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useEffect, useState } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { motion } from "framer-motion";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [currentDate, setCurrentDate] = useState(new Date()); 
  
  // DADOS COM ESTRUTURA NOVA
  const [data, setData] = useState({ 
    balance: 0, 
    expenses: 0, 
    invested_total: 0,     // Total investido (Custo)
    portfolio_value: 0,    // Valor atual (Cotação)
    transactions: [], 
    investments: [], 
    categories: {} 
  });
  const [loading, setLoading] = useState(true);

  // MODAL NOVO
  const [showModal, setShowModal] = useState(false);
  const [newItem, setNewItem] = useState({ 
      type: 'expense', 
      desc: '',        // Usado para Descrição OU Ticker
      amount: '',      // Usado para Valor R$ OU Quantidade
      price: '',       // Novo: Preço pago (só para investimentos)
      cat: 'Outros' 
  });

  const getMonthStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const fetchDashboard = async () => {
    try {
      if (isAuthenticated) {
        const response = await fetch(`https://zenith-finance-1.onrender.com/dashboard?month=${getMonthStr(currentDate)}`);
        const jsonData = await response.json();
        setData(jsonData);
        setLoading(false);
      }
    } catch (error) { console.error(error); }
  };

  useEffect(() => { 
    if(isAuthenticated) {
        fetchDashboard(); 
        const interval = setInterval(fetchDashboard, 10000); // Atualiza a cada 10s (para cotações)
        return () => clearInterval(interval);
    }
  }, [isAuthenticated, currentDate]);

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
    setLoading(true);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.value) {
        const [year, month] = e.target.value.split('-');
        setCurrentDate(new Date(parseInt(year), parseInt(month) - 1, 1));
        setLoading(true);
    }
  }

  const handleCreate = async (e: any) => {
    e.preventDefault();
    const dateStr = `${getMonthStr(currentDate)}-01`; 
    
    try {
        if (newItem.type === 'investment') {
            // Lógica de Investimento (Ticker + Quantidade + Preço Pago)
            await fetch('https://zenith-finance-1.onrender.com/investments', {
                method: 'POST', 
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    ticker: newItem.desc,         // ex: BTC-USD
                    quantity: parseFloat(newItem.amount), // ex: 0.5
                    price: parseFloat(newItem.price || "0"), // ex: 50000
                    date: dateStr 
                })
            });
        } else {
            // Lógica Normal (Transações)
            const amount = newItem.type === 'income' ? parseFloat(newItem.amount) : -parseFloat(newItem.amount);
            await fetch('https://zenith-finance-1.onrender.com/transactions', {
                method: 'POST', 
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ description: newItem.desc, amount, category: newItem.cat, date: dateStr })
            });
        }
        setShowModal(false);
        setNewItem({ type: 'expense', desc: '', amount: '', price: '', cat: 'Outros' });
        fetchDashboard();
    } catch (error) { alert("Erro ao salvar."); }
  };

  const deleteItem = async (type: string, id: number) => {
    if (!confirm("Deletar registro?")) return;
    await fetch(`https://zenith-finance-1.onrender.com/${type}/${id}`, { method: 'DELETE' });
    fetchDashboard();
  };

  if (!isAuthenticated) return <LoginPage onLogin={() => setIsAuthenticated(true)} />;

  // Dados para o Gráfico
  const chartData = {
    labels: Object.keys(data.categories),
    datasets: [{
      data: Object.values(data.categories),
      backgroundColor: ['#ff0055', '#00f3ff', '#00ff9f', '#fcee0a', '#bc13fe'],
      borderColor: '#000', borderWidth: 2,
    }],
  };

  // Cálculo de Lucro Total da Carteira
  const totalProfit = data.portfolio_value - data.invested_total;
  const isProfit = totalProfit >= 0;

  return (
    <main className="min-h-screen pl-64 font-sans bg-cyber-darkest text-white" style={{ fontFamily: 'var(--font-rajdhani)' }}>
      <Sidebar activeTab={activeTab} onNavigate={setActiveTab} />
      
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.div initial={{scale:0.9, opacity: 0}} animate={{scale:1, opacity: 1}} className="bg-cyber-dark p-8 rounded-2xl border border-cyber-blue w-96 shadow-[0_0_50px_rgba(0,243,255,0.2)]">
                <h3 className="text-xl font-bold text-white mb-6 font-orbitron tracking-wider text-center">NOVO REGISTRO</h3>
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="text-xs text-cyber-blue font-bold tracking-widest block mb-1">TIPO</label>
                        <select className="w-full bg-black/50 border border-white/20 rounded p-3 text-white focus:border-cyber-blue outline-none" value={newItem.type} onChange={e=>setNewItem({...newItem, type: e.target.value})}>
                            <option value="expense">💸 Gasto</option>
                            <option value="income">💰 Entrada</option>
                            <option value="investment">📈 Investimento (Ações/Crypto)</option>
                        </select>
                    </div>

                    {newItem.type === 'investment' ? (
                        <>
                             <div>
                                <label className="text-xs text-cyber-green font-bold tracking-widest block mb-1">CÓDIGO (TICKER)</label>
                                <input required className="w-full bg-black/50 border border-white/20 rounded p-3 text-white focus:border-cyber-green outline-none uppercase" value={newItem.desc} onChange={e=>setNewItem({...newItem, desc: e.target.value.toUpperCase()})} placeholder="Ex: PETR4.SA, BTC-USD, AAPL" />
                                <p className="text-[10px] text-gray-500 mt-1">*Use .SA para Brasil (ex: VALE3.SA)</p>
                            </div>
                            <div className="flex gap-2">
                                <div>
                                    <label className="text-xs text-cyber-green font-bold tracking-widest block mb-1">QUANTIDADE</label>
                                    <input required type="number" step="any" className="w-full bg-black/50 border border-white/20 rounded p-3 text-white focus:border-cyber-green outline-none" value={newItem.amount} onChange={e=>setNewItem({...newItem, amount: e.target.value})} placeholder="Ex: 100" />
                                </div>
                                <div>
                                    <label className="text-xs text-cyber-green font-bold tracking-widest block mb-1">PREÇO PAGO (UN)</label>
                                    <input required type="number" step="any" className="w-full bg-black/50 border border-white/20 rounded p-3 text-white focus:border-cyber-green outline-none" value={newItem.price} onChange={e=>setNewItem({...newItem, price: e.target.value})} placeholder="Ex: 35.50" />
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="text-xs text-cyber-blue font-bold tracking-widest block mb-1">DESCRIÇÃO</label>
                                <input required className="w-full bg-black/50 border border-white/20 rounded p-3 text-white focus:border-cyber-blue outline-none" value={newItem.desc} onChange={e=>setNewItem({...newItem, desc: e.target.value})} placeholder="Ex: Salário, Pizza" />
                            </div>
                            <div>
                                <label className="text-xs text-cyber-blue font-bold tracking-widest block mb-1">VALOR (R$)</label>
                                <input required type="number" step="0.01" className="w-full bg-black/50 border border-white/20 rounded p-3 text-white focus:border-cyber-blue outline-none" value={newItem.amount} onChange={e=>setNewItem({...newItem, amount: e.target.value})} placeholder="0.00" />
                            </div>
                            {newItem.type === 'expense' && (
                                <div>
                                    <label className="text-xs text-cyber-blue font-bold tracking-widest block mb-1">CATEGORIA</label>
                                    <select className="w-full bg-black/50 border border-white/20 rounded p-3 text-white focus:border-cyber-blue outline-none" value={newItem.cat} onChange={e=>setNewItem({...newItem, cat: e.target.value})}>
                                        <option>Alimentação</option><option>Transporte</option><option>Casa</option><option>Lazer</option><option>Renda</option><option>Outros</option>
                                    </select>
                                </div>
                            )}
                        </>
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
        
        {/* HEADER */}
        <div className="flex justify-between items-end border-b border-white/5 pb-6">
            <div>
                <h2 className="text-4xl font-bold text-white mb-1 tracking-wider font-orbitron">
                    {activeTab === 'dashboard' ? 'VISÃO GERAL' : activeTab === 'investments' ? 'PORTFOLIO' : 'RELATÓRIOS'}
                </h2>
                <div className="flex items-center gap-4 mt-2">
                    <button onClick={() => changeMonth(-1)} className="p-1 hover:text-cyber-blue transition-colors"><ChevronLeft/></button>
                    <div className="relative group">
                        <div className="flex items-center gap-2 text-cyber-blue font-mono text-lg border border-cyber-blue/30 px-4 py-1 rounded bg-cyber-blue/5 cursor-pointer hover:bg-cyber-blue/10 transition-colors">
                            <Calendar size={18} />
                            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                        </div>
                        <input type="month" value={getMonthStr(currentDate)} onChange={handleDateChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                    </div>
                    <button onClick={() => changeMonth(1)} className="p-1 hover:text-cyber-blue transition-colors"><ChevronRight/></button>
                </div>
            </div>
            
            <div className="flex gap-4">
                <button onClick={()=>setShowModal(true)} className="flex items-center gap-2 px-6 py-2 bg-cyber-green/10 border border-cyber-green text-cyber-green rounded hover:bg-cyber-green hover:text-black transition-all duration-300 font-bold tracking-widest text-xs uppercase shadow-[0_0_15px_rgba(0,255,159,0.3)] hover:shadow-[0_0_25px_rgba(0,255,159,0.6)]">
                    <Plus size={16}/> NOVO
                </button>
                <button onClick={fetchDashboard} className="flex items-center gap-2 px-6 py-2 bg-cyber-blue/10 border border-cyber-blue text-cyber-blue rounded hover:bg-cyber-blue hover:text-black transition-all duration-300 font-bold tracking-widest text-xs uppercase shadow-[0_0_15px_rgba(0,243,255,0.3)] hover:shadow-[0_0_25px_rgba(0,243,255,0.6)]">
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                </button>
            </div>
        </div>

        {/* --- ABA DASHBOARD --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <NeonCard icon={<Wallet size={32} />} label="Saldo Líquido (Conta)" value={data.balance} color="blue" />
              <NeonCard icon={<TrendingDown size={32} />} label="Gastos do Mês" value={data.expenses} color="red" />
              <NeonCard icon={<TrendingUp size={32} />} label="Valor do Portfolio (Hoje)" value={data.portfolio_value} color="green" />
            </div>
            
            <div className="rounded-xl border border-white/10 bg-cyber-dark/40 backdrop-blur-md overflow-hidden">
              <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                  <h3 className="text-xl text-white font-bold tracking-wide flex items-center gap-2"><Zap className="text-cyber-yellow"/> Transações Recentes</h3>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {data.transactions.length === 0 ? <div className="p-10 text-center text-gray-600">Nenhum registro encontrado.</div> : data.transactions.map((t: any) => (
                    <div key={t.id} className="flex justify-between items-center p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-4">
                            <button onClick={()=>deleteItem('transactions', t.id)} className="p-2 bg-white/5 rounded text-gray-400 hover:bg-cyber-red hover:text-white transition-all"><Trash2 size={16}/></button>
                            <div>
                                <span className="text-white font-bold block text-lg">{t.description}</span>
                                <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/5 tracking-wider">{t.category} • {t.date}</span>
                            </div>
                        </div>
                        <span className={`text-xl font-bold font-mono ${t.type === 'receita' ? 'text-cyber-green' : 'text-cyber-red'}`}>
                            {t.type === 'receita' ? '+' : ''} {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- ABA INVESTIMENTOS (PORTFOLIO REAL) --- */}
        {activeTab === 'investments' && (
          <div className="space-y-8">
            <div className={`p-8 rounded-2xl border flex items-center justify-between shadow-lg transition-colors duration-500 ${isProfit ? 'bg-green-900/10 border-green-500/30' : 'bg-red-900/10 border-red-500/30'}`}>
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-wide">Patrimônio Total</h2>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`px-3 py-1 rounded text-xs font-bold tracking-widest ${isProfit ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {isProfit ? 'LUCRO' : 'PREJUÍZO'} TOTAL: {Math.abs(totalProfit).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-5xl font-bold text-white font-mono drop-shadow-md">
                        {data.portfolio_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                    <p className="text-gray-500 text-sm mt-1">Atualizado em Tempo Real</p>
                </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-cyber-dark/40 backdrop-blur-md overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                    <h3 className="text-xl text-white font-bold tracking-wide flex items-center gap-2"><TrendingUp className="text-cyber-green"/> Seus Ativos</h3>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                    {data.investments.length === 0 ? <div className="p-10 text-center text-gray-600">Nenhum investimento cadastrado.</div> : data.investments.map((t: any) => (
                        <div key={t.id} className="flex justify-between items-center p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-4">
                                <button onClick={()=>deleteItem('investments', t.id)} className="p-2 bg-white/5 rounded text-gray-400 hover:bg-cyber-red hover:text-white transition-all"><Trash2 size={16}/></button>
                                <div>
                                    <span className="text-white font-bold block text-lg tracking-widest">{t.ticker}</span>
                                    <span className="text-xs text-gray-500">{t.quantity} un • P. Médio: {t.purchase_price.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xl font-bold font-mono text-white block">
                                    {t.total_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                                <span className={`text-xs font-bold flex items-center justify-end gap-1 ${t.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {t.profit >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                                    {t.profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </div>
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
            if (res.ok) onLogin(); else setError("ACESSO NEGADO"); 
        } catch { setError("ERRO: SERVIDOR OFFLINE"); } 
    };
    return (
        <div className="min-h-screen bg-cyber-darkest flex items-center justify-center font-sans">
            <div className="bg-cyber-dark p-10 rounded-2xl border border-cyber-blue/30 w-full max-w-md shadow-lg">
                <div className="flex justify-center mb-8"><div className="w-20 h-20 bg-cyber-blue rounded-2xl flex items-center justify-center shadow-md"><Lock size={40} className="text-black" /></div></div>
                <h2 className="text-3xl text-center font-bold text-white mb-8 font-orbitron tracking-widest">ZENITH SECURITY</h2>
                <form onSubmit={handleLogin} className="space-y-6">
                    <input type="text" value={user} onChange={e=>setUser(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-cyber-blue" placeholder="Usuário" />
                    <input type="password" value={pass} onChange={e=>setPass(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-cyber-blue" placeholder="Senha" />
                    {error && <p className="text-red-500 text-center text-xs font-bold">{error}</p>}
                    <button className="w-full bg-cyber-blue/10 border border-cyber-blue text-cyber-blue py-3 rounded-lg hover:bg-cyber-blue hover:text-black transition-all font-bold">AUTENTICAR</button>
                </form>
            </div>
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