import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#D32F2F', '#E6960A', '#1565C0', '#1BA89C', '#43A047', '#7B1FA2', '#C2185B', '#0097A7', '#689F38', '#F57C00'];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
      fontSize: 13,
      color: '#1A2B3C',
      lineHeight: 1.6,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.name}</div>
      <div style={{ color: '#4A5B6C' }}>
        Reported by <strong style={{ color: '#1BA89C' }}>{d.percentage}%</strong> of patients
      </div>
      {d.count != null && (
        <div style={{ color: '#7A8B9C', fontSize: 11, marginTop: 2 }}>
          {d.count} mentions
        </div>
      )}
    </div>
  );
}

export default function SideEffectChart({ sideEffects }) {
  if (!sideEffects || sideEffects.length === 0) return null;

  const data = sideEffects.slice(0, 10).map((e) => ({
    name: e.name.charAt(0).toUpperCase() + e.name.slice(1),
    percentage: e.percentage,
    count: e.count,
  }));

  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-icon" style={{ background: '#D32F2F' }}>SE</div>
        <div>
          <div className="card-title">Side Effects</div>
          <div className="card-subtitle">Most frequently mentioned side effects</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={data.length * 44 + 10}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: '#7A8B9C', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            unit="%"
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#4A5B6C', fontSize: 13 }}
            width={130}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(21, 101, 192, 0.04)' }} />
          <Bar dataKey="percentage" radius={[0, 6, 6, 0]} barSize={20}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
