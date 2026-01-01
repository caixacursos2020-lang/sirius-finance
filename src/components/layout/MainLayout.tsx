import { Link, useLocation } from "react-router-dom";
import { useState, type ReactNode } from "react";

export default function MainLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const isActive = (path: string) =>
    location.pathname === path ? "bg-sky-600" : "bg-slate-800 hover:bg-slate-700";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">SIRIUS - App Financeiro</h1>
        <nav
          className="flex items-center gap-2 text-sm relative"
          onMouseLeave={() => setOpenMenu(null)}
        >
          <Link className={`px-3 py-1 rounded-md ${isActive("/")}`} to="/">
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

          <Link className={`px-3 py-1 rounded-md ${isActive("/banco")}`} to="/banco">
            Carteira
          </Link>
        </nav>
      </header>
      <main className="p-6">{children}</main>
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
        className={`px-3 py-1 rounded-md border border-slate-700 ${
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












