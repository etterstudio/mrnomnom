import { Vector3, Quaternion } from 'three';

/**
 * Class to simulate a spring.
 */
class Spring
{
    /**
     * @param {Number} omega - The angular frequency in radians per second.
     * @param {Number} zeta - The damping ratio of the spring.
     */
    constructor(omega = 0, zeta = 0)
    {
        this.omega = omega;
        this.zeta = zeta;
    }

    /**
     * The oscillation frequency in hertz.
     * Directly linked to omega.
     * @type {Number}
     */
    get frequency()
    {
        return this.omega / (2 * Math.PI);
    }

    set frequency(freq)
    {
        this.omega = 2 * Math.PI * freq;
    }

    /**
     * Sets the damping as the time over which the oscillation is reduced by half.
     * Directly linked to zeta and depending on omega.
     * @type {Number}
     */
    get halfLife()
    {
        return -Math.log(0.5) / (this.omega * this.zeta);
    }

    set halfLife(hf)
    {
        this.zeta = -Math.log(0.5) / (this.omega * hf);
    }
}

class SpringNumber extends Spring
{
    constructor(omega = 0, zeta = 0)
    {
        super(omega, zeta);

        this.position = 0;
        this.velocity = 0;
        this.target = 0;
    }

    step(deltaTime)
    {
        // Implicit method
        var f = 1 + 2 * deltaTime * this.zeta * this.omega;
        var oo = this.omega * this.omega;
        var hoo = deltaTime * oo;
        var hhoo = deltaTime * hoo;
        var detInv = 1 / (f + hhoo);
        var detX = f * this.position + deltaTime * this.velocity + hhoo * this.target;
        var detV = this.velocity + hoo * (this.target - this.position);
        this.position = detX * detInv;
        this.velocity = detV * detInv; 

        /*
        // Semi-implicit method
        this.velocity += -2 * deltaTime * this.zeta * this.omega * this.velocity
            + deltaTime * this.omega * this.omega * (this.target - this.position);
        this.position += deltaTime * this.velocity;
        */

        return this.position;
    }
}

class SpringVector3 extends Spring
{
    constructor(omega = 0, zeta = 0)
    {
        super(omega, zeta);

        this.position = new Vector3();
        this.velocity = new Vector3();
        this.target = new Vector3();

        this.detX = new Vector3();
        this.detV = new Vector3();
    }

    step(deltaTime)
    {
        // Implicit method
        var f = 1 + 2 * deltaTime * this.zeta * this.omega;
        var oo = this.omega * this.omega;
        var hoo = deltaTime * oo;
        var hhoo = deltaTime * hoo;
        var detInv = 1 / (f + hhoo);

        this.detX.copy(this.position).multiplyScalar(f);
        this.detX.addScaledVector(this.velocity, deltaTime);
        this.detX.addScaledVector(this.target, hhoo);

        this.detV.copy(this.target).sub(this.position).multiplyScalar(hoo);
        this.detV.add(this.velocity);

        this.detX.multiplyScalar(detInv);
        this.position.copy(this.detX);

        this.detV.multiplyScalar(detInv);
        this.velocity.copy(this.detV);

        /*
        // Semi-implicit method
        this.delta.copy(this.target).sub(this.position);
        this.velocity.addScaledVector(this.velocity, -2 * deltaTime * this.zeta * this.omega);
        this.velocity.addScaledVector(this.delta, deltaTime * this.omega * this.omega);
        this.position.addScaledVector(this.velocity, deltaTime);
        */

        return this.position;
    }
}

class SpringQuaternion extends Spring
{
    constructor(omega = 0, zeta = 0)
    {
        super(omega, zeta);

        this.position = new Quaternion();
        this.velocity = new Quaternion();
        this.target = new Quaternion();
    }

    step(deltaTime)
    {
        var dot = 
            this.position.x * this.target.x 
            + this.position.y * this.target.y 
            + this.position.z * this.target.z 
            + this.position.w * this.target.w;
        if (dot < 0) {
            this.target.x *= -1;
            this.target.y *= -1;
            this.target.z *= -1;
            this.target.w *= -1;
        }

        // Implicit
        var f = 1 + 2 * deltaTime * this.zeta * this.omega;
        var oo = this.omega * this.omega;
        var hoo = deltaTime * oo;
        var hhoo = deltaTime * hoo;
        var detInv = 1 / (f + hhoo);

        var detXx = f * this.position.x + deltaTime * this.velocity.x + hhoo * this.target.x;
        var detXy = f * this.position.y + deltaTime * this.velocity.y + hhoo * this.target.y;
        var detXz = f * this.position.z + deltaTime * this.velocity.z + hhoo * this.target.z;
        var detXw = f * this.position.w + deltaTime * this.velocity.w + hhoo * this.target.w;

        var detVx = this.velocity.x + hoo * (this.target.x - this.position.x);
        var detVy = this.velocity.y + hoo * (this.target.y - this.position.y);
        var detVz = this.velocity.z + hoo * (this.target.z - this.position.z);
        var detVw = this.velocity.w + hoo * (this.target.w - this.position.w);

        this.position.x = detXx * detInv;
        this.position.y = detXy * detInv;
        this.position.z = detXz * detInv;
        this.position.w = detXw * detInv;

        this.velocity.x = detVx * detInv;
        this.velocity.y = detVy * detInv;
        this.velocity.z = detVz * detInv;
        this.velocity.w = detVw * detInv;

        /*
        // Semi-implict method
        var n1 = -2 * deltaTime * this.zeta * this.omega;
        var n2 = deltaTime * this.omega * this.omega;
        this.velocity.x += n1 * this.velocity.x + n2 * (this.target.x - this.position.x);
        this.velocity.y += n1 * this.velocity.y + n2 * (this.target.y - this.position.y);
        this.velocity.z += n1 * this.velocity.z + n2 * (this.target.z - this.position.z);
        this.velocity.w += n1 * this.velocity.w + n2 * (this.target.w - this.position.w);

        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.position.z += this.velocity.z * deltaTime;
        this.position.w += this.velocity.w * deltaTime;
        */
        
        this.position.normalize();
        return this.position;
    }
}

export { Spring, SpringNumber, SpringVector3, SpringQuaternion };