import { renderTicket, mountTicket } from './_renderer.js';

export const meta  = { title: 'T1 — IAM user blocked', cloud: 'aws' };
export const render = () => renderTicket('T1');
export const mount  = (root) => mountTicket(root, 'T1');
