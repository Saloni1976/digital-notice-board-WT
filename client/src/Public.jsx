import { useState } from 'react';
import { useLive, fmt, fmtDay } from './api.js'; import { CATS, ORDER, ICON } from './config.js'; import { I, Empty, Skeleton, Brand } from './ui.jsx';
const red = c => c === 'Important Announcements';
const Card = ({ n, open }) => (
  <div className="col-md-6 col-xl-4"><article className={'ncard' + (n.priority === 'Urgent' ? ' is-urgent' : '')} tabIndex={0} onClick={() => open(n)} onKeyDown={e => e.key === 'Enter' && open(n)}>
    {n.poster && <img src={n.poster} className="ncard-img" alt="" />}
    <div className="ncard-body"><div className="d-flex justify-content-between align-items-center mb-2"><span className={'cat' + (red(n.category) ? ' cat-red' : '')}><I n={ICON[n.category]} /> {n.category}</span>{n.pinned && <I n="pin-angle-fill" c="text-navy" />}</div>
      <h3 className="ncard-title">{n.title}</h3><p className="ncard-text">{n.description}</p>
      <div className="ncard-foot"><span><I n="calendar3" /> {fmtDay(n.publishDate)}</span><span className="link">View details <I n="arrow-right" /></span></div></div></article></div>);
export default function Public() {
  const [cat, setCat] = useState('All'), [search, setSearch] = useState(''), [sort, setSort] = useState('newest'), [open, setOpen] = useState(null);
  const [notices] = useLive(`/notices?category=${encodeURIComponent(cat)}&search=${encodeURIComponent(search)}&sort=${sort}`);
  const [urgent] = useLive('/notices/urgent'), [events] = useLive('/notices/events');
  const groups = !notices ? [] : cat === 'All' ? ORDER.map(c => [c, notices.filter(n => n.category === c)]).filter(g => g[1].length) : [[cat, notices]];
  return (<div className="page">
    <header className="topbar"><div className="container d-flex align-items-center justify-content-between py-3"><Brand />
      <div className="d-flex align-items-center gap-3"><span className="d-none d-md-inline text-muted small"><I n="calendar3" /> {new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}</span><a href="#/admin" className="btn btn-outline-navy btn-sm"><I n="shield-lock" /> Admin Login</a></div></div></header>
    {urgent?.length > 0 && <div className="marquee" role="alert"><span className="mq-tag"><I n="exclamation-octagon-fill" /> URGENT</span><div className="mq-wrap"><div className="mq-track">{[...urgent, ...urgent].map((n, i) => <span key={i} className="mq-item" onClick={() => setOpen(n)}>{n.title}<em> — {n.description.slice(0, 90)}</em></span>)}</div></div></div>}
    <section className="searchband"><div className="container"><h1>Find notices & announcements</h1>
      <div className="row g-2 justify-content-center"><div className="col-lg-6 col-md-8"><div className="input-icon"><I n="search" /><input className="form-control form-control-lg" placeholder="Search by title, description or venue…" value={search} onChange={e => setSearch(e.target.value)} /></div></div>
        <div className="col-lg-2 col-md-4"><select className="form-select form-select-lg" aria-label="Sort" value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option></select></div></div>
      <nav className="chips">{['All', ...CATS].map(t => <button key={t} onClick={() => setCat(t)} className={'chip' + (cat === t ? ' on' : '')}><I n={ICON[t]} /> {t === 'All' ? 'Home' : t}</button>)}</nav></div></section>
    <main className="container my-4"><div className="row g-4">
      <div className="col-lg-9">{!notices ? <Skeleton /> : groups.length === 0 ? <Empty icon="search" title="No notices found" text="Try a different search term or category." /> : groups.map(([c, list]) => (
        <section key={c} className="mb-4"><div className={'sec-head' + (red(c) ? ' sec-red' : '')}><h2><I n={ICON[c]} /> {c}</h2><span className="count">{list.length}</span></div><div className="row g-3">{list.map(n => <Card key={n.id} n={n} open={setOpen} />)}</div></section>))}</div>
      <aside className="col-lg-3"><div className="panel sticky-lg-top" style={{ top: 70 }}><div className="panel-head"><I n="calendar-event" /> Upcoming Events</div>
        {!events ? <div className="p-3 text-muted small">Loading…</div> : !events.length ? <Empty icon="calendar-x" title="No upcoming events" text="New events will appear here." /> : events.slice(0, 6).map(e => <button key={e.id} className="ev" onClick={() => setOpen(e)}><b>{e.title}</b><small><I n="clock" /> {fmt(e.eventDate)}</small>{e.venue && <small><I n="geo-alt" /> {e.venue}</small>}</button>)}</div></aside>
    </div></main>
    <footer className="foot"><div className="container py-4 d-flex flex-wrap justify-content-between gap-2"><Brand /><small className="text-muted align-self-center">© {new Date().getFullYear()} Digital Notice Board</small></div></footer>
    {open && <div className="modal d-block" style={{ background: '#0f254799' }} onClick={() => setOpen(null)}><div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable" onClick={e => e.stopPropagation()}><div className="modal-content">
      <div className="modal-header"><div><span className={'cat' + (red(open.category) ? ' cat-red' : '')}><I n={ICON[open.category]} /> {open.category}</span>{open.priority !== 'Normal' && <span className={'badge ms-2 ' + (open.priority === 'Urgent' ? 'bg-danger' : 'bg-navy')}>{open.priority}</span>}<h5 className="modal-title mt-2">{open.title}</h5></div><button className="btn-close" aria-label="Close" onClick={() => setOpen(null)} /></div>
      <div className="modal-body">{open.poster && <img src={open.poster} className="img-fluid rounded mb-3" alt="" />}<p style={{ whiteSpace: 'pre-wrap' }}>{open.description}</p>
        <dl className="meta"><dt>Published</dt><dd>{fmt(open.publishDate)}</dd>{open.expiryDate && <><dt>Valid until</dt><dd>{fmt(open.expiryDate)}</dd></>}{open.eventDate && <><dt>Event date</dt><dd>{fmt(open.eventDate)}</dd></>}{open.venue && <><dt>Venue</dt><dd>{open.venue}</dd></>}{open.organizer && <><dt>Organizer</dt><dd>{open.organizer}</dd></>}</dl></div></div></div></div>}
  </div>);
}
