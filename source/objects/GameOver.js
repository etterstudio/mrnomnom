import {
    Vector3,
    Matrix4,
    Quaternion,
    Euler,
    CircleBufferGeometry,
    SphereBufferGeometry,
    MeshBasicMaterial,
    Mesh,
    DoubleSide
} from 'three';
import { SpringQuaternion } from 'math/Spring';
import GameObject from 'objects/GameObject';
import Face from 'objects/Face';
import FlyingText from 'objects/FlyingText';

export default class GameOver extends GameObject
{
    constructor()
    {
        super([
            'faces'
        ]);
        this.type = 'GameOver';
        
        this.faceScale = 1 / 1024;
        this.faceDistance = 2.5;
        this.domeRadius = 5;
        
        var geom = new SphereBufferGeometry(this.domeRadius, 32, 32);
        var mat = new MeshBasicMaterial({ color: 0x000, transparent: true, side: DoubleSide });
        this.dome = new Mesh(geom, mat);
        
        geom = new CircleBufferGeometry(this.faceScale * 1024 * 0.5, 64);
        mat = new MeshBasicMaterial({ color: 0x000 });
        this.faceMask = new Mesh(geom, mat);
        this.dome.add(this.faceMask);
        
        this.text = new FlyingText();
        this.text.textScale = 0.12;
        this.text.textYOffset = 0.8;
        this.text.textTarget = this.faceMask;
        this.add(this.text);
        
        this.face = null;
        
        this.zero = new Vector3(0, 0, 0);
        this.forward = new Vector3(0, 0, -1);
        this.lookSpring = new SpringQuaternion(5, 1);
        
        this.isHiding = false;
        this.enabled = false;
    }
    
    show(figure, texter)
    {
        var face = this.assets.faces[figure.faceName];
        if (!face) {
            console.error(`Face with name '${figure.faceName}' could not be found.`);
            return;
        }
        
        var cam = this._scene.game.camera;
        
        this.dome.position.copy(cam.getWorldPosition());
        this.dome.material.color.copy(this._scene.background);
        this.add(this.dome);
        
        this.face = new Face(face);
        this.face.scale.multiplyScalar(this.faceScale);
        this.dome.add(this.face);
        
        this.faceMask.material.color.copy(figure.face.parent.visuals.material.color);
        
        this.face.eat();
        
        var dir = figure.getWorldPosition().sub(cam.getWorldPosition()).normalize();
        this.lookSpring.position.setFromUnitVectors(this.forward, dir);
        
        this.dome.material.opacity = 0;
        this._scene.game.animate(this.dome.material, {
            opacity: 1
        }, 0.2);
        
        this.isHiding = false;
        this.enabled = true;
    }
    
    say(text, duration = Number.POSITIVE_INFINITY, onHidden = null)
    {
        this.text.show(text, duration, onHidden);
    }
    
    shutUp(onShutUp = null)
    {
        this.text.hide(onShutUp);
    }
    
    hide()
    {
        this._scene.game.animate(this.dome.material, {
            opacity: 0
        }, 0.2, ()=> {
            this.remove(this.dome);
            this.dome.remove(this.face);
            this.face = null;
            this.enabled = false;
        });
        
        this.isHiding = true;
    }
    
    update(time, deltaTime)
    {
        var cam = this._scene.game.camera;
        this.lookSpring.target.copy(cam.quaternion);
        this.lookSpring.step(deltaTime);
        
        var viewDir = this.forward.clone().applyQuaternion(this.lookSpring.position);
        
        this.face.position
            .copy(this.zero)
            .addScaledVector(viewDir, this.faceDistance);
        this.face.quaternion.copy(cam.quaternion);
        this.faceMask.position
            .copy(this.zero)
            .addScaledVector(viewDir, this.faceDistance + 0.01);
        this.faceMask.quaternion.copy(cam.quaternion);
    }
}