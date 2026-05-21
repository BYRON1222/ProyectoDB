import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Backups() {
  const [backups, setBackups] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [b, s] = await Promise.all([
        api.get('/backups'),
        api.get('/backups/stats')
      ]);
      setBackups(b.data);
      setStats(s.data);
    } catch {
      toast.error('Error cargando backups');
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async (tipo) => {
    setRunning(true);
    try {
      await api.post('/backups/run', { db_id: 1, tipo });
      toast.success(`Backup ${tipo} completado`);
      loadData();
    } catch {
      toast.error('Error ejecutando backup');
    } finally {
      setRunning(false);
    }
  };

  const handleSnapshot = async (nombre) => {
    setRunning(true);
    try {
      await api.post('/backups/snapshot', { db_id: 1, nombre });
      toast.success(`Snapshot ${nombre} creado`);
      loadData();
    } catch {
      toast.error('Error creando snapshot');
    } finally {
      setRunning(false);
    }
  };

  const handleDisaster = async () => {
    setRunning(true);
    try {
      const res = await api.post('/backups/simulate-disaster', { db_id: 1 });
      const sla = res.data.sla;
      toast.success(`Restauración completada — RPO: ${sla.rpo_minutes}min, RTO: ${sla.rto_minutes}min`);
      loadData();
    } catch {
      toast.error('Error simulando desastre');
    } finally {
      setRunning(false);
    }
  };

  const s = {
    page: { minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'Segoe UI, sans-serif' },
    nav: { background: '#161b22', borderBottom: '1px solid #30363d', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    main: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
    btn: (bg) => ({ background: bg, border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }),
    card: { background: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '20px', marginBottom: '24px' },
    grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
    statCard: (color) => ({ background: '#161b22', border: `1px solid ${color}44`, borderLeft: `4px solid ${color}`, borderRadius: '12px', padding: '20px' }),
    num: (color) => ({ fontSize: '32px', fontWeight: 'bold', color, margin: '8px 0' }),
    label: { color: '#8b949e', fontSize: '13px' },
    badge: (c) => ({ background: `${c}22`, color: c, padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }),
    title: { color: '#e6edf3', fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '1px solid #30363d', paddingBottom: '8px' },
    th: { color: '#8b949e', padding: '10px 8px', textAlign: 'left', fontSize: '13px', borderBottom: '1px solid #30363d' },
    td: { padding: '10px 8px', borderBottom: '1px solid #21262d', fontSize: '13px' }
  };

  const tipoColor = (tipo) => {
    if (tipo === 'FULL') return '#58a6ff';
    if (tipo === 'DIFF') return '#d29922';
    if (tipo === 'INC') return '#3fb950';
    return '#8b949e';
  };

  if (loading) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8b949e' }}>⏳ Cargando backups...</p>
    </div>
  );

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
          <h2>💾 Backup & Recovery</h2>
          <button onClick={loadData} style={s.btn('#1f6feb')}>🔄 Actualizar</button>
        </div>

        {/* Stats */}
        <div style={s.grid4}>
          {[
            { label: 'Total Backups', value: stats?.total || 0, color: '#58a6ff' },
            { label: 'Exitosos', value: stats?.exitosos || 0, color: '#3fb950' },
            { label: 'SLA Cumplido', value: stats?.sla_cumplido || 0, color: '#3fb950' },
            { label: 'Fallidos', value: stats?.fallidos || 0, color: '#f85149' },
          ].map(item => (
            <div key={item.label} style={s.statCard(item.color)}>
              <div style={s.label}>{item.label}</div>
              <div style={s.num(item.color)}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Acciones */}
        <div style={s.card}>
          <div style={s.title}>⚡ Ejecutar Backup</div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={() => handleBackup('FULL')} disabled={running} style={s.btn('#1f6feb')}>
              💾 Full Backup
            </button>
            <button onClick={() => handleBackup('DIFF')} disabled={running} style={s.btn('#d29922')}>
              📄 Differential Backup
            </button>
            <button onClick={() => handleBackup('INC')} disabled={running} style={s.btn('#3fb950')}>
              ➕ Incremental Backup
            </button>
            <div style={{ width: '1px', background: '#30363d', margin: '0 4px' }}></div>
            <button onClick={() => handleSnapshot('PRE_DEPLOY')} disabled={running} style={s.btn('#8b949e')}>
              📸 PRE_DEPLOY
            </button>
            <button onClick={() => handleSnapshot('PRE_TEST')} disabled={running} style={s.btn('#8b949e')}>
              📸 PRE_TEST
            </button>
            <button onClick={() => handleSnapshot('PRE_IMPORT')} disabled={running} style={s.btn('#8b949e')}>
              📸 PRE_IMPORT
            </button>
            <div style={{ width: '1px', background: '#30363d', margin: '0 4px' }}></div>
            <button onClick={handleDisaster} disabled={running} style={s.btn('#da3633')}>
              💥 Simular Desastre
            </button>
          </div>
          {running && <p style={{ color: '#8b949e', marginTop: '12px', fontSize: '13px' }}>⏳ Ejecutando operación...</p>}
        </div>

        {/* SLA Info */}
        <div style={{ ...s.card, borderColor: '#3fb95044', borderLeft: '4px solid #3fb950' }}>
          <div style={s.title}>📋 SLA Configurado</div>
          <div style={{ display: 'flex', gap: '32px' }}>
            <div>
              <div style={s.label}>RPO (Recovery Point Objective)</div>
              <div style={{ color: '#3fb950', fontSize: '24px', fontWeight: 'bold' }}>15 minutos</div>
              <div style={s.label}>Máxima pérdida de datos aceptable</div>
            </div>
            <div>
              <div style={s.label}>RTO (Recovery Time Objective)</div>
              <div style={{ color: '#58a6ff', fontSize: '24px', fontWeight: 'bold' }}>45 minutos</div>
              <div style={s.label}>Tiempo máximo de restauración</div>
            </div>
            <div>
              <div style={s.label}>Cumplimiento SLA</div>
              <div style={{ color: '#3fb950', fontSize: '24px', fontWeight: 'bold' }}>
                {stats?.sla_cumplido || 0}/{stats?.total || 0}
              </div>
              <div style={s.label}>backups dentro del objetivo</div>
            </div>
          </div>
        </div>

        {/* Historial */}
        <div style={s.card}>
          <div style={s.title}>📜 Historial de Backups</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['ID', 'Nombre', 'Tipo', 'Tamaño', 'Duración', 'Estado', 'SLA', 'Fecha'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {backups.length === 0 ? (
                <tr><td colSpan="8" style={{ ...s.td, textAlign: 'center', color: '#8b949e' }}>No hay backups registrados</td></tr>
              ) : backups.map(b => (
                <tr key={b.id}>
                  <td style={s.td}>{b.id}</td>
                  <td style={{ ...s.td, color: '#8b949e', fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.nombre}</td>
                  <td style={s.td}><span style={s.badge(tipoColor(b.tipo))}>{b.tipo}</span></td>
                  <td style={s.td}>{parseFloat(b.size_mb || 0).toFixed(1)} MB</td>
                  <td style={s.td}>{b.duration_sec}s</td>
                  <td style={s.td}>
                    <span style={s.badge(b.status === 'SUCCESS' ? '#3fb950' : b.status === 'FAILED' ? '#f85149' : '#d29922')}>
                      {b.status}
                    </span>
                  </td>
                  <td style={s.td}>
                    <span style={s.badge(b.sla_cumplido ? '#3fb950' : '#f85149')}>
                      {b.sla_cumplido ? '✅ Sí' : '❌ No'}
                    </span>
                  </td>
                  <td style={{ ...s.td, color: '#8b949e', fontSize: '12px' }}>
                    {new Date(b.created_at).toLocaleString()}
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