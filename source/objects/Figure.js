import * as THREE from 'three';

import Maath from 'math/Maath';
import Polar2 from 'math/Polar2';
import { SpringNumber, SpringQuaternion } from 'math/Spring';
import GameObject from 'objects/GameObject';
import CollisionObject from 'objects/CollisionObject';
import Block from 'objects/Block';
import Legs from 'objects/Legs';
import Face from 'objects/Face';
import Loader from 'Loader';
import Simplex from 'fast-simplex-noise';
import FlyingText from 'objects/FlyingText';

import Characters from 'config/Characters.xml';

const StateRunCircles = 'StateRunCircles';
const StateWalkTo = 'StateWalkTo';
const StateRun = 'StateRun';
const StateFollow = 'StateFollow';
const StateCaptured = 'StateCaptured';
const StateRoundOver = 'StateRoundOver';

var spawnedChars = [];
var spawnedAllCharacters = false;

var debugBlue = 0x0000ff;
var debugOrange = 0xffff00;

var footprintGeom = new THREE.CircleBufferGeometry(0.1, 8);
var footprintMat = new THREE.MeshBasicMaterial({ color: 0x250f69 });
var footprint = new THREE.Mesh(footprintGeom, footprintMat);
footprint.rotation.set(-Math.PI / 2, 0, 0);

export default class Figure extends CollisionObject
{
    constructor(character = undefined)
    {
        super([
            'config',
            'boombox',
            'faces'
        ]);
        this.type = 'Figure';
        
        this.presetChar = character;
        
        this.turnSpeed = Math.PI * 2;
        this.runSlowDownDistance = 5;
        
        this.runCircleSpeed = 10;
        this.runCircleVariance = 1;
        this.runCircleVarianceSpeed = 0.5;
        
        this.targetOffsetRotation = 2 * Math.PI / 60;
        this.targetOffsetRadius = 20;
        this.targetOffsetRange = 30; 
        
        this.character = null;
        this.round = {};
        
        this.runCircleRadius = 0;
        this.runCirclePos = null;
        this.runCircleCenter = null;
        
        this.targetPos = null;
        this.walkSpring = null;
        this.turnSpring = null;
        this.onTargetReached = null;
        this.targetOffset = null;
        this.disperseUntil = 0;

        this.eatSqrRadius = 0;
        this.avoidRadiusFactor = 4;
        this.obstacles = null;
        
        this.time = 0;
        this.deltaTime = 0;
        this.state = StateRoundOver;
        
        this.sitdown = null;
        this.standup = null;
        this.steps = null;
        
        this.texts = [];
        this.textStyle = {
            scale: 1,
            letterSpacing: 0.7,
            lineHeight: 2
        };

        this.footprintDuration = 16;
        this.footprints = new THREE.Group();

        this.turnRollLimit = Math.PI / 2;
        this.turnRollAmount = 0;

        this.legs = new Legs();
        this.legs.addEventListener('step', this._onStep.bind(this));
        this.legs.addEventListener('sitdown', this._onSitDown.bind(this));
        this.legs.addEventListener('standup', this._onStandUp.bind(this));
        this.add(this.legs);
    }
    
    onEnable()
    {
        super.onEnable();
        
        this.character = this.presetChar;
        if (this.character === undefined) {
            var chars = Characters.characters.character;
            if (Array.isArray(chars)) {
                this.character = this._chooseCharacter(chars);
                if (!this.character) {
                    throw new Error('No characters found to spawn!');
                }
            } else {
                this.character = chars;
            }
        }

        var soundgroup = this.character._sounds;
        if (!soundgroup) {
            var groups = this.assets.boombox.getGroups('step');
            soundgroup = groups[Maath.randomIntBetween(0, groups.length)];
        }
        this.steps = this.assets.boombox.getCassette('step', soundgroup); 
        this._scene.add(this.steps.audio);

        this.sitdown = this.assets.boombox.getCassette('sit_down', soundgroup);
        this._scene.add(this.sitdown.audio);
        
        this.standup = this.assets.boombox.getCassette('stand_up', soundgroup);
        this._scene.add(this.standup.audio);
        
        this.reset(this.character);
        this.legs.onEnable();
        
        this._scene.add(this.footprints);

        if (this.assets.config.debugCollisions !== 'false') {
            var geom = new THREE.CircleBufferGeometry(1, 32);
            var mat = new THREE.MeshBasicMaterial({ color: debugBlue });
            this.eatDebug = new THREE.Mesh(geom, mat);
            this.eatDebug.rotation.set(-Math.PI / 2, 0, 0);
            this.eatDebug.position.set(0, 0.02, 0);
        }
        
        if (this.eatDebug) {
            this._scene.add(this.eatDebug);
            this.eatDebug.material.color.set(debugBlue);
        }
    }
    
    reset(char)
    {
        if (this.root !== undefined) {
            this.root.parent.remove(this.root);
            this.root = undefined;
        }
        this.face = null;

        this.name = char._id || '';

        var eatRadius = parseFloat(char._radius) || 1;
        this.eatSqrRadius = eatRadius * eatRadius;
        
        this.turnRollAmount = parseFloat(char._turnRoll) || 0.3;

        if (this.name === 'donut') {
            this.radius = eatRadius;
            this.obstacles = null;
        } else {
            this.radius = eatRadius * this.avoidRadiusFactor;
            this.obstacles = [];
        }

        if (char.legs) {
            this.legs.load(char.legs);
        } else {
            this.legs.randomize();
        }
        
        var rootDef = char.block;
        if (Array.isArray(char.block)) {
            rootDef = char.block[0];
        }

        var zero = new THREE.Vector3();
        this.root = this._createBlocks(rootDef, this.legs, zero, zero);
        
        if (this.eatDebug) {
            this._scene.remove(this.eatDebug);
        }
    }
    
    get isVisible()
    {
        return this.legs.isVisible;
    }

    get mixer()
    {
        if (!this._mixer) {
            this._mixer = new THREE.AnimationMixer(this);
        }
        return this._mixer;
    }

    _chooseCharacter(chars)
    {
        var pool = chars.filter((e)=> 
            e._eligible !== 'false' 
            && spawnedChars.indexOf(e._id) < 0
        );
        if (pool.length == 0) {
            pool = chars.filter((e)=> e._eligible !== 'false');
            if (pool.length == 0) {
                return null;
            }
        }
        var char = pool[Maath.randomIntBetween(0, pool.length)];
        spawnedChars.push(char._id);
        return char;
    }

    _createBlocks(def, parent, parentCenter, parentExtents)
    {
        var dir = new THREE.Vector3(0, 1, 0);
        if (Array.isArray(def._dir)) {
            dir.fromArray(def._dir);
        }

        var size = new THREE.Vector3(1, 1, 1);
        if (Array.isArray(def._size)) {
            size.fromArray(def._size);
        }

        var block = new Block(this, def);

        var position = parentExtents.clone().multiply(dir).add(parentCenter);
        block.position.copy(position);

        parent.add(block);

        size.multiply(block.visualsSize);
        size.multiplyScalar(0.5);
        position.copy(size).multiply(dir);
        
        if (def.block !== undefined) {
            for (var childDef of Array.isArray(def.block) ? def.block : [def.block]) {
                this._createBlocks(childDef, block, position, size);
            }
        }
        
        if (def.face !== undefined) {
            for (var faceDef of Array.isArray(def.face) ? def.face : [def.face]) {
                this._createFace(faceDef, block, position, size);
            }
        }
        
        return block;
    }

    _createFace(def, parent, parentCenter, parentExtents)
    {
        var face = this.assets.faces[def._name];
        if (!face) {
            console.error(`Face with name '${def._name}' could not be found.`);
            return;
        }
        
        var dir = new THREE.Vector3(0, 1, 0);
        if (Array.isArray(def._dir)) {
            dir.fromArray(def._dir);
        }

        var size = new THREE.Vector3(1, 1, 1);
        if (Array.isArray(def._size)) {
            size.fromArray(def._size);
        }
        
        this.faceName = def._name;
        this.face = new Face(face);
        this.face.scale.copy(size).multiplyScalar(0.000976562);
        
        var position = parentExtents.clone().multiply(dir).add(parentCenter);
        this.face.position.copy(position.add(dir.clone().multiplyScalar(0.01)));
        
        this.face.lookAt(position.add(dir));
        
        parent.add(this.face);
    }

    findBlockByName(name)
    {
        if (!this.root)
            return null;
        if (this.root.name === name)
            return this.root;
        
        var findBlockRecursive = function(block, name) {
            for (var child of block.children) {
                if (!(child instanceof Block))
                    continue;
                
                if (child.name === name)
                    return child;
                
                var result = findBlockRecursive(child, name);
                if (result) return result;
            }
            return null;
        }
        
        return findBlockRecursive(this.root, name);
    }

    getWorldCenter()
    {
        return this.root.visuals.getWorldPosition();
    }

    say(text, duration = Number.POSITIVE_INFINITY, onHidden = null)
    {
        var lines = text.split("\n"); 
        
        while (this.texts.length < lines.length) {
            var text = new FlyingText();
            this._scene.add(text);
            this.texts.push(text);
        }
        
        var offset = 3.2 + (lines.length - 1) * this.textStyle.lineHeight * this.textStyle.scale;
        for (var i = 0; i < lines.length; i++) {
            if (!this.texts[i]) {
                this.texts[i] = new FlyingText();
                this._scene.add(this.texts[i]);
            }
            
            this.texts[i].textTarget = this.face || this.root;
            this.texts[i].textScale = this.textStyle.scale;
            this.texts[i].letterSpacing = this.textStyle.letterSpacing;
            this.texts[i].textYOffset = offset;
            this.texts[i].show(lines[i], duration, onHidden);
            
            offset -= this.textStyle.lineHeight * this.textStyle.scale;
            onHidden = null;
        }
    }

    shutUp(onShutUp = null)
    {
        if (this.texts.length == 0) {
            if (onShutUp) {
                onShutUp();
            }
            return;
        }
        
        for (var text of this.texts) {
            text.hide(onShutUp);
            onShutUp = null;
        }
    }

    stop()
    {
        this.state = StateCaptured;
        this.legs.setSitting(Legs.SIT_STAND);
    }

    runCircles(center, radius, cassette = null)
    {
        this.state = StateRunCircles;
        this.runCircleRadius = radius;
        this.runCircleCenter = center;
        this.runCirclePos = Polar2.fromVector3XZ(this.getWorldPosition());
        this.runCirclePos.radius = this.runCircleRadius;
        
        if (cassette) {
            cassette.removeAfterPlay = true;
            this.add(cassette.audio);
            cassette.play();
        }
    }

    walkTo(targetPos, onTargetReached = null)
    {
        this.targetPos = targetPos;
        this.onTargetReached = onTargetReached;
        this.state = StateWalkTo;
    }

    run(targetPos)
    {
        this.targetPos = targetPos;
        this.targetOffset = null;
        this.state = StateRun;
    }

    follow(targetPos, offsetAngle = 0, disperseTime = 0)
    {
        this.targetPos = targetPos;
        this.targetOffset = new Polar2(
            this.targetOffsetRadius, 
            offsetAngle
        );
        this.disperseUntil = this.time + disperseTime;
        this.state = StateFollow;
    }

    capture()
    {
        this.state = StateCaptured;
        this.face.ouch(3);
        this.legs.setSitting(Legs.SIT_AUTO);
    }

    get isCaptured()
    {
        return (this.state === StateCaptured);
    }

    roundOver()
    {
        if (!this.isCaptured) {
            this.state = StateRoundOver;
            this.legs.setSitting(Legs.SIT_STAND);
        }
    }

    startRound(round)
    {
        this.round = round;
        this.legs.setSitting(Legs.SIT_AUTO);
    }

    update(time, deltaTime)
    {
        this.time = time;
        this.deltaTime = deltaTime;
        
        switch (this.state) {
            case StateRunCircles:
                this.updateRunCircles();
                break;
            case StateWalkTo:
                this.updateWalkTo();
                break;
            case StateRun:
                this.updateRun();
                break;
            case StateFollow:
                this.updateFollow();
                break;
            case StateCaptured:
                this.updateCaptured();
                break;
            case StateRoundOver:
                this.updateRoundOver();
                break;
        }

        this.legs.legsupdate(time, deltaTime);
        this._updateMatrixWorldNonRecursive(this.legs);

        this._recursiveUpdate(this.legs, time, deltaTime);
        
        while (this.footprints.children.length > 0) {
            var print = this.footprints.children[0];
            if (this.time < print.created + this.footprintDuration)
                break;
            
            this.footprints.remove(print);
        }

        if (this._mixer) {
            this._mixer.update(deltaTime);
        }
        
        if (this.eatDebug) {
            this.eatDebug.position.copy(this.getWorldPosition());
            this.eatDebug.position.y = 0.02;
            this.eatDebug.scale.setScalar(Math.sqrt(this.eatSqrRadius));
        }
    }

    _recursiveUpdate(current, time, deltaTime)
    {
        for (var child of current.children) {
            if (child.type === 'Block') {
                this._updateMatrixWorldNonRecursive(child);
                child.springupdate(time, deltaTime);
                this._updateMatrixWorldNonRecursive(child);
                this._recursiveUpdate(child, time, deltaTime);
            }
        }
    }

    updateRoundOver()
    {
        //
    }

    updateRunCircles()
    {
        if (!this.noise) {
            this.noise = new Simplex();
        }
        
        var distance = this.runCircleSpeed * this.deltaTime;
        this.runCirclePos.angle += distance / this.runCircleRadius;
        
        var variance = this.noise.in2D(this.runCirclePos.angle, this.time * this.runCircleVarianceSpeed);
        this.runCirclePos.radius = this.runCircleRadius + variance * this.runCircleVariance;
        
        this.walkStep(this.runCirclePos.toVector3XZ().add(this.runCircleCenter), this.runCircleSpeed);
    }

    updateWalkTo()
    {
        var speed = (this.round.speed || 2.75) * (this.character._speed || 1);
        if (this.walkStep(this.targetPos, speed)) {
            if (this.onTargetReached) {
                this.onTargetReached();
                this.onTargetReached = null;
            }
        }
    }

    updateRun()
    {
        var aggro = (this.character._aggro || 1);
        var speed = (this.character._speed || 1);
        
        var distance = this.targetPos.distanceTo(this.position);
        if (distance < this.runSlowDownDistance) {
            speed = 0;
        }
        
        this.steerStep(this.targetPos, speed, 8 / aggro);
    }

    updateFollow()
    {
        var offsetFactor = 1;
        if (this.disperseUntil < this.time) {
            var distance = this.position.distanceTo(this.targetPos);
            offsetFactor = Math.min(1, distance / this.targetOffsetRange);
        }
        
        this.targetOffset.angle += this.targetOffsetRotation * this.deltaTime;
        var target = this.targetOffset.toVector3XZ()
            .multiplyScalar(offsetFactor)
            .add(this.targetPos);
        
        var aggro = (this.round.aggro || 1) * (this.character._aggro || 1);
        var speed = (this.round.speed || 2.75) * (this.character._speed || 1);
        this.steerStep(target, speed, 4);
    }

    updateCaptured()
    {
        // Wait for end of time?
    }

    steerStep(target, velocity, steerOmega)
    {
        if (!this.walkSpring || !this.turnSpring) {
            this.walkSpring = new SpringNumber(8, 1);
            this.turnSpring = new SpringQuaternion(steerOmega, 0.8);
        } else {
            this.turnSpring.omega = steerOmega;
        }
        
        if (this.legs._isIdle && velocity > 0) {
            this.legs.startStepping();
        }
        
        var targetOffset = target.clone().sub(this.position);

        if (this.obstacles && this.obstacles.length > 0) {
            var obstacleOffset = new THREE.Vector3();
            var obstacle = null;
            var smallestScalar = Number.POSITIVE_INFINITY;
            for (var candidate of this.obstacles) {
                // Project this->obstacle onto this->target
                obstacleOffset.copy(candidate.position).sub(this.position);
                scalar = targetOffset.dot(obstacleOffset) / targetOffset.lengthSq();
                if (scalar > 0 && scalar < smallestScalar) {
                    smallestScalar = scalar;
                    obstacle = candidate;
                }
            }

            if (obstacle) {
                // get vector form obstacle perpendicular to this->target
                targetOffset.multiplyScalar(smallestScalar).add(this.position);
                obstacleOffset.copy(targetOffset).sub(obstacle.position);
                // find point so that the two radii avoid each other
                obstacleOffset.setLength(obstacle.radius + this.radius);
                // Use this point as new target
                targetOffset.copy(obstacle.position).add(obstacleOffset);
                targetOffset.sub(this.position);
            }
        }

        targetOffset.normalize();
        var angle = Math.atan2(targetOffset.z, targetOffset.x);
        this.turnSpring.target.setFromAxisAngle(this.up, -angle + Math.PI / 2);
        this.turnSpring.step(this.deltaTime);
        this.quaternion.copy(this.turnSpring.position);
        
        this.walkSpring.target = velocity;
        this.walkSpring.step(this.deltaTime);
        
        var direction = this.getWorldDirection();
        this.position.addScaledVector(direction, this.walkSpring.position * this.deltaTime);

        window.ad = Maath.angleDistance;
        var forward = new THREE.Vector3();
        forward.set(0, 0, 1).applyQuaternion(this.turnSpring.position);
        var anglePos = Math.atan2(forward.z, forward.x);
        forward.set(0, 0, 1).applyQuaternion(this.turnSpring.target);
        var angleTgt = Math.atan2(forward.z, forward.x);
        var delta = Maath.angleDistance(anglePos, angleTgt);
        this.legs.extraRoll = Maath.clamp(delta, -this.turnRollLimit, this.turnRollLimit) * this.turnRollAmount;
    }

    walkStep(target, velocity)
    {
        var rot = true;
        if (target.distanceToSquared(this.position) > 0.0001) {
            var matrix = new THREE.Matrix4().lookAt(target, this.position, this.up);
            var targetRotation = new THREE.Quaternion().setFromRotationMatrix(matrix);
            rot = Maath.moveTowardsQ(this.quaternion, targetRotation, this.turnSpeed * this.deltaTime);
        }
        
        var pos = Maath.moveTowardsV3(this.position, target, velocity * this.deltaTime);
        
        if (!(rot && pos) && this.legs._isIdle) {
            this.legs.startStepping();
        }
        
        return (rot && pos);
    }

    onCollisionEnter(other, sqrDistance)
    {
        if (this.obstacles && other instanceof Figure && other.name !== 'donut') {
            this.obstacles.push(other);
        }
    }

    onCollisionStay(other, sqrDistance)
    {
        var eaten = false;
        if (this.state !== StateCaptured 
                && other.name === 'donut' 
                && sqrDistance <= this.eatSqrRadius + other.eatSqrRadius) {
            eaten = true;
            this.dispatchEvent({ type: 'nom' });
        }
        if (this.eatDebug) {
            this.eatDebug.material.color.set(eaten ? debugOrange : debugBlue);
        }
    }

    onCollisionExit(other)
    {
        if (this.obstacles && other instanceof Figure && other.name !== 'donut') {
            var index = this.obstacles.indexOf(other);
            if (index >= 0) {
                this.obstacles.splice(index, 1);
            }
        }
        if (this.eatDebug && other.name === 'donut') {
            this.eatDebug.material.color.set(debugBlue);
        }
    }

    _onStep(event)
    {
        if (!this.steps)
            return;

        var print = footprint.clone();
        print.position.copy(event.position).setY(0.01);
        print.created = this.time;
        this.footprints.add(print);

        this.steps.play(event.position);
    }

    _onSitDown(event)
    {
        if (!this.sitdown)
            return;

        this.sitdown.play(this.getWorldPosition());
    }
    
    _onStandUp(event)
    {
        if (!this.standup)
            return;

        this.standup.play(this.getWorldPosition());
    }
}