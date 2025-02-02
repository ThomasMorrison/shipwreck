/**
 * Classes for working with Siren Entities
 *
 * Entity
 * - SubEntity
 * - Links
 * - Actions
 *   - Fields
 */

/**
 * Base Siren class with stubs for common methods
 */
class SirenBase {
  constructor(json) {
    this._json = JSON.parse(JSON.stringify(json));
    this.raw = JSON.parse(JSON.stringify(json));
    this.errors = new Map();
  }

  get json() {
    // sub classes should overwrite this method
    return {};
  }

  _validate() {
    // sub classes should overwrite this method
  }

  validate() {
    this._validate();
    return this.errors.size === 0;
  }

  _error(field, message) {
    let errors = this.errors.get(field);
    if (!errors) {
      this.errors.set(field, errors = new Set());
    }
    errors.add(message);
  }

  toString() {
    return JSON.stringify(this.json);
  }
}

/**
 * Links represent navigational transitions.
 */
export class SirenLink extends SirenBase {
  constructor(json) {
    super(json);
    // required
    this.rel = this._json['rel'] || [];
    this.href = this._json['href'] || '';
    // optional
    this.class = this._json['class'] || [];
    this.type = this._json['type'] || '';
    this.title = this._json['title'] || '';
  }

  get json() {
    const data = {
      'rel': this.rel,
      'href': this.href,
    };
    if (this.class.length !== 0) {
      data['class'] = this.class;
    }
    if (this.type) {
      data['type'] = this.type;
    }
    if (this.title) {
      data['title'] = this.title;
    }
    return data;
  }

  _validate() {
    super._validate();
    const { rel } = this;
    if (rel === undefined) {
      this._error('rel', 'Required.');
    }
    if (!(rel instanceof Array) || rel.length === 0) {
      this._error('rel', 'MUST be a non-empty array of strings.');
    }
  }
}

/**
 * Fields represent controls inside of actions.
 */
export class SirenField extends SirenBase {
  constructor(json) {
    super(json);
    // required
    this.name = this._json['name'] || '';
    // optional
    this.class = this._json['class'] || [];
    this.title = this._json['title'] || '';
    this.type = this._json['type'] || 'text';
    this.value = this._json['value'] === undefined ? '' : this._json['value'];
    // NON-SPEC
    this.options = this._json['options'] || [];
  }

  get json() {
    const data = {
      'name': this.name,
    };
    if (this.class.length !== 0) {
      data['class'] = this.class;
    }
    if (this.title) {
      data['title'] = this.title;
    }
    if (this.type) {
      data['type'] = this.type;
    }
    if (this.value) {
      data['value'] = this.value;
    }
    return data;
  }

  _validate() {
    if (!this.name) {
      this._error('name', 'Required.');
    }
  }

}

/**
 * Actions show available behaviors an entity exposes.
 */
export class SirenAction extends SirenBase {
  constructor(json) {
    super(json);
    // required
    this.name = this._json['name'] || '';
    this.href = this._json['href'] || '';
    // optional
    this.class = this._json['class'] || [];
    this.method = this._json['method'] || 'GET';
    this.title = this._json['title'] || '';
    this.type = this._json['type'] || 'application/x-www-form-urlencoded;charset=UTF-8';
    this.fields = (this._json['fields'] || []).map(f => new SirenField(f));
  }

  // get field by name
  field(name) {
    return this.actions.find(a => a.name === name);
  }

  get json() {
    const data = {
      'name': this.name,
      'href': this.href,
    };
    if (this.class.length !== 0) {
      data['class'] = this.class;
    }
    if (this.method) {
      data['method'] = this.method;
    }
    if (this.title) {
      data['title'] = this.title;
    }
    if (this.type) {
      data['type'] = this.type;
    }
    if (this.fields.length !== 0) {
      data['fields'] = this.fields.map(field => field.json);
    }
    return data;
  }

  _validate() {
    if (!this.name) {
      this._error('name', 'Required.');
    }
    if (!this.href) {
      this._error('href', 'Required.');
    }
    this.fields.forEach(f => f._validate());
  }
}

/**
 * Common elements between SirenEntity and SirenSubEntity
 */
class SirenEntityBase extends SirenBase {
  constructor(json) {
    super(json);
    // optional
    this.actions = (this._json['actions'] || []).map(a => new SirenAction(a));
    this.class = this._json['class'] || [];
    this.links = (this._json['links'] || []).map(l => new SirenLink(l));
    this.properties = this._json['properties'] || {};
    this.title = this._json['title'] || '';
    this.entities = [];
  }

  // get action by name
  action(name) {
    return this.actions.find(a => a.name === name);
  }

  // get sub entity by rel
  entity(rel) {
    return this.entities.find(e => e.rel.includes(rel));
  }

  // get link by rel
  link(rel) {
    return this.links.find(l => l.rel.includes(rel));
  }

  get json() {
    const data = {};
    if (this.actions.length !== 0) {
      data['actions'] = this.actions.map(action => action.json);
    }
    if (this.class.length !== 0) {
      data['class'] = this.class;
    }
    if (this.links.length !== 0) {
      data['links'] = this.links.map(link => link.json);
    }
    if (this.entities.length !== 0) {
      data['entities'] = this.entities.map(entity => entity.json);
    }
    if (Object.keys(this.properties).length !== 0) {
      data['properties'] = this.properties;
    }
    if (this.title) {
      data['title'] = this.title;
    }
    return data;
  }

  _validate() {
    this.actions.forEach(e => e._validate());
    this.entities.forEach(e => e._validate());
    this.links.forEach(e => e._validate());
  }
}

/**
 * Embedded sub-entity representations retain all the characteristics of a standard entity,
 * but MUST also contain a rel attribute describing the relationship of the sub-entity to its parent.
 */
export class SirenSubEntity extends SirenEntityBase {
  constructor(json) {
    super(json);
    // required for sub-entities
    this.rel = this._json['rel'] || [];
    // sub entities can be entities or links
    // if it has an `href` it's a link, otherwise it's an entity
    this.entities = (this._json['entities'] || []).map(e => e.href ? new SirenLink(e) : new SirenSubEntity(e));
  }

  _validate() {
    super._validate();
    const { rel } = this;
    if (rel === undefined) {
      this._error('rel', 'Required.');
    }
    if (!(rel instanceof Array) || rel.length === 0) {
      this._error('rel', 'MUST be a non-empty array of strings.');
    }
  }

  get json() {
    const data = super.json;
    data['rel'] = this.rel;
    return data;
  }
}

/**
 * The Primary thing return by a request to a Siren API
 * An Entity is a URI-addressable resource that has properties and actions associated with it.
 * It may contain sub-entities and navigational links.
 */
export class SirenEntity extends SirenEntityBase {
  constructor(json) {
    super(json);
    // sub entities can be entities or links
    // if it has an `href` it's a link, otherwise it's an entity
    this.entities = (this._json['entities'] || []).map(e => e.href ? new SirenLink(e) : new SirenSubEntity(e));
  }
}
