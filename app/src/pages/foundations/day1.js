import { renderFoundation, mountFoundation } from './_renderer.js';

export const meta  = { title: 'Day 1 — Org Structure', cloud: 'home' };
export const render = () => renderFoundation(1);
export const mount  = (root) => mountFoundation(root, 1);
