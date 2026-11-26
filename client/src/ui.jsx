import { BRAND } from './config.js';
export const I = ({ n, c = '' }) => <i className={`bi bi-${n} ${c}`} aria-hidden="true" />;
export const Empty = ({ icon = 'inbox', title, text }) => <div className="empty"><I n={icon} /><h6>{title}</h6><p>{text}</p></div>;
export const Skeleton = ({ n = 6 }) => <div className="row g-3">{Array.from({ length: n }).map((_, i) => <div className="col-md-6 col-xl-4" key={i}><div className="ncard skel"><span /><span /><span /></div></div>)}</div>;
export const Brand = ({ light }) => <div className={'brand' + (light ? ' light' : '')}><span className="brand-mark"><I n="megaphone" /></span><span className="brand-txt"><b>{BRAND.name}</b><small>{BRAND.sub}</small></span></div>;
