import { 
    Vector2,
    Euler,
    Color,
    Object3D,
    SphereBufferGeometry, 
    MeshBasicMaterial, 
    Mesh,
    DirectionalLight,
    Fog,
    Math as TMath
} from 'three';
import Maath from 'math/Maath';
import { SpringQuaternion } from 'math/Spring';
import GameObject from 'objects/GameObject';

export default class Sun extends GameObject
{
    constructor()
    {
        super([
            'boombox',
            'landscape'
        ]);
        this.type = 'Sun';
        
        this.sunDistance = 150;
        
        this.sunLowAngle = TMath.degToRad(-14);
        this.sunHighAngle = TMath.degToRad(23);
        this.sunAzimuth = TMath.degToRad(0);
        
        this.highSunColor = new Color(0xfff5d5);
        this.lowSunColor = new Color(0xff1800);
        
        this.highFogColor = new Color(0x32138c);
        this.lowFogColor = new Color(0x32138c);
        
        this.highGroundColor = new Color(0x2b117a);
        this.lowGroundColor = new Color(0x2b117a);
        
        this.blinkDuration = 10;
        this.blinkDecreaseFactor = 0.15;
        this.blinkMinInterval = 0.07;
        this.timerBlinkMinAlpha = 0.2;
        
        this.sunPosition = 1;
        this.totalTime = 0;
        this.targetRot = new Euler(this.sunLowAngle, this.sunAzimuth, 0);
        
        this.pivot = new Object3D();
        this.pivot.rotation.copy(this.targetRot);
        this.add(this.pivot);
        
        this.light = new DirectionalLight(0xffffff, 0.15);
        this.light.position.set(0, 100, -this.sunDistance);
        this.pivot.add(this.light);
        
        this.light.castShadow = true;
        this.light.shadow.camera.left = -40;
        this.light.shadow.camera.right = 40;
        this.light.shadow.camera.bottom = -40;
        this.light.shadow.camera.top = 40;
        this.light.shadow.mapSize = new Vector2(1024, 1024);
        
        this.spring = new SpringQuaternion();
        this.spring.frequency = 2.5;
        this.spring.zeta = 0.17;
        this.spring.position.setFromEuler(this.targetRot);
    }
    
    onStart()
    {
        this.ground = this.assets.landscape.getObjectByName('ground');
    }

    update(time, deltaTime)
    {
        this.targetRot.x = Maath.lerp(this.sunLowAngle, this.sunHighAngle, this.sunPosition);
        
        var color = this.lowFogColor.clone().lerp(this.highFogColor, this.sunPosition);
        this._scene.background.copy(color);
        
        if (this.ground) {
            var ambient = this._scene.game.ambientLight.intensity;
            this.ground.material.color.copy(this.lowGroundColor).lerp(this.highGroundColor, this.sunPosition)
                .multiplyScalar(1 / ambient);
        }

        this.spring.target.setFromEuler(this.targetRot);
        this.spring.step(deltaTime);
        this.pivot.quaternion.copy(this.spring.position);
    }
    
}