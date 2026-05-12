import { renderFoundation, mountFoundation } from './_renderer.js';
const ID = 'azure-runbooks';
export const meta = { title: 'Azure Automation Runbooks', cloud: 'azure' };
export const render = () => renderFoundation(ID);
export const mount = (root) => mountFoundation(root, ID);
