import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../supabaseClient";

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
  updateCategory: (
    id: string,
    data: Partial<Pick<UserCategory, "name" | "color">>
  ) => void;
}

const CategoriesContext = createContext<CategoriesContextValue | undefined>(
  undefined
);

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

const mapRowToCategory = (row: any): UserCategory => ({
  id: String(row.id),
  name: String(row.name ?? ""),
  color: String(row.color ?? "#22c55e"),
  isDefault: Boolean(row.is_default ?? false),
});

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Load do Supabase + migração automática do localStorage (se existir)
  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);

      if (!user) {
        if (active) {
          setCategories([]);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("user_categories")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) {
        console.error("Erro ao carregar categorias do Supabase:", error);
        if (active) setLoading(false);
        return;
      }

      const rows = data ?? [];

      // Se vazio no Supabase -> migra do localStorage (se tiver) ou cria seed padrão
      if (rows.length === 0) {
        let initial: UserCategory[] | null = null;

        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as UserCategory[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              initial = parsed.map((c) => ({
                ...c,
                id: c.id || crypto.randomUUID(),
              }));
            }
          }
        } catch {
          // ignora
        }

        if (!initial) {
          initial = SEED_CATEGORIES.map((c) => ({
            ...c,
            id: crypto.randomUUID(),
          }));
        }

        const payload = initial.map((c) => ({
          id: c.id,
          user_id: user.id,
          name: c.name,
          color: c.color,
          is_default: c.isDefault,
        }));

        const { error: insErr } = await supabase
          .from("user_categories")
          .insert(payload);

        if (insErr) {
          console.error("Erro ao seed/migrar categorias:", insErr);
          if (active) {
            setCategories(initial);
            setLoading(false);
          }
          return;
        }

        if (active) {
          setCategories(initial);
          setLoading(false);
        }
        return;
      }

      if (active) {
        setCategories(rows.map(mapRowToCategory));
        setLoading(false);
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const addCategory = (name: string, color?: string) => {
    if (!user) return;

    const newCategory: UserCategory = {
      id: crypto.randomUUID(),
      name,
      color: color || "#22c55e",
      isDefault: false,
    };

    setCategories((prev) => [...prev, newCategory]);

    supabase
      .from("user_categories")
      .insert({
        id: newCategory.id,
        user_id: user.id,
        name: newCategory.name,
        color: newCategory.color,
        is_default: newCategory.isDefault,
      })
      .then(({ error }) => {
        if (error) {
          console.error("Erro ao salvar categoria no Supabase:", error);
          alert("Falha ao salvar categoria na nuvem.");
          setCategories((prev) => prev.filter((c) => c.id !== newCategory.id));
        }
      });
  };

  const deleteCategory = (id: string) => {
    if (!user) return;

    const snapshot = categories;
    setCategories((prev) => prev.filter((c) => c.id !== id));

    supabase
      .from("user_categories")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .then(({ error }) => {
        if (error) {
          console.error("Erro ao deletar categoria no Supabase:", error);
          alert("Falha ao deletar categoria na nuvem.");
          setCategories(snapshot);
        }
      });
  };

  const updateCategory = (
    id: string,
    data: Partial<Pick<UserCategory, "name" | "color">>
  ) => {
    if (!user) return;

    const snapshot = categories;
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data } : c))
    );

    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.color !== undefined) payload.color = data.color;

    supabase
      .from("user_categories")
      .update(payload)
      .eq("id", id)
      .eq("user_id", user.id)
      .then(({ error }) => {
        if (error) {
          console.error("Erro ao atualizar categoria no Supabase:", error);
          alert("Falha ao atualizar categoria na nuvem.");
          setCategories(snapshot);
        }
      });
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
