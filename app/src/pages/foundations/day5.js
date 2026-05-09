import { renderFoundation, mountFoundation } from './_renderer.js';

export const meta  = { title: 'Day 5 — Terraform', cloud: 'tf' };
export const render = () => renderFoundation(5);
export const mount  = (root) => mountFoundation(root, 5);
