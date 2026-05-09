import { renderTicket, mountTicket } from './_renderer.js';

export const meta  = { title: 'T2 — Custom Config rule', cloud: 'aws' };
export const render = () => renderTicket('T2');
export const mount  = (root) => mountTicket(root, 'T2');
