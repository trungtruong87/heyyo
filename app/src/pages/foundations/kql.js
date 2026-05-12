import { renderFoundation, mountFoundation } from './_renderer.js';
const ID = 'kql';
export const meta = { title: 'KQL (Kusto Query Language)', cloud: 'azure' };
export const render = () => renderFoundation(ID);
export const mount = (root) => mountFoundation(root, ID);
