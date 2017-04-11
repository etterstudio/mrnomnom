import * as THREE from 'three';

import Maath from 'math/Maath';
import { SpringVector3, SpringQuaternion } from 'math/Spring';
import GameObject from 'objects/GameObject';
import HemisphereBufferGeometry from 'HemisphereBufferGeometry';

export default class Block extends GameObject
{
    constructor(figure, attrs)
    {
        super();
        this.type = 'Block';

        // --- Load XML attributes --

        this.name = attrs._name;
        
        var shape = attrs._shape || 'cube';
        var pattern = attrs._pattern || 'solid';
        var spring = (attrs._spring !== 'false');
        
        this.texture = attrs._texture || null;
        this.texture_blink = attrs._blink || null;
        this.texture_frown = attrs._frown || null;

        var rot = new THREE.Euler(0, 0, 0, 'XYZ');
        if (Array.isArray(attrs._rot)) {
            rot.fromArray(attrs._rot.map((v) => THREE.Math.degToRad(v)));
        }

        var size = new THREE.Vector3(1, 1, 1);
        if (Array.isArray(attrs._size)) {
            size.fromArray(attrs._size);
        }

        var dir = new THREE.Vector3(0, 1, 0);
        if (Array.isArray(attrs._dir)) {
            dir.fromArray(attrs._dir);
        }

        var color = new THREE.Color(0xFFFFFF);
        if (attrs._color !== undefined) {
            color.setStyle(attrs._color);
        }

        var offset = new THREE.Vector3(0, 0, 0);
        if (attrs._offset !== undefined) {
            offset.fromArray(attrs._offset);
        }

        // --- Create block ---

        this.visualsSize = new THREE.Vector3(1, 1, 1);

        if (Block.models[shape] !== undefined) {
            var data = Block.models[shape];
            this.visuals = data.mesh.clone()
            this.visualsSize = data.baseSize;

        } else {
            var geometry;
            if (shape === 'cube') {
                geometry = new THREE.BoxBufferGeometry(1, 1, 1);
            } else if (shape == 'sphere') {
                geometry = new THREE.SphereBufferGeometry(0.5, 32, 24);
            } else if (shape == 'hemisphere') {
                geometry = new HemisphereBufferGeometry(0.5, 32, 12);
                geometry.center();
                this.visualsSize.y = 0.5;
            } else if (shape == 'cylinder') {
                geometry = new THREE.CylinderBufferGeometry(0.5, 0.5, 1, 32, 1);
            } else if (shape == 'pyramid') {
                geometry = new THREE.ConeBufferGeometry(0.5, 1, 4, 1);
            } else if (shape == 'plane') {
                geometry = new THREE.PlaneBufferGeometry(1, 1);
                this.visualsSize.z = 0.005;
            } else {
                throw new Error(`Unknown shape type: '${shape}'`);
            }

            var material;
            if (pattern === 'solid') {
                material = new THREE.MeshLambertMaterial({ color: color });
            } else {
                throw new Error(`Unknown pattern type: '${pattern}'`);
            }

            this.visuals = new THREE.Mesh(geometry, material);
            this.visuals.castShadow = true;
        }
        
        if (Block.textures[this.texture] !== undefined) {
            this.visuals.material.transparent = true;
            this.visuals.material.map = Block.textures[this.texture];
        }
        
        if (this.texture_frown) {
            this.figure = figure;
        }
        
        this.visuals.rotation.copy(rot);

        var scale = this.visuals.scale;
        scale.copy(size).applyQuaternion(this.visuals.quaternion);
        scale.set(
            Math.abs(scale.x), 
            Math.abs(scale.y), 
            Math.abs(scale.z)
        );
        
        this.visuals.position.set(
            dir.x * size.x * this.visualsSize.x / 2, 
            dir.y * size.y * this.visualsSize.y / 2, 
            dir.z * size.z * this.visualsSize.z / 2
        ).add(offset);
        this.add(this.visuals);

        if (this.visuals instanceof THREE.SkinnedMesh) {
            var mesh = this.visuals;
            figure.mixer.clipAction(mesh.geometry.animations[0], mesh).play();
        }

        if (spring) {
            this.springQ = new SpringQuaternion();
            this.springQ.frequency = 2;
            this.springQ.zeta = 0.25;
        }
        
        if (this.texture_blink) {
            this.openTime = { min: 0.5, max: 4 };
            this.closedTime = { min: 0.1, max: 0.2 };
            this.isClosed = false;
            this.nextChange = 0;
        }
        if (this.texture_frown) {
            this.frownTime = 0.5;
        }
    }

    onAdded()
    {
        super.onAdded();
        
        if (this.springQ) {
            this.parent.getWorldQuaternion(this.springQ.position);
            this.invQuaternion = new THREE.Quaternion();
        }
    }

    onEnable()
    {
        if (this.texture_frown) {
            this.frownUntil = 0;
            this.onFrownBound = this.onFrown.bind(this);
            this.figure.addEventListener('frown', this.onFrownBound);
        }
    }

    onDisable()
    {
        if (this.onFrownBound) {
            figure.removeEventListener('frown', this.onFrownBound);
            this.figure.onFrownBound = null;
        }
    }

    onFrown()
    {
        this.hasFrowned = true;
    }

    update(time, deltaTime)
    {
        if (this.hasFrowned) {
            this.hasFrowned = false;
            this.isFrowning = true;
            this.frownUntil = time + Maath.randomInRange(this.frownTime);
            this.visuals.material.map = Block.textures[this.texture_frown];
        }
        
        if (this.isFrowning) {
            if (this.frownUntil < time) {
                this.isFrowning = false;
                this.visuals.material.map = Block.textures[this.texture];
            }
            
        } else if (this.texture_blink) {
            if (this.nextChange < time) {
                this.isClosed = !this.isClosed;
                
                var duration = (this.isClosed ? this.closedTime : this.openTime);
                this.nextChange = time + Maath.randomInRange(duration);
                
                var name = this.isClosed ? this.texture_blink : this.texture;
                this.visuals.material.map = Block.textures[name];
            }
        }
    }

    springupdate(time, deltaTime)
    {
        if (!this.springQ)
            return;
        
        this._getWorldQuaternionWithoutMatrixUpdate(this.parent, this.springQ.target);
        this.springQ.step(deltaTime);
        this.quaternion.copy(this.springQ.position);

        this._updateMatrixWorldNonRecursive(this);

        this._getWorldQuaternionWithoutMatrixUpdate(this.parent, this.invQuaternion);
        this.invQuaternion.inverse();
        this.quaternion.premultiply(this.invQuaternion);
    }
}