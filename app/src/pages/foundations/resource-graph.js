import { renderFoundation, mountFoundation } from './_renderer.js';
const ID = 'resource-graph';
export const meta = { title: 'Azure Resource Graph', cloud: 'azure' };
export const render = () => renderFoundation(ID);
export const mount = (root) => mountFoundation(root, ID);
