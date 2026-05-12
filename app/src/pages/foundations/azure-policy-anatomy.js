import { renderFoundation, mountFoundation } from './_renderer.js';
const ID = 'azure-policy-anatomy';
export const meta = { title: 'Azure Policy: anatomy', cloud: 'azure' };
export const render = () => renderFoundation(ID);
export const mount = (root) => mountFoundation(root, ID);
