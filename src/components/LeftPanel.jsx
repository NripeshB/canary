import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useAppState } from '../context/AppContext';
import { getAqiColor, getAqiCategory } from '../utils/aqiUtils';

function LeftPanel() {
  const { wardDetail, isLeftPanelOpen, isDetailLoading, selectedWard } = useAppState();
  const panelRef = useRef(null);
  const contentRef = useRef(null);

  // GSAP slide from left
  useEffect(() => {
    if (!panelRef.current) return;
    if (isLeftPanelOpen && wardDetail) {
      gsap.fromTo(panelRef.current,
        { x: '-100%', opacity: 0 },
        { x: '0%', opacity: 1, duration: 0.6, ease: 'power3.out' }
      );
      if (contentRef.current) {
        const sections = contentRef.current.querySelectorAll('.left-section');
        gsap.fromTo(sections,
          { y: 25, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power2.out', delay: 0.3 }
        );
      }
    } else if (!isLeftPanelOpen) {
      gsap.to(panelRef.current, { x: '-100%', opacity: 0, duration: 0.4, ease: 'power2.in' });
    }
  }, [isLeftPanelOpen, wardDetail]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="glass-panel-solid rounded-lg px-3 py-2 text-xs border border-white/[0.08]">
        <p className="text-gray-300 font-medium">{d.label || d.month || ''}</p>
        <p style={{ color: getAqiColor(d.aqi) }}>AQI: <span className="font-mono font-bold">{d.aqi}</span></p>
      </div>
    );
  };

  if (!selectedWard) {
    return <div ref={panelRef} className="fixed left-0 top-0 h-full w-[340px] z-20 -translate-x-full" />;
  }

  const detail = wardDetail;
  const trend24h = detail?.trend_24h || [];
  const sources = detail?.sources || [];
  const reports = detail?.reports || [];
  const aqi = detail?.aqi || 0;

  return (
    <div
      ref={panelRef}
      className="fixed left-0 top-0 h-full w-[340px] z-20 glass-panel-solid shadow-2xl shadow-black/60 flex flex-col -translate-x-full"
    >
      {/* Header strip */}
      <div className="px-5 pt-5 pb-3 border-b border-white/[0.05] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${getAqiColor(aqi)}15` }}
          >
            <span className="text-lg font-mono font-extrabold" style={{ color: getAqiColor(aqi) }}>
              {aqi || '—'}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-100">Ward Analysis</h3>
            <p className="text-[10px] text-gray-500">
              {detail ? `${detail.ward_name} · ${detail.district}` : 'Loading...'}
            </p>
          </div>
        </div>

        {/* Quick stats */}
        {detail && (
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2 text-center">
              <p className="text-[9px] text-gray-500 uppercase">Pop.</p>
              <p className="text-xs font-bold text-gray-200">{(detail.population || 0).toLocaleString()}</p>
            </div>
            <div className="flex-1 rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2 text-center">
              <p className="text-[9px] text-gray-500 uppercase">Reports</p>
              <p className="text-xs font-bold text-gray-200">{detail.report_count || 0}</p>
            </div>
            <div className="flex-1 rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2 text-center">
              <p className="text-[9px] text-gray-500 uppercase">Status</p>
              <p className="text-xs font-bold" style={{ color: getAqiColor(aqi) }}>{getAqiCategory(aqi)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {isDetailLoading && !detail ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : detail ? (
          <>
            {/* 24h AQI Trend */}
            <div className="left-section">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-3">24-Hour Trend</h4>
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3">
                <div className="h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend24h} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                      <defs>
                        <linearGradient id="trend24Gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={getAqiColor(aqi)} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={getAqiColor(aqi)} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
                      <XAxis dataKey="label" tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} interval={5} />
                      <YAxis tick={{ fontSize: 8, fill: '#475569' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="aqi" stroke={getAqiColor(aqi)} strokeWidth={2} fill="url(#trend24Gradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-between mt-1 text-[9px] text-gray-500">
                  <span>12 AM</span>
                  <span>Now</span>
                  <span>11 PM</span>
                </div>
              </div>
            </div>

            {/* Source Contribution Bar Chart */}
            <div className="left-section">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-3">Source Breakdown</h4>
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3">
                <div className="h-[100px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sources} layout="vertical" margin={{ top: 0, right: 5, bottom: 0, left: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="source"
                        type="category"
                        tick={{ fontSize: 9, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        width={100}
                        tickFormatter={(val) => val.length > 14 ? val.slice(0, 12) + '…' : val}
                      />
                      <Tooltip
                        formatter={(val) => [`${val}%`, 'Contribution']}
                        contentStyle={{ background: 'rgba(15,21,32,0.95)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '8px', fontSize: '11px', color: '#e2e8f0' }}
                      />
                      <Bar dataKey="pct" radius={[0, 4, 4, 0]} fill={getAqiColor(aqi)} barSize={10} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Recent Reports */}
            <div className="left-section">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-3">
                Recent Reports
                {reports.length > 0 && <span className="ml-2 text-accent font-mono">{reports.length}</span>}
              </h4>
              {reports.length === 0 ? (
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4 text-center">
                  <p className="text-xs text-gray-500">No reports for this ward</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reports.slice(0, 4).map((r, i) => (
                    <div key={r.id || i} className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                          {r.category}
                        </span>
                        <span className="text-[9px] text-gray-500">
                          {r.hours_ago === 0 ? 'Just now' : `${r.hours_ago}h ago`}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 line-clamp-2 mt-1">{r.description}</p>
                      <div className="flex gap-0.5 mt-1.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <div
                            key={s}
                            className="w-4 h-1 rounded-full"
                            style={{ backgroundColor: s <= r.severity ? getAqiColor(r.severity * 80) : 'rgba(255,255,255,0.04)' }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default React.memo(LeftPanel);
