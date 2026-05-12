import { renderFoundation, mountFoundation } from './_renderer.js';
const ID = 'defender-endpoint';
export const meta = { title: 'Microsoft Defender for Endpoint (MDE)', cloud: 'azure' };
export const render = () => renderFoundation(ID);
export const mount = (root) => mountFoundation(root, ID);
