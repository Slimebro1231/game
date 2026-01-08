/**
 * World - Stylized racing environment with cyberpunk aesthetic
 * Features: Black hole vortex, grid, particles, glow effects
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
        this.createStarfield();
        // this.createVortex(); // Disabled - camera angle doesn't show it well
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
    
    createStarfield() {
        // Create a dome of stars above the track
        const starCount = 2000;
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);
        
        for (let i = 0; i < starCount; i++) {
            // Distribute on a hemisphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.4; // Only upper hemisphere
            const radius = 300 + Math.random() * 100;
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.cos(phi) + 50; // Offset up
            positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
            
            // Color variation - white to cyan to pink
            const colorType = Math.random();
            if (colorType < 0.6) {
                // White
                colors[i * 3] = 0.9 + Math.random() * 0.1;
                colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
                colors[i * 3 + 2] = 0.9 + Math.random() * 0.1;
            } else if (colorType < 0.8) {
                // Cyan (accent color)
                colors[i * 3] = 0;
                colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
                colors[i * 3 + 2] = 0.5 + Math.random() * 0.3;
            } else {
                // Pink/purple
                colors[i * 3] = 0.8 + Math.random() * 0.2;
                colors[i * 3 + 1] = 0.3 + Math.random() * 0.3;
                colors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
            }
            
            // Random sizes with some bright stars
            sizes[i] = Math.random() < 0.05 ? 2 + Math.random() * 2 : 0.5 + Math.random() * 1;
        }
        
        const starGeometry = new THREE.BufferGeometry();
        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Custom shader for variable star sizes
        const starMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                attribute float size;
                varying vec3 vColor;
                uniform float time;
                
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    
                    // Twinkle effect
                    float twinkle = sin(time * 2.0 + position.x * 0.1) * 0.3 + 0.7;
                    
                    gl_PointSize = size * twinkle * (200.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                
                void main() {
                    // Circular point with soft edge
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;
                    
                    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(this.stars);
    }
    
    createVortex() {
        // Cyberpunk black hole / vortex effect in the sky
        const vortexVertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;
        
        const vortexFragmentShader = `
            uniform float time;
            uniform vec3 color1;
            uniform vec3 color2;
            uniform float isDark;
            varying vec2 vUv;
            
            #define PI 3.14159265359
            
            // Noise function
            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }
            
            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                float a = hash(i);
                float b = hash(i + vec2(1.0, 0.0));
                float c = hash(i + vec2(0.0, 1.0));
                float d = hash(i + vec2(1.0, 1.0));
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }
            
            void main() {
                vec2 uv = vUv - 0.5;
                float dist = length(uv);
                float angle = atan(uv.y, uv.x);
                
                // Swirl effect
                float swirl = angle + dist * 8.0 - time * 0.3;
                float spiral = sin(swirl * 6.0) * 0.5 + 0.5;
                
                // Radial rings
                float rings = sin(dist * 30.0 - time * 2.0) * 0.5 + 0.5;
                rings *= smoothstep(0.5, 0.1, dist);
                
                // Noise distortion
                float n = noise(uv * 10.0 + time * 0.5);
                
                // Black hole center
                float hole = smoothstep(0.02, 0.08, dist);
                
                // Event horizon glow
                float horizon = smoothstep(0.15, 0.05, dist) * smoothstep(0.0, 0.05, dist);
                
                // Combine effects
                float pattern = spiral * rings * hole;
                pattern += horizon * 2.0;
                pattern *= smoothstep(0.5, 0.2, dist);
                pattern += n * 0.1 * smoothstep(0.4, 0.1, dist);
                
                // Glitch lines (occasional)
                float glitch = step(0.98, sin(time * 20.0 + uv.y * 100.0));
                pattern += glitch * 0.3 * step(0.5, sin(time * 3.0));
                
                // Color mixing
                vec3 col = mix(color1, color2, pattern);
                col += horizon * color2 * 3.0;
                
                // Fade at edges
                float alpha = smoothstep(0.5, 0.3, dist) * 0.6 * isDark;
                
                gl_FragColor = vec4(col, alpha * pattern);
            }
        `;
        
        this.vortexMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color1: { value: new THREE.Color(0x0a0a15) },
                color2: { value: new THREE.Color(0x00ff88) },
                isDark: { value: 1.0 }
            },
            vertexShader: vortexVertexShader,
            fragmentShader: vortexFragmentShader,
            transparent: true,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        // Large plane in the sky
        const vortexGeometry = new THREE.PlaneGeometry(400, 400);
        this.vortex = new THREE.Mesh(vortexGeometry, this.vortexMaterial);
        this.vortex.position.set(0, 80, 0);
        this.vortex.rotation.x = -Math.PI / 2;
        this.scene.add(this.vortex);
        
        // Secondary smaller vortex rings
        for (let i = 0; i < 3; i++) {
            const ringGeometry = new THREE.RingGeometry(50 + i * 30, 55 + i * 30, 64);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ff88,
                transparent: true,
                opacity: 0.05 - i * 0.01,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.set(0, 75 - i * 5, 0);
            ring.rotation.x = -Math.PI / 2;
            ring.userData.rotationSpeed = 0.1 + i * 0.05;
            ring.userData.ringIndex = i;
            this.scene.add(ring);
            if (!this.vortexRings) this.vortexRings = [];
            this.vortexRings.push(ring);
        }
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
            
            // Vortex colors for dark theme
            if (this.vortexMaterial) {
                this.vortexMaterial.uniforms.color1.value.setHex(0x0a0a15);
                this.vortexMaterial.uniforms.color2.value.setHex(0x00ff88);
                this.vortexMaterial.uniforms.isDark.value = 1.0;
            }
            if (this.vortexRings) {
                this.vortexRings.forEach(r => r.material.color.setHex(0x00ff88));
            }
            
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
            
            // Vortex colors for light theme (subtle pink)
            if (this.vortexMaterial) {
                this.vortexMaterial.uniforms.color1.value.setHex(0xfff5f5);
                this.vortexMaterial.uniforms.color2.value.setHex(0xff6b9d);
                this.vortexMaterial.uniforms.isDark.value = 0.4;
            }
            if (this.vortexRings) {
                this.vortexRings.forEach(r => r.material.color.setHex(0xff6b9d));
            }
        }
    }
    
    update(delta) {
        this.time += delta;
        
        // Animate starfield twinkle
        if (this.stars && this.stars.material.uniforms) {
            this.stars.material.uniforms.time.value = this.time;
        }
        
        // Animate vortex shader
        if (this.vortexMaterial) {
            this.vortexMaterial.uniforms.time.value = this.time;
        }
        
        // Rotate vortex rings
        if (this.vortexRings) {
            this.vortexRings.forEach((ring, i) => {
                ring.rotation.z += delta * ring.userData.rotationSpeed * (i % 2 === 0 ? 1 : -1);
            });
        }
        
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
