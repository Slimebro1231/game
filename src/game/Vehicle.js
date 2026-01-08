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
        
        // Handbrake
        this.handbrakeMultiplier = 0.7;
        this.isHandbraking = false;
        
        // Start position
        this.startPosition = new THREE.Vector3(0, 0.5, 0);
        this.startRotation = new THREE.Euler(0, 0, 0);
        
        this.createMesh();
        this.createTrailEffect();
    }
    
    createMesh() {
        // Create a stylized low-poly car
        const group = new THREE.Group();
        
        // Car body - main chassis
        const bodyGeometry = new THREE.BoxGeometry(2, 0.6, 4);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff88,
            roughness: 0.3,
            metalness: 0.8,
            emissive: 0x00ff88,
            emissiveIntensity: 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.3;
        body.castShadow = true;
        group.add(body);
        
        // Cockpit
        const cockpitGeometry = new THREE.BoxGeometry(1.5, 0.5, 2);
        const cockpitMaterial = new THREE.MeshStandardMaterial({
            color: 0x003322,
            roughness: 0.1,
            metalness: 0.9
        });
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.position.set(0, 0.7, -0.3);
        cockpit.castShadow = true;
        group.add(cockpit);
        
        // Wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
        const wheelMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const wheelPositions = [
            [-0.9, 0, 1.3],  // Front left
            [0.9, 0, 1.3],   // Front right
            [-0.9, 0, -1.3], // Rear left
            [0.9, 0, -1.3]   // Rear right
        ];
        
        this.wheels = [];
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(pos[0], pos[1], pos[2]);
            wheel.castShadow = true;
            group.add(wheel);
            this.wheels.push(wheel);
        });
        
        // Headlights (emissive)
        const lightGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.1);
        const lightMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 1
        });
        
        const leftLight = new THREE.Mesh(lightGeometry, lightMaterial);
        leftLight.position.set(-0.6, 0.3, 2);
        group.add(leftLight);
        
        const rightLight = new THREE.Mesh(lightGeometry, lightMaterial);
        rightLight.position.set(0.6, 0.3, 2);
        group.add(rightLight);
        
        // Tail lights
        const tailLightMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });
        
        const leftTail = new THREE.Mesh(lightGeometry, tailLightMaterial);
        leftTail.position.set(-0.6, 0.3, -2);
        group.add(leftTail);
        this.leftTailLight = leftTail;
        
        const rightTail = new THREE.Mesh(lightGeometry, tailLightMaterial);
        rightTail.position.set(0.6, 0.3, -2);
        group.add(rightTail);
        this.rightTailLight = rightTail;
        
        // Debug: show forward direction
        // const arrowHelper = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), 3, 0xff0000);
        // group.add(arrowHelper);
        
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
        
        // Start race immediately on first update
        if (!this.game.raceStarted) {
            this.game.startRace();
        }
        
        // Get current forward direction
        const forward = this.getForwardDirection();
        const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
        
        // Calculate current speed in forward direction
        const currentSpeed = this.velocity.dot(forward);
        
        // AUTO-DRIVE: Always accelerating forward (unless braking)
        const isBraking = input.backward;
        
        if (!isBraking) {
            const accelForce = this.acceleration * delta;
            const accel = forward.clone().multiplyScalar(accelForce);
            this.velocity.add(accel);
        } else {
            // Braking - strong deceleration
            this.velocity.multiplyScalar(0.95);
        }
        
        // Handbrake/Space (for drifting)
        this.isHandbraking = input.handbrake;
        if (this.isHandbraking) {
            // Reduce grip, allow drifting
            const lateralVel = right.clone().multiplyScalar(this.velocity.dot(right));
            this.velocity.sub(lateralVel.multiplyScalar(0.05));
            // Slow down slightly
            this.velocity.multiplyScalar(0.97);
        }
        
        // Steering with A/D (always responsive)
        const steerAmount = Math.abs(currentSpeed) > 0.5 ? 1 : Math.max(0.3, Math.abs(currentSpeed) / 0.5);
        
        if (input.left) {
            this.steering = Math.min(this.steering + this.turnSpeed * delta * 1.5, this.maxSteering);
        } else if (input.right) {
            this.steering = Math.max(this.steering - this.turnSpeed * delta * 1.5, -this.maxSteering);
        } else {
            // Return steering to center
            this.steering *= 0.85;
        }
        
        // Apply steering rotation
        if (Math.abs(currentSpeed) > 0.1) {
            const turnAmount = this.steering * steerAmount;
            const driftMultiplier = this.isHandbraking ? this.handbrakeMultiplier : 1;
            this.mesh.rotation.y += turnAmount * delta * driftMultiplier;
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
        
        // Apply friction
        let frictionMultiplier = this.isHandbraking ? 0.99 : this.friction;
        if (offTrackFriction) {
            frictionMultiplier = 0.92; // High friction off-track
        }
        this.velocity.multiplyScalar(Math.pow(frictionMultiplier, delta * 60));
        
        // Lateral friction (prevent sliding sideways)
        if (!this.isHandbraking) {
            const lateralVel = right.clone().multiplyScalar(this.velocity.dot(right));
            this.velocity.sub(lateralVel.multiplyScalar(0.1));
        }
        
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
        
        // Check checkpoints
        this.checkCheckpoints();
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
    
    checkCheckpoints() {
        if (!this.game.track || !this.game.track.checkpoints) return;
        if (!this.game.raceStarted || this.game.raceFinished) return;
        
        const currentCheckpoint = this.game.currentCheckpoint;
        if (currentCheckpoint >= this.game.track.checkpoints.length) return;
        
        const checkpoint = this.game.track.checkpoints[currentCheckpoint];
        const pos2D = new THREE.Vector2(this.mesh.position.x, this.mesh.position.z);
        const cp2D = new THREE.Vector2(checkpoint.position.x, checkpoint.position.z);
        const distance = pos2D.distanceTo(cp2D);
        
        if (distance < checkpoint.radius) {
            this.game.passCheckpoint(currentCheckpoint);
        }
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
