import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  ChevronDown,
  LogOut,
  LayoutDashboard,
  Wallet,
  PieChart,
  TrendingUp,
  TrendingDown,
  Layers,
  UserRound,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import CoringaToggleInHeader from "../../features/coringa/CoringaToggleInHeader";

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null); // Mobile
  const [desktopMenu, setDesktopMenu] = useState<string | null>(null); // Desktop

  const isActive = (path: string) =>
    location.pathname === path
      ? "bg-sky-600 text-white shadow-lg shadow-sky-900/20"
      : "text-slate-400 hover:text-white hover:bg-slate-800";

  const toggleSubmenu = (menu: string) => {
    setOpenSubmenu(openSubmenu === menu ? null : menu);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/auth");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-50 font-sans">
      {/* HEADER SUPERIOR */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-3 font-bold text-lg text-slate-100 group"
            >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 shadow-[0_0_15px_rgba(16,185,129,0.2)] group-hover:shadow-[0_0_25px_rgba(56,189,248,0.4)] group-hover:border-slate-700 transition-all duration-500 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-sky-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <svg viewBox="0 0 100 100" className="h-7 w-7 relative z-10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="logo-grad" x1="0" y1="100" x2="100" y2="0">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                  <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <path
                  d="M10 55 L 25 25 L 45 65 L 65 25 L 80 55"
                  stroke="url(#logo-grad)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glow-filter)"
                />
                <text
                  x="65"
                  y="88"
                  fontSize="38"
                  fontWeight="900"
                  fill="#facc15"
                  style={{ textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}
                >
                  $
                </text>
              </svg>
            </div>
            <span className="bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent font-extrabold tracking-tight drop-shadow-[0_0_5px_rgba(56,189,248,0.5)] animate-pulse">
              Sirius MW Finance
            </span>
            </Link>

            {/* Coringa toggle near logo */}
            <div className="flex items-center">
              <CoringaToggleInHeader />
            </div>
          </div>

          {/* --- MENU DESKTOP --- */}
          <nav
            className="hidden md:flex items-center gap-1 text-sm font-medium"
            onMouseLeave={() => setDesktopMenu(null)}
          >
            <Link
              to="/"
              className={`px-3 py-2 rounded-md transition-all ${isActive("/")}`}
            >
              Dashboard
            </Link>

            {/* Entradas */}
            <div
              className="relative"
              onMouseEnter={() => setDesktopMenu("entradas")}
            >
              <button className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-white transition-all">
                Entradas <ChevronDown size={14} />
              </button>
              {desktopMenu === "entradas" && (
                <div className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-slate-700 bg-slate-900/95 p-1 shadow-2xl">
                  <Link
                    to="/entradas/adicionar"
                    className="block px-3 py-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Adicionar Entrada
                  </Link>
                  <Link
                    to="/entradas/fontes"
                    className="block px-3 py-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Fontes de Renda
                  </Link>
                </div>
              )}
            </div>

            {/* Saídas */}
            <div
              className="relative"
              onMouseEnter={() => setDesktopMenu("saidas")}
            >
              <button className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-white transition-all">
                Saídas <ChevronDown size={14} />
              </button>
              {desktopMenu === "saidas" && (
                <div className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-slate-700 bg-slate-900/95 p-1 shadow-2xl">
                  <Link
                    to="/saidas/adicionar"
                    className="block px-3 py-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Adicionar Saída
                  </Link>
                  <Link
                    to="/categorias"
                    className="block px-3 py-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Categorias
                  </Link>
                </div>
              )}
            </div>

            {/* Análises */}
            <div
              className="relative"
              onMouseEnter={() => setDesktopMenu("analises")}
            >
              <button className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-white transition-all">
                Análises <ChevronDown size={14} />
              </button>
              {desktopMenu === "analises" && (
                <div className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-slate-700 bg-slate-900/95 p-1 shadow-2xl">
                  <Link
                    to="/comparar"
                    className="block px-3 py-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Comparativo Mensal
                  </Link>
                  <Link
                    to="/analise-produtos"
                    className="block px-3 py-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Pesquisa de Preços
                  </Link>
                </div>
              )}
            </div>

            {/* Ferramentas */}
            <div
              className="relative"
              onMouseEnter={() => setDesktopMenu("ferramentas")}
            >
              <button className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-white transition-all">
                Ferramentas <ChevronDown size={14} />
              </button>
              {desktopMenu === "ferramentas" && (
                <div className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-slate-700 bg-slate-900/95 p-1 shadow-2xl">
                  <Link
                    to="/ferramentas"
                    className="block px-3 py-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Painel de ferramentas
                  </Link>
                  <Link
                    to="/ferramentas/calculadora"
                    className="block px-3 py-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Calculadora rápida
                  </Link>
                  <Link
                    to="/ferramentas/notas"
                    className="block px-3 py-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Bloco de notas
                  </Link>
                  <Link
                    to="/ferramentas/calendario"
                    className="block px-3 py-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Calendário
                  </Link>
                </div>
              )}
            </div>

            <Link
              to="/banco"
              className={`px-3 py-2 rounded-md transition-all ${isActive(
                "/banco",
              )}`}
            >
              Carteira
            </Link>

            <Link
              to="/conta"
              className={`px-3 py-2 rounded-md transition-all ${isActive(
                "/conta",
              )}`}
            >
              Minha conta
            </Link>

            {/* Coringa toggle moved near logo */}

            <div className="w-px h-6 bg-slate-800 mx-2" />

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-md transition-all"
            >
              <LogOut size={16} /> Sair
            </button>
          </nav>

          {/* BOTÃO MOBILE */}
          <button
            className="md:hidden p-2 text-slate-300"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* --- MENU MOBILE (Expandido) --- */}
        {isMobileMenuOpen && (
          <div className="border-b border-slate-800 bg-slate-900 md:hidden animate-in slide-in-from-top-5">
            <div className="flex flex-col p-4 space-y-1">
              <div className="pb-2">{/* Coringa toggle moved near logo */}</div>
              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium ${isActive(
                  "/",
                )}`}
              >
                <LayoutDashboard size={18} /> Dashboard
              </Link>

              {/* Submenu Entradas Mobile */}
              <button
                onClick={() => toggleSubmenu("entradas")}
                className="flex w-full items-center justify-between px-4 py-3 text-slate-400 hover:text-white"
              >
                <span className="flex items-center gap-3">
                  <TrendingUp size={18} className="text-emerald-500" /> Entradas
                </span>
                <ChevronDown
                  size={16}
                  className={openSubmenu === "entradas" ? "rotate-180" : ""}
                />
              </button>
              {openSubmenu === "entradas" && (
                <div className="bg-slate-950/30 rounded-lg p-2 ml-4 border-l-2 border-slate-800">
                  <Link
                    to="/entradas/adicionar"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-slate-300"
                  >
                    Nova Entrada
                  </Link>
                  <Link
                    to="/entradas/fontes"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-slate-300"
                  >
                    Fontes
                  </Link>
                </div>
              )}

              {/* Submenu Saídas Mobile */}
              <button
                onClick={() => toggleSubmenu("saidas")}
                className="flex w-full items-center justify-between px-4 py-3 text-slate-400 hover:text-white"
              >
                <span className="flex items-center gap-3">
                  <TrendingDown size={18} className="text-rose-500" /> Saídas
                </span>
                <ChevronDown
                  size={16}
                  className={openSubmenu === "saidas" ? "rotate-180" : ""}
                />
              </button>
              {openSubmenu === "saidas" && (
                <div className="bg-slate-950/30 rounded-lg p-2 ml-4 border-l-2 border-slate-800">
                  <Link
                    to="/saidas/adicionar"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-slate-300"
                  >
                    Nova Saída
                  </Link>
                  <Link
                    to="/categorias"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-slate-300"
                  >
                    Categorias
                  </Link>
                </div>
              )}

              {/* Submenu Análises Mobile */}
              <button
                onClick={() => toggleSubmenu("analises")}
                className="flex w-full items-center justify-between px-4 py-3 text-slate-400 hover:text-white"
              >
                <span className="flex items-center gap-3">
                  <PieChart size={18} className="text-sky-500" /> Análises
                </span>
                <ChevronDown
                  size={16}
                  className={openSubmenu === "analises" ? "rotate-180" : ""}
                />
              </button>
              {openSubmenu === "analises" && (
                <div className="bg-slate-950/30 rounded-lg p-2 ml-4 border-l-2 border-slate-800">
                  <Link
                    to="/comparar"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-slate-300"
                  >
                    Comparativo
                  </Link>
                  <Link
                    to="/analise-produtos"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-slate-300"
                  >
                    Pesquisa de Preços
                  </Link>
                </div>
              )}

              {/* Ferramentas Mobile */}
              <button
                onClick={() => toggleSubmenu("ferramentas")}
                className="flex w-full items-center justify-between px-4 py-3 text-slate-400 hover:text-white"
              >
                <span className="flex items-center gap-3">
                  <Layers size={18} className="text-emerald-400" /> Ferramentas
                </span>
                <ChevronDown
                  size={16}
                  className={openSubmenu === "ferramentas" ? "rotate-180" : ""}
                />
              </button>
              {openSubmenu === "ferramentas" && (
                <div className="bg-slate-950/30 rounded-lg p-2 ml-4 border-l-2 border-slate-800">
                  <Link
                    to="/ferramentas"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-slate-300"
                  >
                    Painel de ferramentas
                  </Link>
                  <Link
                    to="/ferramentas/calculadora"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-slate-300"
                  >
                    Calculadora rápida
                  </Link>
                  <Link
                    to="/ferramentas/notas"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-slate-300"
                  >
                    Bloco de notas
                  </Link>
                  <Link
                    to="/ferramentas/calendario"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-slate-300"
                  >
                    Calendário
                  </Link>
                </div>
              )}

              <Link
                to="/banco"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium ${isActive(
                  "/banco",
                )}`}
              >
                <Wallet size={18} /> Carteira
              </Link>

              <Link
                to="/conta"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium ${isActive(
                  "/conta",
                )}`}
              >
                <UserRound size={18} /> Minha conta
              </Link>

              <button
                onClick={handleSignOut}
                className="flex items-center justify-center gap-2 px-4 py-3 text-rose-400 bg-rose-950/20 rounded-lg mt-4 font-bold"
              >
                <LogOut size={18} /> Sair
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

