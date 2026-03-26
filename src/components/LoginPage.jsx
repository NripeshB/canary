import React, { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useAppDispatch } from '../context/AppContext';
import { login } from '../api/authApi';

function LoginPage() {
  const dispatch = useAppDispatch();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const cardRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(cardRef.current,
        { y: 30, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out' }
      );
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await login(username, password);
      if (result.success) {
        dispatch({ type: 'SET_USER', payload: result.user });
        // Animate out
        if (cardRef.current) {
          gsap.to(cardRef.current, {
            y: -20, opacity: 0, scale: 0.97, duration: 0.3,
          });
        }
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials');
      // Shake animation
      if (formRef.current) {
        gsap.fromTo(formRef.current,
          { x: -8 },
          { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' }
        );
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/95 backdrop-blur-md">
      <div ref={cardRef} className="w-full max-w-sm mx-4">
        <div className="glass-panel-solid rounded-2xl border border-white/[0.05] shadow-2xl shadow-black/70 overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-5 text-center">
            <div className="w-14 h-14 rounded-xl bg-accent/15 flex items-center justify-center mx-auto mb-4 border border-accent/20">
              <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h2 className="text-lg font-extrabold text-gray-50 tracking-tight">Admin Access</h2>
            <p className="text-xs text-gray-500 mt-1">Delhi AQI Command — Policy Intelligence</p>
          </div>

          {/* Form */}
          <form ref={formRef} onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-center">
                <p className="text-xs text-red-400 font-medium">{error}</p>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoFocus
                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-accent/40 transition-colors"
                id="login-username"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-accent/40 transition-colors"
                id="login-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !username.trim() || !password.trim()}
              className="w-full py-3.5 rounded-xl bg-accent/20 hover:bg-accent/30 text-accent font-bold text-sm transition-all border border-accent/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              id="login-submit"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In to Admin Panel'
              )}
            </button>

            <p className="text-[10px] text-gray-600 text-center mt-3">
              Authorized personnel only. All access is logged.
            </p>
          </form>
        </div>

        {/* Back to citizen */}
        <button
          onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'user' })}
          className="w-full mt-4 py-2.5 text-xs text-gray-500 hover:text-gray-300 transition-colors text-center"
        >
          ← Back to Citizen View
        </button>
      </div>
    </div>
  );
}

export default React.memo(LoginPage);
