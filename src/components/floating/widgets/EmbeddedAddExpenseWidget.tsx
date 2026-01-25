import EmbeddedPageFrame from "./EmbeddedPageFrame";
import AddExpensePage from "../../../pages/AddExpensePage";

export default function EmbeddedAddExpenseWidget() {
  return (
    <EmbeddedPageFrame title="Nova Saída" tone="rose">
      <AddExpensePage />
    </EmbeddedPageFrame>
  );
}
