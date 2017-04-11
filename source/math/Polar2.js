import { Vector2, Vector3 } from 'three';

/**
 * Class representing a 2D coordinate as angle and radius.
 */
export default class Polar2
{
    /**
     * @param {Number} radius - Distance of the position from origin
     * @param {Number} angle - Angle of the position from the positive X-axis,
     *      turning counter-clockwise, in radians
     */
    constructor(radius = 0, angle = 0)
    {
        this.radius = radius;
        this.angle = angle;
    }
    
    /**
     * Convert a cartesian 2d vector into a 2d polar coordiante
     * @param {Vector2} vector
     * @returns {Polar2}
     */
    static fromVector2(vector)
    {
        return new Polar2(
            vector.length(),
            Math.atan2(vector.y, vector.x)
        );
    }
    
    /**
     * Convert a cartesian 3d vector into a polar 2d coordiante,
     * discarding the vectors y component
     * @param {Vector3} vector
     * @returns {Polar2}
     */
    static fromVector3XZ(vector)
    {
        return new Polar2(
            vector.length(),
            Math.atan2(vector.z, vector.x)
        );
    }
    
    toVector2()
    {
        return new Vector2(
            this.radius * Math.cos(this.angle),
            this.radius * Math.sin(this.angle)
        );
    }
    
    toVector3XZ()
    {
        return new Vector3(
            this.radius * Math.cos(this.angle),
            0,
            this.radius * Math.sin(this.angle)
        );
    }
}