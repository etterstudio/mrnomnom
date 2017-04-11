import {
    Vector3
} from 'three';
import renderer from './renderer';

var Primitive = renderer.Primitive;

var UNIT_X = new Vector3(1, 0, 0);
var UNIT_Y = new Vector3(0, 1, 0);
var UNIT_Z = new Vector3(0, 0, 1);
var DEG_TO_RAD = Math.PI / 180;

function stringToColor(str) {
    switch (str) {
    case 'red':
        return 0xFF0000;
    case 'green':
        return 0x00FF00;
    case 'blue':
        return 0x0000FF;
    case 'yellow':
        return 0xFFFF00;
    case 'magenta':
        return 0xFF00FF;
    case 'cyan':
        return 0x00FFFF;
    case 'white':
        return 0xFFFFFF;
    default:
        return 0x000000;
    }
}

function toColor(arg) {
    if (typeof arg == 'string') {
        return stringToColor(arg);
    } else {
        return arg;
    }
}

/**
 * Draws a single line from v0 to v1 with the given color.
 *
 * Each point is a THREE.Vector3 object.
 */
function _drawLine(v0, v1, color) {
    var p = new Primitive();

    p.vertices = [v0, v1];
    p.color = toColor(color);

    renderer.addPrimitive(p);
}

/**
 * Draws a strip of connected lines using the specified points[].
 *
 * Each point is a THREE.Vector3 object.
 */
function _drawLineStrip(points, color) {
    if (points.length < 2) {
        console.error('Line strips must have at least 2 points.');
        return;
    }

    var p = new Primitive();

    p.vertices = points;
    p.color = toColor(color);

    renderer.addPrimitive(p);
}

/**
 * Draws an arrow pointing from pStart to pEnd.
 * Specify the size of the arrow with arrowSize.
 */
function _drawArrow(pStart, pEnd, arrowSize, color) {
    var p = new Primitive();
    p.color = toColor(color);

    p.vertices.push(pStart);
    p.vertices.push(pEnd);

    var dir = new Vector3();
    dir.subVectors(pEnd, pStart);
    dir.normalize();

    var right = new Vector3();
    var dot = dir.dot(UNIT_Y);
    if (dot > 0.99 || dot < -0.99) {
        right.crossVectors(dir, UNIT_X);
    } else {
        right.crossVectors(dir, UNIT_Y);
    }

    var top = new Vector3();
    top.crossVectors(right, dir);

    dir.multiplyScalar(arrowSize);
    right.multiplyScalar(arrowSize);
    top.multiplyScalar(arrowSize);

    // Right slant.
    var tmp = new Vector3();
    p.vertices.push(pEnd);
    p.vertices.push(tmp.addVectors(pEnd, right).sub(dir));

    // Left slant.
    tmp = new Vector3();
    p.vertices.push(pEnd);
    p.vertices.push(tmp.subVectors(pEnd, right).sub(dir));

    // Top slant.
    tmp = new Vector3();
    p.vertices.push(pEnd);
    p.vertices.push(tmp.addVectors(pEnd, top).sub(dir));

    // Bottom slant.
    tmp = new Vector3();
    p.vertices.push(pEnd);
    p.vertices.push(tmp.subVectors(pEnd, top).sub(dir));

    renderer.addPrimitive(p);
}

/**
 * Draws a bounding box defined by the min/max coordinates.
 *
 * min/max are THREE.Vector3 objects.
 */
function _drawBoundingBox(min, max, color) {
    var p = new Primitive();
    p.color = toColor(color);

    var halfExtents = new Vector3();
    halfExtents.subVectors(max, min);
    halfExtents.multiplyScalar(0.5);
    var center = new Vector3();
    center.addVectors(max, min);
    center.multiplyScalar(0.5);

    var edgeCoord = [1, 1, 1];

    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 3; j++) {
            var pa = new Vector3(
                edgeCoord[0] * halfExtents.x,
                edgeCoord[1] * halfExtents.y,
                edgeCoord[2] * halfExtents.z);
            pa.add(center);

            var otherCoord = j % 3;
            edgeCoord[otherCoord] = edgeCoord[otherCoord] * -1;
            var pb = new Vector3(
                edgeCoord[0] * halfExtents.x,
                edgeCoord[1] * halfExtents.y,
                edgeCoord[2] * halfExtents.z);
            pb.add(center);

            p.vertices.push(pa, pb);
        }

        edgeCoord = [-1, -1, -1];

        if (i < 3) {
            edgeCoord[i] = edgeCoord[i] * -1;
        }
    }

    renderer.addPrimitive(p);
}

/**
 * Draw a sphere at pos with radius r.
 */
function _drawSphere(pos, r, color) {
    var p = new Primitive();
    p.color = toColor(color);

    // Decreasing these angles will increase complexity of sphere.
    var dtheta = 35; var dphi = 35;

    for (var theta = -90; theta <= (90 - dtheta); theta += dtheta) {
        for (var phi = 0; phi <= (360 - dphi); phi += dphi) {
            p.vertices.push(new Vector3(
                pos.x + r * Math.cos(theta * DEG_TO_RAD) * Math.cos(phi * DEG_TO_RAD),
                pos.y + r * Math.cos(theta * DEG_TO_RAD) * Math.sin(phi * DEG_TO_RAD),
                pos.z + r * Math.sin(theta * DEG_TO_RAD)
            ));

            p.vertices.push(new Vector3(
                pos.x + r * Math.cos((theta + dtheta) * DEG_TO_RAD) * Math.cos(phi * DEG_TO_RAD),
                pos.y + r * Math.cos((theta + dtheta) * DEG_TO_RAD) * Math.sin(phi * DEG_TO_RAD),
                pos.z + r * Math.sin((theta + dtheta) * DEG_TO_RAD)
            ));

            p.vertices.push(new Vector3(
                pos.x + r * Math.cos((theta + dtheta) * DEG_TO_RAD) * Math.cos((phi + dphi) * DEG_TO_RAD),
                pos.y + r * Math.cos((theta + dtheta) * DEG_TO_RAD) * Math.sin((phi + dphi) * DEG_TO_RAD),
                pos.z + r * Math.sin((theta + dtheta) * DEG_TO_RAD)
            ));

            if ((theta > -90) && (theta < 90)) {
                p.vertices.push(new Vector3(
                    pos.x + r * Math.cos(theta * DEG_TO_RAD) * Math.cos((phi + dphi) * DEG_TO_RAD),
                    pos.y + r * Math.cos(theta * DEG_TO_RAD) * Math.sin((phi + dphi) * DEG_TO_RAD),
                    pos.z + r * Math.sin(theta * DEG_TO_RAD)
                ));
            }
        }
    }

    renderer.addPrimitive(p);
}

/**
 * Render all objects drawn this frame into the scene.
 */
function _render(scene) {
    renderer.update(scene);
}

export default {
    drawLine: _drawLine,
    drawLineStrip: _drawLineStrip,
    drawArrow: _drawArrow,
    drawBoundingBox: _drawBoundingBox,
    drawSphere: _drawSphere,
    render: _render
};