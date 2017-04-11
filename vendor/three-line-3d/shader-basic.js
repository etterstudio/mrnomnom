/*
The MIT License (MIT) Copyright (c) 2014 Matt DesLauriers

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// Adapted for 3D from https://github.com/mattdesl/three-line-2d

import { Color, Vector2, REVISION } from 'three';

export default function (opt) {
  opt = opt || {};
  var thickness = typeof opt.thickness === 'number' ? opt.thickness : 0.1;
  var opacity = typeof opt.opacity === 'number' ? opt.opacity : 1.0;
  var diffuse = opt.diffuse !== null ? opt.diffuse : 0xffffff;

  // remove to satisfy r73
  delete opt.thickness;
  delete opt.opacity;
  delete opt.diffuse;
  delete opt.precision;

  var ret = Object.assign({
    uniforms: {
      thickness: { type: 'f', value: thickness },
      opacity: { type: 'f', value: opacity },
      diffuse: { type: 'c', value: new Color(diffuse) }
    },
    vertexShader: [
      'uniform float thickness;',
      'void main() {',
      'vec3 eyePos = vec3(modelViewMatrix * vec4(position, 1.0));',
      'vec3 eyeNormal = vec3(modelViewMatrix * vec4(normal, 0.0));',
      'eyeNormal.z = 0.0;',
      'vec3 lineNormal = normalize(cross(eyeNormal, eyePos));',
      'vec3 pointPos = eyePos + (lineNormal * thickness / 2.0);',
      'gl_Position = projectionMatrix * vec4(pointPos, 1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 diffuse;',
      'uniform float opacity;',
      'void main() {',
      'gl_FragColor = vec4(diffuse, opacity);',
      '}'
    ].join('\n')
  }, opt);

  return ret;
};
