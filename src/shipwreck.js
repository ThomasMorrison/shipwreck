/**
 * Shipwreck : Heed the Sirens' call
 *
 * A simple client for working with Siren Hypermedia APIs
 */

import EntityStore from './util/entity-store.js';
import markup from './markup.js';

/**
 * Convert a JSON object into a URL encoded parameter string.
 * Usefull for sending data in a query string, or as form parameters
 */
export const _urlencode = data => {
  return Object
    .keys(data)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
    .join('&');
};

/** Convert a string to a DOM node */
export const _html = str => {
  const template = document.createElement('template');
  template.innerHTML = str.trim();
  return template.content.firstChild;
};

/**
 */
export class Shipwreck {
  constructor(target) {
    this.target = target;
    this._token = sessionStorage.getItem('auth-token') || '';
    this._listeners = {};

    this._store = new EntityStore();
    this._store.on('error', (data) => this._raise('error', data));
    this._store.on('update', (data) => this._raise('success', data));

    document.body.addEventListener('submit', async (e) => {
      if (!this.target.contains(e.target)) {
        return;
      }
      e.preventDefault();
      const form = e.target;
      const fields = [];
      for (const { name, value } of form.elements) {
        name && fields.push({ name, value });
      }
      const action = {
        name: form.name,
        type: form.enctype,
        href: form.action,
        method: form.method,
        fields,
      };
      this._raise('fetch', {});
      const entity = await this._store.submitAction(action);
      await this.render(entity);
      this._raise('complete', {});
    });
  }

  get token() {
    return this._token;
  }

  set token(val) {
    if (val === this._token) {
      return;
    }
    this._token = val;
    if (val) {
      sessionStorage.setItem('auth-token', val);
    } else {
      sessionStorage.removeItem('auth-token');
    }
  }

  // ----- events

  // fetch: starting a fetch
  // error: something went wrong
  // success: fetch was successful
  // complete: fetch complete (calls wether it was successful or not)
  // update: then entity has been updated

  on(name, fn)  {
    this._listeners[name] = this._listeners[name] || [];
    this._listeners[name].push(fn);
  }

  off(name, fn) {
    if (!this._listeners[name]) {
      return;
    }
    if (!fn) {
      this._listeners[name] = [];
    } else {
      this._listeners[name] = this._listeners[name].filter(f => f !== fn);
    }
  }

  async _raise(name, data) {
    if (!this._listeners[name]) {
      return;
    }
    this._listeners[name].forEach(fn => fn(data));
  }

  // -----

  // submit a request and display the response
  async fetch(href) {
    this._raise('fetch', { message: 'Doing a fetch.', href });
    try {
      const entity = await this._store.get(href, this._token);
      if (entity) {
        this._raise('success', { message: 'Request success' });
        await this.render(entity);
        this._raise('update', { message: 'Updated Entity', entity });
      }
    } catch (err) {
      console.warn(err); // eslint-disable-line no-console
    }
    this._raise('complete', { message: 'Fetch complete.' });
  }

  // display the markup and attach and logic
  async render(entity) {
    const { target } = this;
    target.innerHTML = markup.ship(entity);

    // Tabs
    const contents = target.querySelectorAll('.shipwreck > .content');
    const tabs = target.querySelectorAll('.shipwreck > .tabs > a');
    tabs.forEach(tab => {
      tab.onclick = () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        contents.forEach(c => c.style.display = c.id === tab.name ? 'block' : 'none');
      };
    });
    tabs[0].click();

    // Sub-Entities
    const parent = target.querySelector('.entity-entities');
    entity.entities.forEach(e => {
      const card = _html(markup.card(e));
      parent.appendChild(card);
      // toggle body visibility when head is clicked
      const body = card.querySelector('.body');
      const head = card.querySelector('.head');
      if (head && body) {
        head.onclick = () =>  body.style.display = body.style.display === 'block' ? 'none' : 'block';
      }
    });

    // Links (do this after sub entities are added)
    target.querySelectorAll('.current-path a, #content-entity a')
      .forEach(a => a.addEventListener('click', (e) => {
        e.preventDefault();
        this.fetch(e.target.href);
      }));
  }
}
