import { 
    Object3D, 
    Vector2, 
    Vector3,
    Geometry, 
    Color, 
    Mesh, 
    DoubleSide,
    ShaderMaterial
} from 'three';
import line from 'three-line-3d/line3d';
import basicShader from 'three-line-3d/shader-basic';

export default class DynamicLine extends Object3D
{
    constructor(pointsOrCurve, color = 0x000000, width = 0.05, curvePoints = 50, closed = false)
    {
        super();
        this.type = 'DynamicLine';
        
        this.curve = pointsOrCurve;
        this.closed = closed;
        this.curvePoints = curvePoints;
        this.color = color;
        this.width = width;
        
        var geom = line(this._getPoints(), { closed: closed });
        var mat = new ShaderMaterial(basicShader({
            side: DoubleSide,
            diffuse: this.color,
            thickness: this.width
        }));
        this.mesh = new Mesh(geom, mat);
        
        this.add(this.mesh);
    }

    _getPoints()
    {
        var points = this.curve;
        if (typeof points.getPoints === 'function') {
            points = points.getPoints(this.curvePoints);
        }
        return points;
    }

    update()
    {
        var points = this._getPoints();
        if (points.length < 2) {
            this.mesh.visible = false;
            return;
        }
        
        this.mesh.visible = true;
        this.mesh.geometry.update(points, this.closed);
        this.mesh.geometry.boundingSphere = null;
        this.mesh.geometry.boundingBox = null;
    }
}