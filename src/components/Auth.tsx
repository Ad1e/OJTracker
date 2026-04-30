import { useState } from "react";
import { supabase } from "../lib/supabase";
import BsuLogoImg from "../assets/bsu-logo.png";

export function Auth({ onLogin }: { onLogin: () => void }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!supabase) {
            // Mock auth if supabase is not configured
            setTimeout(() => {
                localStorage.setItem("mock_session", "true");
                onLogin();
            }, 500);
            return;
        }

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
            }
            onLogin();
        } catch (err: any) {
            setError(err.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <div className="w-20 h-20 mx-auto flex items-center justify-center mb-4">
                    <img src={BsuLogoImg} alt="BSU Logo" className="w-full h-full object-contain drop-shadow-xl" />
                </div>
                <h2 className="text-center text-3xl font-display font-extrabold text-white tracking-tight">
                    {isLogin ? "Sign in to SpartaShift" : "Create an account"}
                </h2>
                {!supabase && (
                    <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-sm">
                        <p className="font-semibold">Supabase is not configured.</p>
                        <p className="mt-1">Any email/password will let you test the UI.</p>
                    </div>
                )}
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="glass-card py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-slate-800">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-semibold text-slate-300 uppercase tracking-wider">Email address</label>
                            <div className="mt-2 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                    </svg>
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-lg bg-slate-900/50 text-white focus:ring-2 focus:ring-accent focus:border-transparent transition-all shadow-inner"
                                    placeholder="intern@bsu.edu.ph"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-300 uppercase tracking-wider">Password</label>
                            <div className="mt-2 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-lg bg-slate-900/50 text-white focus:ring-2 focus:ring-accent focus:border-transparent transition-all shadow-inner"
                                    placeholder="••••••••"
                                    minLength={6}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-start gap-2">
                                <svg className="w-5 h-5 text-red-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span className="text-red-400 text-sm font-medium">{error}</span>
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-accent hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent focus:ring-offset-background disabled:opacity-50 transition-all"
                            >
                                {loading && (
                                    <svg className="w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                                    </svg>
                                )}
                                {isLogin ? "Sign in" : "Sign up"}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError(null);
                            }}
                            className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
                        >
                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                            <span className="text-accent hover:text-indigo-400 underline decoration-accent/30 underline-offset-4">
                                {isLogin ? "Sign up here" : "Sign in here"}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
