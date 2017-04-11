import { 
    Group, 
    Vector3, 
    Vector2,
    SphereBufferGeometry,
    MeshBasicMaterial,
    Mesh
} from 'three';
import GameObject from 'objects/GameObject';
import DynamicLine from 'rendering/DynamicLine';
import Simplex from 'fast-simplex-noise';

export default class Scarf extends GameObject
{
    constructor()
    {
        super([
            'boombox'
        ]);
        this.type = 'Scarf';

        this.reference = null;
        this.referenceOffset = new Vector3();
        this.scarfMaxNodes = 0;
        this.scarfLengthIncrease = 8;
        this.scarfNodeDistance = 0.5;
        this.floatDownSpeed = 0.8;
        this.floatSpeed = 0.5;
        this.floatScale = 0.2;
        this.floatMagnitude = 0.4;
        
        this.scarfColor = 0xff0030;
        this.scarfWidth = 0.6;

        this.start = this.end = -1;
        this.cutScarf = false;

        this.noise = new Simplex();

        this.nodes = [ new Vector3() ];
        this.nodes[0].reference = new Vector3();
        this.circles = new Group();
        this.add(this.circles);

        this.line = new DynamicLine(this.nodes, this.scarfColor, this.scarfWidth);
        this.line.mesh.castShadow = true;
        this.add(this.line);

        this.up = new Vector3(0, 1, 0);
    }

    grow(count = 1)
    {
        this.scarfMaxNodes += count * (this.scarfLengthIncrease / this.scarfNodeDistance);
        this.assets.boombox.play('ribbon_grow');
    }

    reset()
    {
        this.scarfMaxNodes = 0;
        this.nodes.splice(0, this.nodes.length - 1);

        var cassette = this.assets.boombox.getSharedCassette('ribbon_grow');
        if (cassette) {
            cassette.resetPlaybackMode();
        }
    }

    cleanUp()
    {
        while (this.circles.children.length > 0) {
            this.circles.remove(this.circles.children[0]);
        }
    }

    isCaptured(pos)
    {
        if (this.start < 0 || this.end < 0) {
            throw new Error('isCaptured can only be called during the capture event.');
        }
        return this.inPoly(pos, this.nodes, this.start, this.end);
    }

    cut()
    {
        if (this.start < 0 || this.end < 0) {
            throw new Error('cut can only be called during the capture event.');
        }
        this.cutScarf = true;
    }

    update(time, deltaTime)
    {
        if (!this.reference)
            return;

        var tail = this.nodes;

        var current = this.reference.localToWorld(this.referenceOffset.clone());
        tail[tail.length - 1].copy(current);
        tail[tail.length - 1].reference.copy(current);

        if (this.scarfMaxNodes == 0) {
            // Scarf disabled

        } else if (tail.length < 2) {
            current.reference = current.clone();
            tail.push(current);
            
        } else if (this.distanceBetweenXZ(tail[tail.length - 2].reference, current) > this.scarfNodeDistance) {
            current.reference = current.clone();
            tail.push(current);

            var previous = tail[tail.length - 3];
            previous.sideways = previous.clone()
                .sub(current)
                .cross(this.up)
                .normalize(); 
            
            if (tail.length > this.scarfMaxNodes + 1) {
                tail.splice(0, tail.length - (this.scarfMaxNodes + 1));
            }
        }

        var downward = new Vector3(0, -this.floatDownSpeed * deltaTime, 0);
        for (var node of tail) {
            this.animateNode(node, downward, time);
        }
        for (var circle of this.circles.children) {
            for (var node of circle.curve) {
                this.animateNode(node, downward, time);
            }
            circle.update();
        }

        var p = new Vector2(), p2 = new Vector2(), q = new Vector2(), q2 = new Vector2();
        outer: for (var i = tail.length - 3; i >= 0; i--) {
            if (tail[i].break)
                break;
            this.copyXZ(tail[i], p);
            this.copyXZ(tail[i + 1], p2);
            for (var j = i + 2; j < tail.length - 1; j++) {
                this.copyXZ(tail[j], q);
                this.copyXZ(tail[j + 1], q2);
                var intersection = this.intersectLines(p, p2, q, q2);
                if (intersection) {
                    // Check winding of polygon
                    // Based on http://stackoverflow.com/a/1165943
                    var start = i + 1;
                    var end = j;
                    var sum = 0;
                    for (var k = start; k <= end; k++) {
                        var p1 = tail[k];
                        var p2 = tail[k < end ? k + 1 : start];
                        sum += (p2.x - p1.x) * (p2.z + p1.z);
                    }
                    if (sum > 0) {
                        var tmp = start;
                        start = end;
                        end = tmp;
                    }

                    this.start = start;
                    this.end = end;
                    this.cutScarf = false;
                    this.dispatchEvent({ type: 'capture' });

                    if (this.cutScarf) {
                        var removeCount = j - i; // j - (i + 1) + 1
                        var circleNodes = tail.splice(i + 1, removeCount);
                        var circle = new DynamicLine(circleNodes, this.scarfColor, this.scarfWidth, 0 , true);
                        circle.mesh.castShadow = true;
                        this.circles.add(circle);
                        this.scarfMaxNodes -= removeCount;

                        var cassette = this.assets.boombox.getSharedCassette('ribbon_grow');
                        if (cassette) {
                            var nodesPerCoin = this.scarfLengthIncrease / this.scarfNodeDistance;
                            var coins = Math.floor(this.scarfMaxNodes / nodesPerCoin);
                            cassette.setPlaybackModeIndex(coins);
                        }
                    } else {
                        tail[j].break = true;
                    }

                    this.start = this.end = -1;
                    this.cutScarf = false;
                    break outer;
                }
            }
        }

        this.line.update();
    }

    animateNode(node, downward, time)
    {
        if (node.y > this.scarfWidth / 4 && node.sideways) {
            node.reference.add(downward);
            node.copy(node.reference);
            var floatUp = this.noise.in3D(node.reference.x * this.floatScale, node.reference.z * this.floatScale, time * this.floatSpeed);
            node.addScaledVector(this.up, floatUp * this.floatMagnitude);
            var floatSide = this.noise.in3D(node.reference.x * this.floatScale, node.reference.z * this.floatScale, (time + 100) * this.floatSpeed);
            node.addScaledVector(node.sideways, floatSide * this.floatMagnitude);
        }
    }

    distanceBetweenXZ(one, two)
    {
        var dx = two.x - one.x;
        var dz = two.z - one.z;
        return Math.sqrt(dx * dx + dz * dz);
    }

    // Based on 
    // https://github.com/pgkelley4/line-segments-intersect/blob/master/js/line-segments-intersect.js
    intersectLines(p, p2, q, q2)
    {
        var r = p2.clone().sub(p);
        var s = q2.clone().sub(q);
        var pq = q.clone().sub(p);

        var uNumerator = this.cross2(pq, r);
        var denominator = this.cross2(r, s);

        if (uNumerator == 0 && denominator == 0) {
            // Lines are colinear (we do not care for colinear intersection)
            return null;
        } else if (denominator == 0) {
            // Lines are parallel
            return null;
        }

        var u = uNumerator / denominator;
        var t = this.cross2(pq, s) / denominator;

        if (t < 0 || t > 1 || u < 0 || u > 1) {
            // Lines do not intersect
            return null;
        }

        return pq.copy(p).addScaledVector(r, t);
    }

    cross2(p1, p2)
    {
        return p1.x * p2.y - p1.y * p2.x;
    }

    copyXZ(from, to)
    {
        to.x = from.x;
        to.y = from.z;
    }

    // Based on
    // http://geomalgorithms.com/a03-_inclusion.html
    inPoly(p, poly, start, end)
    {
        var wn = 0;

        var dir = Math.sign(end - start);
        for (var i = start; (dir == 1 && i <= end) || (dir == -1 && i >= end); i += dir) {
            var next;
            if (dir == 1) {
                next = i < end ? i + 1 : start;
            } else {
                next = i > end ? i - 1 : start;
            }
            var p1 = poly[i];
            var p2 = poly[next];
            if (p1.z <= p.z) {
                if (p2.z > p.z && this.isLeft(p1, p2, p) > 0)
                    wn++;
            } else {
                if (p2.z <= p.z && this.isLeft(p1, p2, p) < 0)
                    wn--;
            }
        }
        return wn != 0;
    }

    isLeft(p, p2, q)
    {
        return (
            (p2.x - p.x) * (q.z - p.z)
            - (q.x - p.x) * (p2.z - p.z)
        );
    }
}