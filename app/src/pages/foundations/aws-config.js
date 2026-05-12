import { renderFoundation, mountFoundation } from './_renderer.js';
const ID = 'aws-config';
export const meta = { title: 'AWS Config & Config Rules', cloud: 'aws' };
export const render = () => renderFoundation(ID);
export const mount = (root) => mountFoundation(root, ID);
