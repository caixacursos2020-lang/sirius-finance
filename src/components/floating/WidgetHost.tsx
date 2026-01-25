import { useCoringa } from "./CoringaContext";
import EmbeddedAddIncomeWidget from "./widgets/EmbeddedAddIncomeWidget";
import EmbeddedAddExpenseWidget from "./widgets/EmbeddedAddExpenseWidget";
import QuickCalculatorWidget from "./widgets/QuickCalculatorWidget";
import QuickNotesWidget from "./widgets/QuickNotesWidget";
import EmbeddedPageFrame from "./widgets/EmbeddedPageFrame";
import IncomeSourcesPage from "../../pages/IncomeSourcesPage";
import CategoriesPage from "../../pages/CategoriesPage";
import CompareMonthsPage from "../../pages/CompareMonthsPage";
import ProductAnalyticsPage from "../../pages/ProductAnalyticsPage";
import ToolsPage from "../../pages/ToolsPage";
import CalculatorPage from "../../pages/CalculatorPage";
import NotesPage from "../../pages/NotesPage";
import CalendarPage from "../../pages/CalendarPage";
import BancoPage from "../../pages/BancoPage";
import PaymentMethodsPage from "../../contexts/PaymentMethodsPage";
import AccountPage from "../../pages/AccountPage";

export default function WidgetHost() {
  const { activeWidget } = useCoringa();

  switch (activeWidget) {
    case "add-income":
      return <EmbeddedAddIncomeWidget />;
    case "add-expense":
      return <EmbeddedAddExpenseWidget />;
    case "calculator":
      return <QuickCalculatorWidget />;
    case "notes":
      return <QuickNotesWidget />;
    case "income-sources":
      return (
        <EmbeddedPageFrame title="Fontes de Renda" tone="emerald">
          <IncomeSourcesPage />
        </EmbeddedPageFrame>
      );
    case "categories":
      return (
        <EmbeddedPageFrame title="Categorias" tone="rose">
          <CategoriesPage />
        </EmbeddedPageFrame>
      );
    case "compare-months":
      return (
        <EmbeddedPageFrame title="Comparativo Mensal" tone="sky">
          <CompareMonthsPage />
        </EmbeddedPageFrame>
      );
    case "product-analytics":
      return (
        <EmbeddedPageFrame title="Pesquisa de Preços" tone="amber">
          <ProductAnalyticsPage />
        </EmbeddedPageFrame>
      );
    case "tools":
      return (
        <EmbeddedPageFrame title="Ferramentas" tone="slate">
          <ToolsPage />
        </EmbeddedPageFrame>
      );
    case "calculator-page":
      return (
        <EmbeddedPageFrame title="Calculadora" tone="blue">
          <CalculatorPage />
        </EmbeddedPageFrame>
      );
    case "notes-page":
      return (
        <EmbeddedPageFrame title="Notas" tone="yellow">
          <NotesPage />
        </EmbeddedPageFrame>
      );
    case "calendar-page":
      return (
        <EmbeddedPageFrame title="Calendário" tone="emerald">
          <CalendarPage />
        </EmbeddedPageFrame>
      );
    case "bank":
      return (
        <EmbeddedPageFrame title="Carteira" tone="slate">
          <BancoPage />
        </EmbeddedPageFrame>
      );
    case "payment-methods":
      return (
        <EmbeddedPageFrame title="Formas de Pagamento" tone="sky">
          <PaymentMethodsPage />
        </EmbeddedPageFrame>
      );
    case "account":
      return (
        <EmbeddedPageFrame title="Minha Conta" tone="violet">
          <AccountPage />
        </EmbeddedPageFrame>
      );
    default:
      return (
        <div className="p-4 text-center text-slate-500">
          Widget não encontrado.
        </div>
      );
  }
}

