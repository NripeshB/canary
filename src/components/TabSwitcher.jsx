import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useAppState, useAppDispatch } from '../context/AppContext';

function TabSwitcher() {
  const { activeTab } = useAppState();
  const dispatch = useAppDispatch();
  const indicatorRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!indicatorRef.current || !containerRef.current) return;
    const buttons = containerRef.current.querySelectorAll('.tab-btn');
    const activeBtn = activeTab === 'user' ? buttons[0] : buttons[1];
    if (activeBtn) {
      gsap.to(indicatorRef.current, {
        x: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
        duration: 0.35,
        ease: 'power3.out',
      });
    }
  }, [activeTab]);

  const handleSwitch = (tab) => {
    if (tab !== activeTab) {
      dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex items-center glass-panel-solid rounded-xl p-1 border border-white/[0.03]"
    >
      {/* Sliding indicator */}
      <div
        ref={indicatorRef}
        className="absolute top-1 h-[calc(100%-8px)] rounded-lg bg-accent/15 border border-accent/25 pointer-events-none"
        style={{ left: 0, width: 0 }}
      />

      <button
        onClick={() => handleSwitch('user')}
        className={`tab-btn relative z-10 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-semibold transition-colors ${
          activeTab === 'user'
            ? 'text-accent'
            : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
        </svg>
        Citizen
      </button>

      <button
        onClick={() => handleSwitch('admin')}
        className={`tab-btn relative z-10 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-semibold transition-colors ${
          activeTab === 'admin'
            ? 'text-accent'
            : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Admin
      </button>
    </div>
  );
}

export default React.memo(TabSwitcher);
