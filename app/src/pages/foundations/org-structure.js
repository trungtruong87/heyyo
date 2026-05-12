import { renderFoundation, mountFoundation } from './_renderer.js';
const ID = 'org-structure';
export const meta = { title: 'Org structure & checkpoints', cloud: 'home' };
export const render = () => renderFoundation(ID);
export const mount = (root) => mountFoundation(root, ID);
