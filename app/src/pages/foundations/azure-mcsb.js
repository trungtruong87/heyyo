import { renderFoundation, mountFoundation } from './_renderer.js';
const ID = 'azure-mcsb';
export const meta = { title: 'Microsoft Cloud Security Benchmark (MCSB)', cloud: 'azure' };
export const render = () => renderFoundation(ID);
export const mount = (root) => mountFoundation(root, ID);
