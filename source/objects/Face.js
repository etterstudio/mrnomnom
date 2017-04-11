import { Object3D, Geometry, Vector2, Vector3, Face3, MeshLambertMaterial, Mesh } from 'three';
import Maath from 'math/Maath';
import GameObject from 'objects/GameObject';

const FaceNormal = 'nrm';
const FaceBlink = 'blk';
const FaceOh = 'oh';
const FaceMon = 'mon';
const FaceNom = 'nom';

var halfFaceSize = new Vector2(512, 512);

export default class Face extends GameObject
{
    constructor(sprites)
    {
        super();
        this.type = 'Face';
        
        this.openTime = { min: 0.5, max: 4 };
        this.closedTime = { min: 0.1, max: 0.2 };
        
        this.nomTime = { min: 0.1, max: 0.2 };
        this.monTime = { min: 0.1, max: 0.2 };
        
        this.state = null;
        this.nextChange = 0;
        this.time = 0;
        
        var materials = {};
        
        this.normal = new Object3D();
        this._createFace(sprites[FaceNormal], materials, this.normal);
        this.add(this.normal);
        
        this.blink = new Object3D();
        this._createFace(sprites[FaceBlink], materials, this.blink);
        this.add(this.blink);
        
        this.oh = new Object3D();
        this._createFace(sprites[FaceOh], materials, this.oh);
        this.add(this.oh);
        
        this.nom = new Object3D();
        this._createFace(sprites[FaceNom], materials, this.nom);
        this.add(this.nom);
        
        this._changeState(FaceNormal);
    }
    
    ouch(duration)
    {
        this._changeState(FaceOh);
        this.nextChange = this.time + duration;
    }
    
    eat()
    {
        this._changeState(FaceMon);
    }
    
    blink()
    {
        this._changeState(FaceNormal);
    }
    
    update(time, deltaTime)
    {
        this.time = time;
        
        if (this.nextChange < time) {
            var duration = null;
            switch (this.state) {
                case FaceNormal:
                case FaceBlink:
                case FaceOh:
                    this._changeState(this.state !== FaceNormal ? FaceNormal : FaceBlink);
                    duration = (this.state === FaceBlink ? this.closedTime : this.openTime);
                    break;
                case FaceNom:
                case FaceMon:
                    this._changeState(this.state !== FaceMon ? FaceMon : FaceNom);
                    duration = (this.state === FaceNom ? this.nomTime : this.monTime);
                    break;
            }
                        
            this.nextChange = time + Maath.randomBetween(duration.min, duration.max);
        }
    }
    
    _changeState(newState)
    {
        this.state = newState;
        
        this.normal.visible = (this.state === FaceNormal || this.state === FaceMon);
        this.blink.visible = (this.state === FaceBlink);
        this.oh.visible = (this.state === FaceOh);
        this.nom.visible = (this.state === FaceNom);
    }
    
    _createFace(sprites, materials, container)
    {
        var meshes = {};
        for (var sprite of sprites) {
            if (!sprite)
                continue;
            
            var texid = sprite.texture.id;
            if (!meshes[texid]) {
                if (!materials[texid]) {
                    materials[texid] = new MeshLambertMaterial({ map: sprite.texture, transparent: true });
                }
                meshes[texid] = new Mesh(new Geometry(), materials[texid]);
                container.add(meshes[texid]);
            }
            
            this._addQuad(meshes[texid].geometry, sprite);
        }
    }
    
    _addQuad(geom, sprite, mirror = false, depth = 0)
    {
        //        rect.width
        // |-------------------|
        // |        p.w        |
        // |      |------|     |
        // |  p.x |      | p.z | rect.height
        // |      |      |     |
        // |      |------|     |
        // |        p.y        |
        // |-------------------|
        
        var padLeft = sprite.padding.x;
        var padRight = sprite.padding.z;
        if (mirror) {
            padLeft = sprite.padding.z;
            padRight = sprite.padding.x;
        }
        
        var offsetX = -halfFaceSize.x + sprite.rect.x + sprite.rect.width / 2; 
        var offsetY = -halfFaceSize.y + sprite.rect.y + sprite.rect.height / 2; 
        
        var minX = -sprite.rect.width / 2 + padLeft + offsetX;
        var maxX =  sprite.rect.width / 2 - padRight + offsetX;
        var minY = -sprite.rect.height / 2 + sprite.padding.y + offsetY;
        var maxY =  sprite.rect.height / 2 - sprite.padding.w + offsetY;
        
        var vertStart = geom.vertices.length;
        geom.vertices.push(new Vector3(minX, minY, depth));
        geom.vertices.push(new Vector3(minX, maxY, depth));
        geom.vertices.push(new Vector3(maxX, maxY, depth));
        geom.vertices.push(new Vector3(maxX, minY, depth));
        
        geom.faces.push(new Face3(vertStart, vertStart + 2, vertStart + 1));
        geom.faces.push(new Face3(vertStart + 2, vertStart, vertStart + 3));
        
        var uvLeft = sprite.outerUV.x;
        var uvRight = sprite.outerUV.z;
        if (mirror) {
            uvLeft = sprite.outerUV.z;
            uvRight = sprite.outerUV.x;
        }
        
        geom.faceVertexUvs[0].push([
            new Vector2(uvLeft, sprite.outerUV.y),
            new Vector2(uvRight, sprite.outerUV.w),
            new Vector2(uvLeft, sprite.outerUV.w)
        ]);
        geom.faceVertexUvs[0].push([
            new Vector2(uvRight, sprite.outerUV.w),
            new Vector2(uvLeft, sprite.outerUV.y),
            new Vector2(uvRight, sprite.outerUV.y)
        ]);
    }
}