const PAYMENT_METHODS_KEY = "sirius_payment_methods_v1";

export function runLocalMigrations() {
  try {
    const raw = localStorage.getItem(PAYMENT_METHODS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const hasDebitCard = Array.isArray(parsed)
      ? parsed.some(
          (pm) =>
            pm.type === "debito" ||
            pm.type === "cartao_debito" ||
            (pm.name && pm.name.toLowerCase().includes("débito")),
        )
      : false;

    if (!hasDebitCard) {
      const updated = Array.isArray(parsed) ? [...parsed] : [];
      updated.push({
        id: "pm-cartao-debito",
        name: "Cartão de débito",
        type: "debito",
        color: "#0ea5e9",
        active: true,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem(PAYMENT_METHODS_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.error("[migrations] Falha ao migrar formas de pagamento", err);
  }
}
