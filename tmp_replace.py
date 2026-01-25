# -*- coding: utf-8 -*-
from pathlib import Path
path = Path('src/components/receipts/ReceiptImportModal.tsx')
text = path.read_text(encoding='utf-8')
start = text.index('{/* Info do cupom */}')
end = text.index('              {qrResult', start)
new = '''              {/* Info do cupom + editar loja */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex-1 min-w-[240px]">
                  <p className="text-xs uppercase text-slate-500">Loja / Local</p>
                  <div className="relative mt-1">
                    <Store className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      className="w-full rounded-md border border-slate-700 bg-slate-900 pl-8 pr-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                      value={receipt.storeName ?? ''}
                      onChange={(e) =>
                        setReceipt((prev) =>
                          prev ? { ...prev, storeName: e.target.value } : prev,
                        )
                      }
                      placeholder="Ex.: Mercado, Padaria, Posto..."
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Data: {formatDate(receipt.date)}
                  </p>
                </div>
                <div className="text-right min-w-[180px]">
                  <p className="text-xs uppercase text-slate-500">
                    Total do cupom
                  </p>
                  <p className="text-xl font-semibold text-emerald-300">
                    {formatCurrency(cupomTotal)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {receipt.items.length} itens • soma dos itens:{" "}
                    {formatCurrency(itemsTotal)}
                  </p>
                </div>
              </div>
'''
path.write_text(text[:start] + new + text[end:], encoding='utf-8')
