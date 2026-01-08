/**
 * Vehicle - player car with arcade physics
 */

import * as THREE from 'three';

export class Vehicle {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        
        // Physics properties (arcade-style)
        this.velocity = new THREE.Vector3();
        this.acceleration = 40; // m/s^2
        this.maxSpeed = 30; // m/s
        this.brakeForce = 50;
        this.friction = 0.98;
        this.turnSpeed = 2.5;
        this.driftFactor = 0.95;
        this.steering = 0;
        this.maxSteering = Math.PI / 4;
        
        // Handbrake/Drift
        this.handbrakeMultiplier = 2.0; // Turn faster during drift
        this.driftGrip = 0.3; // Reduced lateral grip during drift
        this.isHandbraking = false;
        
        // Start position - will be set by track after initialization
        this.startPosition = new THREE.Vector3(0, 0.5, 34);
        this.startRotation = new THREE.Euler(0, 0, 0);
        
        this.createMesh();
        this.createTrailEffect();
    }
    
    createMesh() {
        // Create a sleek futuristic racing car
        const group = new THREE.Group();
        
        // Main body material - glossy with neon glow
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            roughness: 0.2,
            metalness: 0.9,
        });
        
        const accentMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff88,
            emissive: 0x00ff88,
            emissiveIntensity: 0.5,
            roughness: 0.3,
            metalness: 0.8
        });
        
        // Lower body - sleek wedge shape
        const lowerBodyShape = new THREE.Shape();
        lowerBodyShape.moveTo(-0.9, 0);
        lowerBodyShape.lineTo(-0.7, 1.8);    // Front taper
        lowerBodyShape.lineTo(0.7, 1.8);
        lowerBodyShape.lineTo(0.9, 0);
        lowerBodyShape.lineTo(0.9, -1.8);    // Rear
        lowerBodyShape.lineTo(-0.9, -1.8);
        lowerBodyShape.closePath();
        
        const extrudeSettings = { depth: 0.4, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05 };
        const lowerBodyGeo = new THREE.ExtrudeGeometry(lowerBodyShape, extrudeSettings);
        lowerBodyGeo.rotateX(-Math.PI / 2);
        const lowerBody = new THREE.Mesh(lowerBodyGeo, bodyMaterial);
        lowerBody.position.y = 0.2;
        lowerBody.castShadow = true;
        group.add(lowerBody);
        
        // Cockpit canopy - curved glass look
        const canopyShape = new THREE.Shape();
        canopyShape.moveTo(-0.5, 0);
        canopyShape.quadraticCurveTo(-0.5, 0.8, 0, 1);
        canopyShape.quadraticCurveTo(0.5, 0.8, 0.5, 0);
        canopyShape.closePath();
        
        const canopyGeo = new THREE.ExtrudeGeometry(canopyShape, { depth: 1.2, bevelEnabled: true, bevelThickness: 0.02 });
        canopyGeo.rotateX(-Math.PI / 2);
        const canopyMaterial = new THREE.MeshStandardMaterial({
            color: 0x003333,
            roughness: 0.1,
            metalness: 0.95,
            transparent: true,
            opacity: 0.8
        });
        const canopy = new THREE.Mesh(canopyGeo, canopyMaterial);
        canopy.position.set(0, 0.55, -0.3);
        canopy.castShadow = true;
        group.add(canopy);
        
        // Side accent stripes (neon)
        const stripeGeo = new THREE.BoxGeometry(0.08, 0.15, 3);
        const leftStripe = new THREE.Mesh(stripeGeo, accentMaterial);
        leftStripe.position.set(-0.85, 0.35, 0);
        group.add(leftStripe);
        
        const rightStripe = new THREE.Mesh(stripeGeo, accentMaterial);
        rightStripe.position.set(0.85, 0.35, 0);
        group.add(rightStripe);
        
        // Front splitter accent
        const splitterGeo = new THREE.BoxGeometry(1.6, 0.05, 0.15);
        const splitter = new THREE.Mesh(splitterGeo, accentMaterial);
        splitter.position.set(0, 0.15, 1.9);
        group.add(splitter);
        
        // Rear diffuser accent
        const diffuserGeo = new THREE.BoxGeometry(1.4, 0.05, 0.2);
        const diffuser = new THREE.Mesh(diffuserGeo, accentMaterial);
        diffuser.position.set(0, 0.15, -1.85);
        group.add(diffuser);
        
        // Rear wing
        const wingPostGeo = new THREE.BoxGeometry(0.08, 0.4, 0.08);
        const wingPost1 = new THREE.Mesh(wingPostGeo, bodyMaterial);
        wingPost1.position.set(-0.5, 0.7, -1.6);
        group.add(wingPost1);
        const wingPost2 = new THREE.Mesh(wingPostGeo, bodyMaterial);
        wingPost2.position.set(0.5, 0.7, -1.6);
        group.add(wingPost2);
        
        const wingGeo = new THREE.BoxGeometry(1.4, 0.06, 0.35);
        const wing = new THREE.Mesh(wingGeo, accentMaterial);
        wing.position.set(0, 0.95, -1.6);
        wing.rotation.x = -0.15;
        group.add(wing);
        
        // Wheels - larger with glowing rims
        const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 24);
        const wheelMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.7,
            metalness: 0.3
        });
        
        const rimGeo = new THREE.TorusGeometry(0.28, 0.04, 8, 24);
        const rimMat = new THREE.MeshStandardMaterial({
            color: 0x00ff88,
            emissive: 0x00ff88,
            emissiveIntensity: 0.3
        });
        
        const wheelPositions = [
            [-0.85, 0.35, 1.2],   // Front left
            [0.85, 0.35, 1.2],    // Front right
            [-0.85, 0.35, -1.2],  // Rear left
            [0.85, 0.35, -1.2]    // Rear right
        ];
        
        this.wheels = [];
        wheelPositions.forEach((pos, i) => {
            const wheelGroup = new THREE.Group();
            
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheelGroup.add(wheel);
            
            // Glowing rim
            const rim = new THREE.Mesh(rimGeo, rimMat);
            rim.rotation.y = Math.PI / 2;
            rim.position.x = i % 2 === 0 ? -0.13 : 0.13;
            wheelGroup.add(rim);
            
            wheelGroup.position.set(pos[0], pos[1], pos[2]);
            wheelGroup.castShadow = true;
            group.add(wheelGroup);
            this.wheels.push(wheelGroup);
        });
        
        // Headlights - sleek LED strips
        const headlightGeo = new THREE.BoxGeometry(0.6, 0.08, 0.05);
        const headlightMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 1.5
        });
        
        const headlight = new THREE.Mesh(headlightGeo, headlightMat);
        headlight.position.set(0, 0.4, 1.85);
        group.add(headlight);
        
        // Tail lights - full width LED bar
        const tailLightGeo = new THREE.BoxGeometry(1.2, 0.06, 0.05);
        const tailLightMat = new THREE.MeshStandardMaterial({
            color: 0xff0044,
            emissive: 0xff0044,
            emissiveIntensity: 0.8
        });
        
        const tailLight = new THREE.Mesh(tailLightGeo, tailLightMat);
        tailLight.position.set(0, 0.45, -1.85);
        group.add(tailLight);
        this.tailLight = tailLight;
        
        // Store reference for tail light brightness
        this.leftTailLight = { material: tailLightMat };
        this.rightTailLight = { material: tailLightMat };
        
        this.mesh = group;
        this.mesh.position.copy(this.startPosition);
        this.scene.add(this.mesh);
    }
    
    createTrailEffect() {
        // Simple trail using line
        const maxTrailPoints = 50;
        const positions = new Float32Array(maxTrailPoints * 3);
        
        this.trailGeometry = new THREE.BufferGeometry();
        this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const trailMaterial = new THREE.LineBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.5
        });
        
        this.trail = new THREE.Line(this.trailGeometry, trailMaterial);
        this.scene.add(this.trail);
        
        this.trailPositions = [];
        this.maxTrailPoints = maxTrailPoints;
    }
    
    update(delta, input) {
        if (!this.mesh) return;
        
        // Get current forward direction
        const forward = this.getForwardDirection();
        const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
        
        // Calculate current speed in forward direction
        const currentSpeed = this.velocity.dot(forward);
        
        // Manual acceleration with W - no auto-drive
        const isAccelerating = input.forward;
        const isBraking = input.backward;
        
        if (isAccelerating) {
            const accelForce = this.acceleration * delta;
            const accel = forward.clone().multiplyScalar(accelForce);
            this.velocity.add(accel);
        }
        
        // Braking with S
        if (isBraking) {
            const brakeForce = forward.clone().multiplyScalar(-this.brakeForce * delta);
            this.velocity.add(brakeForce);
            this.velocity.multiplyScalar(0.92);
        }
        
        // Handbrake/Space (for drifting) - NO speed penalty!
        this.isHandbraking = input.handbrake;
        if (this.isHandbraking && Math.abs(currentSpeed) > 3) {
            // Reduce lateral grip to allow sliding - but keep forward momentum
            const lateralVel = right.clone().multiplyScalar(this.velocity.dot(right));
            this.velocity.sub(lateralVel.multiplyScalar(this.driftGrip));
            // NO slowdown during drift - this is key for fun drifting!
        }
        
        // Steering with A/D - SHARPER at low speeds, gentler at high speeds
        const absSpeed = Math.abs(currentSpeed);
        // At low speed: turn sharply. At high speed: turn less sharply
        const speedFactor = absSpeed < 10 ? 1.5 : Math.max(0.6, 1 - (absSpeed - 10) / 40);
        const turnRate = this.turnSpeed * speedFactor;
        
        if (input.left) {
            this.steering = Math.min(this.steering + turnRate * delta * 2, this.maxSteering);
        } else if (input.right) {
            this.steering = Math.max(this.steering - turnRate * delta * 2, -this.maxSteering);
        } else {
            // Return steering to center quickly
            this.steering *= 0.8;
        }
        
        // Apply steering rotation - sharper at low speed
        if (Math.abs(currentSpeed) > 0.1) {
            // Low speed = tighter turns, high speed = wider turns
            const lowSpeedBonus = absSpeed < 8 ? 1.8 : 1;
            const driftBonus = this.isHandbraking ? this.handbrakeMultiplier : 1;
            const turnAmount = this.steering * lowSpeedBonus * driftBonus;
            this.mesh.rotation.y += turnAmount * delta;
        }
        
        // Check if off-track (high friction zone)
        const offTrackFriction = this.checkOffTrack();
        
        // Limit velocity
        let effectiveMaxSpeed = this.maxSpeed;
        if (offTrackFriction) {
            effectiveMaxSpeed = this.maxSpeed * 0.4; // Much slower off-track
        }
        
        const speed = this.velocity.length();
        if (speed > effectiveMaxSpeed) {
            this.velocity.normalize().multiplyScalar(effectiveMaxSpeed);
        }
        
        // Apply friction - drifting should NOT slow you down
        let frictionMultiplier = this.isHandbraking ? 0.995 : this.friction; // Almost no slowdown when drifting
        if (offTrackFriction) {
            frictionMultiplier = 0.92; // High friction off-track
        }
        this.velocity.multiplyScalar(Math.pow(frictionMultiplier, delta * 60));
        
        // Lateral friction - controls how much the car slides sideways
        const lateralVel = right.clone().multiplyScalar(this.velocity.dot(right));
        // When drifting: very little lateral grip = lots of slide
        // When normal: high lateral grip = car goes where it's pointing
        const lateralFriction = this.isHandbraking ? 0.01 : 0.2;
        this.velocity.sub(lateralVel.multiplyScalar(lateralFriction));
        
        // Update position
        this.mesh.position.add(this.velocity.clone().multiplyScalar(delta));
        
        // Keep on ground
        this.mesh.position.y = 0.5;
        
        // Rotate wheels
        const wheelRotation = currentSpeed * delta * 2;
        this.wheels.forEach(wheel => {
            wheel.rotation.x += wheelRotation;
        });
        
        // Update tail light brightness based on handbrake
        const tailIntensity = this.isHandbraking ? 2 : 0.5;
        this.leftTailLight.material.emissiveIntensity = tailIntensity;
        this.rightTailLight.material.emissiveIntensity = tailIntensity;
        
        // Update trail
        this.updateTrail();
    }
    
    checkOffTrack() {
        // Check if vehicle is on the track by checking distance to track path
        if (!this.game.track || !this.game.track.trackPath) return false;
        
        const pos = this.mesh.position;
        const trackWidth = this.game.track.trackWidth;
        
        // Find closest point on track
        let minDist = Infinity;
        for (const point of this.game.track.trackPath) {
            const dist = new THREE.Vector2(pos.x - point.x, pos.z - point.z).length();
            if (dist < minDist) {
                minDist = dist;
            }
        }
        
        // If further than track width, we're off-track
        return minDist > trackWidth / 2 + 1;
    }
    
    updateTrail() {
        // Add current position to trail
        this.trailPositions.unshift(this.mesh.position.clone());
        
        // Limit trail length
        if (this.trailPositions.length > this.maxTrailPoints) {
            this.trailPositions.pop();
        }
        
        // Update geometry
        const positions = this.trailGeometry.attributes.position.array;
        for (let i = 0; i < this.maxTrailPoints; i++) {
            if (i < this.trailPositions.length) {
                positions[i * 3] = this.trailPositions[i].x;
                positions[i * 3 + 1] = this.trailPositions[i].y;
                positions[i * 3 + 2] = this.trailPositions[i].z;
            }
        }
        this.trailGeometry.attributes.position.needsUpdate = true;
        this.trailGeometry.setDrawRange(0, this.trailPositions.length);
    }
    
    getForwardDirection() {
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(this.mesh.quaternion);
        return forward.normalize();
    }
    
    getSpeed() {
        return this.velocity.length();
    }
    
    reset() {
        this.mesh.position.copy(this.startPosition);
        this.mesh.rotation.copy(this.startRotation);
        this.velocity.set(0, 0, 0);
        this.steering = 0;
        this.trailPositions = [];
    }
}
