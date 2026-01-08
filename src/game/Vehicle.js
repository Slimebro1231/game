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
        // Create a stylized racing car with natural colors
        const group = new THREE.Group();
        
        // Main body material - warm cream/beige
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xf5e6d3,
            roughness: 0.4,
            metalness: 0.3,
        });
        
        // Accent - warm brown/bronze
        const accentMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b6914,
            emissive: 0x3d2a08,
            emissiveIntensity: 0.2,
            roughness: 0.5,
            metalness: 0.6
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
        
        // Hard top roof cabin
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: 0xf5e6d3,
            roughness: 0.4,
            metalness: 0.3
        });
        
        // Tinted window material
        const windowMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.1,
            metalness: 0.8,
            transparent: true,
            opacity: 0.85
        });
        
        // Roof box
        const roofGeo = new THREE.BoxGeometry(1.0, 0.35, 1.4);
        const roof = new THREE.Mesh(roofGeo, roofMaterial);
        roof.position.set(0, 0.75, -0.2);
        roof.castShadow = true;
        group.add(roof);
        
        // Front windshield (angled)
        const windshieldGeo = new THREE.BoxGeometry(0.9, 0.4, 0.08);
        const windshield = new THREE.Mesh(windshieldGeo, windowMaterial);
        windshield.position.set(0, 0.6, 0.55);
        windshield.rotation.x = 0.4;
        group.add(windshield);
        
        // Rear windshield
        const rearWindowGeo = new THREE.BoxGeometry(0.85, 0.35, 0.08);
        const rearWindow = new THREE.Mesh(rearWindowGeo, windowMaterial);
        rearWindow.position.set(0, 0.65, -0.95);
        rearWindow.rotation.x = -0.3;
        group.add(rearWindow);
        
        // Side windows (left)
        const sideWindowGeo = new THREE.BoxGeometry(0.06, 0.28, 0.9);
        const leftWindow = new THREE.Mesh(sideWindowGeo, windowMaterial);
        leftWindow.position.set(-0.52, 0.7, -0.2);
        group.add(leftWindow);
        
        // Side windows (right)
        const rightWindow = new THREE.Mesh(sideWindowGeo, windowMaterial);
        rightWindow.position.set(0.52, 0.7, -0.2);
        group.add(rightWindow);
        
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
            color: 0xc4a35a,
            roughness: 0.3,
            metalness: 0.8
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
        // Drift particles - sparks and smoke
        this.particles = [];
        this.maxParticles = 100;
        
        // Dirt particle material (brown dust)
        this.sparkMaterial = new THREE.PointsMaterial({
            color: 0x8b7355,
            size: 0.4,
            transparent: true,
            opacity: 0.7,
            blending: THREE.NormalBlending,
            depthWrite: false
        });
        
        // Dust cloud material (lighter brown)
        this.smokeMaterial = new THREE.PointsMaterial({
            color: 0xc4a574,
            size: 1.0,
            transparent: true,
            opacity: 0.35,
            blending: THREE.NormalBlending,
            depthWrite: false
        });
        
        // Create particle geometries
        this.sparkGeometry = new THREE.BufferGeometry();
        this.smokeGeometry = new THREE.BufferGeometry();
        
        const sparkPositions = new Float32Array(this.maxParticles * 3);
        const smokePositions = new Float32Array(this.maxParticles * 3);
        
        this.sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
        this.smokeGeometry.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
        
        this.sparkPoints = new THREE.Points(this.sparkGeometry, this.sparkMaterial);
        this.smokePoints = new THREE.Points(this.smokeGeometry, this.smokeMaterial);
        
        this.scene.add(this.sparkPoints);
        this.scene.add(this.smokePoints);
        
        // Particle data arrays
        this.sparkData = [];
        this.smokeData = [];
        
        for (let i = 0; i < this.maxParticles; i++) {
            this.sparkData.push({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0 });
            this.smokeData.push({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, size: 0 });
        }
        
        this.sparkIndex = 0;
        this.smokeIndex = 0;
    }
    
    emitDriftParticles() {
        if (!this.isHandbraking) return;
        
        const speed = this.velocity.length();
        if (speed < 5) return;
        
        // Emit from rear wheels
        const rearLeft = new THREE.Vector3(-0.8, 0.1, -1.2);
        const rearRight = new THREE.Vector3(0.8, 0.1, -1.2);
        
        rearLeft.applyQuaternion(this.mesh.quaternion);
        rearRight.applyQuaternion(this.mesh.quaternion);
        
        rearLeft.add(this.mesh.position);
        rearRight.add(this.mesh.position);
        
        // Sparks - fast, bright, short-lived
        for (let i = 0; i < 2; i++) {
            const spark = this.sparkData[this.sparkIndex];
            spark.pos.copy(i === 0 ? rearLeft : rearRight);
            spark.pos.x += (Math.random() - 0.5) * 0.3;
            spark.pos.z += (Math.random() - 0.5) * 0.3;
            spark.vel.set(
                (Math.random() - 0.5) * 3,
                Math.random() * 2 + 1,
                (Math.random() - 0.5) * 3
            );
            spark.life = 0.3 + Math.random() * 0.2;
            this.sparkIndex = (this.sparkIndex + 1) % this.maxParticles;
        }
        
        // Smoke - slow, soft, longer-lived
        const smoke = this.smokeData[this.smokeIndex];
        smoke.pos.copy(Math.random() > 0.5 ? rearLeft : rearRight);
        smoke.vel.set(
            (Math.random() - 0.5) * 0.5,
            Math.random() * 0.5 + 0.3,
            (Math.random() - 0.5) * 0.5
        );
        smoke.life = 1 + Math.random() * 0.5;
        smoke.size = 0.5 + Math.random() * 0.5;
        this.smokeIndex = (this.smokeIndex + 1) % this.maxParticles;
    }
    
    updateParticles(delta) {
        // Update sparks
        const sparkPositions = this.sparkGeometry.attributes.position.array;
        for (let i = 0; i < this.maxParticles; i++) {
            const spark = this.sparkData[i];
            if (spark.life > 0) {
                spark.life -= delta;
                spark.vel.y -= 9.8 * delta; // Gravity
                spark.pos.add(spark.vel.clone().multiplyScalar(delta));
                
                sparkPositions[i * 3] = spark.pos.x;
                sparkPositions[i * 3 + 1] = spark.pos.y;
                sparkPositions[i * 3 + 2] = spark.pos.z;
            } else {
                sparkPositions[i * 3 + 1] = -100; // Hide below ground
            }
        }
        this.sparkGeometry.attributes.position.needsUpdate = true;
        
        // Update smoke
        const smokePositions = this.smokeGeometry.attributes.position.array;
        for (let i = 0; i < this.maxParticles; i++) {
            const smoke = this.smokeData[i];
            if (smoke.life > 0) {
                smoke.life -= delta;
                smoke.pos.add(smoke.vel.clone().multiplyScalar(delta));
                smoke.vel.y += 0.5 * delta; // Rise
                
                smokePositions[i * 3] = smoke.pos.x;
                smokePositions[i * 3 + 1] = smoke.pos.y;
                smokePositions[i * 3 + 2] = smoke.pos.z;
            } else {
                smokePositions[i * 3 + 1] = -100;
            }
        }
        this.smokeGeometry.attributes.position.needsUpdate = true;
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
        
        // Emit and update drift particles
        this.emitDriftParticles();
        this.updateParticles(delta);
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
