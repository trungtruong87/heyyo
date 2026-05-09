import { renderTicket, mountTicket } from './_renderer.js';

export const meta  = { title: 'T5 — Defender triage', cloud: 'azure' };
export const render = () => renderTicket('T5');
export const mount  = (root) => mountTicket(root, 'T5');
