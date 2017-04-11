import { 
    Vector3, 
    Quaternion, 
    Color, 
    SphereBufferGeometry, 
    PlaneBufferGeometry,
    MeshBasicMaterial, 
    Mesh, 
    Object3D,
    Math as TMath
} from 'three';
import { SpringVector3, SpringNumber } from 'math/Spring';
import Maath from 'math/Maath';
import GameObject from 'objects/GameObject';
import FlyingText from 'objects/FlyingText';
import Simplex from 'fast-simplex-noise';

const StateHide = 'StateHide';
const StateIdle = 'StateIdle';
const StateReturn = 'StateReturn';

export default class Bee extends GameObject
{
    constructor()
    {
        super([
            'boombox'
        ]);
        this.type = 'Bee';
        
        this.velocity = 50;
        this.groundDistance = 2;
        this.cameraDistance = 3.25;
        this.beeRadius = 0.5;
        this.squash = 0.8;
        this.squashMaxVelocity = 3;
        this.color = new Color(0xffffff);
        
        this.excursion = 2;
        this.minExcursion = 0.2;
        this.excursionSpeed = 0.7;
        this.excursionPower = 2;
        
        this.time = 0;
        this.deltaTime = 0;
        this.state = StateHide;
        this.idleTargetPos = null;
        this.beePosition = new Vector3();
        this.buzz = null;

        this.invincibleTime = 0;
        this.invincibleBlinkDecreaseFactor = 0.15;
        this.invincibleBlinkMinInterval = 0.07;
        this.invincibleColor = new Color(0x103699);
        this.invincibleUntil = 0;
        this.invincibleBlinkState = null;

        var geom = new SphereBufferGeometry(this.beeRadius, 32, 32);
        var mat = new MeshBasicMaterial({ color: this.color });
        this.point = new Mesh(geom, mat);
        this.point.castShadow = true;
        this.add(this.point);

        /*this.text = new FlyingText();
        this.text.textScale = 2;
        this.text.textYOffset = 2.2;
        this.text.textTarget = this.point;
        this.add(this.text);*/

        this.texts = [];
        this.textStyle = {
            scale: 2,
            letterSpacing: 0.7,
            lineHeight: 2
        };

        this.spring = new SpringVector3();
        this.spring.frequency = 4;
        this.spring.zeta = 0.25;
        
        this.noise = new Simplex();
    }
    
    onStart()
    {
        //
    }

    onEnable()
    {
        this.beePosition.copy(this.getWorldPosition());
        this.point.getWorldPosition(this.spring.position);
        
        this.buzz = this.assets.boombox.getCassette('bee_buzz');
        if (this.buzz != null) {
            this.add(this.buzz.audio);
            this.buzz.play().loop();
        }
    }
    
    onDisable()
    {
        if (this.buzz != null) {
            this.buzz.stop();
        }
    }
    
    hide()
    {
        this.state = StateHide;
    }

    say(text, duration = Number.POSITIVE_INFINITY, onHidden = null)
    {
        this.state = StateIdle;

        var lines = text.split("\n");

        while (this.texts.length < lines.length) {
            var text = new FlyingText();
            this.add(text);
            this.texts.push(text);
        }
        
        var offset = 3.2 + (lines.length - 1) * this.textStyle.lineHeight * this.textStyle.scale;
        for (var i = 0; i < lines.length; i++) {
            if (!this.texts[i]) {
                this.texts[i] = new FlyingText();
                this.add(this.texts[i]);
            }
            
            this.texts[i].textTarget = this.point;
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
    
    invincibleFor(duration)
    {
        this.invincibleTime = duration;
        this.invincibleUntil = this.time + duration;
        this.invincibleBlinkState = {};
    }
    
    get isInvincible()
    {
        return (this.time <= this.invincibleUntil);
    }
    
    update(time, deltaTime)
    {
        this.time = time;
        this.deltaTime = deltaTime;
        
        switch (this.state) {
            case StateHide:
                this.updateHide();
                break;
            case StateIdle:
                this.updateIdle();
                break;
        }
    }
    
    getIdleTarget()
    {
        var targetPos;
        if (this.idleTargetPos != null) {
            targetPos = this.idleTargetPos.clone().addScaledVector(this.up, this.groundDistance);
        } else {
            var cam = this._scene.game.camera;
            targetPos = cam.getWorldPosition()
                .add(cam.getWorldDirection().multiplyScalar(this.cameraDistance));
        }
        return targetPos;
    }
    
    updateHide()
    {
        this.updateFlight(new Vector3(0, -10, 0), this.velocity);
    }
    
    updateIdle()
    {
        this.updateFlight(this.getIdleTarget(), this.velocity);
    }

    updateFlight(target, targetVelocity)
    {
        var cam = this._scene.game.camera;

        // Just linearly interpolate main target 
        Maath.moveTowardsV3(this.beePosition, target, targetVelocity * this.deltaTime)
        
        // Add random movement based on Simplex noise
        var excursionDir = new Vector3(0, 0, 0);
        excursionDir.x = this.noise.in2D(this.beePosition.x, this.time * this.excursionSpeed);
        excursionDir.y = this.noise.in2D(this.beePosition.y, this.time * this.excursionSpeed);
        excursionDir.z = this.noise.in2D(this.beePosition.z, this.time * this.excursionSpeed);
        var excursionSize = Math.pow(this.noise.in2D(this.time * this.excursionSpeed, 0), this.excursionPower) * this.excursion + this.minExcursion;
        
        // Use a spring to make movement more physical
        var lastPosition = this.spring.position.clone();
        
        this.spring.target.copy(excursionDir).setLength(excursionSize).add(this.beePosition);
        this.spring.step(this.deltaTime);
        this.point.position.copy(this.spring.position);
        this.point.parent.worldToLocal(this.point.position);

        // Update squash (based on velocity) and size (based on mic volume)
        var diff = this.spring.position.clone().sub(lastPosition);
        var velocity = diff.length() / this.deltaTime;

        var lookAtPoint = this.spring.position.clone().add(diff);
        this.point.lookAt(lookAtPoint);
        
        var velocityFactor = (1 - 1 / ((velocity / this.squashMaxVelocity) + 1));
        this.point.scale.x = (1 - (velocityFactor * this.squash));
        this.point.scale.y = this.point.scale.x;
        this.point.scale.z = 1;
        
        // Blink cooldown
        if (this.invincibleBlinkState && (this.invincibleUntil - this.time) <= this.invincibleTime) {
            if (Maath.decreasingInterval(
                this.invincibleTime, 
                this.invincibleBlinkDecreaseFactor,
                this.invincibleBlinkMinInterval, 
                this.deltaTime, 
                this.invincibleBlinkState
            )) {
                var pos = this.invincibleBlinkState.intervalPos;
                pos = (Math.cos(pos * 2 * Math.PI) + 1) / 2;
                this.point.material.color.copy(this.color).lerp(this.invincibleColor, pos);
                this.buzz.audio.setVolume(pos * (this.buzz.sound.volume + this.buzz.sound.velocityVolume));
            } else {
                this.invincibleBlinkState = null;
                this.point.material.color.copy(this.color);
            }
        }
        
        // Update buzz sound
        if (this.buzz != null) {
            if (this.state === StateHide) {
                this.buzz.audio.setVolume(0);
            } else {
                this.buzz.audio.setPlaybackRate(1 + velocityFactor * this.buzz.sound.velocityPitch);
                if (!this.invincibleBlinkState) {
                    this.buzz.audio.setVolume(this.buzz.sound.volume + velocityFactor * this.buzz.sound.velocityVolume);
                }
            }
        }
    }
}