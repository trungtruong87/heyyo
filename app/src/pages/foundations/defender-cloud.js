import { renderFoundation, mountFoundation } from './_renderer.js';
const ID = 'defender-cloud';
export const meta = { title: 'Microsoft Defender for Cloud', cloud: 'azure' };
export const render = () => renderFoundation(ID);
export const mount = (root) => mountFoundation(root, ID);
