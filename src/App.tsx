import { Routes, Route } from "react-router-dom";
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

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<FinanceDashboard />} />
        <Route path="/add" element={<AddExpensePage />} />
        <Route path="/saidas/adicionar" element={<AddExpensePage />} />
        <Route path="/saidas/editar/:id" element={<EditExpensePage />} />
        <Route path="/entradas/adicionar" element={<AddIncomePage />} />
        <Route path="/entradas/editar/:id" element={<EditIncomePage />} />
        <Route path="/entradas/fontes" element={<IncomeSourcesPage />} />
        <Route path="/categorias" element={<CategoriesPage />} />
        <Route path="/comparar" element={<CompareMonthsPage />} />
        <Route path="/analise-produtos" element={<ProductAnalyticsPage />} />
        <Route path="/banco" element={<BancoPage />} />
        <Route path="/formas-pagamento" element={<PaymentMethodsPage />} />
      </Routes>
    </MainLayout>
  );
}

export default App;
