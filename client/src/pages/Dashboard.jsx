import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { getDashboard } from '../api/dashboard';
import { listUsers } from '../api/tickets';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    getDashboard().then(setData);
    listUsers().then(setUsers);
  }, []);

  if (!data) return <p>Loading…</p>;

  const agentById = Object.fromEntries(users.map((u) => [u._id, u.name]));
  const byAgentLabeled = data.byAgent.map((a) => ({
    name: a.agentId === 'unassigned' ? 'Unassigned' : (agentById[a.agentId] || a.agentId),
    count: a.count,
  }));
  const resolvedChart = data.resolvedPerWeek.map((w) => ({
    week: new Date(w.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: w.count,
  }));

  return (
    <div>
      <h1>Dashboard</h1>

      <div className="headline-grid">
        <StatCard label="Open" value={data.headline.open} />
        <StatCard label="Pending on customer" value={data.headline.pending} />
        <StatCard label="Resolved this week" value={data.headline.resolvedThisWeek} />
        <StatCard label="Breaching SLA" value={data.headline.breaching} tone="breach" />
      </div>

      <div className="dashboard-charts">
        <div className="chart-card">
          <h3>Tickets by status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.byStatus}>
              <XAxis dataKey="status" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" fill="#16181D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Tickets by agent</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byAgentLabeled}>
              <XAxis dataKey="name" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" fill="#6B7280" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card chart-wide">
          <h3>Resolved per week (last 8 weeks)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={resolvedChart}>
              <CartesianGrid stroke="#E2E5EA" />
              <XAxis dataKey="week" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#2F8F5B" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <div className={`stat-card ${tone ? `stat-${tone}` : ''}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}