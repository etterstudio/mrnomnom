import {
    Vector3,
    Color,
    SphereBufferGeometry,
    MeshBasicMaterial,
    Mesh
} from 'three';
import CollisionObject from 'objects/CollisionObject';
import Maath from 'math/Maath';

export default class Coin extends CollisionObject
{
    constructor()
    {
        super();
        this.type = 'Coin';
        
        this.static = true;
        this.radius = 2.75;
        this.pickedUp = false;
        
        this.dropDuration = 0.5;
        this.dropHeight = 3;
        
        this.dropFrom = null;
        this.dropOffset = null;
        this.dropStartTime = 0;
        
        var geom = new SphereBufferGeometry(0.5, 8, 6);
        var mat = new MeshBasicMaterial({ color: 0xff0030 });
        this.mesh = new Mesh(geom, mat);
        this.mesh.castShadow = true;
        this.add(this.mesh);
        
        this.up = new Vector3(0, 1, 0);
    }
    
    onCollisionEnter(other)
    {
        if (!this.dropFrom && !this.pickedUp && other.name === 'donut') {
            this.pickup();
        }
    }
    
    dropTo(target)
    {
        this.dropFrom = this.position.clone();
        this.dropOffset = target.clone().sub(this.dropFrom);
        this.dropStartTime = 0;
    }
    
    pickup()
    {
        this.pickedUp = true;
        this._scene.game.coinEaten();

        this._scene.game.animate(this.mesh.scale, {
            x: 0, y: 0, z: 0
        }, 0.5);
        this._scene.game.animate(this.mesh.position, {
            y: this.mesh.position.y + 3
        }, 0.5);
        
        var targetColor = new Color(0xffffff);
        this._scene.game.animate(this.mesh.position, {
            r: targetColor.r, g: targetColor.g, b: targetColor.b
        }, 0.5, ()=> {
            this.parent.remove(this);
        });
    }
    
    update(time, deltaTime)
    {
        if (this.dropFrom) {
            if (this.dropStartTime == 0) {
                this.dropStartTime = time;
            }
            var pos = Maath.clamp01((time - this.dropStartTime) / this.dropDuration);
            
            this.position.copy(this.dropFrom).addScaledVector(this.dropOffset, pos);
            this.position.addScaledVector(this.up, Math.sin(pos * Math.PI) * this.dropHeight);
            
            if (pos == 1) {
                this.dropFrom = null;
                this.dropOffset = null;
            }
        }
    }
}