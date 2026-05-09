import { renderTicket, mountTicket } from './_renderer.js';

export const meta  = { title: 'T6 — PowerShell Runbook', cloud: 'azure' };
export const render = () => renderTicket('T6');
export const mount  = (root) => mountTicket(root, 'T6');
