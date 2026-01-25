# -*- coding: utf-8 -*-
from pathlib import Path
path = Path('src/components/receipts/ReceiptImportModal.tsx')
text = path.read_text(encoding='utf-8')
start = text.index('              {/* Forma de pagamento */}')
end = text.index('              {/* ITENS DO CUPOM */}', start)
new = '''              {/* Forma de pagamento */}
              <div className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-200">
                <div>
                  <p className="mb-1 text-xs font-semibold text-slate-300">
                    Forma de pagamento
                  </p>
                  <p className="max-w-md text-xs text-slate-500">
                    Escolha como esta compra foi paga. A mesma forma será aplicada na saída criada a partir deste cupom.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {activePaymentMethods.map((pm) => {
                    const isSelected = pm.id === selectedPaymentMethodId;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setSelectedPaymentMethodId(pm.id)}
                        className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${
                          isSelected
                            ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                            : "border-slate-800 bg-slate-950 hover:border-slate-600"
                        }`}
                        style={{ borderColor: isSelected ? pm.color || "#22c55e" : undefined }}
                      >
                        <span
                          className="flex h-9 w-9 items-center justify-center rounded-full text-white shadow-sm"
                          style={{ backgroundColor: pm.color || "#475569" }}
                        >
                          {paymentIcon(pm.type)}
                        </span>
                        <span className="flex flex-col items-start leading-tight">
                          <span
                            className={`text-sm font-semibold ${
                              isSelected ? "text-white" : "text-slate-100"
                            }`}
                          >
                            {pm.name}
                          </span>
                          <span className="text-[10px] uppercase tracking-wide text-slate-400">
                            {pm.type}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                  {!activePaymentMethods.length && (
                    <p className="text-xs text-amber-300">
                      Nenhuma forma de pagamento ativa encontrada.
                    </p>
                  )}
                </div>
              </div>
'''
path.write_text(text[:start] + new + text[end:], encoding='utf-8')
