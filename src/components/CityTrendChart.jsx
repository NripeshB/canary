import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppState } from '../context/AppContext';
import { getAqiColor, getAqiCategory } from '../utils/aqiUtils';

function CityTrendChart() {
  const { cityTrend, selectedWard } = useAppState();
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || cityTrend.length === 0) return;
    gsap.fromTo(containerRef.current,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 1.4 }
    );
  }, [cityTrend]);

  if (cityTrend.length === 0 || selectedWard) return null;

  const avgAqi = Math.round(cityTrend.reduce((s, d) => s + d.aqi, 0) / cityTrend.length);
  const maxMonth = cityTrend.reduce((a, b) => a.aqi > b.aqi ? a : b);
  const minMonth = cityTrend.reduce((a, b) => a.aqi < b.aqi ? a : b);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="glass-panel-solid rounded-lg px-3 py-2 text-xs border border-white/[0.08]">
        <p className="font-bold text-gray-200">{d.month}</p>
        <p style={{ color: d.color }}>AQI: <span className="font-mono font-bold">{d.aqi}</span></p>
        <p className="text-gray-500">{d.category}</p>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="absolute bottom-6 right-4 z-10 w-[280px]">
      <div className="glass-panel-solid rounded-xl p-4 border border-white/[0.03]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">City AQI Trend</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">12-month overview</p>
          </div>
          <div className="text-right">
            <span className="text-lg font-mono font-extrabold" style={{ color: getAqiColor(avgAqi) }}>
              {avgAqi}
            </span>
            <p className="text-[9px] text-gray-500">avg</p>
          </div>
        </div>

        <div className="h-[100px] -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cityTrend} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getAqiColor(avgAqi)} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={getAqiColor(avgAqi)} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#475569' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="aqi"
                stroke={getAqiColor(avgAqi)}
                strokeWidth={2}
                fill="url(#aqiGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-between mt-2 text-[9px]">
          <span className="text-gray-500">Peak: <span className="font-bold" style={{ color: getAqiColor(maxMonth.aqi) }}>{maxMonth.month} ({maxMonth.aqi})</span></span>
          <span className="text-gray-500">Low: <span className="font-bold" style={{ color: getAqiColor(minMonth.aqi) }}>{minMonth.month} ({minMonth.aqi})</span></span>
        </div>
      </div>
    </div>
  );
}

export default React.memo(CityTrendChart);
