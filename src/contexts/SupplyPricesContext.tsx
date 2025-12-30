import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type SupplyPriceSample,
  type SupplyVariantId,
} from "../types/finance";

interface SupplyPricesContextValue {
  samples: SupplyPriceSample[];
  loading: boolean;
  addSample: (
    data: Omit<SupplyPriceSample, "id" | "createdAt">
  ) => SupplyPriceSample;
  getLastTwoPrices: (
    variantId: SupplyVariantId
  ) => { last?: SupplyPriceSample; previous?: SupplyPriceSample };
  getMonthlyAverage: (
    variantId: SupplyVariantId,
    year: number,
    month: number
  ) => number | null;
  getHistory: (variantId: SupplyVariantId) => SupplyPriceSample[];
}

const SupplyPricesContext = createContext<SupplyPricesContextValue | undefined>(
  undefined
);

const SUPPLY_PRICES_KEY = "sirius_supply_prices_v1";

export function SupplyPricesProvider({ children }: { children: ReactNode }) {
  const [samples, setSamples] = useState<SupplyPriceSample[]>([]);
  const [loading, setLoading] = useState(true);

  // Carrega do localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SUPPLY_PRICES_KEY);
      if (raw) {
        setSamples(JSON.parse(raw) as SupplyPriceSample[]);
      }
    } catch (err) {
      console.error("Erro ao carregar preços de insumos", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Salva no localStorage
  useEffect(() => {
    if (loading) return;
    try {
      localStorage.setItem(SUPPLY_PRICES_KEY, JSON.stringify(samples));
    } catch (err) {
      console.error("Erro ao salvar preços de insumos", err);
    }
  }, [samples, loading]);

  const addSample = (
    data: Omit<SupplyPriceSample, "id" | "createdAt">
  ): SupplyPriceSample => {
    const sample: SupplyPriceSample = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setSamples((prev) => [...prev, sample]);
    return sample;
  };

  const getHistory = (variantId: SupplyVariantId) =>
    samples
      .filter((s) => s.variantId === variantId)
      .sort((a, b) => a.date.localeCompare(b.date));

  const getLastTwoPrices = (variantId: SupplyVariantId) => {
    const history = getHistory(variantId);
    const last = history[history.length - 1];
    const previous = history.length > 1 ? history[history.length - 2] : undefined;
    return { last, previous };
  };

  const getMonthlyAverage = (
    variantId: SupplyVariantId,
    year: number,
    month: number
  ) => {
    const filtered = samples.filter((s) => {
      if (s.variantId !== variantId) return false;
      const d = new Date(s.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    if (!filtered.length) return null;
    const total = filtered.reduce((acc, s) => acc + s.price, 0);
    return total / filtered.length;
  };

  const value = useMemo(
    () => ({
      samples,
      loading,
      addSample,
      getLastTwoPrices,
      getMonthlyAverage,
      getHistory,
    }),
    [samples, loading]
  );

  return (
    <SupplyPricesContext.Provider value={value}>
      {children}
    </SupplyPricesContext.Provider>
  );
}

export function useSupplyPrices() {
  const ctx = useContext(SupplyPricesContext);
  if (!ctx) throw new Error("useSupplyPrices deve ser usado dentro de SupplyPricesProvider");
  return ctx;
}

