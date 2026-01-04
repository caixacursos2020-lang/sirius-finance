import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./contexts/AuthContext";
import { FinanceProvider } from "./contexts/FinanceContext";
import { CategoriesProvider } from "./contexts/CategoriesContext";
import { IncomeSourcesProvider } from "./contexts/IncomeSourcesContext";
import { SupplyPricesProvider } from "./contexts/SupplyPricesContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CategoriesProvider>
          <IncomeSourcesProvider>
            <SupplyPricesProvider>
              <FinanceProvider>
                <App />
              </FinanceProvider>
            </SupplyPricesProvider>
          </IncomeSourcesProvider>
        </CategoriesProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
