import { useState, type ReactNode } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { 
  Menu, X, ChevronDown, LogOut, LayoutDashboard, 
  Wallet, ArrowRightLeft, PieChart, TrendingUp, TrendingDown, Layers
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null); // Mobile
  const [desktopMenu, setDesktopMenu] = useState<string | null>(null); // Desktop

  const isActive = (path: string) => 
    location.pathname === path ? "bg-sky-600 text-white shadow-lg shadow-sky-900/20" : "text-slate-400 hover:text-white hover:bg-slate-800";

  const toggleSubmenu = (menu: string) => {
    setOpenSubmenu(openSubmenu === menu ? null : menu);
  };

  const handleSignOut = async () => {
    try { await signOut(); navigate("/auth"); } catch(e) { console.error(e); }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-50 font-sans">
      
      {/* HEADER SUPERIOR */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-4">
          
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-slate-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-emerald-600 to-sky-600">
              <LayoutDashboard size={18} className="text-white" />
            </div>
            SIRIUS
          </Link>

          {/* --- MENU DESKTOP --- */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium" onMouseLeave={() => setDesktopMenu(null)}>
            <Link to="/" className={`px-3 py-2 rounded-md transition-all ${isActive("/")}`}>Dashboard</Link>
            
            {/* Menu Entradas */}
            <div className="relative" onMouseEnter={() => setDesktopMenu("entradas")}>
              <button className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-white transition-all">
                Entradas <ChevronDown size={14} />
              </button>
              {desktopMenu === "entradas" && (
                <div className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-slate-700 bg-slate-900/95 p-1 shadow-2xl">
                  <Link to="/entradas/adicionar" className="block px-3 py-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white">Adicionar Entrada</Link>
                  <Link to="/entradas/fontes" className="block px-3 py-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white">Fontes de Renda</Link>
                </div>
              )}
            </div>

            {/* Menu Saídas */}
            <div className="relative" onMouseEnter={() => setDesktopMenu("saidas")}>
              <button className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-white transition-all">
                Saídas <ChevronDown size={14} />
              </button>
              {desktopMenu === "saidas" && (
                <div className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-slate-700 bg-slate-900/95 p-1 shadow-2xl">
                  <Link to="/saidas/adicionar" className="block px-3 py-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white">Adicionar Saída</Link>
                  <Link to="/categorias" className="block px-3 py-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white">Categorias</Link>
                </div>
              )}
            </div>

            {/* Menu Análises */}
            <div className="relative" onMouseEnter={() => setDesktopMenu("analises")}>
              <button className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-white transition-all">
                Análises <ChevronDown size={14} />
              </button>
              {desktopMenu === "analises" && (
                <div className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-slate-700 bg-slate-900/95 p-1 shadow-2xl">
                  <Link to="/comparar" className="block px-3 py-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white">Comparativo Mensal</Link>
                  <Link to="/analise-produtos" className="block px-3 py-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white">Pesquisa de Preços</Link>
                </div>
              )}
            </div>

            <Link to="/banco" className={`px-3 py-2 rounded-md transition-all ${isActive("/banco")}`}>Carteira</Link>
            
            <div className="w-px h-6 bg-slate-800 mx-2"></div>
            
            <button onClick={handleSignOut} className="flex items-center gap-2 px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-md transition-all">
              <LogOut size={16} /> Sair
            </button>
          </nav>

          {/* BOTÃO MOBILE */}
          <button className="md:hidden p-2 text-slate-300" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* --- MENU MOBILE (Expandido) --- */}
        {isMobileMenuOpen && (
          <div className="border-b border-slate-800 bg-slate-900 md:hidden animate-in slide-in-from-top-5">
            <div className="flex flex-col p-4 space-y-1">
              <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium ${isActive("/")}`}>
                <LayoutDashboard size={18}/> Dashboard
              </Link>
              
              {/* Submenu Entradas Mobile */}
              <button onClick={() => toggleSubmenu("entradas")} className="flex w-full items-center justify-between px-4 py-3 text-slate-400 hover:text-white">
                <span className="flex items-center gap-3"><TrendingUp size={18} className="text-emerald-500"/> Entradas</span>
                <ChevronDown size={16} className={openSubmenu === "entradas" ? "rotate-180" : ""} />
              </button>
              {openSubmenu === "entradas" && (
                <div className="bg-slate-950/30 rounded-lg p-2 ml-4 border-l-2 border-slate-800">
                  <Link to="/entradas/adicionar" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-2 text-sm text-slate-300">Nova Entrada</Link>
                  <Link to="/entradas/fontes" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-2 text-sm text-slate-300">Fontes</Link>
                </div>
              )}

              {/* Submenu Saídas Mobile */}
              <button onClick={() => toggleSubmenu("saidas")} className="flex w-full items-center justify-between px-4 py-3 text-slate-400 hover:text-white">
                <span className="flex items-center gap-3"><TrendingDown size={18} className="text-rose-500"/> Saídas</span>
                <ChevronDown size={16} className={openSubmenu === "saidas" ? "rotate-180" : ""} />
              </button>
              {openSubmenu === "saidas" && (
                <div className="bg-slate-950/30 rounded-lg p-2 ml-4 border-l-2 border-slate-800">
                  <Link to="/saidas/adicionar" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-2 text-sm text-slate-300">Nova Saída</Link>
                  <Link to="/categorias" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-2 text-sm text-slate-300">Categorias</Link>
                </div>
              )}

              {/* Submenu Análises Mobile */}
              <button onClick={() => toggleSubmenu("analises")} className="flex w-full items-center justify-between px-4 py-3 text-slate-400 hover:text-white">
                <span className="flex items-center gap-3"><PieChart size={18} className="text-sky-500"/> Análises</span>
                <ChevronDown size={16} className={openSubmenu === "analises" ? "rotate-180" : ""} />
              </button>
              {openSubmenu === "analises" && (
                <div className="bg-slate-950/30 rounded-lg p-2 ml-4 border-l-2 border-slate-800">
                  <Link to="/comparar" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-2 text-sm text-slate-300">Comparativo</Link>
                  <Link to="/analise-produtos" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-2 text-sm text-slate-300">Pesquisa de Preços</Link>
                </div>
              )}

              <Link to="/banco" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium ${isActive("/banco")}`}>
                <Wallet size={18}/> Carteira
              </Link>
              
              <button onClick={handleSignOut} className="flex items-center justify-center gap-2 px-4 py-3 text-rose-400 bg-rose-950/20 rounded-lg mt-4 font-bold">
                <LogOut size={18}/> Sair
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-[1200px] p-4 sm:p-6 pb-24">
        <Outlet />
      </main>
    </div>
  );
}