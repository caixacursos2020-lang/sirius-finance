import type { ReactNode } from "react";
import {
  Calculator,
  Calendar as CalendarIcon,
  CreditCard,
  ExternalLink,
  FilePlus2,
  Layers,
  NotebookPen,
  PiggyBank,
  Repeat,
} from "lucide-react";
import QuickExpenseTool from "./tools/QuickExpenseTool";
import QuickIncomeTool from "./tools/QuickIncomeTool";
import TransferTool from "./tools/TransferTool";
import DebitCardExpenseTool from "./tools/DebitCardExpenseTool";
import NotesTool from "./tools/NotesTool";
import CalculatorTool from "./tools/CalculatorTool";
import CalendarLinkTool from "./tools/CalendarLinkTool";

export type CoringaTool = {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  icon: ReactNode;
  type: "tool" | "action" | "navigation";
  component?: React.ComponentType;
  onSelect?: () => void;
};

export const coringaRegistry: CoringaTool[] = [
  {
    id: "add-income",
    title: "Adicionar Entrada",
    category: "Fluxo de Caixa",
    keywords: ["receita", "entrada", "renda", "ganho"],
    icon: <PiggyBank className="h-4 w-4 text-emerald-400" />,
    type: "tool",
    component: QuickIncomeTool,
  },
  {
    id: "add-expense",
    title: "Adicionar Saída",
    category: "Fluxo de Caixa",
    keywords: ["despesa", "saída", "gasto"],
    icon: <FilePlus2 className="h-4 w-4 text-rose-400" />,
    type: "tool",
    component: QuickExpenseTool,
  },
  {
    id: "debit-card",
    title: "Débito Cartão",
    category: "Fluxo de Caixa",
    keywords: ["debito", "cartao", "pagamento"],
    icon: <CreditCard className="h-4 w-4 text-sky-400" />,
    type: "tool",
    component: DebitCardExpenseTool,
  },
  {
    id: "transfer",
    title: "Transferência",
    category: "Bancos",
    keywords: ["banco", "conta", "move", "pix"],
    icon: <Repeat className="h-4 w-4 text-amber-400" />,
    type: "tool",
    component: TransferTool,
  },
  {
    id: "notes",
    title: "Notas rápidas",
    category: "Utilidades",
    keywords: ["anotar", "memo", "texto"],
    icon: <NotebookPen className="h-4 w-4 text-amber-400" />,
    type: "tool",
    component: NotesTool,
  },
  {
    id: "calculator",
    title: "Calculadora",
    category: "Utilidades",
    keywords: ["calcular", "soma", "divisão"],
    icon: <Calculator className="h-4 w-4 text-emerald-400" />,
    type: "tool",
    component: CalculatorTool,
  },
  {
    id: "calendar",
    title: "Abrir Google Calendar",
    category: "Utilidades",
    keywords: ["agenda", "compromisso", "evento"],
    icon: <CalendarIcon className="h-4 w-4 text-sky-400" />,
    type: "navigation",
    component: CalendarLinkTool,
  },
  {
    id: "tools",
    title: "Ferramentas",
    category: "Navegação",
    keywords: ["notas", "calculadora", "ferramentas"],
    icon: <Layers className="h-4 w-4 text-slate-300" />,
    type: "navigation",
    onSelect: () => {
      window.location.href = "/ferramentas";
    },
  },
  {
    id: "calendar-ext",
    title: "Google Calendar (nova aba)",
    category: "Navegação",
    keywords: ["google", "calendar", "agenda"],
    icon: <ExternalLink className="h-4 w-4 text-sky-300" />,
    type: "navigation",
    onSelect: () => window.open("https://calendar.google.com", "_blank"),
  },
];

