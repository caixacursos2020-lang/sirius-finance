import { LogOut, LogOutIcon, ShieldCheck, KeyRound } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function AccountPage() {
  const { user, signOut, signOutAll } = useAuth();
  const email = user?.email || "E-mail não disponível";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [statusErr, setStatusErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    setStatusErr(null);
    setStatusMsg(null);
    if (!newPassword || newPassword.length < 6) {
      setStatusErr("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusErr("As senhas não conferem.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setStatusErr(error.message);
    } else {
      setStatusMsg("Senha alterada com sucesso. Use a nova senha nos próximos logins.");
      setNewPassword("");
      setConfirmPassword("");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-emerald-400">
              Conta e login
            </p>
            <h1 className="text-2xl font-bold text-slate-50 mt-1">
              Minha conta
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Veja os dados da sua conta e resolva problemas de acesso.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs font-semibold text-slate-300">E-mail</p>
          <p className="text-lg font-semibold text-slate-50 mt-1 break-all">
            {email}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Use exatamente este e-mail e a mesma senha para entrar em qualquer
            aparelho. Se o servidor exigir confirmação de e-mail, confirme o
            link enviado para liberar o login em novos dispositivos.
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            onClick={signOut}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-semibold text-rose-300 hover:bg-rose-950/30 hover:border-rose-800 transition-colors"
          >
            <LogOut size={16} /> Sair da conta
          </button>

          <button
            onClick={signOutAll}
            className="flex items-center justify-center gap-2 rounded-lg border border-amber-800 bg-amber-900/20 px-4 py-3 text-sm font-semibold text-amber-200 hover:bg-amber-900/30 transition-colors"
          >
            <LogOutIcon size={16} /> Sair de todos os dispositivos
          </button>
        </div>

        <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950/60 p-4 space-y-3">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
            <KeyRound size={16} className="text-emerald-400" /> Alterar senha
          </div>
          <p className="text-xs text-slate-400">
            Defina uma nova senha para acessar em qualquer aparelho. Você já está autenticado, então não precisa da senha atual.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400">Nova senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400">Confirmar senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                placeholder="Repita a nova senha"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleChangePassword}
              disabled={saving}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-500 disabled:opacity-60"
            >
              {saving ? "Atualizando..." : "Salvar nova senha"}
            </button>
            <button
              type="button"
              onClick={() => {
                setNewPassword("");
                setConfirmPassword("");
                setStatusErr(null);
                setStatusMsg(null);
              }}
              className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Limpar
            </button>
          </div>
          {statusErr && (
            <p className="text-xs text-rose-300">{statusErr}</p>
          )}
          {statusMsg && (
            <p className="text-xs text-emerald-300">{statusMsg}</p>
          )}
        </div>

        <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950/60 p-4 space-y-2 text-sm text-slate-300">
          <div className="flex items-center gap-2 text-emerald-300 text-xs uppercase font-bold">
            <ShieldCheck size={14} /> Ajuda rápida
          </div>
          <ul className="list-disc pl-5 space-y-1 text-slate-400 text-[13px]">
            <li>Use o mesmo e-mail e senha em qualquer aparelho.</li>
            <li>
              Se não conseguir entrar, verifique se o e-mail foi confirmado (se
              o servidor exigir confirmação).
            </li>
            <li>
              Se esqueceu a senha, use a opção de redefinição (quando
              disponível).
            </li>
            <li>
              “Sair de todos os dispositivos” força nova sessão em todos os
              lugares.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
