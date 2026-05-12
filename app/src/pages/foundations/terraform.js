import { renderFoundation, mountFoundation } from './_renderer.js';
const ID = 'terraform';
export const meta = { title: 'Terraform fundamentals', cloud: 'tf' };
export const render = () => renderFoundation(ID);
export const mount = (root) => mountFoundation(root, ID);
