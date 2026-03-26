import React, { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import ReactMarkdown from "react-markdown";import { useAppState, useAppDispatch } from '../context/AppContext';
import { getAqiColor, getAqiCategory, getAqiBg, getAqiTextColor } from '../utils/aqiUtils';
import { exportWardPDF } from '../utils/pdfExport';

function DetailPanel() {
  const { wardDetail, isPanelOpen, isDetailLoading, selectedWard, activeTab } = useAppState();
  const dispatch = useAppDispatch();
  const panelRef = useRef(null);
  const counterRef = useRef(null);
  const contentRef = useRef(null);
  const [simOpen, setSimOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatEndRef = useRef(null);

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

 

  const aqi = detail?.aqi || 0;
  const predicted = detail?.predicted || 0;
  const trend = detail?.trend || 'stable';
  const trendIcon = trend === 'rising' ? '↗' : trend === 'falling' ? '↘' : '→';
  const trendColor = trend === 'rising' ? '#ef4444' : trend === 'falling' ? '#22c55e' : '#94a3b8';
  const sources = detail?.sources || [];
  const advisory = detail?.advisory || {};
  const smartRec = detail?.smart_recommendations || null;
  const historical = detail?.historical || {};
  const explainability = detail?.explainability || '';

  const assistantContext = useMemo(() => {
    if (!detail) return null;
    const topSources = [...sources]
      .sort((a, b) => (b?.pct || 0) - (a?.pct || 0))
      .slice(0, 2)
      .map((s) => `${s.source} (${s.pct}%)`)
      .join(', ');

    return {
      wardName: detail.ward_name,
      aqi,
      predicted,
      trend,
      category: getAqiCategory(aqi),
      topSources: topSources || 'mixed local factors',
      advisoryGeneral: advisory.general || '',
      advisorySensitive: advisory.sensitive || '',
      explainability,
    };
  }, [detail, sources, advisory.general, advisory.sensitive, aqi, predicted, trend, explainability]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [chatMessages, isChatLoading]);

  useEffect(() => {
    if (!assistantContext) {
      setChatMessages([]);
      return;
    }

    const trendSummary = assistantContext.trend === 'rising'
      ? 'AQI may worsen in the next cycle'
      : assistantContext.trend === 'falling'
        ? 'AQI is likely to improve shortly'
        : 'AQI is expected to remain stable';

    const intro =
      `For ${assistantContext.wardName}, current AQI is ${assistantContext.aqi} (${assistantContext.category}) and predicted AQI is ${assistantContext.predicted}. ` +
      `${trendSummary}. Main contributors right now: ${assistantContext.topSources}.`;

    setChatMessages([
      {
        role: 'assistant',
        text: intro,
      },
    ]);
  }, [assistantContext]);

  const fallbackLocalReply = (question) => {
    if (!assistantContext) return 'Please select a ward so I can provide insights.';
    const q = question.toLowerCase();
    if (q.includes('source') || q.includes('cause') || q.includes('why')) return `Top source drivers are ${assistantContext.topSources}.`;
    if (q.includes('predict') || q.includes('future') || q.includes('next')) return `Predicted AQI is ${assistantContext.predicted} and trend is ${assistantContext.trend}.`;
    return assistantContext.explainability || `Current AQI is ${assistantContext.aqi} (${assistantContext.category}) in ${assistantContext.wardName}.`;
  };

  const getExternalAssistantReply = async (question) => {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;


    // untested Models: "meta-llama/llama-3.2-3b-instruct:free";
    // "meta-llama/llama-3.3-70b-instruct:free";
    // "google/gemma-3-27b-it:free";
    // "google/gemma-3-12b-it:free";
    // "google/gemma-3-4b-it:free";
    // "google/gemma-3n-e4b-it:free";
    // "google/gemma-3n-e2b-it:free";
    

    const model = "nvidia/nemotron-3-super-120b-a12b:free";//"nvidia/nemotron-3-super-120b-a12b:free";//"nvidia/nemotron-3-nano-30b-a3b:free";'arcee-ai/trinity-large-preview:free';//"stepfun/step-3.5-flash:free"; 

    if (!apiKey) {
      return fallbackLocalReply(question);
    }

    const wardContextPrompt = assistantContext
      ? `Ward context:\n- Ward: ${assistantContext.wardName}\n- AQI: ${assistantContext.aqi} (${assistantContext.category})\n- Predicted AQI: ${assistantContext.predicted}\n- Trend: ${assistantContext.trend}\n- Top sources: ${assistantContext.topSources}\n- General advisory: ${assistantContext.advisoryGeneral}\n- Sensitive advisory: ${assistantContext.advisorySensitive}\n- Explainability: ${assistantContext.explainability}\n`
      : 'No ward selected yet.';

    // const systemPrompt = `You are an AQI assistant. Give concise, practical, and well-rounded responses, including uncertainty when needed. Use the ward context when relevant, but still answer vague questions helpfully.`;
    const systemPrompt = `
      You are an AQI assistant.

      Rules:
      - If user greets only Greet back say what can i help you with
      - Always ask if the user needs any help or futher information at the end.
      - Don't use emojis.
      - Keep responses between 150–200 words MAX
      - Be concise and practical
      - Avoid unnecessary explanations
      - Use bullet points when helpful
      - No long paragraphs

Use the ward context when relevant.
`;
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${wardContextPrompt}\nUser question: ${question}` },
        ],
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter request failed with ${response.status}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content?.trim() || fallbackLocalReply(question);
  };

  const handleSendMessage = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || isChatLoading) return;
    setChatError('');
    const userMessage = { role: 'user', text: trimmed };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');

    setIsChatLoading(true);
    try {
      const reply = await getExternalAssistantReply(trimmed);
      const assistantMessage = { role: 'assistant', text: reply };
      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setChatError('Chat service is unavailable right now. Showing a local fallback answer.');
      const assistantMessage = { role: 'assistant', text: fallbackLocalReply(trimmed) };
      setChatMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };
   if (!selectedWard) {
    return <div ref={panelRef} className="fixed right-0 top-0 h-full w-[360px] z-30 translate-x-full" />;
  }

  // Priority color mapping
  const priorityColors = {
    monitor: 'rgba(34,197,94,0.1)',
    low: 'rgba(34,197,94,0.1)',
    moderate: 'rgba(234,179,8,0.1)',
    medium: 'rgba(234,179,8,0.1)',
    enforce: 'rgba(249,115,22,0.1)',
    high: 'rgba(249,115,22,0.1)',
    emergency: 'rgba(239,68,68,0.15)',
    critical: 'rgba(239,68,68,0.15)',
  };

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
          <div className="flex gap-1">
            {activeTab === 'admin' && detail && (
              <button
                onClick={() => exportWardPDF(detail)}
                className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors"
                title="Export Ward Report as PDF"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            )}
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

              {/* Historical comparison badges */}
              {(historical.vs_yesterday || historical.vs_week_avg) && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.06]">
                  {historical.vs_yesterday && (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${historical.vs_yesterday.direction === 'worse' ? 'bg-red-500/15 text-red-400' : historical.vs_yesterday.direction === 'better' ? 'bg-green-500/15 text-green-400' : 'bg-gray-500/15 text-gray-400'}`}>
                      {historical.vs_yesterday.label}
                    </span>
                  )}
                  {historical.vs_week_avg && (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${historical.vs_week_avg.direction === 'worse' ? 'bg-red-500/15 text-red-400' : historical.vs_week_avg.direction === 'better' ? 'bg-green-500/15 text-green-400' : 'bg-gray-500/15 text-gray-400'}`}>
                      {historical.vs_week_avg.label}
                    </span>
                  )}
                </div>
              )}
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

            {/* AI Insight + Free Chatbot */}
            <div className="panel-section rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">AI Assistant</h3>
                <span className="text-[9px] text-emerald-400 font-semibold uppercase">Free</span>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {chatMessages.map((msg, i) => (
                  <div
                    key={`${msg.role}-${i}`}
                    className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                      msg.role === 'assistant'
                        ? 'bg-indigo-500/10 border border-indigo-400/20 text-gray-200'
                        : 'bg-white/5 border border-white/10 text-gray-300'
                    }`}
                  >
                    <p className="text-[9px] uppercase font-bold opacity-60 mb-1">{msg.role}</p>
                    {/* <p>{msg.text}</p>
                     */}
                     <ReactMarkdown>
                        {msg.text}
                      </ReactMarkdown>
                  </div>
                ))}
                {isChatLoading ? (
                  <div className="rounded-lg px-3 py-2 text-xs leading-relaxed bg-indigo-500/10 border border-indigo-400/20 text-gray-200">
                    <p className="text-[9px] uppercase font-bold opacity-60 mb-1">assistant</p>
                    <p>Thinking…</p>
                  </div>
                ) : null}
                <div ref={chatEndRef} />
              </div>
              {chatError ? (
                <p className="mt-2 text-[10px] text-amber-400">{chatError}</p>
              ) : null}
              <div className="mt-3 flex gap-2">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask anything (AQI, health, trend, action plan...). Press Enter to send."
                  rows={3}
                  className="flex-1 min-h-[84px] rounded-lg bg-black/30 border border-accent/30 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-accent resize-none"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isChatLoading}
                  className="self-end h-10 px-4 rounded-lg bg-accent/80 hover:bg-accent disabled:opacity-60 text-[11px] font-bold text-black transition-colors"
                >
                  Send
                </button>
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

            {/* Smart Policy Recommendations — Admin tab only */}
            {activeTab === 'admin' && smartRec && (
            <div className="panel-section">
              {/* Severity + Urgency header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  Smart Policy Engine
                </h3>
                <div className="flex gap-1.5">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                    smartRec.severity_tier === 'emergency' ? 'bg-red-500/20 text-red-400' :
                    smartRec.severity_tier === 'enforce' ? 'bg-orange-500/20 text-orange-400' :
                    smartRec.severity_tier === 'moderate' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>{smartRec.severity_tier}</span>
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-white/[0.05] text-gray-400">
                    Urgency {smartRec.urgency}/100
                  </span>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-3 mb-3">
                <p className="text-[11px] text-gray-300 leading-relaxed">{smartRec.summary}</p>
              </div>

              {/* Primary Actions */}
              <p className="text-[9px] font-bold text-gray-500 uppercase mb-2">
                Primary Actions ({smartRec.dominant_source_label})
              </p>
              <div className="space-y-1.5 mb-3">
                {smartRec.primary_actions?.map((a, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                    style={{ background: priorityColors[a.priority] || 'rgba(255,255,255,0.03)' }}>
                    <span className="text-sm flex-shrink-0">{a.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-gray-200 block">{a.action}</span>
                      <span className="text-[9px] text-gray-500">{a.dept} · Impact −{a.impact} AQI</span>
                    </div>
                    <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      a.priority === 'emergency' || a.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                      a.priority === 'enforce' || a.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>{a.priority}</span>
                  </div>
                ))}
              </div>

              {/* Secondary Actions */}
              {smartRec.secondary_actions?.length > 0 && (
                <>
                  <p className="text-[9px] font-bold text-gray-500 uppercase mb-2">Secondary Actions</p>
                  <div className="space-y-1.5 mb-3">
                    {smartRec.secondary_actions.map((a, i) => (
                      <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.02]">
                        <span className="text-sm">{a.icon}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-gray-300">{a.action}</span>
                          <span className="text-[9px] text-gray-500 block">{a.dept}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Compound Actions */}
              {smartRec.compound_actions?.length > 0 && (
                <>
                  <p className="text-[9px] font-bold text-amber-400 uppercase mb-2">⚠ Compound Situation</p>
                  <div className="space-y-1.5 mb-3">
                    {smartRec.compound_actions.map((a, i) => (
                      <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-amber-500/[0.08] border border-amber-500/20">
                        <span className="text-sm">{a.icon}</span>
                        <div className="flex-1">
                          <span className="text-xs font-medium text-amber-200">{a.action}</span>
                          <span className="text-[9px] text-amber-400/70 block">{a.dept} · {a.trigger}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Before/After Simulation */}
              <div
                className="rounded-lg border border-white/[0.08] p-3 cursor-pointer hover:bg-white/[0.03] transition-colors"
                onClick={() => setSimOpen(!simOpen)}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-bold text-gray-400 uppercase">📊 Impact Simulation</p>
                  <span className="text-[10px] text-gray-500">{simOpen ? '▲' : '▼'}</span>
                </div>
                {simOpen && (
                  <div className="mt-3 pt-3 border-t border-white/[0.05]">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="text-center">
                        <p className="text-[9px] text-gray-500 mb-1">Current</p>
                        <p className="text-2xl font-black font-mono" style={{ color: getAqiColor(aqi) }}>{aqi}</p>
                      </div>
                      <div className="text-xl text-gray-500">→</div>
                      <div className="text-center">
                        <p className="text-[9px] text-gray-500 mb-1">Projected</p>
                        <p className="text-2xl font-black font-mono text-green-400">{smartRec.projected_aqi}</p>
                      </div>
                      <div className="flex-1 text-right">
                        <p className="text-lg font-bold text-green-400">−{smartRec.estimated_aqi_reduction}</p>
                        <p className="text-[9px] text-gray-500">AQI reduction</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 italic">
                      If all primary actions are implemented within 24 hours
                    </p>
                  </div>
                )}
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
