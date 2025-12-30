import { useFinance, type PaymentMethod } from "../contexts/FinanceContext";

interface PaymentMethodSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
  methods?: PaymentMethod[]; // Opcional para manter compatibilidade ou uso direto
}

const DEFAULT_OPTION = {
  id: "none",
  name: "Não informado / Outro",
};

export function getPaymentMethodById(
  methods: PaymentMethod[],
  id: string | null
): PaymentMethod | null {
  if (!id || id === "none") return null; // Retorna null para usar o fallback se necessário, ou o objeto DEFAULT_OPTION se preferir
  // A logica pedida no prompt era retornar DEFAULT_OPTION se id for none.
  // Mas para exibição, geralmente queremos o objeto real ou null.
  // Vou seguir a implementação pedida:
  if (!id || id === "none") return { ...DEFAULT_OPTION, active: true, createdAt: "", type: "outro" } as PaymentMethod;
  return methods.find((m) => m.id === id) ?? null;
}

export function PaymentMethodSelect({ value, onChange, className, methods: propMethods }: PaymentMethodSelectProps) {
  const { getActivePaymentMethods } = useFinance(); // Hook do contexto se methods não for passado
  const methods = propMethods || getActivePaymentMethods();
  const allOptions = [{ ...DEFAULT_OPTION, id: "none" }, ...methods];

  return (
    <div className="w-full">
      <select
        className={`w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none ${className}`}
        value={value || ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        {allOptions.map((pm) => (
          <option key={pm.id} value={pm.id}>
            {pm.name}
          </option>
        ))}
      </select>
    </div>
  );
}