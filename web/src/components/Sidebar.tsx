import { Home, PieChart, Wallet, LogOut, TrendingUp } from 'lucide-react';

export default function Sidebar({ activeTab, onNavigate }: any) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-cyber-dark border-r border-white/10 flex flex-col justify-between p-6 z-50">
      <div>
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-cyber-blue rounded-lg shadow-[0_0_15px_#00f0ff] flex items-center justify-center">
            <span className="font-bold text-black text-xl">Z</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wider font-orbitron">ZENITH</h1>
        </div>

        <nav className="space-y-4">
          <NavItem icon={<Home size={20} />} label="Dashboard" id="dashboard" activeTab={activeTab} onClick={onNavigate} />
          <NavItem icon={<TrendingUp size={20} />} label="Investimentos" id="investments" activeTab={activeTab} onClick={onNavigate} />
          <NavItem icon={<PieChart size={20} />} label="Relatórios" id="reports" activeTab={activeTab} onClick={onNavigate} />
        </nav>
      </div>

      <button className="flex items-center gap-3 text-gray-500 hover:text-cyber-red transition-colors font-mono text-sm">
        <LogOut size={18} />
        <span>DESCONECTAR</span>
      </button>
    </aside>
  );
}

function NavItem({ icon, label, id, activeTab, onClick }: any) {
  const active = activeTab === id;
  return (
    <div onClick={() => onClick(id)} className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all duration-300 ${active ? 'bg-cyber-blue/10 text-cyber-blue border border-cyber-blue/20 shadow-[0_0_10px_rgba(0,243,255,0.1)]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
      {icon}
      <span className="font-mono text-sm tracking-wide">{label}</span>
    </div>
  );
}