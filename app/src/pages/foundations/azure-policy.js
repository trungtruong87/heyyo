import { renderFoundation, mountFoundation } from './_renderer.js';
const ID = 'azure-policy';
export const meta = { title: 'Azure Policy', cloud: 'azure' };
export const render = () => renderFoundation(ID);
export const mount = (root) => mountFoundation(root, ID);
