import { renderFoundation, mountFoundation } from './_renderer.js';
const ID = 'aws-control-tower';
export const meta = { title: 'Control Tower & Landing Zones', cloud: 'aws' };
export const render = () => renderFoundation(ID);
export const mount = (root) => mountFoundation(root, ID);
