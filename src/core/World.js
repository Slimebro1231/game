/**
 * World - Stylized racing environment with clean aesthetic
 * Inspired by modern minimalist design
 */

import * as THREE from 'three';

export class World {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        
        this.isDark = true;
        this.time = 0;
        
        this.createGround();
        this.createGrid();
        this.createAtmosphere();
        this.createAmbientParticles();
    }
    
    createGround() {
        // Large ground plane with subtle gradient effect via vertex colors
        const groundGeometry = new THREE.PlaneGeometry(600, 600, 100, 100);
        
        // Add vertex colors for radial gradient effect
        const colors = [];
        const positions = groundGeometry.attributes.position.array;
        
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 1]; // y in plane coords before rotation
            const dist = Math.sqrt(x * x + z * z);
            
            // Gradient from center to edges
            const t = Math.min(dist / 300, 1);
            
            // Dark theme: deep purple to darker purple
            const r = 0.08 + t * 0.02;
            const g = 0.08 + t * 0.01;
            const b = 0.15 + t * 0.05;
            
            colors.push(r, g, b);
        }
        
        groundGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        this.groundMaterial = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.95,
            metalness: 0.05,
            side: THREE.DoubleSide
        });
        
        this.ground = new THREE.Mesh(groundGeometry, this.groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = -0.05;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
    }
    
    createGrid() {
        // Subtle grid lines for visual interest
        const gridSize = 400;
        const gridDivisions = 40;
        
        this.gridHelper = new THREE.GridHelper(
            gridSize, 
            gridDivisions, 
            0x00ff88, // Center line color
            0x1a1a2e  // Grid color (subtle)
        );
        this.gridHelper.position.y = 0.01;
        this.gridHelper.material.opacity = 0.15;
        this.gridHelper.material.transparent = true;
        this.scene.add(this.gridHelper);
        
        // Secondary finer grid
        this.fineGrid = new THREE.GridHelper(
            gridSize,
            gridDivisions * 4,
            0x00ff88,
            0x222244
        );
        this.fineGrid.position.y = 0.005;
        this.fineGrid.material.opacity = 0.05;
        this.fineGrid.material.transparent = true;
        this.scene.add(this.fineGrid);
    }
    
    createAtmosphere() {
        // Ambient glow spheres at far corners
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.03
        });
        
        const glowPositions = [
            [150, 20, 150],
            [-150, 20, 150],
            [150, 20, -150],
            [-150, 20, -150],
        ];
        
        this.glowSpheres = [];
        glowPositions.forEach(pos => {
            const sphere = new THREE.Mesh(
                new THREE.SphereGeometry(40, 16, 16),
                glowMaterial.clone()
            );
            sphere.position.set(pos[0], pos[1], pos[2]);
            this.scene.add(sphere);
            this.glowSpheres.push(sphere);
        });
        
        // Horizon glow ring
        const ringGeometry = new THREE.TorusGeometry(250, 2, 8, 64);
        this.horizonRing = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.1
        }));
        this.horizonRing.rotation.x = Math.PI / 2;
        this.horizonRing.position.y = 0.5;
        this.scene.add(this.horizonRing);
    }
    
    createAmbientParticles() {
        // Floating particles for atmosphere
        const particleCount = 200;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 300;
            positions[i * 3 + 1] = Math.random() * 50 + 5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 300;
            
            // Green-cyan color variation
            colors[i * 3] = 0;
            colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
            colors[i * 3 + 2] = 0.5 + Math.random() * 0.3;
        }
        
        const particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        this.particles = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(this.particles);
        
        this.particlePositions = positions;
    }
    
    updateTheme(isDark) {
        this.isDark = isDark;
        
        if (isDark) {
            // Dark theme - deep space feel
            this.scene.background = new THREE.Color(0x0a0a15);
            this.scene.fog = new THREE.Fog(0x0a0a15, 80, 300);
            
            this.gridHelper.material.opacity = 0.15;
            this.fineGrid.material.opacity = 0.05;
            
            this.glowSpheres.forEach(s => {
                s.material.color.setHex(0x00ff88);
                s.material.opacity = 0.03;
            });
            this.horizonRing.material.color.setHex(0x00ff88);
            this.horizonRing.material.opacity = 0.1;
            
        } else {
            // Light theme - clean white/pink aesthetic
            this.scene.background = new THREE.Color(0xfff5f5);
            this.scene.fog = new THREE.Fog(0xfff5f5, 100, 350);
            
            this.gridHelper.material.opacity = 0.1;
            this.gridHelper.material.color.setHex(0xff6b9d);
            this.fineGrid.material.opacity = 0.03;
            this.fineGrid.material.color.setHex(0xff6b9d);
            
            this.glowSpheres.forEach(s => {
                s.material.color.setHex(0xff6b9d);
                s.material.opacity = 0.02;
            });
            this.horizonRing.material.color.setHex(0xff6b9d);
            this.horizonRing.material.opacity = 0.08;
        }
    }
    
    update(delta) {
        this.time += delta;
        
        // Animate particles slowly floating
        if (this.particles && this.particlePositions) {
            const positions = this.particles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] += Math.sin(this.time + i) * 0.01;
                
                // Wrap around
                if (positions[i + 1] > 55) positions[i + 1] = 5;
                if (positions[i + 1] < 5) positions[i + 1] = 55;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
        }
        
        // Pulse glow spheres
        this.glowSpheres.forEach((sphere, i) => {
            const pulse = Math.sin(this.time * 0.5 + i) * 0.01 + 0.03;
            sphere.material.opacity = this.isDark ? pulse : pulse * 0.5;
        });
        
        // Rotate horizon ring slowly
        this.horizonRing.rotation.z += delta * 0.02;
    }
}
