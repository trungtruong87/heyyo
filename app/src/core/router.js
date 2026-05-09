// Tiny hash router. Routes register themselves with their meta + render/mount
// functions; the router watches `hashchange`, swaps DOM, and notifies listeners.

const routes = new Map();           // path → { meta, render, mount, unmount }
const listeners = new Set();        // (currentPath) => void
let currentPath = null;
let currentModule = null;
let mountEl = null;

export function registerRoute(path, mod) {
  routes.set(path, mod);
}

export function getRoute(path) {
  return routes.get(path);
}

export function listRoutes() {
  return Array.from(routes.entries()).map(([path, mod]) => ({ path, ...mod.meta }));
}

export function onNavigate(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function navigate(path) {
  if (!path.startsWith('#')) path = '#' + path;
  if (location.hash === path) {
    // hashchange won't fire — re-render manually
    handleRoute();
  } else {
    location.hash = path;
  }
}

export function currentRoute() { return currentPath; }

function parseHash() {
  const h = location.hash.replace(/^#/, '');
  return h || '/study/home';   // default landing
}

function handleRoute() {
  if (!mountEl) return;
  const path = parseHash();
  const mod = routes.get(path);

  // Tear down previous page
  if (currentModule && typeof currentModule.unmount === 'function') {
    try { currentModule.unmount(); } catch (e) { console.error('unmount error', e); }
  }

  if (!mod) {
    mountEl.innerHTML = `
      <div class="page-inner">
        <div class="ph"><h1>Page not found</h1></div>
        <div class="card">
          <p>No route registered for <code>${path}</code>.</p>
          <div class="btn-row"><a href="#/study/home" class="btn btn-green">Back home</a></div>
        </div>
      </div>`;
    currentPath = path;
    currentModule = null;
    listeners.forEach(fn => fn(path, null));
    return;
  }

  mountEl.innerHTML = mod.render();
  currentPath = path;
  currentModule = mod;

  if (typeof mod.mount === 'function') {
    try { mod.mount(mountEl); } catch (e) { console.error('mount error', e); }
  }

  // Scroll the inner content to top so route changes don't leave the user mid-page.
  mountEl.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: 'instant' });

  listeners.forEach(fn => fn(path, mod));
}

export function startRouter(el) {
  mountEl = el;
  window.addEventListener('hashchange', handleRoute);
  // First render
  if (!location.hash) location.hash = '#/study/home';
  else handleRoute();
}
