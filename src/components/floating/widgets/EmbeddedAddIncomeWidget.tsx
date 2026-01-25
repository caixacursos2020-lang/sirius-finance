import EmbeddedPageFrame from "./EmbeddedPageFrame";
import AddIncomePage from "../../../pages/AddIncomePage";

export default function EmbeddedAddIncomeWidget() {
  return (
    <EmbeddedPageFrame title="Nova Entrada" tone="emerald">
      <AddIncomePage />
    </EmbeddedPageFrame>
  );
}
