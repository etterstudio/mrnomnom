import { Vector3, Quaternion, Euler, Font, TextGeometry, MeshBasicMaterial, Mesh, Group } from 'three';
import GameObject from 'objects/GameObject';
import { SpringVector3 } from 'math/Spring';

import FontData from 'donutFont';

export default class FlyingText extends GameObject
{
    constructor()
    {
        super();
        this.type = 'FlyingText';
        
        this.size = 1;
        this.thickness = 0.001;
        this.letterSpacing = 0.7;
        this.spaceSpacing = 0.3,
        this.textYOffset = 3.2;
        this.textScale = 1;
        
        this.font = new Font(FontData);
        
        this.isShowing = false;
        this.textTarget = null;
        this.hideAfter = 0;
        this.showUntil = 0;
        this.onHide = null;
        
        this.material = new MeshBasicMaterial({ color: 0xFFFFFF, transparent: true });
        this.letters = new Group();
        this.add(this.letters);
        
        this.centers = [];
        this.offsets = [];
        this.springs = [];
        this.letterSize = [];
        this.up = new Vector3(0, 1, 0);
        this.baseOffset = new Vector3();
    }
    
    show(text, hideAfter = Number.POSITIVE_INFINITY, onHide = null)
    {
        text = text.toUpperCase();
        
        this.isShowing = true;
        this.hideAfter = hideAfter;
        this.showUntil = 0;
        this.onHide = onHide;
        
        for (var i = this.letters.children.length - 1; i >= 0; i--) {
            var letter = this.letters.children[i];
            this.letters.remove(letter);
            letter.geometry.dispose();
        }
        
        var letterSpacing = this.letterSpacing * this.textScale;
        var totalWidth = 0;
        for (var i = 0; i < text.length; i++) {
            var geom = new TextGeometry(text.charAt(i), {
                font: this.font,
                size: this.size * this.textScale,
                height: this.thickness * this.textScale
            });
            var letter = new Mesh(geom, this.material);
            this.letters.add(letter);
            
            if (this.springs.length <= i) {
                this.springs.push(new SpringVector3(100, 1));
            }
            
            geom.computeBoundingBox();
            if (isFinite(geom.boundingBox.max.x)) {
                this.letterSize[i] = geom.boundingBox.max.x - geom.boundingBox.min.x;
            } else {
                this.letterSize[i] = this.spaceSpacing;
            }
            
            totalWidth += this.letterSize[i] + letterSpacing;
        }
        
        this.centers.length = 0;
        if (text.length % 2 == 0) {
            this.centers.push(Math.ceil(text.length / 2) - 1);
            this.offsets[this.centers[0]] = -letterSpacing / 2 - this.letterSize[this.centers[0]];
            this.centers.push(Math.ceil(text.length / 2));
            this.offsets[this.centers[1]] = letterSpacing / 2;
        } else {
            this.centers.push(Math.ceil(text.length / 2) - 1);
            this.centers.push(this.centers[0]);
            this.offsets[this.centers[0]] = -this.letterSize[this.centers[0]] / 2;
        }
        
        this.offsets.length = text.length;
        for (var i = this.centers[0] - 1; i >= 0; i--) {
            this.offsets[i] = -letterSpacing - this.letterSize[i];
        }
        for (var i = this.centers[1] + 1; i < this.offsets.length; i++) {
            this.offsets[i] = this.letterSize[i - 1] + letterSpacing;
        }
        
        this.baseOffset.set(0, this.textYOffset, 0);
    }
    
    hide(onHidden = null)
    {
        for (var letter of this.letters.children) {
            letter.visible = false;
        }
        this.isShowing = false;
        
        if (this.onHide) {
            this.onHide();
            this.onHide = null;
        }
        if (onHidden) {
            onHidden();
        }
        
    }
    
    update(time, deltaTime)
    {
        if (!this.textTarget || !this.isShowing)
            return;
        
        if (this.showUntil == 0) {
            this.showUntil = time + this.hideAfter;
        } else if (this.showUntil < time) {
            this.hide();
            return;
        }
        
        var cam = this._scene.game.camera;
        
        var viewDir = cam.getWorldDirection();
        var angle = Math.atan2(viewDir.z, viewDir.x) + Math.PI / 2;
        var textDir = new Vector3(1, 0, 0).applyAxisAngle(this.up, -angle);
        
        var basePos = this.textTarget.getWorldPosition().add(this.baseOffset);
        
        var index = this.centers[0];
        var lastPos = basePos.clone();
        this.updateLetter(index, lastPos, textDir, deltaTime);
        
        for (var i = index - 1; i >= 0; i--) {
            this.updateLetter(i, lastPos, textDir, deltaTime);
        }
        
        index = this.centers[1];
        lastPos.copy(basePos);
        if (this.offsets.length % 2 == 0) {
            this.updateLetter(index, lastPos, textDir, deltaTime);
        } else {
            lastPos.addScaledVector(textDir, this.offsets[index]);
        }
        
        for (var i = index + 1; i < this.offsets.length; i++) {
            this.updateLetter(i, lastPos, textDir, deltaTime);
        }
    }
    
    updateLetter(index, lastPos, textDir, deltaTime)
    {
        var spring = this.springs[index];
        var letter = this.letters.children[index];
        
        spring.target.copy(lastPos).addScaledVector(textDir, this.offsets[index]);
        spring.step(deltaTime);
        letter.position.copy(spring.position);
        
        letter.quaternion.copy(this._scene.game.camera.quaternion);
        
        lastPos.copy(spring.position);
    }
}