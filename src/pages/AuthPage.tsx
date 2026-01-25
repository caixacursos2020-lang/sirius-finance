import { useState, type FormEvent } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";

type Mode = "login" | "signup";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuth();

  const title =
    mode === "login" ? "Entrar na sua conta" : "Criar conta no Sirius";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const action = mode === "login" ? signIn : signUp;
    const { error } = await action(email, password);

    if (error) {
      setError(error);
    } else if (mode === "signup") {
      setInfo(
        "Conta criada! Se a verificação de e-mail estiver ativa no servidor, confirme o e-mail antes de acessar em outros aparelhos."
      );
    }

    setLoading(false);
  }

  const handleForgotPassword = async () => {
    setError(null);
    setInfo(null);
    if (!email) {
      setError("Informe seu e-mail para receber o link de redefinição.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) {
      setError(error.message);
    } else {
      setInfo(
        "Enviamos um e-mail com instruções para redefinir sua senha. Verifique a caixa de entrada e spam."
      );
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h1 className="text-2xl font-semibold mb-4 text-center">
          Sirius Finance
        </h1>
        <p className="text-sm text-slate-300 mb-6 text-center">{title}</p>

        <div className="flex mb-4 rounded-lg overflow-hidden bg-slate-800">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 py-2 text-sm font-medium ${
              mode === "login"
                ? "bg-emerald-500 text-slate-950"
                : "text-slate-300"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 py-2 text-sm font-medium ${
              mode === "signup"
                ? "bg-emerald-500 text-slate-950"
                : "text-slate-300"
            }`}
          >
            Criar conta
          </button>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-400 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        {info && (
          <div className="mb-4 text-sm text-emerald-300 bg-emerald-900/20 border border-emerald-700 rounded-lg px-3 py-2">
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-slate-200" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-200" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 rounded-lg bg-emerald-500 text-slate-950 font-semibold py-2 text-sm hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading
              ? "Processando..."
              : mode === "login"
              ? "Entrar"
              : "Criar conta"}
          </button>

          {mode === "login" && (
            <button
              type="button"
              onClick={handleForgotPassword}
              className="mt-3 w-full text-[12px] text-sky-400 hover:text-sky-300 underline underline-offset-2"
              disabled={loading}
            >
              Esqueci a senha / Redefinir acesso
            </button>
          )}

          <p className="text-[11px] text-slate-500 text-center mt-3">
            Dica: use o mesmo e-mail e senha em qualquer dispositivo. Se não
            conseguir entrar, verifique se o e-mail foi confirmado ou redefina
            a senha.
          </p>
        </form>
      </div>
    </div>
  );
}
