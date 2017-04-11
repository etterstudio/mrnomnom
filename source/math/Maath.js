const TwoPI = 2 * Math.PI;

/**
 * Additional math methods
 */
export default class Maath
{
    /**
     * Linearly interpolate between two numbers.
     */
    static lerp(x, y, t) {
        return (1 - t) * x + t * y;
    }
    
    /**
     * Randomly return 1 or -1.
     */
    static get randomSign()
    {
        return (Math.random() > 0.5 ? 1 : -1);
    }
    
    /**
     * Generate a random floating-point number in a range
     * @param {Number} min - minimum of range (inclusive)
     * @param {Number} max - maximum of range (exclusive)
     * @returns {Number} A random number between min and max
     */
    static randomBetween(min, max)
    {
        return min + Math.random() * (max - min);
    }

    /**
     * Generate a random integer in a range
     * @param {Number} min - minimum of range (inclusive)
     * @param {Number} max - maximum of range (exclusive)
     * @returns {Number} A random number between min and max
     */
    static randomIntBetween(min, max)
    {
        return Math.floor(min + Math.random() * (max - min));
    }

    /**
     * Get a random floating-point number in a range.
     * This function either accepts an object with min max properties,
     * an array with at least two elements (only the first two will be used)
     * or just a single number, which will be returned as-is.
     */
    static randomInRange(range)
    {
        var min = 0, max = 0;
        
        // Array: [min, max] or [value]
        if (Array.isArray(range)) {
            if (range.length > 1) {
                min = range[0];
                max = range[1];
            } else if (range.length == 1) {
                min = max = range[0];
            }
        
        // Number: xx
        } else if (typeof range === 'number') {
            min = max = range;
        
        // Object: { min: x, max: y }
        } else if ('min' in range && 'max' in range) {
            min = range.min;
            max = range.max;
        }
        
        return min + Math.random() * (max - min);
    }

    /**
     * Clamp a number to the range [min,max]
     * @param {Number} value
     * @param {Number} minimum
     * @param {Number} maximum
     * @returns {Number}
     */
    static clamp(value, min, max)
    {
        if (value < min)
            return min;
        if (value > max)
            return max;
        return value;
    }

    /**
     * Clamp a number to the range [0,1]
     * @param {Number} value
     * @returns {Number}
     */
    static clamp01(value)
    {
        if (value < 0)
            return 0;
        if (value > 1)
            return 1;
        return value;
    }

    /**
     * Return the sign of a number (returns 1 for 0)
     * @param {Number} value
     * @returns {Number}
     */
    static sign(value)
    {
        if (value < 0)
            return -1;
        return 1;
    }

    /**
     * Map position to range [min,max], returning
     * a 0 when pos is min and 1 when it is max.
     * The position will be clamped to the range.
     * @param {Number} min - minimum of range
     * @param {Number} max - maximum of range
     * @param {Number} pos - value to map to range
     * @returns {Number} position in range between [0,1]
     */
    static maprange(min, max, pos)
    {
        return this.clamp01((pos - min) / (max - min));
    }

    /**
     * Map a value from one to another range.
     * This will calculate the value's position in the in range
     * and then return that position in the out range.
     */
    static mapRanges(value, inRange, outRange)
    {
        var pos = this.clamp01((value - inRange.min) / (inRange.max - inRange.min));
        return outRange.min + pos * (outRange.max - outRange.min);
    }

    /**
     * Move a number towards a target, moving at most a given delta
     * and making sure not to overshoot the target
     * @param {Number} current - the current value
     * @param {Number} target - the target value
     * @param {Number} maxDelta - the maximum delta to move
     * @returns {Number}
     */
    static moveTowards(current, target, maxDelta)
    {
        if (Math.abs(target - current) <= maxDelta) {
            return target;
        }
        return current + this.sign(target - current) * maxDelta;
    }

    /**
     * Move a vector towards a target, moving at most a given distance delta
     * and making sure not to overshoot the target
     * @param {Vector3} current - the current value (will be modified)
     * @param {Vector3} target - the target value
     * @param {Vector3} maxDistanceDelta - the maximum distance delta to move
     * @returns {Boolean} Wether the target was reached
     */
    static moveTowardsV3(current, target, maxDistanceDelta)
    {
        var offset = target.clone().sub(current);
        var length = offset.length();
        if (length <= maxDistanceDelta) {
            current.copy(target);
            return true;
        }
        current.add(offset.multiplyScalar(maxDistanceDelta / length));
        return false;
    }
    
    /**
     * Calculate the dot product between two quaternions
     * @param {Quaternion} a
     * @param {Quaternion} b
     * @returns {Number} the dot product
     */
    static quaternionDot(a, b)
    {
        return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
    }
    
    /**
     * Calculate the angle between two quaternions
     * @param {Quaternion} a
     * @param {Quaternion} b
     * @returns {Number} the angle in radians
     */
    static quaternionAngle(a, b)
    {
        return Math.acos(Math.min(Math.abs(this.quaternionDot(a, b)), 1)) * 2;
    }
    
    /**
     * Move a rotation towards a target, moving at most a given angle delta
     * and making sure not to overshoot the target
     * @param {Quaternion} current - the current value (will be modified)
     * @param {Quaternion} target - the target value
     * @param {Quaternion} maxAngleDelta - the maximum angle delta to move (radians)
     * @returns {Boolean} Wether the target was reached
     */
    static moveTowardsQ(current, target, maxAngleDelta)
    {
        var angle = this.quaternionAngle(current, target);
        if (angle <= maxAngleDelta) {
            current.copy(target);
            return true;
        }
        current.slerp(target, this.clamp01(maxAngleDelta / angle));
        return false;
    }

    /**
     * The shortest distance between to angles.
     */
    static angleDistance(first, second)
    {
        var a = second - first;
        var a = a - Math.floor(a / TwoPI) * TwoPI;
        if (a > Math.PI) a -= TwoPI;
        return a;
    }
    
    /**
     * Create a continuously decreasing interval.
     * @param {Number} duration - Duration over which to run the intervals
     * @param {Number} factor - Factor by which each following interval is decreased
     * @param {Number} deltaTime - Delta time since last invocation
     * @param {Numner} minInterval - Don't decrease interval below this
     * @param {Object} state - Pass in the same empty object on each invocation
     * @returns {Boolean} true until the duration has passed 
     */
    static decreasingInterval(duration, factor, minInterval, deltaTime, state)
    {
        if (state.remaining == undefined) {
            state.remaining = duration;
        } else {
            state.remaining = state.remaining - deltaTime;
        }
        
        state.intervalChanged = false;
        if (state.nextInterval === undefined || state.remaining <= state.nextInterval) {
            state.lastInterval = state.currentInterval || 0;
            state.currentInterval = state.lastInterval + 1;
            state.intervalChanged = true;
            
            state.intervalDuration = Math.max(state.remaining * factor, minInterval);
            state.nextInterval = state.remaining - state.intervalDuration;
        }
        
        state.intervalPos = 1 - (state.remaining - state.nextInterval) / state.intervalDuration;
        state.pos = state.remaining / duration;
        
        return (state.remaining > 0);
    }
}