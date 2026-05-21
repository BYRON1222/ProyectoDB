import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Connections() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nombre: '', motor: 'PostgreSQL', host: '',
    port: 5432, database_name: '', user_name: '', password: ''
  });
  const navigate = useNavigate();

  useEffect(() => { loadConnections(); }, []);

  const loadConnections = async () => {
    try {
      const res = await api.get('/connections');
      setConnections(res.data);
    } catch {
      toast.error('Error cargando conexiones');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/connections', form);
      toast.success('Conexión registrada correctamente');
      setShowForm(false);
      setForm({ nombre: '', motor: 'PostgreSQL', host: '', port: 5432, database_name: '', user_name: '', password: '' });
      loadConnections();
    } catch {
      toast.error('Error registrando conexión');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta conexión?')) return;
    try {
      await api.delete(`/connections/${id}`);
      toast.success('Conexión eliminada');
      loadConnections();
    } catch {
      toast.error('Error eliminando conexión');
    }
  };

  const s = {
    page: { minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'Segoe UI, sans-serif' },
    nav: { background: '#161b22', borderBottom: '1px solid #30363d', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    main: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
    btn: (bg) => ({ background: bg, border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }),
    card: { background: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '24px', marginBottom: '24px' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { color: '#8b949e', padding: '10px 8px', textAlign: 'left', fontSize: '13px', borderBottom: '1px solid #30363d' },
    td: { padding: '10px 8px', borderBottom: '1px solid #21262d', fontSize: '14px' },
    badge: (c) => ({ background: `${c}22`, color: c, padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }),
    input: { width: '100%', padding: '10px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#e6edf3', fontSize: '14px', boxSizing: 'border-box' },
    label: { color: '#8b949e', fontSize: '13px', display: 'block', marginBottom: '6px' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  };

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <span style={{ color: '#58a6ff', fontWeight: 'bold', fontSize: '18px' }}>🖥️ DataOps Control Center</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[['📊 Dashboard', '/dashboard'], ['🔌 Conexiones', '/connections'], ['📈 Métricas', '/metrics'], ['🔍 Queries', '/queries'], ['💾 Backups', '/backups'], ['🔔 Alertas', '/alerts']].map(([label, path]) => (
            <button key={path} onClick={() => navigate(path)} style={s.btn(location.pathname === path ? '#1f6feb' : '#21262d')}>{label}</button>
          ))}
        </div>
        <button onClick={() => { localStorage.clear(); navigate('/login'); }} style={s.btn('#da3633')}>Salir</button>
      </nav>

      <main style={s.main}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2>🔌 Conexiones de Base de Datos</h2>
          <button onClick={() => setShowForm(!showForm)} style={s.btn('#238636')}>
            {showForm ? '✕ Cancelar' : '+ Nueva Conexión'}
          </button>
        </div>

        {showForm && (
          <div style={s.card}>
            <h3 style={{ marginBottom: '20px', color: '#58a6ff' }}>Registrar Nueva Conexión</h3>
            <form onSubmit={handleSubmit}>
              <div style={s.grid2}>
                <div>
                  <label style={s.label}>Nombre / Alias</label>
                  <input style={s.input} value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Mi Base de Datos" required />
                </div>
                <div>
                  <label style={s.label}>Motor</label>
                  <select style={s.input} value={form.motor} onChange={e => setForm({...form, motor: e.target.value})}>
                    <option>PostgreSQL</option>
                    <option>SQLServer</option>
                    <option>Oracle</option>
                    <option>MySQL</option>
                  </select>
                </div>
                <div>
                  <label style={s.label}>Host</label>
                  <input style={s.input} value={form.host} onChange={e => setForm({...form, host: e.target.value})} placeholder="localhost" required />
                </div>
                <div>
                  <label style={s.label}>Puerto</label>
                  <input style={s.input} type="number" value={form.port} onChange={e => setForm({...form, port: e.target.value})} required />
                </div>
                <div>
                  <label style={s.label}>Base de Datos</label>
                  <input style={s.input} value={form.database_name} onChange={e => setForm({...form, database_name: e.target.value})} placeholder="nombre_db" required />
                </div>
                <div>
                  <label style={s.label}>Usuario</label>
                  <input style={s.input} value={form.user_name} onChange={e => setForm({...form, user_name: e.target.value})} placeholder="usuario" required />
                </div>
                <div>
                  <label style={s.label}>Contraseña</label>
                  <input style={s.input} type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" required />
                </div>
              </div>
              <button type="submit" style={s.btn('#238636')}>✅ Registrar Conexión</button>
            </form>
          </div>
        )}

        <div style={s.card}>
          <table style={s.table}>
            <thead>
              <tr>
                {['ID', 'Nombre', 'Motor', 'Host', 'Puerto', 'Base de Datos', 'Usuario', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ ...s.td, textAlign: 'center', color: '#8b949e' }}>Cargando...</td></tr>
              ) : connections.length === 0 ? (
                <tr><td colSpan="9" style={{ ...s.td, textAlign: 'center', color: '#8b949e' }}>No hay conexiones registradas</td></tr>
              ) : connections.map(c => (
                <tr key={c.id}>
                  <td style={s.td}>{c.id}</td>
                  <td style={s.td}>{c.nombre}</td>
                  <td style={s.td}><span style={s.badge('#58a6ff')}>{c.motor}</span></td>
                  <td style={{ ...s.td, color: '#8b949e' }}>{c.host}</td>
                  <td style={s.td}>{c.port}</td>
                  <td style={s.td}>{c.database_name}</td>
                  <td style={s.td}>{c.user_name}</td>
                  <td style={s.td}>
                    <span style={s.badge(c.status === 'ACTIVE' ? '#3fb950' : c.status === 'ERROR' ? '#f85149' : '#8b949e')}>
                      {c.status}
                    </span>
                  </td>
                  <td style={s.td}>
                    <button onClick={() => handleDelete(c.id)} style={{ ...s.btn('#da3633'), padding: '4px 10px', fontSize: '12px' }}>
                      🗑️ Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}