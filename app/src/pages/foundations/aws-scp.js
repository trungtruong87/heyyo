import { renderFoundation, mountFoundation } from './_renderer.js';
const ID = 'aws-scp';
export const meta = { title: 'Service Control Policies', cloud: 'aws' };
export const render = () => renderFoundation(ID);
export const mount = (root) => mountFoundation(root, ID);
