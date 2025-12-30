import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface UserCategory {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
}

interface CategoriesContextValue {
  categories: UserCategory[];
  loading: boolean;
  addCategory: (name: string, color?: string) => void;
  deleteCategory: (id: string) => void;
  updateCategory: (id: string, data: Partial<Pick<UserCategory, "name" | "color">>) => void;
}

const CategoriesContext = createContext<CategoriesContextValue | undefined>(undefined);

const STORAGE_KEY = "sirius_categories_v1";

const SEED_CATEGORIES: Omit<UserCategory, "id">[] = [
  { name: "Mercado", color: "#0ea5e9", isDefault: true },
  { name: "Farmácia", color: "#ec4899", isDefault: true },
  { name: "Gasolina", color: "#f97316", isDefault: true },
  { name: "Presentes", color: "#a855f7", isDefault: true },
  { name: "Pet", color: "#22c55e", isDefault: true },
  { name: "Contas (casa/cartão)", color: "#eab308", isDefault: true },
  { name: "Outros", color: "#64748b", isDefault: true },
];

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Carrega do localStorage na primeira vez
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as UserCategory[];
        setCategories(parsed);
      } else {
        const seeded = SEED_CATEGORIES.map((c) => ({
          ...c,
          id: crypto.randomUUID(),
        }));
        setCategories(seeded);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      }
    } catch (err) {
      console.error("Erro ao carregar categorias do localStorage", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Salva no localStorage sempre que mudar
  useEffect(() => {
    if (loading) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    } catch (err) {
      console.error("Erro ao salvar categorias no localStorage", err);
    }
  }, [categories, loading]);

  const addCategory = (name: string, color?: string) => {
    const newCategory: UserCategory = {
      id: crypto.randomUUID(),
      name,
      color: color || "#22c55e",
      isDefault: false,
    };
    setCategories((prev) => [...prev, newCategory]);
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCategory = (
    id: string,
    data: Partial<Pick<UserCategory, "name" | "color">>
  ) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data } : c))
    );
  };

  return (
    <CategoriesContext.Provider
      value={{ categories, loading, addCategory, deleteCategory, updateCategory }}
    >
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) {
    throw new Error("useCategories deve ser usado dentro de <CategoriesProvider>");
  }
  return ctx;
}
