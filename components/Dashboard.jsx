'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  Cell,
} from 'recharts';

// ─── Helpers (sin toLocaleString para evitar hydration mismatch) ──────────────

const MONTHS_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

// Separa miles con punto (formato AR) sin usar toLocaleString
function sepMiles(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function fmtCurrency(n) {
  if (n === null || n === undefined || (n !== 0 && !n)) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}K`;
  return `$${sepMiles(n)}`;
}

function fmtNum(n) {
  if (n === null || n === undefined || (n !== 0 && !n)) return '—';
  return sepMiles(n);
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const day = parseInt(parts[2], 10);
  const mon = parseInt(parts[1], 10) - 1;
  return `${day} ${MONTHS_SHORT[mon] || ''}`;
}

// ─── Componentes base ─────────────────────────────────────────────────────────

function VariationBadge({ pct, invertColors = false }) {
  if (pct === null || pct === undefined) return <span className="text-gray-400 text-xs">N/A</span>;

  // Para CPL, una baja es buena (invertColors=true)
  const isPositive = invertColors ? pct < 0 : pct >= 0;
  const color = isPositive ? 'text-green-500' : 'text-red-500';
  const arrow = pct >= 0 ? '▲' : '▼';
  const abs = Math.abs(pct).toFixed(1);

  return (
    <span className={`text-xs font-semibold ${color}`}>
      {arrow} {abs}%
    </span>
  );
}

function KPICard({ label, value, variation, invertColors = false, accent = '#E91E8C' }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex flex-col gap-1">
      <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold" style={{ color: '#1A1A2E' }}>{value}</span>
      <VariationBadge pct={variation} invertColors={invertColors} />
      <span className="text-xs text-gray-400">vs mes anterior</span>
    </div>
  );
}

function SectionHeader({ title, subtitle, color = '#E91E8C' }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-1 h-6 rounded-full" style={{ backgroundColor: color }} />
      <div>
        <h2 className="text-base font-bold text-gray-800">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Tooltip personalizado ─────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-lg shadow-lg p-3 border border-gray-100 text-xs">
      <p className="font-bold text-gray-700 mb-1">{fmtDate(label)}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.name.toLowerCase().includes('gasto')
            ? fmtCurrency(p.value)
            : p.name.toLowerCase().includes('cpl')
            ? fmtCurrency(p.value)
            : fmtNum(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─── Proyección fin de mes ─────────────────────────────────────────────────────

function ProjectionCard({ daily, range }) {
  if (!daily || daily.length === 0) return null;
  const daysElapsed = daily.length;
  // Usamos la fecha del último día del array para calcular días del mes (evita hydration mismatch)
  const lastDate    = daily[daily.length - 1]?.date;
  const ref         = lastDate ? new Date(lastDate + 'T00:00:00') : new Date();
  const daysInMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
  const daysLeft    = daysInMonth - daysElapsed;
  const avgLeads    = daily.reduce((s, d) => s + d.totalLeads, 0) / daysElapsed;
  const avgSpend    = daily.reduce((s, d) => s + d.spend, 0) / daysElapsed;
  const projLeads   = Math.round(avgLeads * daysInMonth);
  const projSpend   = Math.round(avgSpend * daysInMonth);
  const projCpl     = projLeads > 0 ? Math.round(projSpend / projLeads) : 0;

  return (
    <div className="bg-gradient-to-r from-[#003B5C] to-[#005580] text-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📈</span>
        <div>
          <div className="font-bold text-sm">Proyección cierre de mes</div>
          <div className="text-xs opacity-70">Basado en promedio de {daysElapsed} días · {daysLeft} días restantes</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/10 rounded-xl p-3 text-center">
          <div className="text-xs opacity-70">Leads proyectados</div>
          <div className="text-2xl font-bold">{fmtNum(projLeads)}</div>
        </div>
        <div className="bg-white/10 rounded-xl p-3 text-center">
          <div className="text-xs opacity-70">Inversión proyectada</div>
          <div className="text-xl font-bold">{fmtCurrency(projSpend)}</div>
        </div>
        <div className="bg-white/10 rounded-xl p-3 text-center">
          <div className="text-xs opacity-70">CPL proyectado</div>
          <div className="text-xl font-bold">{fmtCurrency(projCpl)}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Sección Leads por Sucursal ───────────────────────────────────────────────

function SucursalSection({ sucursales, daily }) {
  if (!sucursales || sucursales.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 text-yellow-800 text-sm">
        <strong>Leads por Sucursal:</strong> sin datos. Verificá que los nombres de los conjuntos de anuncios de WhatsApp contengan: "san martin", "stand", "laferrere", "san justo" o "mosconi".
      </div>
    );
  }

  // Mismo criterio que ProjectionCard: promedio diario × días del mes
  let projFactor = null;
  if (daily && daily.length > 0) {
    const daysElapsed = daily.length;
    const lastDate    = daily[daily.length - 1]?.date;
    const ref         = lastDate ? new Date(lastDate + 'T00:00:00') : new Date();
    const daysInMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
    projFactor = daysInMonth / daysElapsed;
  }

  const rows = sucursales.map(s => {
    const projLeads = projFactor !== null ? Math.round(s.leads * projFactor) : null;
    return {
      ...s,
      projLeads,
      projSpend: projFactor !== null ? Math.round(s.spend * projFactor) : null,
      projResto: projLeads !== null ? Math.max(projLeads - s.leads, 0) : 0,
    };
  });

  const maxLeads = Math.max(...rows.map(s => s.leads));
  const COLORS   = ['#E91E8C', '#9C27B0', '#2196F3', '#00BCD4', '#4CAF50'];

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
      <SectionHeader title="Leads por Sucursal — WhatsApp" subtitle="Nivel conjunto de anuncios · mes actual · proyección a fin de mes" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tabla */}
        <div>
          <div className="grid grid-cols-5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-2">
            <span className="col-span-2">Sucursal (Supervisor)</span>
            <span className="text-right">Leads</span>
            <span className="text-right">Proy. Mes</span>
            <span className="text-right">CPL</span>
          </div>
          <div className="space-y-2">
            {rows.map((s, i) => (
              <div key={s.sucursal} className="grid grid-cols-5 items-center bg-gray-50 rounded-xl px-3 py-2">
                <div className="col-span-2">
                  <div className="font-semibold text-sm text-gray-800">{s.sucursal}</div>
                  <div className="text-xs text-gray-400">({s.supervisor})</div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-gray-800">{fmtNum(s.leads)}</span>
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                    <div
                      className="h-1 rounded-full"
                      style={{ width: `${(s.leads / maxLeads) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold" style={{ color: '#003B5C' }}>
                    {s.projLeads !== null ? `≈${fmtNum(s.projLeads)}` : '—'}
                  </span>
                </div>
                <div className="text-right text-sm text-gray-600">{fmtCurrency(s.cpl)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico de barras */}
        <div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={rows} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="sucursal"
                tick={{ fontSize: 10 }}
                width={90}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  if (!d) return null;
                  return (
                    <div className="bg-white rounded-lg shadow-lg p-3 border border-gray-100 text-xs">
                      <p className="font-bold text-gray-700 mb-1">{d.sucursal}</p>
                      <p className="text-gray-600">Leads: <strong>{fmtNum(d.leads)}</strong></p>
                      {d.projLeads !== null && (
                        <p className="text-gray-600">Proyección mes: <strong>≈{fmtNum(d.projLeads)}</strong></p>
                      )}
                      <p className="text-gray-600">Gasto: <strong>{fmtCurrency(d.spend)}</strong></p>
                      {d.projSpend !== null && (
                        <p className="text-gray-600">Gasto proyectado: <strong>≈{fmtCurrency(d.projSpend)}</strong></p>
                      )}
                      <p className="text-gray-600">CPL: <strong>{fmtCurrency(d.cpl)}</strong></p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="leads" name="Leads" stackId="total">
                {rows.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
              <Bar dataKey="projResto" name="Proyección" stackId="total" radius={[0, 4, 4, 0]}>
                {rows.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.25} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
          {projFactor !== null && (
            <p className="text-xs text-gray-400 text-center mt-1">
              Barra sólida: leads actuales · Barra clara: proyección a fin de mes
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sección Facebook Ads ─────────────────────────────────────────────────────

function FacebookSection({ metaData, variations }) {
  const { current, prev, daily, prevDaily, sucursales } = metaData;

  return (
    <div className="space-y-6">
      {/* Banner demo */}
      {metaData.isDemo && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-amber-800 text-sm">
          ⚠️ Mostrando datos de demo. Configurá <code className="font-mono bg-amber-100 px-1 rounded">META_ACCESS_TOKEN</code> y{' '}
          <code className="font-mono bg-amber-100 px-1 rounded">META_AD_ACCOUNT_ID</code> en Vercel para ver datos reales.
        </div>
      )}

      {metaData.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-800 text-sm">
          ❌ Error de API: {metaData.error}
        </div>
      )}

      {/* ── Proyección ── */}
      <ProjectionCard daily={daily} range={current.range} />

      {/* ── Mes Actual vs Mes Anterior ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mes Actual */}
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <SectionHeader
            title="Inversión & Lead Ads — Mes Actual"
            subtitle={`Comparando con ${prev.range?.label || 'mes anterior'}`}
          />
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-gray-700 text-white rounded-xl p-3 text-center">
              <div className="text-xs opacity-70">Leads Total</div>
              <div className="text-2xl font-bold">{fmtNum(current.totalLeads)}</div>
              <VariationBadge pct={variations.totalLeads} />
            </div>
            <div className="bg-gray-700 text-white rounded-xl p-3 text-center">
              <div className="text-xs opacity-70">Gasto</div>
              <div className="text-xl font-bold">{fmtCurrency(current.spend)}</div>
              <VariationBadge pct={variations.spend} />
            </div>
            <div className="bg-gray-700 text-white rounded-xl p-3 text-center">
              <div className="text-xs opacity-70">CPL Total</div>
              <div className="text-xl font-bold">{fmtCurrency(current.cpl)}</div>
              <VariationBadge pct={variations.cpl} invertColors />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={fmtCurrency} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="totalLeads" name="Leads" fill="#E91E8C" opacity={0.85} radius={[3, 3, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="cpl" name="CPL" stroke="#003B5C" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Mes Anterior — ahora con datos reales */}
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <SectionHeader
            title="Inversión & Lead Ads — Mes Anterior"
            subtitle={prev.range?.label || ''}
            color="#4285F4"
          />
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-gray-600 text-white rounded-xl p-3 text-center">
              <div className="text-xs opacity-70">Leads Total</div>
              <div className="text-2xl font-bold">{fmtNum(prev.totalLeads)}</div>
            </div>
            <div className="bg-gray-600 text-white rounded-xl p-3 text-center">
              <div className="text-xs opacity-70">Gasto</div>
              <div className="text-xl font-bold">{fmtCurrency(prev.spend)}</div>
            </div>
            <div className="bg-gray-600 text-white rounded-xl p-3 text-center">
              <div className="text-xs opacity-70">CPL Total</div>
              <div className="text-xl font-bold">{fmtCurrency(prev.cpl)}</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={prevDaily || []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={fmtCurrency} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="totalLeads" name="Leads" fill="#9C27B0" opacity={0.75} radius={[3, 3, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="cpl" name="CPL" stroke="#4285F4" strokeWidth={2} dot={{ r: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Tipo de Conversión ── */}
      <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
        <SectionHeader title="Tipo de Conversión — Leads WhatsApp vs Leads Formulario" />
        <p className="text-xs text-gray-400 mb-4">* Muestra la data mes acumulado vs mes anterior en el total.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ConversionKPI label="Leads WhatsApp"  value={fmtNum(current.waLeads)}    variation={variations.waLeads}    />
          <ConversionKPI label="Leads Formulario" value={fmtNum(current.formLeads)}  variation={variations.formLeads}  />
          <ConversionKPI label="Leads Total"      value={fmtNum(current.totalLeads)} variation={variations.totalLeads} />
          <ConversionKPI label="Gasto"            value={fmtCurrency(current.spend)} variation={variations.spend}      />
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {['waLeads', 'formLeads', 'totalLeads', 'spend'].map((key) => (
            <div key={key} className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daily}>
                  <Area type="monotone" dataKey={key} stroke="#E91E8C" fill="#FCE4F2" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      </div>

      {/* ── Leads por Sucursal ── */}
      <SucursalSection sucursales={sucursales} daily={daily} />
    </div>
  );
}

function ConversionKPI({ label, value, variation }) {
  return (
    <div className="text-center">
      <div className="text-xs text-gray-500 font-medium mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      <VariationBadge pct={variation} />
    </div>
  );
}

// ─── Sección Google Ads (placeholder) ────────────────────────────────────────

function GoogleSection() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100 text-center">
      <div className="text-4xl mb-3">📊</div>
      <h3 className="text-lg font-bold text-gray-700 mb-2">Google Ads — Próximamente</h3>
      <p className="text-gray-500 text-sm max-w-md mx-auto">
        La integración con Google Ads requiere credenciales adicionales (Developer Token + OAuth2).
        Seguí las instrucciones en el <strong>README.md</strong> para configurarlas.
      </p>
      <div className="mt-6 bg-gray-50 rounded-xl p-4 text-left text-xs text-gray-600 font-mono max-w-sm mx-auto">
        <div>GOOGLE_ADS_DEVELOPER_TOKEN=...</div>
        <div>GOOGLE_ADS_CLIENT_ID=...</div>
        <div>GOOGLE_ADS_CLIENT_SECRET=...</div>
        <div>GOOGLE_ADS_REFRESH_TOKEN=...</div>
        <div>GOOGLE_ADS_CUSTOMER_ID=...</div>
      </div>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ range }) {
  const [dateLabel, setDateLabel] = useState('');

  useEffect(() => {
    setDateLabel(new Date().toLocaleDateString('es-AR', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }));
  }, []);

  return (
    <div className="bg-[#003B5C] text-white px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div>
          <div className="font-bold text-lg tracking-wide">ROTTER®</div>
          <div className="text-xs opacity-70">Concesionario Oficial</div>
        </div>
        <div className="w-px h-8 bg-white/20" />
        <div className="flex items-center gap-2">
          <Image
            src="/logo-wikinbound.svg"
            alt="WiKinBound"
            width={140}
            height={40}
            style={{ objectFit: 'contain' }}
          />
          <div className="text-xs opacity-70 hidden sm:block">Digital Campaigns Performance</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold">{range}</div>
        <div className="text-xs opacity-60">{dateLabel ? `Actualizado: ${dateLabel}` : ''}</div>
      </div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'facebook', label: 'Facebook Ads', icon: '📘' },
  { id: 'google', label: 'Google Ads', icon: '🔵' },
];

// ─── Dashboard principal ──────────────────────────────────────────────────────

export default function Dashboard({ metaData, variations }) {
  const [activeTab, setActiveTab] = useState('facebook');

  const MONTHS_LONG = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  function fmtRangeDate(dateStr, withYear = false) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const label = `${parseInt(d)} ${MONTHS_LONG[parseInt(m) - 1]}`;
    return withYear ? `${label} ${y}` : label;
  }
  const rangeLabel = metaData.current.range
    ? `${fmtRangeDate(metaData.current.range.since)} — ${fmtRangeDate(metaData.current.range.until, true)}`
    : '';

  return (
    <div className="min-h-screen flex flex-col">
      <Header range={rangeLabel} />

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-semibold transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-[#E91E8C] text-[#E91E8C]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'facebook' && (
          <FacebookSection metaData={metaData} variations={variations} />
        )}
        {activeTab === 'google' && <GoogleSection />}
      </main>

      <footer className="text-center py-4 text-xs text-gray-400 border-t border-gray-100 bg-white">
        WiKinBound — Digital Campaigns Performance Dashboard · Datos actualizados cada hora
      </footer>
    </div>
  );
}
