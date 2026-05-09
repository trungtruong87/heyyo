import { renderTicket, mountTicket } from './_renderer.js';

export const meta  = { title: 'T3 — Verify CT controls', cloud: 'aws' };
export const render = () => renderTicket('T3');
export const mount  = (root) => mountTicket(root, 'T3');
