// src/pages/CalculatorPage.tsx
import { useState } from "react";

type MemoryKey = "MC" | "M+" | "M-" | "MR";

const isOperator = (value: string) => ["+", "-", "×", "÷"].includes(value);

const formatNumber = (value: number): string => {
  const str = value.toString();
  const [intPart, decPart] = str.split(".");
  if (!decPart) return intPart;
  const trimmedDec = decPart.replace(/0+$/, "");
  if (!trimmedDec) return intPart;
  return `${intPart},${trimmedDec}`;
};

const evaluateExpression = (exp: string): number | null => {
  try {
    const normalized = exp
      .replace(/,/g, ".")
      .replace(/×/g, "*")
      .replace(/÷/g, "/");

    if (!/^[0-9+\-*/. ]+$/.test(normalized)) return null;

    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${normalized || "0"});`)();
    if (typeof result === "number" && Number.isFinite(result)) {
      return result;
    }
    return null;
  } catch {
    return null;
  }
};

export default function CalculatorPage() {
  const [expression, setExpression] = useState<string>("0");
  const [justEvaluated, setJustEvaluated] = useState(false);
  const [memory, setMemory] = useState<number | null>(null);

  const handleMemory = (key: MemoryKey) => {
    if (key === "MC") {
      setMemory(null);
      return;
    }

    if (key === "MR") {
      if (memory === null) return;
      setExpression(formatNumber(memory));
      setJustEvaluated(true);
      return;
    }

    const current = evaluateExpression(expression);
    if (current === null) return;

    if (key === "M+") {
      setMemory(prev => (prev ?? 0) + current);
    } else if (key === "M-") {
      setMemory(prev => (prev ?? 0) - current);
    }
  };

  const toggleSign = () => {
    setExpression(prev => {
      const exp = prev;

      if (exp === "0") return "-0";

      const lastPlus = exp.lastIndexOf("+");
      const lastMinus = exp.lastIndexOf("-");
      const lastTimes = exp.lastIndexOf("×");
      const lastDivide = exp.lastIndexOf("÷");
      const lastOp = Math.max(lastPlus, lastMinus, lastTimes, lastDivide);

      if (lastOp === -1) {
        // Só um número
        if (exp.startsWith("-")) return exp.slice(1);
        return "-" + exp;
      }

      const before = exp.slice(0, lastOp + 1);
      const lastNumber = exp.slice(lastOp + 1);

      if (lastNumber.startsWith("-")) {
        return before + lastNumber.slice(1);
      }
      return before + "-" + lastNumber;
    });
  };

  const handlePercent = () => {
    const value = evaluateExpression(expression);
    if (value === null) return;
    const result = value / 100;
    setExpression(formatNumber(result));
    setJustEvaluated(true);
  };

  const handleEqual = () => {
    const result = evaluateExpression(expression);
    if (result === null) return;
    setExpression(formatNumber(result));
    setJustEvaluated(true);
  };

  const handleBackspace = () => {
    setExpression(prev => {
      if (justEvaluated) {
        setJustEvaluated(false);
        return "0";
      }
      if (prev.length <= 1) return "0";
      return prev.slice(0, -1);
    });
  };

  const handleInput = (value: string) => {
    // Controles especiais
    if (value === "C") {
      setExpression("0");
      setJustEvaluated(false);
      return;
    }

    if (value === "=") {
      handleEqual();
      return;
    }

    if (value === "⌫") {
      handleBackspace();
      return;
    }

    if (value === "+/-") {
      toggleSign();
      setJustEvaluated(false);
      return;
    }

    if (value === "%") {
      handlePercent();
      return;
    }

    // Operadores
    if (isOperator(value)) {
      setJustEvaluated(false);
      setExpression(prev => {
        let exp = prev;

        if (exp === "0" && value !== "-") {
          // não começa com +, × ou ÷
          return exp;
        }

        const lastChar = exp[exp.length - 1];
        if (isOperator(lastChar)) {
          exp = exp.slice(0, -1);
        }

        return exp + value;
      });
      return;
    }

    // Vírgula
    if (value === ",") {
      setJustEvaluated(false);
      setExpression(prev => {
        let exp = prev;
        if (exp === "0") return "0,";

        const lastPlus = exp.lastIndexOf("+");
        const lastMinus = exp.lastIndexOf("-");
        const lastTimes = exp.lastIndexOf("×");
        const lastDivide = exp.lastIndexOf("÷");
        const lastOp = Math.max(lastPlus, lastMinus, lastTimes, lastDivide);

        const currentNumber = exp.slice(lastOp + 1);
        if (currentNumber.includes(",")) return exp;

        return exp + ",";
      });
      return;
    }

    // Dígitos
    if (/^[0-9]$/.test(value)) {
      setExpression(prev => {
        let exp = prev;

        if (justEvaluated) {
          setJustEvaluated(false);
          return value === "0" ? "0" : value;
        }

        if (exp === "0") {
          return value;
        }

        return exp + value;
      });
      return;
    }
  };

  const displayValue = expression || "0";

  const memoryLabel =
    memory === null ? "vazia" : formatNumber(memory);

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-50 mb-1">
          Calculadora rápida
        </h1>
        <p className="text-sm text-slate-400">
          Ferramenta simples para contas rápidas no mercado, no banco
          ou enquanto preenche o financeiro. Tudo funciona aqui dentro
          do Sirius, sem sair do app.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl">
        {/* Cabeçalho + memória */}
        <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
          <span>Resultado</span>
          <span>
            Memória:{" "}
            <span className="text-emerald-400 font-medium">
              {memoryLabel}
            </span>
          </span>
        </div>

        {/* Display */}
        <div className="rounded-xl bg-slate-950 px-4 py-3 text-right">
          <div className="text-2xl font-semibold text-slate-50 break-all">
            {displayValue}
          </div>
        </div>

        {/* Teclas */}
        <div className="mt-4 space-y-2">
          {/* Linha memória */}
          <div className="grid grid-cols-4 gap-2">
            {["MC", "M+", "M-", "MR"].map(key => (
              <button
                key={key}
                onClick={() => handleMemory(key as MemoryKey)}
                className="h-10 rounded-lg bg-slate-800 text-xs font-semibold text-slate-100 hover:bg-slate-700 transition-colors"
              >
                {key}
              </button>
            ))}
          </div>

          {/* Linha C, %, +/-, ÷ */}
          <div className="grid grid-cols-4 gap-2">
            {["C", "%", "+/-", "÷"].map(key => (
              <button
                key={key}
                onClick={() => handleInput(key)}
                className={
                  key === "C"
                    ? "h-12 rounded-lg bg-rose-600 text-sm font-bold text-white hover:bg-rose-500 transition-colors"
                    : "h-12 rounded-lg bg-slate-800 text-sm font-semibold text-slate-100 hover:bg-slate-700 transition-colors"
                }
              >
                {key}
              </button>
            ))}
          </div>

          {/* Demais linhas */}
          <div className="grid grid-cols-4 gap-2">
            {["7", "8", "9", "×"].map(key => (
              <button
                key={key}
                onClick={() => handleInput(key)}
                className={
                  isOperator(key)
                    ? "h-12 rounded-lg bg-slate-800 text-lg font-semibold text-emerald-400 hover:bg-slate-700 transition-colors"
                    : "h-12 rounded-lg bg-slate-900 text-lg font-semibold text-slate-100 hover:bg-slate-800 transition-colors"
                }
              >
                {key}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {["4", "5", "6", "-"].map(key => (
              <button
                key={key}
                onClick={() => handleInput(key)}
                className={
                  isOperator(key)
                    ? "h-12 rounded-lg bg-slate-800 text-lg font-semibold text-emerald-400 hover:bg-slate-700 transition-colors"
                    : "h-12 rounded-lg bg-slate-900 text-lg font-semibold text-slate-100 hover:bg-slate-800 transition-colors"
                }
              >
                {key}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {["1", "2", "3", "+"].map(key => (
              <button
                key={key}
                onClick={() => handleInput(key)}
                className={
                  isOperator(key)
                    ? "h-12 rounded-lg bg-slate-800 text-lg font-semibold text-emerald-400 hover:bg-slate-700 transition-colors"
                    : "h-12 rounded-lg bg-slate-900 text-lg font-semibold text-slate-100 hover:bg-slate-800 transition-colors"
                }
              >
                {key}
              </button>
            ))}
          </div>

          {/* Última linha: 0 , ⌫ = */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => handleInput("0")}
              className="h-12 rounded-lg bg-slate-900 text-lg font-semibold text-slate-100 hover:bg-slate-800 transition-colors"
            >
              0
            </button>
            <button
              onClick={() => handleInput(",")}
              className="h-12 rounded-lg bg-slate-900 text-2xl font-semibold text-slate-100 hover:bg-slate-800 transition-colors"
            >
              ,
            </button>
            <button
              onClick={() => handleInput("⌫")}
              className="h-12 rounded-lg bg-slate-800 text-lg font-semibold text-slate-100 hover:bg-slate-700 transition-colors"
            >
              ⌫
            </button>
            <button
              onClick={() => handleInput("=")}
              className="h-12 rounded-lg bg-emerald-600 text-lg font-semibold text-white hover:bg-emerald-500 transition-colors"
            >
              =
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Dica: use a memória (M+, M-, MR, MC) para ir somando compras de
        mercado, somar boletos ou guardar um valor de referência.
      </p>
    </div>
  );
}
