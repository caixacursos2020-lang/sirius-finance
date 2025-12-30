import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface IncomeSource {
  id: string;
  name: string;
  isDefault: boolean;
}

interface IncomeSourcesContextValue {
  sources: IncomeSource[];
  loading: boolean;
  addSource: (name: string) => void;
  deleteSource: (id: string) => void;
}

const IncomeSourcesContext = createContext<IncomeSourcesContextValue | undefined>(
  undefined
);

const STORAGE_KEY = "sirius_income_sources_v1";

export function IncomeSourcesProvider({ children }: { children: ReactNode }) {
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setSources(JSON.parse(raw) as IncomeSource[]);
      } else {
        const initial: IncomeSource[] = [
          { id: crypto.randomUUID(), name: "Salário", isDefault: true },
          { id: crypto.randomUUID(), name: "Vendas", isDefault: true },
          { id: crypto.randomUUID(), name: "Pix avulso", isDefault: true },
        ];
        setSources(initial);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      }
    } catch (e) {
      console.error("Erro ao carregar fontes de entrada", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
    } catch (e) {
      console.error("Erro ao salvar fontes de entrada", e);
    }
  }, [sources, loading]);

  const addSource = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSources((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: trimmed, isDefault: false },
    ]);
  };

  const deleteSource = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <IncomeSourcesContext.Provider value={{ sources, loading, addSource, deleteSource }}>
      {children}
    </IncomeSourcesContext.Provider>
  );
}

export function useIncomeSources() {
  const ctx = useContext(IncomeSourcesContext);
  if (!ctx) throw new Error("useIncomeSources deve ser usado dentro de IncomeSourcesProvider");
  return ctx;
}
