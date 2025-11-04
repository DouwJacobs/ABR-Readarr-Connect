import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

type RequestRow = {
  id: number;
  receivedAt: string;
  bookTitle: string;
  bookAuthors: string;
  status: 'pending' | 'succeeded' | 'failed';
  addedBookId?: number | null;
  addedBookTitle?: string | null;
};

function App() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/requests');
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'Failed to load');
      setRows(j.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function retry(id: number) {
    setError('');
    try {
      const res = await fetch(`/api/requests/${id}/retry`, { method: 'POST' });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'Retry failed');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function removeItem(id: number) {
    setError('');
    try {
      const res = await fetch(`/api/requests/${id}/remove`, { method: 'POST' });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'Remove failed');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif' }}>
      <h2>ABR Readarr Requests</h2>
      {error && <div style={{ color: '#a40000', marginBottom: 8 }}>{error}</div>}
      <div style={{ marginBottom: 8 }}>
        <button onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={th}>ID</th>
            <th style={th}>Received</th>
            <th style={th}>Title</th>
            <th style={th}>Authors</th>
            <th style={th}>Status</th>
            <th style={th}>Added Book</th>
            <th style={th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td style={td}>{r.id}</td>
              <td style={td}>{r.receivedAt}</td>
              <td style={td}>{r.bookTitle}</td>
              <td style={td}>{r.bookAuthors}</td>
              <td style={td}><Status s={r.status} /></td>
              <td style={td}>{r.addedBookId ? `${r.addedBookId} - ${r.addedBookTitle || ''}` : ''}</td>
              <td style={td}>
                {r.status === 'failed' && <button onClick={() => retry(r.id)}>Retry</button>}
                {r.addedBookId ? <button onClick={() => removeItem(r.id)} style={{ marginLeft: 6 }}>Remove</button> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Status({ s }: { s: RequestRow['status'] }) {
  const base: React.CSSProperties = { padding: '2px 6px', borderRadius: 4, fontSize: 12 };
  if (s === 'succeeded') return <span style={{ ...base, background: '#e6ffed', color: '#03660d' }}>{s}</span>;
  if (s === 'failed') return <span style={{ ...base, background: '#ffecec', color: '#a40000' }}>{s}</span>;
  return <span style={{ ...base, background: '#eef', color: '#214' }}>{s}</span>;
}

const th: React.CSSProperties = { border: '1px solid #ddd', padding: 8, background: '#f5f5f5', textAlign: 'left' };
const td: React.CSSProperties = { border: '1px solid #ddd', padding: 8 };

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
