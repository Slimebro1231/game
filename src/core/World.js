/**
 * World - Natural racing environment with stylized nature aesthetic
 * Features: Grass ground, trees, rocks, soft sky
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class World {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        
        this.isDark = false; // Default to light/natural theme
        this.time = 0;
        this.loadedAssets = {};
        this.scatteredObjects = [];
        
        this.loader = new GLTFLoader();
        
        this.createGround();
        this.createSky();
        this.loadNatureAssets();
    }
    
    createGround() {
        // Large grass ground plane
        const groundGeometry = new THREE.PlaneGeometry(800, 800, 80, 80);
        
        // Add vertex colors for natural gradient
        const colors = [];
        const positions = groundGeometry.attributes.position.array;
        
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 1];
            const dist = Math.sqrt(x * x + z * z);
            
            // Slight variation in grass color
            const noise = Math.random() * 0.1;
            const t = Math.min(dist / 400, 1);
            
            // Natural grass greens - lighter center, darker edges
            const r = 0.35 + noise * 0.1 - t * 0.1;
            const g = 0.55 + noise * 0.15 - t * 0.15;
            const b = 0.25 + noise * 0.05;
            
            colors.push(r, g, b);
        }
        
        groundGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        this.groundMaterial = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.9,
            metalness: 0.0,
            side: THREE.DoubleSide
        });
        
        this.ground = new THREE.Mesh(groundGeometry, this.groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = -0.05;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
    }
    
    createSky() {
        // Gradient sky dome
        const skyGeometry = new THREE.SphereGeometry(400, 32, 32);
        
        // Sky gradient shader
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x87ceeb) },    // Light blue
                bottomColor: { value: new THREE.Color(0xf5e6d3) }, // Warm beige horizon
                offset: { value: 20 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });
        
        this.sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(this.sky);
        
        // Set scene background and fog
        this.scene.background = new THREE.Color(0xf5e6d3);
        this.scene.fog = new THREE.Fog(0xf5e6d3, 150, 500);
        
        // Directional sunlight
        this.sunLight = new THREE.DirectionalLight(0xfff5e0, 1.2);
        this.sunLight.position.set(100, 150, 50);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 10;
        this.sunLight.shadow.camera.far = 500;
        this.sunLight.shadow.camera.left = -200;
        this.sunLight.shadow.camera.right = 200;
        this.sunLight.shadow.camera.top = 200;
        this.sunLight.shadow.camera.bottom = -200;
        this.scene.add(this.sunLight);
        
        // Warm ambient
        this.ambientLight = new THREE.AmbientLight(0xffeedd, 0.5);
        this.scene.add(this.ambientLight);
        
        // Hemisphere light for natural feel
        this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x7a9c59, 0.4);
        this.scene.add(this.hemiLight);
    }
    
    async loadNatureAssets() {
        // Dense forest - lots of trees
        const assetDefs = [
            { name: 'tree1', path: '/models/CommonTree_1.gltf', count: 50, scale: 3.5, isTree: true },
            { name: 'tree2', path: '/models/CommonTree_2.gltf', count: 45, scale: 3.5, isTree: true },
            { name: 'tree3', path: '/models/CommonTree_3.gltf', count: 40, scale: 3.0, isTree: true },
            { name: 'pine1', path: '/models/Pine_1.gltf', count: 50, scale: 4.0, isTree: true },
            { name: 'pine2', path: '/models/Pine_2.gltf', count: 40, scale: 3.5, isTree: true },
            { name: 'rock1', path: '/models/Rock_Medium_1.gltf', count: 20, scale: 1.5, isTree: false },
            { name: 'rock2', path: '/models/Rock_Medium_2.gltf', count: 15, scale: 1.2, isTree: false },
            { name: 'bush1', path: '/models/Bush_Common.gltf', count: 30, scale: 2.0, isTree: false },
        ];
        
        this.treeObjects = []; // Track trees separately for transparency
        
        // Load all assets
        for (const def of assetDefs) {
            try {
                const gltf = await this.loadAsset(def.path);
                if (gltf) {
                    this.loadedAssets[def.name] = { 
                        scene: gltf.scene, 
                        count: def.count, 
                        scale: def.scale,
                        isTree: def.isTree
                    };
                }
            } catch (e) {
                console.warn(`Could not load ${def.name}:`, e.message);
            }
        }
        
        // Scatter assets around the track
        this.scatterNatureObjects();
    }
    
    loadAsset(path) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                path,
                (gltf) => resolve(gltf),
                undefined,
                (error) => reject(error)
            );
        });
    }
    
    scatterNatureObjects() {
        const trackPath = this.game.track?.trackPath || [];
        const trackWidth = this.game.track?.trackWidth || 10;
        
        // Calculate bounding box of track
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        
        for (const point of trackPath) {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minZ = Math.min(minZ, point.z);
            maxZ = Math.max(maxZ, point.z);
        }
        
        // Expand bounds for scenery
        const padding = 80;
        minX -= padding; maxX += padding;
        minZ -= padding; maxZ += padding;
        
        // Place each asset type
        for (const [name, asset] of Object.entries(this.loadedAssets)) {
            for (let i = 0; i < asset.count; i++) {
                // Random position
                let x, z, attempts = 0;
                let validPosition = false;
                
                while (!validPosition && attempts < 20) {
                    x = minX + Math.random() * (maxX - minX);
                    z = minZ + Math.random() * (maxZ - minZ);
                    
                    // Check distance from track
                    let minDistToTrack = Infinity;
                    for (const point of trackPath) {
                        const dist = Math.sqrt((x - point.x) ** 2 + (z - point.z) ** 2);
                        minDistToTrack = Math.min(minDistToTrack, dist);
                    }
                    
                    // Trees closer to track edge, rocks can be closer
                    const minDist = name.includes('rock') ? trackWidth * 0.7 : trackWidth * 1.2;
                    
                    if (minDistToTrack > minDist) {
                        validPosition = true;
                    }
                    attempts++;
                }
                
                if (validPosition) {
                    const clone = asset.scene.clone();
                    
                    // Random scale variation
                    const scaleVar = asset.scale * (0.7 + Math.random() * 0.6);
                    clone.scale.set(scaleVar, scaleVar, scaleVar);
                    
                    // Random rotation
                    clone.rotation.y = Math.random() * Math.PI * 2;
                    
                    // Position
                    clone.position.set(x, 0, z);
                    
                    // Collect materials for trees (for transparency)
                    const materials = [];
                    clone.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            
                            // Make material support transparency for trees
                            if (asset.isTree) {
                                if (Array.isArray(child.material)) {
                                    child.material = child.material.map(m => {
                                        const newMat = m.clone();
                                        newMat.transparent = true;
                                        newMat.opacity = 1;
                                        materials.push(newMat);
                                        return newMat;
                                    });
                                } else {
                                    child.material = child.material.clone();
                                    child.material.transparent = true;
                                    child.material.opacity = 1;
                                    materials.push(child.material);
                                }
                            }
                        }
                    });
                    
                    this.scene.add(clone);
                    this.scatteredObjects.push(clone);
                    
                    // Track trees for transparency updates
                    if (asset.isTree) {
                        this.treeObjects.push({
                            object: clone,
                            materials: materials,
                            position: new THREE.Vector3(x, 0, z)
                        });
                    }
                }
            }
        }
        
        console.log(`Scattered ${this.scatteredObjects.length} nature objects (${this.treeObjects.length} trees)`);
    }
    
    updateTheme(isDark) {
        this.isDark = isDark;
        
        if (isDark) {
            // Dusk/evening theme
            this.scene.background = new THREE.Color(0x2a2820);
            this.scene.fog = new THREE.Fog(0x2a2820, 100, 400);
            
            this.sky.material.uniforms.topColor.value.setHex(0x1a1a2e);
            this.sky.material.uniforms.bottomColor.value.setHex(0x3d3428);
            
            this.sunLight.intensity = 0.4;
            this.sunLight.color.setHex(0xffd4a0);
            this.ambientLight.intensity = 0.2;
            this.hemiLight.intensity = 0.2;
            
        } else {
            // Bright daytime
            this.scene.background = new THREE.Color(0xf5e6d3);
            this.scene.fog = new THREE.Fog(0xf5e6d3, 150, 500);
            
            this.sky.material.uniforms.topColor.value.setHex(0x87ceeb);
            this.sky.material.uniforms.bottomColor.value.setHex(0xf5e6d3);
            
            this.sunLight.intensity = 1.2;
            this.sunLight.color.setHex(0xfff5e0);
            this.ambientLight.intensity = 0.5;
            this.hemiLight.intensity = 0.4;
        }
    }
    
    // Clear scattered objects (for map switching)
    clearScatteredObjects() {
        for (const obj of this.scatteredObjects) {
            this.scene.remove(obj);
            obj.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
        this.scatteredObjects = [];
        this.treeObjects = [];
    }
    
    // Re-scatter for new map
    rescatter() {
        this.clearScatteredObjects();
        if (Object.keys(this.loadedAssets).length > 0) {
            this.scatterNatureObjects();
        }
    }
    
    update(delta) {
        this.time += delta;
        
        // Update tree transparency based on camera line of sight
        this.updateTreeTransparency();
    }
    
    updateTreeTransparency() {
        if (!this.treeObjects || this.treeObjects.length === 0) return;
        if (!this.game.vehicle?.mesh || !this.game.camera) return;
        
        const carPos = this.game.vehicle.mesh.position;
        const camPos = this.game.camera.position;
        
        // Direction from camera to car
        const camToCarDir = new THREE.Vector3().subVectors(carPos, camPos).normalize();
        const camToCarDist = camPos.distanceTo(carPos);
        
        for (const tree of this.treeObjects) {
            // Vector from camera to tree
            const camToTree = new THREE.Vector3().subVectors(tree.position, camPos);
            const treeDistFromCam = camToTree.length();
            
            // Only check trees between camera and car
            if (treeDistFromCam > camToCarDist + 10) {
                // Tree is behind car, full opacity
                this.setTreeOpacity(tree, 1.0);
                continue;
            }
            
            // Project tree position onto camera-to-car line
            const projection = camToTree.dot(camToCarDir);
            
            if (projection < 0) {
                // Tree is behind camera
                this.setTreeOpacity(tree, 1.0);
                continue;
            }
            
            // Perpendicular distance from tree to line
            const closestPoint = camPos.clone().add(camToCarDir.clone().multiplyScalar(projection));
            const perpDist = tree.position.distanceTo(closestPoint);
            
            // If tree is close to the line of sight, make it transparent
            const fadeRadius = 15; // Trees within this radius of line get transparent
            if (perpDist < fadeRadius && projection > 5) {
                // Calculate opacity based on distance
                const opacity = Math.min(1, perpDist / fadeRadius);
                this.setTreeOpacity(tree, Math.max(0.2, opacity));
            } else {
                this.setTreeOpacity(tree, 1.0);
            }
        }
    }
    
    setTreeOpacity(tree, opacity) {
        for (const mat of tree.materials) {
            if (mat.opacity !== opacity) {
                mat.opacity = opacity;
                mat.needsUpdate = true;
            }
        }
    }
}
