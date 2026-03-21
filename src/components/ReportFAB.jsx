import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useAppDispatch } from '../context/AppContext';

function ReportFAB() {
  const dispatch = useAppDispatch();
  const fabRef = useRef(null);

  useEffect(() => {
    if (!fabRef.current) return;
    // Entrance animation
    gsap.fromTo(fabRef.current,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)', delay: 1.5 }
    );
  }, []);

  return (
    <button
      ref={fabRef}
      onClick={() => dispatch({ type: 'TOGGLE_MODAL', payload: true })}
      className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-accent/90 hover:bg-accent text-white shadow-lg shadow-accent/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 animate-pulse-glow"
      title="Report Pollution"
      id="report-fab"
    >
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </button>
  );
}

export default React.memo(ReportFAB);
