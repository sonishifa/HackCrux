import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#06d6a0', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#22c55e', '#6366f1'];

export default function SideEffectChart({ sideEffects }) {
  if (!sideEffects || sideEffects.length === 0) return null;

  const data = sideEffects.slice(0, 8).map((e) => ({
    name: e.name.charAt(0).toUpperCase() + e.name.slice(1),
    percentage: e.percentage,
    count: e.count,
  }));

  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-icon" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>⚠️</div>
        <div>
          <div className="card-title">Side Effects</div>
          <div className="card-subtitle">Most reported by patients</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={data.length * 44 + 10}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
          <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
          <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 13 }} width={120} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f0f4ff', fontSize: 13 }}
            formatter={(value, name) => [`${value}%`, 'Reported by']}
          />
          <Bar dataKey="percentage" radius={[0, 6, 6, 0]} barSize={20}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
