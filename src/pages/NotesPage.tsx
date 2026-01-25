// src/pages/NotesPage.tsx
import { useEffect, useState } from "react";
import {
  FileText,
  Search,
  Trash2,
  PlusCircle,
  Save,
  Sparkles,
  Edit3,
} from "lucide-react";

type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

const STORAGE_KEY = "sirius-notes-v2";

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = d.getFullYear();
  const hora = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${ano}, ${hora}:${min}`;
}

// Modelos rápidos
const templates = {
  mercado: {
    title: "Lista de compras de mercado",
    content: `LISTA DE COMPRAS – MERCADO
-----------------------------
Setor hortifruti:
- 

Açougue / proteínas:
- 

Laticínios e ovos:
- 

Mercearia:
- 

Higiene e limpeza:
- 

Observações gerais:
- `,
  },
  resumoDia: {
    title: "Resumo financeiro do dia",
    content: `RESUMO FINANCEIRO – DIA
-----------------------------
Entradas do dia:
- 

Saídas principais:
- 

Pontos de atenção:
- 

Decisões para amanhã:
- `,
  },
  semana: {
    title: "Planejamento da semana",
    content: `PLANEJAMENTO DA SEMANA
-----------------------------
Metas principais:
- 

Tarefas importantes:
- 

Pendências rápidas (até 5 min):
- `,
  },
} as const;

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Buffer do editor
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isEditing, setIsEditing] = useState(false); // true = criando/ editando
  const [searchTerm, setSearchTerm] = useState("");

  // Carregar notas do localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Note[];
        setNotes(parsed);
      }
    } catch (e) {
      console.error("Erro ao carregar notas:", e);
    }
  }, []);

  // Salvar notas no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (e) {
      console.error("Erro ao salvar notas:", e);
    }
  }, [notes]);

  const selectedNote = notes.find((n) => n.id === selectedNoteId) || null;
  const charCount = content.length;

  const filteredNotes = notes.filter((note) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      note.title.toLowerCase().includes(term) ||
      note.content.toLowerCase().includes(term)
    );
  });

  function handleNewNote() {
    setSelectedNoteId(null);
    setTitle("");
    setContent("");
    setIsEditing(true);
  }

  function handleSelectNote(note: Note) {
    setSelectedNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setIsEditing(false); // modo leitura
  }

  function handleStartEdit() {
    if (!selectedNoteId) return;
    setIsEditing(true);
  }

  function handleSaveNote() {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle || !trimmedContent) return;

    const now = new Date().toISOString();

    if (selectedNoteId && isEditing) {
      // Editando nota existente
      setNotes((prev) =>
        prev.map((note) =>
          note.id === selectedNoteId
            ? {
                ...note,
                title: trimmedTitle,
                content: trimmedContent,
                updatedAt: now,
              }
            : note
        )
      );
      setIsEditing(false); // volta para leitura dessa nota
      return;
    }

    // Criando nova nota
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    const newNote: Note = {
      id,
      title: trimmedTitle,
      content: trimmedContent,
      createdAt: now,
      updatedAt: now,
    };

    setNotes((prev) => [newNote, ...prev]);

    // Depois de salvar, limpar tudo para próxima nota
    setSelectedNoteId(null);
    setTitle("");
    setContent("");
    setIsEditing(false);
  }

  function handleDeleteNote() {
    if (!selectedNoteId) return;
    setNotes((prev) => prev.filter((n) => n.id !== selectedNoteId));

    // Limpa painel
    setSelectedNoteId(null);
    setTitle("");
    setContent("");
    setIsEditing(false);
  }

  function applyTemplate(type: keyof typeof templates) {
    const tpl = templates[type];
    // Se estiver só visualizando uma nota, começa uma nova
    if (!isEditing) {
      setSelectedNoteId(null);
      setTitle(tpl.title);
      setContent(tpl.content);
      setIsEditing(true);
      return;
    }

    // Já está editando (nova/edição) → sobrescreve conteúdo
    if (!title) setTitle(tpl.title);
    setContent(tpl.content);
  }

  const canSave = isEditing && title.trim() !== "" && content.trim() !== "";
  const canDelete = !!selectedNoteId;
  const canEditExisting = !!selectedNoteId && !isEditing;

  const statusText = (() => {
    if (isEditing && !selectedNoteId) return "Criando nova nota";
    if (isEditing && selectedNote) return "Editando nota existente";
    if (selectedNote)
      return `Visualizando nota (criada em ${formatDate(
        selectedNote.createdAt
      )})`;
    return "Nenhuma nota selecionada";
  })();

  const lastUpdatedText = (() => {
    if (selectedNote && !isEditing)
      return `Última alteração: ${formatDate(selectedNote.updatedAt)}`;
    if (selectedNote && isEditing)
      return `Editando... (base: ${formatDate(selectedNote.updatedAt)})`;
    return "Nenhuma alteração ainda";
  })();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Cabeçalho */}
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-50">Bloco de notas</h1>
        <p className="text-sm text-slate-400 max-w-3xl">
          Espaço rápido para listas de compras, contas do mês, rascunhos de
          ideias e anotações do dia. Tudo é salvo automaticamente neste
          dispositivo.
        </p>
      </header>

      {/* Editor principal */}
      <section className="bg-slate-950/80 border border-slate-800 rounded-2xl shadow-lg shadow-slate-950/40 p-4 sm:p-6 space-y-4">
        {/* Linha título + botões */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Título da nota
            </label>
            <input
              type="text"
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:opacity-60"
              placeholder="Ex.: Lista de compras, Planejamento da semana..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleNewNote}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <PlusCircle size={14} />
              Nova
            </button>

            <button
              type="button"
              onClick={handleStartEdit}
              disabled={!canEditExisting}
              className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                canEditExisting
                  ? "border border-amber-500/60 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                  : "border border-slate-700 bg-slate-900 text-slate-500 cursor-not-allowed"
              }`}
            >
              <Edit3 size={14} />
              Editar
            </button>

            <button
              type="button"
              onClick={handleSaveNote}
              disabled={!canSave}
              className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                canSave
                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                  : "bg-emerald-900/40 text-emerald-300/50 cursor-not-allowed"
              }`}
            >
              <Save size={14} />
              Salvar
            </button>

            <button
              type="button"
              onClick={handleDeleteNote}
              disabled={!canDelete}
              className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                canDelete
                  ? "border border-rose-500/60 bg-rose-900/30 text-rose-200 hover:bg-rose-900/60"
                  : "border border-slate-700 bg-slate-900 text-slate-500 cursor-not-allowed"
              }`}
            >
              <Trash2 size={14} />
              Apagar
            </button>
          </div>
        </div>

        {/* Campo de conteúdo */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Conteúdo
          </label>
          <textarea
            className="w-full min-h-[220px] rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-vertical disabled:opacity-60"
            placeholder={
              isEditing
                ? "Escreva aqui suas anotações..."
                : "Selecione uma nota em “Notas salvas” ou clique em Nova para começar."
            }
            value={content}
            onChange={(e) => setContent(e.target.value)}
            readOnly={!isEditing}
          />
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
            <span>{statusText}</span>
            <span>Caracteres: {charCount}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">{lastUpdatedText}</div>
        </div>

        {/* Modelos rápidos */}
        <div className="pt-2 border-t border-slate-800">
          <p className="text-xs font-medium text-slate-400 mb-2">
            Modelos rápidos (opcional):
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyTemplate("mercado")}
              className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-800"
            >
              <Sparkles size={12} />
              Lista de compras de mercado
            </button>
            <button
              type="button"
              onClick={() => applyTemplate("resumoDia")}
              className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-800"
            >
              <Sparkles size={12} />
              Resumo financeiro do dia
            </button>
            <button
              type="button"
              onClick={() => applyTemplate("semana")}
              className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-800"
            >
              <Sparkles size={12} />
              Planejamento da semana
            </button>
          </div>
        </div>
      </section>

      {/* Lista de notas salvas */}
      <section className="bg-slate-950/80 border border-slate-800 rounded-2xl shadow-lg shadow-slate-950/40 p-4 sm:p-6 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sky-400">
            <FileText size={16} />
            <h2 className="text-sm font-semibold">
              Notas salvas ({notes.length})
            </h2>
          </div>

          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              type="text"
              className="w-full rounded-full bg-slate-900 border border-slate-700 pl-7 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Buscar por título ou conteúdo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {filteredNotes.length === 0 ? (
          <p className="text-xs text-slate-500 pt-2">
            Nenhuma nota salva ainda. Crie uma nova acima.
          </p>
        ) : (
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {filteredNotes.map((note) => {
              const isSelected = note.id === selectedNoteId;
              const preview =
                note.content.replace(/\s+/g, " ").trim().slice(0, 120) +
                (note.content.length > 120 ? "..." : "");

              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => handleSelectNote(note)}
                  className={`w-full text-left rounded-xl border px-3 py-2 text-xs transition-colors ${
                    isSelected
                      ? "border-sky-500 bg-sky-900/40 text-slate-50"
                      : "border-slate-800 bg-slate-900/80 text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold truncate">
                      {note.title || "Sem título"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatDate(note.updatedAt)}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 line-clamp-1">
                    {preview}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
