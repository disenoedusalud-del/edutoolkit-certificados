// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock Next.js server modules
global.Request = class Request {
  constructor(input, init) {
    this.url = typeof input === 'string' ? input : input.url;
    this.method = init?.method || 'GET';
    this.headers = new Headers(init?.headers);
  }
};

global.Response = class Response {
  constructor(body, init) {
    this.body = body;
    this.status = init?.status || 200;
    this.statusText = init?.statusText || 'OK';
    this.headers = new Headers(init?.headers);
  }
  
  json() {
    return Promise.resolve(JSON.parse(this.body));
  }
  
  text() {
    return Promise.resolve(this.body);
  }
};

global.Headers = class Headers {
  constructor(init) {
    this._headers = {};
    if (init) {
      if (init instanceof Headers) {
        init.forEach((value, key) => {
          this._headers[key] = value;
        });
      } else if (Array.isArray(init)) {
        init.forEach(([key, value]) => {
          this._headers[key] = value;
        });
      } else {
        Object.entries(init).forEach(([key, value]) => {
          this._headers[key] = value;
        });
      }
    }
  }
  
  get(name) {
    return this._headers[name.toLowerCase()] || null;
  }
  
  set(name, value) {
    this._headers[name.toLowerCase()] = value;
  }
  
  has(name) {
    return name.toLowerCase() in this._headers;
  }
  
  forEach(callback) {
    Object.entries(this._headers).forEach(([key, value]) => {
      callback(value, key);
    });
  }
};

