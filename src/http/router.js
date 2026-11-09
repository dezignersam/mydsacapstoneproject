function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compilePath(path) {
  if (typeof path !== 'string' || !path.startsWith('/')) {
    throw new TypeError('Route path must start with /');
  }

  const paramNames = [];
  const pattern = path.split('/').map((segment) => {
    if (segment.startsWith(':')) {
      const name = segment.slice(1);
      if (!name || paramNames.includes(name)) throw new TypeError('Route parameters must have unique names');
      paramNames.push(name);
      return '([^/]+)';
    }
    return escapeRegex(segment);
  }).join('/');

  return { regex: new RegExp(`^${pattern}/?$`), paramNames };
}

export class Router {
  #routes = [];

  add(method, path, handler) {
    if (typeof method !== 'string' || method.trim() === '') {
      throw new TypeError('Route method is required');
    }
    if (typeof handler !== 'function') throw new TypeError('Route handler must be a function');
    this.#routes.push({ method: method.toUpperCase(), ...compilePath(path), handler });
    return this;
  }

  match(method, path) {
    const requestMethod = method.toUpperCase();
    for (const route of this.#routes) {
      if (route.method !== requestMethod) continue;
      const match = route.regex.exec(path);
      if (!match) continue;

      const params = {};
      route.paramNames.forEach((name, index) => {
        params[name] = decodeURIComponent(match[index + 1]);
      });
      return { handler: route.handler, params };
    }
    return null;
  }
}

export function createRouter() {
  return new Router();
}