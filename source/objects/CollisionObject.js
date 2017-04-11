import { 
    CircleBufferGeometry,
    MeshBasicMaterial,
    Mesh
} from 'three';
import GameObject from 'objects/GameObject';

var objects = [];
var staticObjects = [];
var collisions = {};

var debugs = {};
var debugGeom = null;
var debugGreen = 0x00ff00;
var debugRed = 0xff0000;

function createDebug()
{
    if (!debugGeom) {
        debugGeom = new CircleBufferGeometry(1, 32);
    }
    var mat = new MeshBasicMaterial({ color: debugGreen });
    debug = new Mesh(debugGeom, mat);
    debug.rotation.set(-Math.PI / 2, 0, 0);
    debug.position.set(0, 0.01, 0);
    debug.collisionCount = 0;
    return debug;
}

function increaseCollisions(debug)
{
    debug.collisionCount++;
    debug.material.color.set(debug.collisionCount > 0 ? debugRed : debugGreen);
}

function decreaseCollisions(debug)
{
    debug.collisionCount--;
    debug.material.color.set(debug.collisionCount > 0 ? debugRed : debugGreen);
}

export default class CollisionObject extends GameObject
{
    constructor(dependencies = null)
    {
        super(dependencies);
        this.type = 'CollisionObject';
        
        this._radius = 1;
        this.static = false;
    }
    
    get radius()
    {
        return this._radius;
    }
    
    set radius(value)
    {
        this._radius = value;
    }
    
    onCollisionEnter(other, sqrDistance)
    {
        //
    }
    
    onCollisionStay(other, sqrDistance)
    {
        //
    }
    
    onCollisionExit(other)
    {
        //
    }
    
    onEnable()
    {
        this._wasStatic = this.static;
        if (this._wasStatic) {
            staticObjects.push(this);
        } else {
            objects.push(this);
        }
        
        if (objects.length == 1) {
            if (!this._checkCollisionsBound) {
                this._checkCollisionsBound = this._checkCollisions.bind(this);
            }
            this._scene.game.addEventListener('update', this._checkCollisionsBound);
        }
    }
    
    onDisable()
    {
        var pool = this._wasStatic ? staticObjects : objects;
        var index = pool.indexOf(this);
        if (index >= 0) {
            pool.splice(index, 1);
        }
        
        if (objects.length == 0) {
            this._scene.game.removeEventListener('update', this._checkCollisionsBound);
        }

        for (var cid in collisions) {
            var c = collisions[cid];
            if (c.o1 === this || c.o2 === this) {
                if (CollisionObject.debug) {
                    decreaseCollisions(debugs[c.o1.id]);
                    decreaseCollisions(debugs[c.o2.id]);
                }
                c.o1.onCollisionExit(c.o2);
                c.o2.onCollisionExit(c.o1);
                delete collisions[cid];
            }
        }

        if (CollisionObject.debug) {
            var debug = debugs[this.id];
            if (debug && debug.parent) {
                debug.parent.remove(debug);
                delete debugs[this.id];
            }
        }
    }
    
    _updateDebug(obj)
    {
        var debug = debugs[obj.id];
        if (!debug) {
            debug = createDebug();
            obj._scene.add(debug);
            debugs[obj.id] = debug;
        }

        debug.position.copy(obj.getWorldPosition());
        debug.position.y = 0.01;
        debug.scale.setScalar(obj.radius);
    }
    
    _checkCollision(o1, o2, time)
    {
        var d = o1._radius + o2._radius;
        var dx = Math.abs(o1.position.x - o2.position.x);
        if (dx > d)
            return;
        
        var dz = Math.abs(o1.position.z - o2.position.z);
        if (dz > d)
            return;
        
        var sqrd = dx * dx + dz * dz;
        if (sqrd > d * d)
            return;
        
        var cid = o1.id + '/' + o2.id;
        if (!collisions[cid]) {
            collisions[cid] = { o1: o1, o2: o2, enter: time, sqrd: sqrd };
        } else {
            collisions[cid].stay = time;
            collisions[cid].sqrd = sqrd;
        }
    }
    
    _checkCollisions(event)
    {
        var count = objects.length;
        if (count <= 1)
            return;
        
        if (CollisionObject.debug) {
            objects.forEach(this._updateDebug);
            staticObjects.forEach(this._updateDebug);
        }

        for (var i = 0; i < count - 1; i++) {
            var o1 = objects[i];
            for (var j = i + 1; j < count; j++) {
                var o2 = objects[j];
                this._checkCollision(o1, o2, event.time);
            }
        }
        
        var staticCount = staticObjects.length;
        for (var i = 0; i < count; i++) {
            var o1 = objects[i];
            for (var j = 0; j < staticCount; j++) {
                var o2 = staticObjects[j];
                this._checkCollision(o1, o2, event.time);
            }
        }
        
        for (var cid in collisions) {
            var c = collisions[cid];
            if (c.enter == event.time) {
                if (CollisionObject.debug) {
                    increaseCollisions(debugs[c.o1.id]);
                    increaseCollisions(debugs[c.o2.id]);
                }
                c.o1.onCollisionEnter(c.o2, c.sqrd);
                c.o2.onCollisionEnter(c.o1, c.sqrd);
            } else if (c.stay < event.time) {
                if (CollisionObject.debug) {
                    decreaseCollisions(debugs[c.o1.id]);
                    decreaseCollisions(debugs[c.o2.id]);
                }
                c.o1.onCollisionExit(c.o2);
                c.o2.onCollisionExit(c.o1);
                delete collisions[cid];
            } else {
                c.o1.onCollisionStay(c.o2, c.sqrd);
                c.o2.onCollisionStay(c.o1, c.sqrd);
            }
        }
    }
}