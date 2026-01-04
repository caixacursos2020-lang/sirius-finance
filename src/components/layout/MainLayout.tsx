import { Link, Outlet, useLocation } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { useAuth } from "../../contexts/AuthContext";

export default function MainLayout({ children }: { children?: ReactNode }) {
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { signOut } = useAuth();

  const isActive = (path: string) =>
    location.pathname === path
      ? "bg-sky-600"
      : "bg-slate-800 hover:bg-slate-700";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 overflow-x-hidden">
      <header className="border-b border-slate-800 bg-slate-950 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-lg font-semibold">SIRIUS - App Financeiro</h1>
          <nav
            className="relative flex w-full flex-wrap items-center gap-2 text-sm sm:w-auto"
            onMouseLeave={() => setOpenMenu(null)}
          >
            <Link className={`px-3 py-2 rounded-md ${isActive("/")}`} to="/">
              Dashboard
            </Link>

            <Dropdown
              label="Entradas"
              isOpen={openMenu === "entradas"}
              onOpen={() => setOpenMenu("entradas")}
              onClose={() => setOpenMenu(null)}
              items={[
                { to: "/entradas/adicionar", label: "Adicionar entrada" },
                { to: "/entradas/fontes", label: "Fontes de entrada" },
              ]}
              isActive={isActive}
            />

            <Dropdown
              label="Saídas"
              isOpen={openMenu === "saídas"}
              onOpen={() => setOpenMenu("saídas")}
              onClose={() => setOpenMenu(null)}
              items={[
                { to: "/saidas/adicionar", label: "Adicionar saída" },
                { to: "/categorias", label: "Categorias de saída" },
              ]}
              isActive={isActive}
            />

            <Dropdown
              label="Cruzar dados"
              isOpen={openMenu === "cruzar"}
              onOpen={() => setOpenMenu("cruzar")}
              onClose={() => setOpenMenu(null)}
              items={[
                { to: "/comparar", label: "Comparar meses" },
                { to: "/analise-produtos", label: "Análise de produtos" },
              ]}
              isActive={isActive}
            />

            <Link className={`px-3 py-2 rounded-md ${isActive("/banco")}`} to="/banco">
              Carteira
            </Link>
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-md bg-emerald-600 px-3 py-2 font-semibold text-slate-950 transition-colors hover:bg-emerald-500"
            >
              Sair
            </button>
          </nav>
        </div>
      </header>
      <main className="px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-[1200px]">
          {children ?? <Outlet />}
        </div>
      </main>
    </div>
  );
}

function Dropdown({
  label,
  items,
  isOpen,
  onOpen,
  onClose,
  isActive,
}: {
  label: string;
  items: { to: string; label: string }[];
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  isActive: (path: string) => string;
}) {
  return (
    <div className="relative" onMouseEnter={onOpen}>
      <button
        className={`px-3 py-2 rounded-md border border-slate-700 ${
          isOpen ? "bg-slate-800" : "bg-slate-900"
        }`}
        onClick={() => (isOpen ? onClose() : onOpen())}
      >
        {label}
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 rounded-md border border-slate-800 bg-slate-900 shadow-lg">
          {items.map((item) => (
            <Link
              key={item.to}
              className={`block px-3 py-2 text-left ${isActive(item.to)}`}
              to={item.to}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
