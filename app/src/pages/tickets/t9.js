import { renderTicket, mountTicket } from './_renderer.js';

export const meta  = { title: 'T9 — Audit evidence', cloud: 'both' };
export const render = () => renderTicket('T9');
export const mount  = (root) => mountTicket(root, 'T9');
