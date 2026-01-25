import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

import FinanceDashboard from "./FinanceDashboard";
import AddExpensePage from "./pages/AddExpensePage";
import EditExpensePage from "./pages/EditExpensePage";
import AddIncomePage from "./pages/AddIncomePage";
import EditIncomePage from "./pages/EditIncomePage";
import IncomeSourcesPage from "./pages/IncomeSourcesPage";
import CategoriesPage from "./pages/CategoriesPage";
import CompareMonthsPage from "./pages/CompareMonthsPage";
import ProductAnalyticsPage from "./pages/ProductAnalyticsPage";
import BancoPage from "./pages/BancoPage";
import PaymentMethodsPage from "./contexts/PaymentMethodsPage";
import MainLayout from "./components/layout/MainLayout";
import AuthPage from "./pages/AuthPage";
import CalculatorPage from "./pages/CalculatorPage";
import NotesPage from "./pages/NotesPage";
import ToolsPage from "./pages/ToolsPage";
import AccountPage from "./pages/AccountPage";
import CalendarPage from "./pages/CalendarPage";
import CoringaProvider from "./components/floating/CoringaProvider";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        Carregando Sirius...
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return (
    <CoringaProvider>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<FinanceDashboard />} />

          {/* Sa�das */}
          <Route path="saidas/adicionar" element={<AddExpensePage />} />
          <Route path="saidas/editar/:id" element={<EditExpensePage />} />
          <Route path="categorias" element={<CategoriesPage />} />

          {/* Entradas */}
          <Route path="entradas/adicionar" element={<AddIncomePage />} />
          <Route path="entradas/editar/:id" element={<EditIncomePage />} />
          <Route path="entradas/fontes" element={<IncomeSourcesPage />} />

          {/* An�lises */}
          <Route path="comparar" element={<CompareMonthsPage />} />
          <Route path="analise-produtos" element={<ProductAnalyticsPage />} />

          {/* Banco / Carteira */}
          <Route path="banco" element={<BancoPage />} />
          <Route path="formas-pagamento" element={<PaymentMethodsPage />} />

          {/* Ferramentas */}
          <Route path="ferramentas" element={<ToolsPage />} />
          <Route path="ferramentas/calculadora" element={<CalculatorPage />} />
          <Route path="ferramentas/notas" element={<NotesPage />} />
          <Route path="ferramentas/calendario" element={<CalendarPage />} />

          {/* Conta */}
          <Route path="conta" element={<AccountPage />} />

          {/* Compatibilidade */}
          <Route path="add" element={<AddExpensePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </CoringaProvider>
  );
}

