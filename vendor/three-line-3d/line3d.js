/*
The MIT License (MIT) Copyright (c) 2014 Matt DesLauriers

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// Adapted for 3D from https://github.com/mattdesl/three-line-2d

import {
  BufferGeometry,
  BufferAttribute,
  Vector3
} from 'three';

var VERTS_PER_POINT = 2;

// Taken from npm module inherits/inherits_browser.js
// Requiring it causes issues with rollup
//var inherits = require('inherits');
function inherits(ctor, superCtor) {
  ctor.super_ = superCtor
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

function LineMesh (path, opt) {
  if (!(this instanceof LineMesh)) {
    return new LineMesh(path, opt);
  }
  BufferGeometry.call(this);

  if (Array.isArray(path)) {
    opt = opt || {};
  } else if (typeof path === 'object') {
    opt = path;
    path = [];
  }

  opt = opt || {};

  this.addAttribute('position', new BufferAttribute(undefined, 3));
  this.addAttribute('normal', new BufferAttribute(undefined, 3));
  if (opt.distances) {
    this.addAttribute('lineDistance', new BufferAttribute(undefined, 1));
  }
  if (typeof this.setIndex === 'function') {
    this.setIndex(new BufferAttribute(undefined, 1));
  } else {
    this.addAttribute('index', new BufferAttribute(undefined, 1));
  }
  this.update(path, opt.closed);
}

inherits(LineMesh, BufferGeometry);

LineMesh.prototype.update = function (path, closed) {
  path = path || [];

  var attrPosition = this.getAttribute('position');
  var attrNormal = this.getAttribute('normal');
  var attrDistance = this.getAttribute('lineDistance');
  var attrIndex = typeof this.getIndex === 'function' ? this.getIndex() : this.getAttribute('index');

  if (!attrPosition.array ||
      (path.length !== attrPosition.array.length / 3 / VERTS_PER_POINT)) {
    var indexCount = Math.max(0, (path.length - 1) * 6);
    if (closed) indexCount += 6;
    var count = path.length * VERTS_PER_POINT;
    attrPosition.setArray(new Float32Array(count * 3));
    attrNormal.setArray(new Float32Array(count * 3));
    attrIndex.setArray(new Uint16Array(indexCount));

    if (attrDistance) {
      attrDistance.setArray(new Float32Array(count));
    }
  }

  attrPosition.needsUpdate = true;
  attrNormal.needsUpdate = true;
  attrIndex.needsUpdate = true;
  if (attrDistance) {
    attrDistance.needsUpdate = true;
  }

  if (path.length < 2)
    return;

  var index = 0;
  var c = 0;
  var nIndex = 0;
  var dIndex = 0;
  var indexArray = attrIndex.array;
  var norm = new Vector3();

  path.forEach(function (point, pointIndex, list) {
    var i = index;
    var j = index + 2;
    if (closed && pointIndex == list.length - 1) {
      j = 0;
    }

    indexArray[c++] = i + 0;
    indexArray[c++] = i + 1;
    indexArray[c++] = j + 0;
    indexArray[c++] = j + 0;
    indexArray[c++] = i + 1;
    indexArray[c++] = j + 1;

    attrPosition.setXYZ(index++, point.x, point.y, point.z);
    attrPosition.setXYZ(index++, point.x, point.y, point.z);

    var last = list[pointIndex - 1];
    var next = list[pointIndex + 1];
    if (!closed) {
      if (!last) {
        norm.copy(next).sub(point).normalize();
      } else if (!next) {
        norm.copy(point).sub(last).normalize();
      } else {
        norm.copy(next).sub(last).normalize();
      }
    } else {
      if (!last) last = list[list.length - 1];
      if (!next) next = list[0];
      norm.copy(next).sub(last).normalize();
    }
    attrNormal.setXYZ(nIndex++, norm.x, norm.y, norm.z);
    attrNormal.setXYZ(nIndex++, -norm.x, -norm.y, -norm.z);

    if (attrDistance) {
      var d = pointIndex / (list.length - 1);
      attrDistance.setX(dIndex++, d);
      attrDistance.setX(dIndex++, d);
    }
  });
};

export default LineMesh;
