import { renderTicket, mountTicket } from './_renderer.js';

export const meta  = { title: 'T4 — Policy exemption', cloud: 'azure' };
export const render = () => renderTicket('T4');
export const mount  = (root) => mountTicket(root, 'T4');
