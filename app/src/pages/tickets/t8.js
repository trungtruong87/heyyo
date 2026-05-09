import { renderTicket, mountTicket } from './_renderer.js';

export const meta  = { title: 'T8 — Drift via Terraform', cloud: 'tf' };
export const render = () => renderTicket('T8');
export const mount  = (root) => mountTicket(root, 'T8');
