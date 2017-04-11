import { Vector3 } from 'three';

/**
 * Solve a two-link IK chain
 * @param {Vector3} start - The start position of the chain
 * @param {Vector3} end - The end position of the chain
 * @param {Vector3} bendDirection - The direction the middle position will be bent in
 * @param {Number} upper - The length of the upper limb
 * @param {Number} lower - The length of the lower limb
 * @param {Vector3} middleOut - The position of the middle node will be filled into this vector
 * @returns {Boolean} wether the link was solves successfully
 */
export default function(start, end, bendDirection, upper, lower, middleOut)
{
    // Find the middle node position in 3D-space by overlappping
    // the two spheres from start/end with radius upper/lower.
    // The middle node must lied on the resulting overlap circle,
    // we project bendDirection onto the plane of the circle
    // and then find the point on the circle in the projected direction.
    
    var diff = end.clone().sub(start);
    var sqrDistance = diff.lengthSq();
    var distance = Math.sqrt(sqrDistance);
    var sqrUpper = upper * upper;
    var sqrLower = lower * lower;
    
    // Points are too far apart
    if (distance > upper + lower) {
        return false;
    }
    
    // Points are too close together
    if (distance < Math.abs(upper - lower)) {
        return false;
    }
    
    // Assume a coordiante system where start -> end is the x-axis
    var axis = diff.clone().normalize();
    
    // Radius of the overlap circle
    // Adapted form: http://mathworld.wolfram.com/Sphere-SphereIntersection.html
    var n = sqrDistance - sqrLower + sqrUpper;
    var a = 1 / (2 * distance) * Math.sqrt(4 * sqrDistance * sqrUpper - n * n);
    if (isNaN(a)) {
        // This should have been catched by the checks above but
        // might still happen due to rounding error
        return false;
    }
    
    // Project forward onto the YZ-Plane
    // (bendDirection - axis * dot(bendDirection, axis)).normalized
    var xzBend = bendDirection.clone().sub(axis.clone().multiplyScalar(bendDirection.dot(axis))).normalize();
    if (xzBend.lengthSq() < 0.00000001) {
        // The bend direction is perpendicular to the plane, finding the
        // bending direction is not possible in this case
        return false;
    }
    
    // X-Position of the YZ-Plane where the overlap circle lies
    var x = n / (2 * distance);
    
    // The center point of the overlap circle
    var center = start.clone().add(axis.clone().multiplyScalar(x));
    // The point on the circle in the bend direction
    middleOut.copy(center.add(xzBend.multiplyScalar(a)));
    
    return true;
}