require=(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({"Reol":[function(require,module,exports){
module.exports=require('oF0Uok');
},{}],"oF0Uok":[function(require,module,exports){
(function(){"use strict";
module.exports = require('./lib/Reol');
/*jshint expr:true*/
/*global window:true*/
typeof window !== 'undefined' && (window.Reol = module.exports);

})()
},{"./lib/Reol":1}],1:[function(require,module,exports){
"use strict";

var List = require('./List'),
    Index = require('./Index'),
    Bucket = require('./Bucket'),
    extend = List.extend;

/**
 * Reol
 *
 * An array with multiple user-specified indexes. Slower to write, faster to read.
 * Made for the cases where you initialize a huge array of objects and frequently
 * whish to find those with a specific property and value.
 *
 * @param fields (object) List of fields you whish to index
 * @return (Object) this
 */

function Reol (fields) {
  var field;

  this.index = {};
  this.fields = fields;

  // Define indexes
  for(field in fields) {
    if(typeof fields[field] !== 'object') {
      fields[field] = {};
    }

    this.index[field] = new Index(extend(fields[field], { index: field, source: this }));
  }

  return this;
}

// Expose helper classes, just to be nice
Reol.List = List;
Reol.Bucket = Bucket;
Reol.Index = Index;


/* Public methods
============================================================================= */

Reol.prototype = new List();
Reol.prototype.constructor = Reol;

/**
 * .add()
 *
 * Add an element. Currently only supports a special kind of unique index which
 * will only reject duplicates from the violating index, but keep the element
 * in other indexes and in the list.
 *
 * @param element (Object) Object to be indexed
 * @return (Reol) this
 */

Reol.prototype.add = function(element, _where) {
  var err, field;

  if(typeof element !== 'object') {
    throw new Error('Sorry, this class only works with objects.');
  }

  // Add to list
  List.prototype.add.call(this, element, _where);

  // Add to indexes
  for(field in this.index) {
    this.index[field].add(element);
  }

  return this;
};


/**
 * .find()
 *
 * Find all elements matching the conditions.
 * an array with one element.
 *
 * @param conditions (object) One (1!) condition to match. Multiple conditions will
 *  be supported later.
 * @param [one] (Boolean) If true will only return one element
 * @return (Array|Object|undefined) The found elements
 */

Reol.prototype.find = function(conditions, one) {
  var key, condition, result;

  // Extract property name
  for(condition in conditions) {
    if(conditions[condition]) {
      key = condition;
      break;
    }
  }

  // Return eveything
  if(!key) {
    return this;
  }

  // Find in index
  if(this.index[key]) {
    result = this.findInIndex(key, conditions[key]);
  }
  // Find in list
  else {
    result = this.findInList(key, conditions[key], one);
  }

  return result;
};


/**
 * .findOne()
 *
 * Find exactly zero or one element. Should be a tiny bit faster than .find().
 *
 * @param conditions (Object) One (1!) condition to match. Multiple conditions will
 *  be supported later.
 * @return (Object|undefined) The element found if found
 */

Reol.prototype.findOne = function(conditions) {
  return this.find(conditions, true)[0];
};


/**
 * .findInIndex()
 *
 * Find an element in a specified index. Use this without being sure that the
 * index exists and the sky will fall on your head.
 *
 * @param key (string) The name of the index/field to match
 * @param value (string) The value to match
 * @return (Array) Found elements.
 */

Reol.prototype.findInIndex = function (key, value) {
  return this.index[key].find(value);
};


/**
 * .clone()
 *
 * Modification of List.clone() since Reol is a bit special. Creates a new instance
 *
 * @return (Reol) The new instance
 */

Reol.prototype.clone = function() {
  var result = new this.constructor(this.fields);
  result.merge(this);
  return result;
};


/**
 * .remove()
 *
 * Extends List.remove() to propagate to indexes
 */

Reol.prototype.remove = function(elements) {
  var i;

  elements = elements || this.clone();

  List.prototype.remove.call(this, elements, true);

  for(i in this.index) {
    this.index[i].remove(elements, true);
  }
};


module.exports = Reol;

},{"./Bucket":4,"./Index":3,"./List":2}],2:[function(require,module,exports){
"use strict";

var List;

/**
 * List
 *
 * "Class" inherited by all other array-like objects to provide some common
 * methods.
 */

exports = module.exports = List = function List (options, defaults) {
  this.options = {};
  List.extend(this.options, defaults, options);
};


/* Static methods
============================================================================= */

// Find a property by path, eg "level1.level2"
List.findByPath = function (element, path) {
  var next, _element;
  
  path = path.split('.');
  _element = element;
  
  while(path.length && _element) {
    next = path.shift();
    _element = _element[next];
  }
  
  return _element;
};

// Shallow copy of objects
List.extend = function (target) {
  var sources = [].slice.call(arguments, 1),
      source, prop;

  while(sources.length > 0) {
    source = sources.shift();

    for(prop in source) {
      if(source.hasOwnProperty(prop)) {
        target[prop] = source[prop];
      }
    }
  }

  return target;
};


/* Public methods
============================================================================= */

List.prototype = [];
List.prototype.constructor = List;

/**
 * .add(Object)
 *
 * Basic add. Most subclasses will overwrite it
 */

List.prototype.add = function(element, _where) {
  _where = Number(_where);

  if(isNaN(_where)) {
    Array.prototype.push.call(this, element);
  }
  else {
    Array.prototype.splice.call(this, _where, 0, element);
  }
};


/**
 * .merge()
 *
 * Adds all elements in an Array or another instance of List.
 *
 * @param elements (List|Array) Elements to merge
 * @return (Object) this
 */

List.prototype.merge = function(elements) {
  var i, l;

  for(i = 0, l = elements.length; i < l; i++) {
    this.add(elements[i]);
  }

  return this;
};


/**
 * .findInList()
 *
 * Justa naive search through all elements until a match is found
 *
 * @param key (string) The name of the index/field to match
 * @param value (string) The value to match
 * @param [one] (string) If true will return on first match
 * @return (Array) Found elements.
 */

List.prototype.findInList = function(key, value, one) {
  var i, l, result = new List({ source: this.options.source }), list = this;

  for(i = 0, l = list.length; i < l; i++) {
    if(list[i][key] === value) {
      if(one) {
        return list[i];
      }

      result.push(list[i]);
    }
  }

  return result;
};


/**
 * .toArray()
 *
 * Returning a copy of this as an array.
 *
 * @return (Array) Everything
 */

List.prototype.toArray = function() {
  return [].slice.call(this);
};


/**
 * .clone()
 *
 * Make a clone of the object, preserving the instance's settings but dropping
 * relations to any source.
 *
 * @return (List) The new instance
 */

List.prototype.clone = function() {
  var result = new this.constructor(this.options);

  delete result.options.source;
  result.merge(this);

  return result;
};


/**
 * .remove()
 *
 * Remove elements from the list. If the list has a source the remove command
 * will be called on the source, and remove will be called
 * on that list with the supplied element as argument. If no element is supplied
 * all elements in the list will be removed. Use .clone() to not remove elements
 * from the source.
 *
 * @param [elements] (Object) Element(s) to remove
 * @return (Object) The same list it was called on
 */

List.prototype.remove = function(elements, _fromParent) {
  var i, elementIndex;

  elements = elements || this.clone();

  if(!_fromParent && this.options.source) {
    this.options.source.remove(elements);
  }

  if(elements === this) {
    // Just remove everything
    [].splice.call(this, 0);
  }
  else {
    // Loop through the hard way
    for(i = elements.length; i--;) {
      elementIndex = this.indexOf(elements[i]);

      if(this[elementIndex]) {
        [].splice.call(this, elementIndex, 1);
      }
    }
  }

  return this;
};


/**
 * .filter()
 *
 * Returns a new List of elements matching the conditions
 *
 * @param conditions (Object|Function) The conditions to match or comparing method
 * @return (List) The matched set
 */

List.prototype.filter = function(conditions) {
  var result = new List({ source: this.options.source }),
      matcher = typeof conditions === 'function' ? conditions : match(conditions),
      i, l;

  if(Array.prototype.filter) {
    return result.merge([].filter.call(this, matcher));
  }

  // Custom filter implementation
  for(i = 0, l = this.length; i < l; i++) {
    if(match(this[i])) {
      result.add(this[i]);
    }
  }

  return result;
};


/**
 * .map()
 *
 * Regular Array.map() method whith the added ability to specify a property to
 * auto map.
 *
 * @param property (String) Name
 * @return (type) Description
 */

List.prototype.map = function(property) {
  var result = new List(),
      extractor = typeof property === 'function' ? property : extract(property),
      i, l;

  for(i = 0, l = this.length; i < l; i++) {
    result.add(extractor(this[i]));
  }

  return result;
};


/* Private functions
============================================================================= */


/**
 * match()
 *
 * Whether or not an element matches some conditions
 *
 * @param conditions (Object) Conditions
 * @return (Function)
 *  @param element (Object) Element to be matched
 *  @return (Boolean) Match or not
 */

function match (conditions) {
  return function (element) {
    var i;

    for(i in conditions) {
      if(List.findByPath(element, i) !== conditions[i]) {
        return false;
      }
    }

    return true;
  };
}


/**
 * extract()
 *
 * Return the property of an element
 *
 * @param paramName (type) Description
 * @return (type) Description
 */

function extract (property) {
  return function (element) {
    return List.findByPath(element, property);
  };
}


/* Aliases for imitating an array
============================================================================= */

List.prototype.push = function() {
  return this.merge(arguments);
};

List.prototype.unshift = function() {
  var i, element;

  // Add each element to the beginning, backwards
  for(i = arguments.length; i--;) {
    element = arguments[i];
    this.add(element, 0);
  }

  return this;
};

List.prototype.concat = function() {
  var result = new List(),
      src = arguments,
      i, l;

  result.merge(this);

  for(i = 0, l = src.length; i < l; i++) {
    result.merge(src[i]);
  }

  return result;
};

List.prototype.pop = function() {
  var result = this[this.length - 1];

  this.remove([result]);
  return result;
};

List.prototype.shift = function() {
  var result = this[0];

  this.remove([result]);
  return result;
};

List.prototype.splice = function(index, howMany, replace) {
  var result = new List(),
      length = arguments.length,
      i;

  // Prepare replacements
  replace = replace ? [replace] : [];

  if(length > 3) {
    replace = Array.prototype.slice.call(arguments, 2);
  }

  // Get elements
  result.merge(Array.prototype.slice.call(this, index, index + howMany));

  // Remove elements
  this.remove(result);

  // Add replacements one at a time, backwards
  for(i = replace.length; i--;) {
    this.add(replace[i], index);
  }

  return result;
};

},{}],3:[function(require,module,exports){
"use strict";

var List = require('./List'),
    Bucket = require('./Bucket'),
    Index;


/**
 * Index
 *
 * Class for storing objects in a hash where the property is a certain key of
 * each object. 
 *
 * @param [options] (Object) Property to index
 *  @param index (String) Property to index
 *  @param unique (Boolean) If true, elements will be added only if the indexed
 *    property has not been indexed already
 *  @param sparse (Boolean) If true, undefined values will not be added (note
 *    that other falsey values are not considered undefined)
 * @return (Object) this
 */

Index = exports = module.exports = function Index (options) {
  List.call(this, options, {
    index: '',
    unique: false,
    sparse: false
  });

  this.elements = {};

  return this;
};


/* Public methods
============================================================================= */

Index.prototype.add = function(element) {
  var i, l,
      elements = this.elements,
      index = this.options.index,
      value,
      bucket;

  // Extract indexable value
  if(index.indexOf('.')) {
    value = List.findByPath(element, index);
  }
  else if(element[index] !== undefined) {
    value = element[index];
  }

  // If sparse and undefined
  if(value === undefined && this.options.sparse === true) {
    return false;
  }

  bucket = elements[value];

  if(!bucket) {
    elements[value] = bucket = new Bucket({ unique: this.options.unique, source: this.options.source });
  }

  bucket.add(element);

  return true;
};


Index.prototype.find = function(value) {
  return this.elements[value] || new List({ unique: this.options.unique, source: this.options.source });
};

Index.prototype.remove = function(elements, _fromParent) {
  var i, bucket, bucketIndex;

  // Assuming an index always has a source
  if(!_fromParent) {
    this.options.source.remove(elements);
    return this;
  }

  // Assume elements is always specified, since it will never be called directly
  for(i = elements.length; i--;) {
    bucketIndex = elements[i][this.options.index];
    bucket = this.elements[bucketIndex];

    if(bucket && bucket.length) {
      bucket.remove(elements, true);

      if(!bucket.length) {
        delete this.elements[bucketIndex];
      }
    }
  }

  return this;
};

},{"./Bucket":4,"./List":2}],4:[function(require,module,exports){
"use strict";

var List = require('./List'),
    Bucket;

/**
 * Bucket
 *
 * Pretty much a List which knows if it's unique or not
 */


Bucket = exports = module.exports = function Bucket (options) {
  List.call(this, options, {
    unique: false
  });
};

Bucket.prototype = new List();
Bucket.prototype.constructor = Bucket;

Bucket.prototype.add = function(element, _where) {
  if(!this.length || !this.options.unique) {
    List.prototype.add.call(this, element, _where);
  }
};

},{"./List":2}]},{},["oF0Uok"])
;