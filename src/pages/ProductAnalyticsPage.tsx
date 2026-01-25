import PriceResearchPanel from "../components/prices/PriceResearchPanel";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ProductAnalyticsPage() {
  const navigate = useNavigate();
  return (
    <div className="w-full max-w-[1200px] mx-auto pb-24 space-y-4 p-4">
      <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
        <button onClick={() => navigate("/")} className="text-sky-500">
          <ArrowLeft />
        </button>
        <h1 className="text-2xl font-black text-white uppercase flex gap-2">
          <Search /> Rastreamento de Preços
        </h1>
      </div>
      <PriceResearchPanel />
    </div>
  );
}
