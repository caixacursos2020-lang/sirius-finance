import { Routes, Route, Navigate } from "react-router-dom";
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

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
        Carregando...
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
    <Routes>
      <Route path="/auth" element={<Navigate to="/" replace />} />
      <Route path="/" element={<MainLayout />}>
        <Route index element={<FinanceDashboard />} />
        <Route path="add" element={<AddExpensePage />} />
        <Route path="saidas/adicionar" element={<AddExpensePage />} />
        <Route path="saidas/editar/:id" element={<EditExpensePage />} />
        <Route path="entradas/adicionar" element={<AddIncomePage />} />
        <Route path="entradas/editar/:id" element={<EditIncomePage />} />
        <Route path="entradas/fontes" element={<IncomeSourcesPage />} />
        <Route path="categorias" element={<CategoriesPage />} />
        <Route path="comparar" element={<CompareMonthsPage />} />
        <Route path="analise-produtos" element={<ProductAnalyticsPage />} />
        <Route path="banco" element={<BancoPage />} />
        <Route path="formas-pagamento" element={<PaymentMethodsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return <AppRoutes />;
}
