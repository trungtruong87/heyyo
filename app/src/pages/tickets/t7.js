import { renderTicket, mountTicket } from './_renderer.js';

export const meta  = { title: 'T7 — KQL audit query', cloud: 'azure' };
export const render = () => renderTicket('T7');
export const mount  = (root) => mountTicket(root, 'T7');
