import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

// Importações das Páginas
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
import PaymentMethodsPage from "./contexts/PaymentMethodsPage"; // Verifique se esta pasta está certa
import MainLayout from "./components/layout/MainLayout";
import AuthPage from "./pages/AuthPage";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Carregando Sirius...</div>;
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
      {/* Rota principal que carrega o Layout */}
      <Route path="/" element={<MainLayout />}>
        {/* Páginas que aparecem DENTRO do Layout (no lugar do Outlet) */}
        <Route index element={<FinanceDashboard />} />
        
        <Route path="saidas/adicionar" element={<AddExpensePage />} />
        <Route path="saidas/editar/:id" element={<EditExpensePage />} />
        <Route path="categorias" element={<CategoriesPage />} />
        
        <Route path="entradas/adicionar" element={<AddIncomePage />} />
        <Route path="entradas/editar/:id" element={<EditIncomePage />} />
        <Route path="entradas/fontes" element={<IncomeSourcesPage />} />
        
        <Route path="comparar" element={<CompareMonthsPage />} />
        <Route path="analise-produtos" element={<ProductAnalyticsPage />} />
        
        <Route path="banco" element={<BancoPage />} />
        <Route path="formas-pagamento" element={<PaymentMethodsPage />} />
        
        {/* Rota de compatibilidade antiga */}
        <Route path="add" element={<AddExpensePage />} />
      </Route>

      {/* Qualquer rota desconhecida volta pra Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}