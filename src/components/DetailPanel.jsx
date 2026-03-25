import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { getAqiColor, getAqiCategory, getAqiBg, getAqiTextColor } from '../utils/aqiUtils';

function DetailPanel() {
  const { wardDetail, isPanelOpen, isDetailLoading, selectedWard, activeTab } = useAppState();
  const dispatch = useAppDispatch();
  const panelRef = useRef(null);
  const counterRef = useRef(null);
  const contentRef = useRef(null);

  const detail = wardDetail;

  // GSAP slide from right
  useEffect(() => {
    if (!panelRef.current) return;
    if (isPanelOpen && detail) {
      gsap.fromTo(panelRef.current,
        { x: '100%', opacity: 0 },
        { x: '0%', opacity: 1, duration: 0.6, ease: 'power3.out' }
      );
      if (contentRef.current) {
        const sections = contentRef.current.querySelectorAll('.panel-section');
        gsap.fromTo(sections,
          { y: 25, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.07, ease: 'power2.out', delay: 0.3 }
        );
      }
    } else if (!isPanelOpen) {
      gsap.to(panelRef.current, { x: '100%', opacity: 0, duration: 0.4, ease: 'power2.in' });
    }
  }, [isPanelOpen, detail]);

  // AQI counter animation
  useEffect(() => {
    if (!counterRef.current || !detail) return;
    const target = { val: 0 };
    gsap.to(target, {
      val: detail.aqi,
      duration: 1.5,
      ease: 'power2.out',
      delay: 0.5,
      onUpdate: () => {
        if (counterRef.current) counterRef.current.textContent = Math.round(target.val);
      },
    });
  }, [detail?.aqi, selectedWard]);

  // Source bars animation
  useEffect(() => {
    if (!contentRef.current || !detail) return;
    const bars = contentRef.current.querySelectorAll('.source-bar-fill');
    gsap.fromTo(bars,
      { width: '0%' },
      { width: (i) => `${detail.sources[i]?.pct || 0}%`, duration: 0.8, stagger: 0.1, ease: 'power2.out', delay: 0.6 }
    );
  }, [detail]);

  if (!selectedWard) {
    return <div ref={panelRef} className="fixed right-0 top-0 h-full w-[360px] z-30 translate-x-full" />;
  }

  const aqi = detail?.aqi || 0;
  const predicted = detail?.predicted || 0;
  const trend = detail?.trend || 'stable';
  const trendIcon = trend === 'rising' ? '↗' : trend === 'falling' ? '↘' : '→';
  const trendColor = trend === 'rising' ? '#ef4444' : trend === 'falling' ? '#22c55e' : '#94a3b8';
  const sources = detail?.sources || [];
  const advisory = detail?.advisory || {};
  const mitigations = detail?.mitigations || [];
  const explainability = detail?.explainability || '';

  return (
    <div
      ref={panelRef}
      className="fixed right-0 top-0 h-full w-[360px] z-30 glass-panel-solid shadow-2xl shadow-black/60 flex flex-col translate-x-full"
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.05] flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-gray-50 tracking-tight">
              {detail?.ward_name || 'Loading...'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {detail ? `${detail.district} · Ward #${detail.ward_no}` : ''}
            </p>
          </div>
          <button
            onClick={() => dispatch({ type: 'DESELECT_WARD' })}
            className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {isDetailLoading && !detail ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : detail ? (
          <>
            {/* AQI Display */}
            <div className="panel-section rounded-xl p-5" style={{ background: getAqiBg(aqi) }}>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.15em] mb-2">Current AQI</p>
                  <div className="flex items-baseline gap-3">
                    <span ref={counterRef} className="text-5xl font-black font-mono" style={{ color: getAqiTextColor(aqi) }}>0</span>
                    <span className="text-sm font-bold px-2.5 py-1 rounded-lg" style={{ background: `${getAqiColor(aqi)}20`, color: getAqiTextColor(aqi) }}>
                      {getAqiCategory(aqi)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 mb-1">Predicted</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-2xl font-bold font-mono" style={{ color: getAqiTextColor(predicted) }}>{predicted}</span>
                    <span className="text-xl" style={{ color: trendColor }}>{trendIcon}</span>
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: trendColor }}>
                    {trend === 'rising' ? 'Worsening' : trend === 'falling' ? 'Improving' : 'Stable'}
                  </p>
                </div>
              </div>
            </div>

            {/* Source Attribution */}
            <div className="panel-section">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-3">Source Attribution</h3>
              <div className="space-y-3">
                {sources.map((s, i) => (
                  <div key={s.key || i}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-xs text-gray-300">{s.source}</span>
                      </div>
                      <span className="text-xs text-gray-500 font-mono font-bold">{s.pct}%</span>
                    </div>
                    <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className="source-bar-fill h-full rounded-full"
                        style={{ backgroundColor: s.color, width: '0%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Explainability */}
            <div className="panel-section rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
              <div className="flex gap-2.5">
                <span className="text-base mt-0.5">💡</span>
                <p className="text-xs text-gray-400 leading-relaxed">{explainability}</p>
              </div>
            </div>

            {/* Health Advisory — Citizen tab only */}
            {activeTab === 'user' && (
            <div className="panel-section">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-3">Health Advisory</h3>
              <div className="space-y-2">
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3.5">
                  <p className="text-[9px] text-gray-500 font-bold uppercase mb-1.5">General Public</p>
                  <p className="text-xs text-gray-300 leading-relaxed">{advisory.general}</p>
                </div>
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3.5">
                  <p className="text-[9px] text-gray-500 font-bold uppercase mb-1.5">Sensitive Groups</p>
                  <p className="text-xs text-gray-300 leading-relaxed">{advisory.sensitive}</p>
                </div>
              </div>
            </div>
            )}

            {/* Policy Recommendations — Admin tab only */}
            {activeTab === 'admin' && (
            <div className="panel-section">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                Recommended Policy Actions
              </h3>
              <div className="space-y-1.5">
                {mitigations.map((m, i) => (
                  <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg priority-${m.priority}`}>
                    <span className="text-sm">{m.icon}</span>
                    <span className="text-xs font-medium flex-1">{m.action}</span>
                    <span className="text-[9px] uppercase font-bold opacity-50">{m.priority}</span>
                  </div>
                ))}
              </div>
            </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

export default React.memo(DetailPanel);
