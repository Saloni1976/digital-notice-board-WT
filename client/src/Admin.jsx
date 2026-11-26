import { useState } from 'react';
import { api, useLive, getToken, setToken, fmt } from './api.js'; import { CATS, ICON } from './config.js'; import { I, Empty, Brand } from './ui.jsx';
const toLocal = iso => (iso ? new Date(new Date(iso) - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : '');
const blank = () => ({ title: '', description: '', category: 'General Notices', priority: 'Normal', publishDate: toLocal(new Date().toISOString()), expiryDate: '', eventDate: '', venue: '', organizer: '', published: true });
const BADGE = { active: 'success', scheduled: 'info', expired: 'secondary', draft: 'warning' };

function Login({ onOk }) {
  const [f, setF] = useState({ username: '', password: '' }), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [show, setShow] = useState(false);
  const go = async e => { e.preventDefault(); setErr(''); setBusy(true); try { const r = await api('/auth/login', { method: 'POST', body: f }); setToken(r.token); onOk(); } catch (x) { setErr(x.message); setBusy(false); } };
  return <div className="login-page"><form className="login-card" onSubmit={go}><Brand /><h2>Admin sign in</h2><p className="text-muted small">Authorised administrators only.</p>
    {err && <div className="alert alert-danger py-2 small"><I n="exclamation-circle" /> {err}</div>}
    <label className="form-label">Username</label><input className="form-control mb-3" autoFocus required value={f.username} onChange={e => setF({ ...f, username: e.target.value })} />
    <label className="form-label">Password</label><div className="input-group mb-4"><input className="form-control" type={show ? 'text' : 'password'} required value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /><button type="button" className="btn btn-outline-secondary" aria-label="Toggle password" onClick={() => setShow(!show)}><I n={show ? 'eye-slash' : 'eye'} /></button></div>
    <button className="btn btn-navy w-100" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button><a href="#/" className="back"><I n="arrow-left" /> Back to notice board</a></form></div>;
}

function Form({ init, onDone, notify }) {
  const [f, setF] = useState(init ? { ...init, publishDate: toLocal(init.publishDate), expiryDate: toLocal(init.expiryDate), eventDate: toLocal(init.eventDate) } : blank());
  const [file, setFile] = useState(null), [errs, setErrs] = useState({}), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const validate = () => { const e = {};
    if (f.title.trim().length < 3) e.title = 'Title must be at least 3 characters'; else if (f.title.length > 120) e.title = 'Title must be 120 characters or fewer';
    if (f.description.trim().length < 10) e.description = 'Description must be at least 10 characters';
    if (!f.publishDate) e.publishDate = 'Select a publication date';
    if (f.expiryDate && f.publishDate && f.expiryDate <= f.publishDate) e.expiryDate = 'Expiry must be after the publication date';
    if (file && file.size > 3e6) e.poster = 'Poster must be under 3 MB'; return e; };
  const inp = (l, k, { type = 'text', col = 'col-md-6', req, ...p } = {}) => <div className={col}><label className="form-label">{l}{req && <span className="req"> *</span>}</label><input type={type} className={'form-control' + (errs[k] ? ' is-invalid' : '')} value={f[k]} onChange={set(k)} {...p} />{errs[k] && <div className="invalid-feedback">{errs[k]}</div>}</div>;
  const submit = async e => {
    e.preventDefault(); setErr(''); const v = validate(); setErrs(v); if (Object.keys(v).length) return; setBusy(true);
    const fd = new FormData(); ['title', 'description', 'category', 'priority', 'venue', 'organizer'].forEach(k => fd.append(k, f[k] || ''));
    ['publishDate', 'expiryDate', 'eventDate'].forEach(k => fd.append(k, f[k] ? new Date(f[k]).toISOString() : '')); if (!init) fd.append('published', f.published); if (file) fd.append('poster', file);
    try { await api(init ? `/admin/notices/${init.id}` : '/admin/notices', { method: init ? 'PUT' : 'POST', body: fd }); notify(init ? 'Notice updated' : 'Notice created'); onDone(); } catch (x) { setErr(x.message); setBusy(false); } };
  const prev = file ? URL.createObjectURL(file) : init?.poster;
  return <form onSubmit={submit} noValidate>{err && <div className="alert alert-danger"><I n="exclamation-circle" /> {err}</div>}
    <div className="panel mb-3"><div className="panel-head">Basic information</div><div className="p-3 row g-3">
      {inp('Title', 'title', { col: 'col-12', req: true, maxLength: 120, placeholder: 'e.g. Mid-term schedule released' })}
      <div className="col-12"><label className="form-label">Description<span className="req"> *</span></label><textarea className={'form-control' + (errs.description ? ' is-invalid' : '')} rows={4} value={f.description} onChange={set('description')} />{errs.description && <div className="invalid-feedback">{errs.description}</div>}</div>
      <div className="col-md-6"><label className="form-label">Category</label><select className="form-select" value={f.category} onChange={set('category')}>{CATS.map(c => <option key={c}>{c}</option>)}</select></div>
      <div className="col-md-6"><label className="form-label">Priority</label><select className="form-select" value={f.priority} onChange={set('priority')}><option>Normal</option><option>High</option><option>Urgent</option></select></div></div></div>
    <div className="panel mb-3"><div className="panel-head">Schedule</div><div className="p-3 row g-3">{inp('Publication date', 'publishDate', { type: 'datetime-local', req: true })}{inp('Expiry date (optional)', 'expiryDate', { type: 'datetime-local' })}
      {!init && <div className="col-12 form-check ms-2"><input id="pub" type="checkbox" className="form-check-input" checked={f.published} onChange={set('published')} /><label htmlFor="pub" className="form-check-label">Publish this notice (a future publication date schedules it automatically)</label></div>}</div></div>
    <div className="panel mb-3"><div className="panel-head">Event details & poster</div><div className="p-3 row g-3">
      {f.category === 'Events' && inp('Event date', 'eventDate', { type: 'datetime-local' })}{inp('Venue', 'venue')}{inp('Organizer', 'organizer')}
      <div className="col-md-6"><label className="form-label">Poster (image, max 3 MB)</label><input type="file" accept="image/*" className={'form-control' + (errs.poster ? ' is-invalid' : '')} onChange={e => setFile(e.target.files[0])} />{errs.poster && <div className="invalid-feedback">{errs.poster}</div>}</div>
      {prev && <div className="col-12"><img src={prev} alt="Poster preview" className="rounded border" style={{ maxHeight: 140 }} /></div>}</div></div>
    <div className="d-flex gap-2"><button className="btn btn-navy" disabled={busy}>{busy ? 'Saving…' : init ? 'Save changes' : 'Create notice'}</button><button type="button" className="btn btn-outline-secondary" onClick={onDone}>Cancel</button></div></form>;
}

function List({ status, onEdit, notify }) {
  const [rows, reload] = useLive('/admin/notices' + (status ? `?status=${status}` : ''));
  const [q, setQ] = useState(''), [cat, setCat] = useState(''), [st, setSt] = useState(''), [sort, setSort] = useState('newest'), [del, setDel] = useState(null);
  const act = async (fn, msg) => { try { await fn(); notify(msg); reload(); } catch (e) { notify(e.message, 'error'); } };
  if (!rows) return <div className="panel p-4 text-muted">Loading notices…</div>;
  const t = q.toLowerCase(), out = rows.filter(n => (!cat || n.category === cat) && (!st || n.status === st) && (!t || (n.title + n.venue + n.organizer).toLowerCase().includes(t)))
    .sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : sort === 'expiry' ? new Date(a.expiryDate || 9e15) - new Date(b.expiryDate || 9e15) : sort === 'oldest' ? new Date(a.publishDate) - new Date(b.publishDate) : new Date(b.publishDate) - new Date(a.publishDate));
  return <><div className="panel"><div className="p-3 row g-2 border-bottom">
    <div className="col-lg-4"><div className="input-icon"><I n="search" /><input className="form-control" placeholder="Search notices…" value={q} onChange={e => setQ(e.target.value)} /></div></div>
    <div className="col-6 col-lg-3"><select className="form-select" value={cat} onChange={e => setCat(e.target.value)}><option value="">All categories</option>{CATS.map(c => <option key={c}>{c}</option>)}</select></div>
    {!status && <div className="col-6 col-lg-2"><select className="form-select" value={st} onChange={e => setSt(e.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="scheduled">Scheduled</option><option value="expired">Expired</option><option value="draft">Unpublished</option></select></div>}
    <div className="col-6 col-lg-3"><select className="form-select" value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option><option value="expiry">Expiry soonest</option></select></div></div>
    {out.length === 0 ? <Empty icon="inbox" title="No notices to show" text="Adjust the filters or create a new notice." /> : <div className="table-responsive"><table className="table table-hover align-middle m-0"><thead><tr><th>Notice</th><th>Category</th><th>Status</th><th>Publish</th><th>Expiry</th><th className="text-end">Actions</th></tr></thead><tbody>
      {out.map(n => <tr key={n.id}><td><div className="fw-semibold">{n.pinned && <I n="pin-angle-fill" c="text-navy me-1" />}{n.title}</div>{n.priority !== 'Normal' && <span className={'badge ' + (n.priority === 'Urgent' ? 'bg-danger' : 'bg-navy')}>{n.priority}</span>}</td>
        <td className="text-nowrap"><I n={ICON[n.category]} c="text-muted me-1" />{n.category}</td><td><span className={'badge badge-soft bg-' + BADGE[n.status]}>{n.status === 'draft' ? 'unpublished' : n.status}</span></td><td className="small text-nowrap">{fmt(n.publishDate)}</td><td className="small text-nowrap">{fmt(n.expiryDate)}</td>
        <td className="text-end text-nowrap"><div className="btn-group btn-group-sm">
          <button className="btn btn-outline-secondary" title="Edit" onClick={() => onEdit(n)}><I n="pencil" /></button>
          <button className="btn btn-outline-secondary" title={n.published ? 'Unpublish' : 'Publish'} onClick={() => act(() => api(`/admin/notices/${n.id}/publish`, { method: 'PATCH' }), n.published ? 'Notice unpublished' : 'Notice published')}><I n={n.published ? 'eye-slash' : 'eye'} /></button>
          <button className="btn btn-outline-secondary" title={n.pinned ? 'Unpin' : 'Pin'} onClick={() => act(() => api(`/admin/notices/${n.id}/pin`, { method: 'PATCH' }), n.pinned ? 'Notice unpinned' : 'Notice pinned')}><I n={n.pinned ? 'pin-angle-fill' : 'pin-angle'} /></button>
          <button className="btn btn-outline-danger" title="Delete" onClick={() => setDel(n)}><I n="trash" /></button></div></td></tr>)}</tbody></table></div>}</div>
    {del && <div className="modal d-block" style={{ background: '#0f254799' }}><div className="modal-dialog modal-dialog-centered"><div className="modal-content"><div className="modal-body"><h5>Delete notice?</h5><p className="text-muted mb-0">“{del.title}” will be permanently removed. This cannot be undone.</p></div>
      <div className="modal-footer"><button className="btn btn-outline-secondary" onClick={() => setDel(null)}>Cancel</button><button className="btn btn-danger" onClick={() => { const n = del; setDel(null); act(() => api(`/admin/notices/${n.id}`, { method: 'DELETE' }), 'Notice deleted'); }}>Delete</button></div></div></div></div>}</>;
}

function Dashboard({ go }) {
  const [s] = useLive('/admin/stats'); if (!s) return <div className="row g-3">{[1, 2, 3, 4].map(i => <div className="col-6 col-xl-3" key={i}><div className="stat skel"><span /><span /></div></div>)}</div>;
  const C = [['Total notices', s.total, 'collection'], ['Active', s.active, 'check-circle'], ['Scheduled', s.scheduled, 'clock'], ['Expired', s.expired, 'clock-history'], ['Unpublished', s.draft, 'eye-slash'], ['Pinned', s.pinned, 'pin-angle']];
  return <><div className="row g-3">{C.map(([l, v, ic]) => <div className="col-6 col-xl-4" key={l}><div className="stat"><span className="stat-ic"><I n={ic} /></span><div><div className="stat-l">{l}</div><div className="stat-v">{v}</div></div></div></div>)}</div>
    <button className="btn btn-navy mt-4" onClick={() => go('add')}><I n="plus-lg" /> Add notice</button></>;
}
function Logs() {
  const [rows] = useLive('/admin/logs'); if (!rows) return <div className="panel p-4 text-muted">Loading activity…</div>;
  return <div className="panel">{rows.length === 0 ? <Empty icon="activity" title="No activity yet" text="Admin actions will be recorded here." /> : rows.map(l => <div key={l.id} className="logrow"><span><I n="dot" /> <b>{l.user}</b> · {l.action}</span><small className="text-muted">{fmt(l.at)}</small></div>)}</div>;
}

export default function Admin() {
  const [authed, setAuthed] = useState(!!getToken()), [view, setView] = useState('dashboard'), [edit, setEdit] = useState(null), [col, setCol] = useState(false), [mob, setMob] = useState(false), [toasts, setToasts] = useState([]);
  if (!authed) return <Login onOk={() => setAuthed(true)} />;
  const notify = (m, t = 'success') => { const id = Math.random(); setToasts(x => [...x, { id, m, t }]); setTimeout(() => setToasts(x => x.filter(y => y.id !== id)), 3500); };
  const items = [['dashboard', 'Dashboard', 'speedometer2'], ['add', 'Add Notice', 'plus-circle'], ['manage', 'Manage Notices', 'card-list'], ['scheduled', 'Scheduled Notices', 'clock'], ['expired', 'Expired Notices', 'clock-history'], ['logs', 'Activity Log', 'activity']];
  const go = v => { setView(v); setEdit(null); setMob(false); };
  const title = edit ? 'Edit Notice' : items.find(i => i[0] === view)[1];
  return <div className={'admin-shell' + (col ? ' collapsed' : '')}>{mob && <div className="scrim" onClick={() => setMob(false)} />}
    <aside className={'sidebar' + (mob ? ' open' : '')}><div className="side-brand"><Brand light /></div>
      {items.map(([k, l, ic]) => <button key={k} title={l} className={'side-link' + (view === k && !edit ? ' on' : '')} onClick={() => go(k)}><I n={ic} /><span className="lbl">{l}</span></button>)}
      <div className="side-sep" /><button className="side-link" title="View public board" onClick={() => (location.hash = '#/')}><I n="box-arrow-up-right" /><span className="lbl">View Public Board</span></button>
      <button className="side-link" title="Logout" onClick={() => { setToken(null); setAuthed(false); }}><I n="box-arrow-left" /><span className="lbl">Logout</span></button></aside>
    <section className="content"><div className="admin-top"><button className="btn btn-outline-secondary btn-sm d-none d-md-inline-block" aria-label="Collapse sidebar" onClick={() => setCol(!col)}><I n="layout-sidebar-inset" /></button><button className="btn btn-outline-secondary btn-sm d-md-none" aria-label="Menu" onClick={() => setMob(true)}><I n="list" /></button><h1>{title}</h1></div>
      <div className="admin-body">{edit ? <Form init={edit} onDone={() => go('manage')} notify={notify} /> : view === 'dashboard' ? <Dashboard go={go} /> : view === 'add' ? <Form onDone={() => go('manage')} notify={notify} /> : view === 'logs' ? <Logs /> :
        <List key={view} status={view === 'scheduled' ? 'scheduled' : view === 'expired' ? 'expired' : ''} onEdit={setEdit} notify={notify} />}</div></section>
    <div className="toasts">{toasts.map(t => <div key={t.id} className={'toast-n ' + t.t}><I n={t.t === 'error' ? 'x-circle-fill' : 'check-circle-fill'} /> {t.m}</div>)}</div></div>;
}
