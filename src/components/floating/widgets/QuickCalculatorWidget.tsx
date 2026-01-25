import { useState } from "react";
import { Delete } from "lucide-react";

export default function QuickCalculatorWidget() {
  const [display, setDisplay] = useState("");

  const handleBtn = (val: string) => {
    if (val === "=") {
      try {
        // eslint-disable-next-line no-eval
        setDisplay(String(eval(display.replace(/x/g, "*"))));
      } catch {
        setDisplay("Erro");
      }
    } else if (val === "C") {
      setDisplay("");
    } else if (val === "DEL") {
      setDisplay((prev) => prev.slice(0, -1));
    } else {
      setDisplay((prev) => prev + val);
    }
  };

  const btns = [
    "C",
    "(",
    ")",
    "/",
    "7",
    "8",
    "9",
    "x",
    "4",
    "5",
    "6",
    "-",
    "1",
    "2",
    "3",
    "+",
    "0",
    ".",
    "DEL",
    "=",
  ];

  return (
    <div className="h-full flex flex-col p-4">
      <div className="bg-slate-950 border border-slate-700 rounded-xl p-4 mb-4 text-right">
        <span className="text-2xl font-mono text-slate-100 tracking-widest">
          {display || "0"}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2 flex-1">
        {btns.map((btn) => (
          <button
            key={btn}
            onClick={() => handleBtn(btn)}
            className={`rounded-lg font-bold text-lg transition-all active:scale-95 ${
              btn === "="
                ? "bg-blue-600 text-white"
                : btn === "C"
                ? "bg-rose-900/30 text-rose-400 border border-rose-900"
                : ["/", "x", "-", "+"].includes(btn)
                ? "bg-slate-800 text-blue-400"
                : "bg-slate-800/50 text-slate-200 hover:bg-slate-800"
            }`}
          >
            {btn === "DEL" ? <Delete size={18} className="mx-auto" /> : btn}
          </button>
        ))}
      </div>
    </div>
  );
}
