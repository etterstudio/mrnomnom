import * as THREE from 'three';

import Loader from 'Loader';
import Maath from 'math/Maath';
import TwoLinkIK from 'math/TwoLinkIK';
import DynamicLine from 'rendering/DynamicLine';
import GameObject from 'objects/GameObject';

class Leg
{
    constructor(name)
    {
        this.curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3());
        this.line = new DynamicLine(this.curve, 0x000000, 0.1, 20);
        this.line.mesh.castShadow = true;
        
        this.name = name;
        this.footTargetPosition = new THREE.Vector3();
        this.footActualPosition = new THREE.Vector3();
        
        this.isStepping = false;
        this.isIKSolved = false;
        this.startFootPosition = new THREE.Vector3();
    }
}

class Legs extends GameObject
{
    constructor()
    {
        super();
        this.type = 'Legs';
        
        // TODO: Convert degrees to radians!
        this.deg2rad = 0.017453292519943295;
        
        // --- CONFIGURATION ---
        
        // -- Anatomy
        this.left = new Leg('left');
        this.add(this.left.line);
        this.right = new Leg('right');
        this.add(this.right.line);
        this.thighLength = 0.5;
        this.shankLength = 0.5;
        
        // -- Step
        this.groundHeight = 0.9;
        this.strideRadius = 0.4;
        this.stepWidth = 0.4;
        this.stepHeight = 0.2;
        this.stepSpeed = 2;
        this.liftSpeed = 10;
        
        // -- Hips Movement
        this.heave = 0.075;
        this.surge = 0;
        this.sway = 0;
        
        // -- Hips Rotation
        this.roll = 5 * this.deg2rad;
        this.pitch = 0;
        this.yawFactor = 0;
        this.extraRoll = 0;
        this.extraPitch = 0;
        
        // -- Idle
        this.idleHeave = 0.05;
        this.idleHeaveSpeed = 3;
        this.idleRoll = 2 * this.deg2rad;
        this.idleRollSpeed = 0.5;
        this.standUpSpeed = 5;
        
        
        // --- SETUP ---
        
        this._time = 0;
        this._deltaTime = 0;
        this._lastFixedPosition = new THREE.Vector3();
        this._lastFixedRotation = new THREE.Quaternion();
        
        this._isIdle = true;
        this._sitMode = Legs.SIT_AUTO;
        this._isSitting = false;
        this._idleStartTime = 0;
        this._standUpFactor = 1;
        this._standUpDirection = 1;
        this._currentSway = 0;
        this._currentPitch = 0;
        this._pitchLastFootHeight = 0;
        
        this.ground = null;
        this._hipsGround = new THREE.Vector3();
        this._raycaster = new THREE.Raycaster();
        this._down = new THREE.Vector3(0, -1, 0);
        
        this._renderedLegs = 1;
        var self = this;
        var onBeforeRender = function() {
            self._renderedLegs++;
        };
        this.left.line.mesh.onBeforeRender = onBeforeRender;
        this.right.line.mesh.onBeforeRender = onBeforeRender;
    }

    randomize()
    {
        this.strideRadius = Maath.randomBetween(0.2, 0.7);
        this.stepHeight = Maath.randomBetween(0.01, 0.5);
        this.stepSpeed = Maath.randomBetween(2, 3);
        
        var ranges = [
            [0.05, 0.2], // 0: Heave
            [0.05, 0.2], // 1: Surge
            [0.02, 0.1], // 2: Sway
            
            [3 * this.deg2rad, 10 * this.deg2rad],     // 3: Roll
            [2 * this.deg2rad, 7.5 * this.deg2rad],    // 4: Pitch
            [0.02, 0.3], // 5: Yaw
        ];
        
        var dominant1 = Maath.randomIntBetween(0, ranges.length);
        var dominant2 = Maath.randomIntBetween(0, ranges.length);
        
        for (var i = 0; i < ranges.length; i++) {
            if (dominant1 != i && dominant2 != i) {
                ranges[i][1] = (ranges[i][0] + ranges[i][1]) / 2;
            } else {
                ranges[i][0] = (ranges[i][0] + ranges[i][1]) / 2;
            }
        }
        
        this.heave = Maath.randomBetween(ranges[0][0], ranges[0][1]);
        this.surge = Maath.randomBetween(ranges[1][0], ranges[1][1]);
        this.sway = Maath.randomBetween(ranges[2][0], ranges[2][1]);
        
        this.roll = Maath.randomBetween(ranges[3][0], ranges[3][1]);
        this.pitch = Maath.randomBetween(ranges[4][0], ranges[4][1]);
        this.yawFactor = Maath.randomBetween(ranges[5][0], ranges[5][1]);
    }

    load(def)
    {
        if (def._groundHeight)
            this.groundHeight = parseFloat(def._groundHeight);
        if (def._thighLength && def._shankLength) {
            this.thighLength = parseFloat(def._thighLength);
            this.shankLength = parseFloat(def._shankLength);
        } else {
            var legBend = 1.2;
            if (def._legBend) {
                legBend = parseFloat(def._legBend);
            }
            this.thighLength = this.groundHeight * legBend / 2;
            this.shankLength = this.thighLength;
        }
        if (def._stepWidth)
            this.stepWidth = parseFloat(def._stepWidth);
        
        if (def._strideRadius)
            this.strideRadius = parseFloat(def._strideRadius);
        if (def._stepHeight)
            this.stepHeight = parseFloat(def._stepHeight);
        if (def._stepSpeed)
            this.stepSpeed = parseFloat(def._stepSpeed);
        
        if (def._heave)
            this.heave = parseFloat(def._heave);
        if (def._surge)
            this.surge = parseFloat(def._surge);
        if (def._sway)
            this.sway = parseFloat(def._sway);
        
        if (def._roll)
            this.roll = parseFloat(def._roll) * this.deg2rad;
        if (def._pitch)
            this.pitch = parseFloat(def._pitch) * this.deg2rad;
        if (def._yawFactor)
            this.yawFactor = parseFloat(def._yawFactor);
    }

    onEnable()
    {
        this.reset();
    }

    reset()
    {
        this.position.set(0, this.groundHeight, 0);
        this.rotation.set(0, 0, 0, 'XYZ');
        this.updateMatrixWorld();
        
        this._reference = this.parent;
        this._reference.updateMatrixWorld();
        this._legLength = this.thighLength + this.shankLength;
        
        this.setStepWidth(this.stepWidth);
        
        this._lastPelvisPosition = this._reference.getWorldPosition();
        this._lastPelvisPosition.y = 0;
        this._stepLeg = this.left;
    }

    setSitting(mode)
    {
        this._sitMode = mode;
        
        if (this._sitMode == Legs.SIT_SIT && !this._isSitting) {
            this._sitDown();
        } else if (this._sitMode == Legs.SIT_STAND && this._isSitting) {
            this._standUp();
        }
    }

    setStepWidth(width)
    {
        this.stepWidth = width;
        
        this._eachLeg((leg) => {
            var standPosition = this._footDefaultPosition(leg);
            leg.footActualPosition.copy(standPosition);
            standPosition.y = this._reference.position.y + this.groundHeight * 10;
            this._findGround(standPosition, this._legLength * 20, leg.footTargetPosition);
        });
    }

    get isVisible() {
        return (this._renderedLegs > 0);
    }

    _standUp()
    {
        if (!this._isSitting)
            return;
        
        this._isSitting = false;
        this.position.y = 0;
        this._standUpFactor = 0;
        this._standUpDirection = 1;
        this.dispatchEvent({ type: 'standup' });
    }

    _sitDown()
    {
        if (this._isSitting)
            return;
        
        this._isSitting = true;
        this._standUpFactor = 1;
        this._standUpDirection = -1;
        this.dispatchEvent({ type: 'sitdown' });
    }

    _eachLeg(func)
    {
        func(this.left);
        func(this.right);
    }

    _findGround(start, distance, groundOut)
    {
        if (this.ground == null) {
            groundOut.copy(start);
            groundOut.y = 0;
            return true;
        } else {
            var wasVisible = this.ground.visible;
            this.ground.visible = true;
            
            this._raycaster.set(start, this._down, 0, distance);
            var intersects = this._raycaster.intersectObject(this.ground, true);
            if (intersects.length == 0) {
                groundOut.set(0, 0, 0);
            } else {
                groundOut.copy(intersects[0].point);
            }
            
            this.ground.visible = wasVisible;
            return (intersects.length > 0);
        }
    }

    startStepping()
    {
        if (!this._stepLeg.isStepping) {
            this._startStepping(this._stepLeg);
            if (this._sitMode == Legs.SIT_AUTO) {
                this._standUp();
            }
        }
    }

    _hipPosition(leg)
    {
        var pos = new THREE.Vector3();
        pos.x = this.stepWidth / 2 * (leg == this.left ? -1 : 1);
        this.localToWorld(pos);
        return pos;
    }

    _footDefaultPosition(leg)
    {
        var worldPos = new THREE.Vector3();
        this._reference.localToWorld(worldPos);
        worldPos.y = 0;
        
        var legDirection = this._hipPosition(leg).sub(worldPos);
        legDirection.y = 0;
        legDirection.normalize();
        
        return worldPos.addScaledVector(legDirection, this.stepWidth / 2);
    }

    _other(leg)
    {
        return (leg == this.left ? this.right : this.left);
    }

    _startStepping(leg)
    {
        this._isIdle = false;
        this._stepLeg = leg;
        this._stepLeg.isStepping = true;
        
        if (!this._stepLeg.isIKSolved) {
            var start = this._stepLeg.footActualPosition.clone();
            start.y += this._legLength * 10; 
            this._findGround(start, this._legLength * 20, this._stepLeg.footTargetPosition);
        }
        
        this._stepLeg.startFootPosition.copy(this._stepLeg.footTargetPosition);
    }

    _updateHips()
    {
        var localRotation = new THREE.Euler();
        var localPosition = new THREE.Vector3();
        localPosition.y = this.groundHeight * this._standUpFactor;
        
        if (this._isIdle) {
            var pos = this._time - this._idleStartTime;
            localPosition.y -= (1 - Math.cos(pos * this.idleHeaveSpeed)) / 2 * this.idleHeave * this._standUpFactor;
            localRotation.z += Math.sin(pos * this.idleRollSpeed * 1.035) * this.idleRoll;
        
        } else {
            if (this.heave > 0 || this.surge > 0) {
                var footDistance = 0;
                this._eachLeg((leg) => {
                    var defaultP = this._footDefaultPosition(leg);
                    defaultP.y = 0;
                    var targetP = leg.footTargetPosition.clone();
                    targetP.y = 0;
                    footDistance += targetP.distanceTo(defaultP);
                });
                
                var factor = Maath.clamp01(footDistance / (2 * this.strideRadius));
                localPosition.y -= factor * this.heave * this._standUpFactor;
                localPosition.z += factor * this.surge * this._standUpFactor;
            }
            
            if (this.sway > 0) {
                var swayTarget = 0;
                if (this._stepLeg.isStepping) {
                    swayTarget = (this._stepLeg === this.right ? -1 : 1);
                }
                this._currentSway = Maath.moveTowards(this._currentSway, swayTarget, this._deltaTime * 10);
                localPosition.x += this._currentSway * this.sway * this._standUpFactor;
            }
            
            if (this.roll > 0 && this._stepLeg.isStepping) {
                var liftFactor = Maath.clamp01(Math.abs(this._stepLeg.footTargetPosition.y - this._stepLeg.startFootPosition.y) / this.stepHeight);
                localRotation.z += liftFactor * this.roll * (this._stepLeg === this.left ? 1 : -1);
            }
            if (this.extraRoll != 0) {
                localRotation.z += this.extraRoll;
            }
            
            if (this.pitch > 0) {
                var delta = this._stepLeg.footTargetPosition.y - this._pitchLastFootHeight;
                this._pitchLastFootHeight = this._stepLeg.footTargetPosition.y;
                this._currentPitch = Maath.moveTowards(this._currentPitch, -Maath.sign(delta), this._deltaTime * 10);
                localRotation.x += this._currentPitch * this.pitch;
            }
            if (this.extraPitch != 0) {
                localRotation.x += this.extraPitch;
            }
            
            if (this.yawFactor > 0) {
                var rightLocalTarget = this.right.footTargetPosition.clone();
                this.worldToLocal(rightLocalTarget);
                var leftLocalTarget = this.left.footTargetPosition.clone();
                this.worldToLocal(leftLocalTarget);
                
                var direction = new THREE.Vector3().subVectors(rightLocalTarget, leftLocalTarget);
                var angle = -Math.atan2(direction.z, direction.x);
                localRotation.y += angle * this.yawFactor;
            }
        }
        
        this.position.copy(localPosition);
        this.rotation.copy(localRotation);
        this.updateMatrixWorld();
    }

    legsupdate(time, deltaTime)
    {
        this._time = time;
        this._deltaTime = deltaTime;
        
        if (this._standUpDirection > 0 && this._standUpFactor < 1
                || (this._standUpDirection < 0 && this._standUpFactor > 0)) {
            this._standUpFactor = Maath.clamp01(this._standUpFactor + this.standUpSpeed * this._standUpDirection * deltaTime);
        }
        
        // -- Track movement of pelvis
        var pelvis = this._reference.getWorldPosition();
        var delta = pelvis.clone().sub(this._lastPelvisPosition).setY(0);
        var direction = delta.clone().normalize();
        var speed = delta.clone().divideScalar(deltaTime);
        this._lastPelvisPosition = pelvis;
        
        var isMoving = (speed.lengthSq() > 0.0000001);
        
        // -- Update step
        if (!this._isIdle) {
            if (this._stepLeg.isStepping) {
                var footPos = this._stepLeg.footTargetPosition.clone();
                footPos.y = 0;
                var footDefault = this._footDefaultPosition(this._stepLeg);
                
                // Define step speed in relation to hip speed to avoid
                // leg moving to slow to catch up
                var baseSpeed = Math.max(speed.length(), 1);
                
                // Movement of the foot on the XZ-plane
                var target;
                if (isMoving) {
                    // Walking: Move towards a point in direction of the movement
                    // to bring the foot to the configured step width
                    target = footDefault.clone().addScaledVector(direction, this.strideRadius);
                } else {
                    // Stopping: Move foot back below hip
                    target = footDefault.clone();
                }
                Maath.moveTowardsV3(footPos, target, baseSpeed * this.stepSpeed * deltaTime);
                footPos.y = 0;
                
                // Lift of the foot depends on how far the foot is away from the hip
                var liftPos = footPos.distanceTo(footDefault) / this.strideRadius;
                
                var targetHeight = 0;
                var findGround = false;
                var startFootY = this._stepLeg.startFootPosition.y;
                if (isMoving) {
                    // Walking: Use an inversed quadratic curve that is highest when
                    // close to the hip and goes down from there (1 - x^2)
                    liftPos *= 1.1;
                    targetHeight = startFootY + (1 - liftPos * liftPos) * this.stepHeight;
                    
                    var targetDistance = footPos.distanceTo(target);
                    var hipDistance = footDefault.distanceTo(target);
                    findGround = targetDistance < hipDistance;
                } else {
                    // Stopping: Use an inversed and translated quadratic curve that
                    // hits the ground below the hips and is above around it
                    liftPos = liftPos * 2 - 1.1;
                    targetHeight = startFootY + (1 - liftPos * liftPos) * this.stepHeight;
                    findGround = liftPos < 0.5;
                }
                
                if (findGround || targetHeight > startFootY) {
                    footPos.y = Maath.moveTowards(footPos.y, targetHeight, baseSpeed * this.liftSpeed * deltaTime);
                } else {
                    footPos.y = startFootY;
                }
                
                this._stepLeg.footTargetPosition.copy(footPos);
                
                // End step when foot hits ground
                // Only check this when foot is moving down to prevent foot from
                // getting stuck in ground when moving up
                if (findGround) {
                    var start = this._stepLeg.footTargetPosition.clone();
                    start.y += this._legLength * 10;
                    var ground = new THREE.Vector3();
                    if (this._findGround(start, this._legLength * 20, ground)) {
                        if (this._stepLeg.footTargetPosition.y <= ground.y) {
                            this._stepLeg.footTargetPosition.copy(ground);
                            this._stepLeg.isStepping = false;

                            if (this._stepLeg.footActualPosition.y > ground.y) {
                                this.dispatchEvent({ 
                                    type: 'step', 
                                    leg: this._stepLeg.name,
                                    position: ground 
                                });
                            }
                        }
                    }
                }
            }
            
            // -- Take next step
            // Start only when other leg is grounded
            if (!this._stepLeg.isStepping) {
                var other = this._other(this._stepLeg);
                
                // When walking, wait for lagging leg to lag strideRadius behind
                // When standing, move leg if it's far away from hip
                var stepTriggerDistance = isMoving ? this.strideRadius : this.strideRadius / 100;
                
                // Measure XZ-distance between hip and foot
                var targetGround = other.footTargetPosition.clone();
                targetGround.y = 0;
                var distance = targetGround.distanceTo(this._footDefaultPosition(other));
                if (distance >= stepTriggerDistance) {
                    this._startStepping(other);
                }
            }
            
            if (!this._stepLeg.isStepping && !isMoving) {
                this._isIdle = true;
                this._idleStartTime = time;
                if (this._sitMode == Legs.SIT_AUTO) {
                    this._sitDown();
                }
            }
        }
        
        // Only update visuals when object is rendered
        if (this._renderedLegs > 0) {
            this._updateHips();
        }
        
        // -- Update IK
        this._eachLeg((leg) => {
            var footPos = leg.footTargetPosition.clone();
            var kneePos = new THREE.Vector3();
            var hipPos = this._hipPosition(leg);
            
            if (hipPos.y < footPos.y) {
                hipPos.y = footPos.y;
            }
            
            leg.isIKSolved = TwoLinkIK(hipPos, footPos, this._reference.getWorldDirection(), this.thighLength, this.shankLength, kneePos);
            
            if (!leg.isIKSolved) {
                // Extend leg straight towards target when IK could not be solved
                // TODO: Strategy for when it couldn't be solved because it's too close?
                var legDirection = footPos.clone().sub(hipPos).normalize();
                kneePos = hipPos.clone().addScaledVector(legDirection, this.thighLength);
                footPos = hipPos.clone().addScaledVector(legDirection, this._legLength);
            }
            
            leg.footActualPosition = footPos.clone();
            
            // Apply positions to visuals
            if (this._renderedLegs > 0) {
                leg.curve.v0.copy(leg.line.worldToLocal(hipPos));
                leg.curve.v1.copy(leg.line.worldToLocal(kneePos));
                leg.curve.v2.copy(leg.line.worldToLocal(footPos));
                leg.line.update();
            }
        });
        
        this._renderedLegs = 0;
    }
}

Legs.SIT_AUTO = "SIT_AUTO";
Legs.SIT_SIT = "SIT_SIT";
Legs.SIT_STAND = "SIT_STAND";

export default Legs;