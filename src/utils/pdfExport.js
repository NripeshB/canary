/**
 * PDF Ward Report Generator
 * Uses browser's built-in print API to generate a clean report PDF.
 * No external dependencies required.
 */

export function exportWardPDF(detail) {
  if (!detail) return;

  const smartRec = detail.smart_recommendations || {};
  const sources = detail.sources || [];
  const historical = detail.historical || {};

  // Build clean HTML report
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ward Report — ${detail.ward_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a2e; padding: 40px; max-width: 800px; margin: auto; }
    h1 { font-size: 22px; margin-bottom: 4px; color: #0f172a; }
    h2 { font-size: 15px; color: #334155; margin: 20px 0 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
    .subtitle { font-size: 12px; color: #64748b; margin-bottom: 20px; }
    .aqi-box { background: #f1f5f9; border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 20px; margin-bottom: 16px; }
    .aqi-value { font-size: 48px; font-weight: 900; font-family: monospace; }
    .badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 6px; text-transform: uppercase; }
    .source-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 13px; }
    .source-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .source-pct { font-family: monospace; font-weight: 700; width: 40px; text-align: right; }
    .action-row { display: flex; gap: 10px; padding: 8px 12px; margin: 4px 0; background: #f8fafc; border-radius: 8px; font-size: 12px; align-items: flex-start; }
    .action-icon { font-size: 16px; flex-shrink: 0; }
    .action-dept { color: #64748b; font-size: 11px; }
    .priority-tag { font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    td, th { padding: 6px 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>📊 Ward Intelligence Report — ${detail.ward_name}</h1>
  <p class="subtitle">${detail.district} · Ward #${detail.ward_no} · Population: ${(detail.population || 0).toLocaleString()} · Generated: ${new Date().toLocaleString()}</p>

  <div class="aqi-box">
    <div class="aqi-value" style="color: ${detail.color}">${detail.aqi}</div>
    <div>
      <span class="badge" style="background: ${detail.color}20; color: ${detail.color}">${detail.category}</span>
      ${historical.vs_yesterday ? `<p style="font-size: 11px; margin-top: 6px; color: ${historical.vs_yesterday.direction === 'worse' ? '#ef4444' : '#22c55e'}">${historical.vs_yesterday.label}</p>` : ''}
      ${historical.vs_week_avg ? `<p style="font-size: 11px; color: ${historical.vs_week_avg.direction === 'worse' ? '#ef4444' : '#22c55e'}">${historical.vs_week_avg.label}</p>` : ''}
      <p style="font-size: 11px; color: #64748b; margin-top: 4px;">Predicted: ${detail.predicted} (${detail.trend})</p>
    </div>
  </div>

  <h2>Source Attribution</h2>
  ${sources.map(s => `
    <div class="source-row">
      <div class="source-dot" style="background: ${s.color}"></div>
      <span style="flex: 1">${s.source}</span>
      <span class="source-pct">${s.pct}%</span>
    </div>
  `).join('')}

  ${smartRec.summary ? `
  <h2>Intelligence Summary</h2>
  <p style="font-size: 13px; line-height: 1.6; color: #374151; margin-bottom: 8px;">${smartRec.summary}</p>
  <table>
    <tr><th>Severity</th><th>Urgency Score</th><th>Est. AQI Reduction</th><th>Projected AQI</th></tr>
    <tr>
      <td>${(smartRec.severity_tier || '').toUpperCase()}</td>
      <td>${smartRec.urgency || 0}/100</td>
      <td>−${smartRec.estimated_aqi_reduction || 0}</td>
      <td>${smartRec.projected_aqi || '-'}</td>
    </tr>
  </table>

  <h2>Recommended Policy Actions</h2>
  ${(smartRec.primary_actions || []).map(a => `
    <div class="action-row">
      <span class="action-icon">${a.icon}</span>
      <div style="flex: 1;">
        <strong>${a.action}</strong>
        <p class="action-dept">${a.dept} · Impact: −${a.impact} AQI</p>
      </div>
      <span class="priority-tag" style="background: ${a.priority === 'emergency' || a.priority === 'critical' ? '#fef2f2' : '#fefce8'}; color: ${a.priority === 'emergency' || a.priority === 'critical' ? '#dc2626' : '#ca8a04'};">${a.priority}</span>
    </div>
  `).join('')}
  ` : ''}

  <div class="footer">
    Delhi AQI Command — Urban Intelligence Platform · Hyper-Local AQI & Pollution Mitigation Dashboard
  </div>
</body>
</html>`;

  // Open in new window and trigger print
  const win = window.open('', '_blank', 'width=800,height=900');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }
}
