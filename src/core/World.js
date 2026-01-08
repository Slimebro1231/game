/**
 * World - manages the environment (ground, skybox, decorations)
 * Nature theme with grass, trees, and natural elements
 */

import * as THREE from 'three';

export class World {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        
        this.isDark = true;
        
        this.createGround();
        this.createEnvironment();
    }
    
    createGround() {
        // Large grass ground plane
        const groundGeometry = new THREE.PlaneGeometry(500, 500, 50, 50);
        
        // Add slight height variation for natural feel
        const positions = groundGeometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] += (Math.random() - 0.5) * 0.3;
        }
        groundGeometry.computeVertexNormals();
        
        this.groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d5a27, // Grass green
            roughness: 0.9,
            metalness: 0.0
        });
        
        this.ground = new THREE.Mesh(groundGeometry, this.groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = -0.1;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
    }
    
    createEnvironment() {
        this.createTrees();
        this.createRocks();
        this.createGrassPatches();
    }
    
    createTrees() {
        // Simple low-poly trees
        this.trees = [];
        
        const treePositions = [];
        // Generate random positions away from track
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 55 + Math.random() * 40; // Outside track area
            treePositions.push([
                Math.cos(angle) * dist,
                0,
                Math.sin(angle) * dist
            ]);
        }
        
        treePositions.forEach(pos => {
            const tree = this.createTree();
            tree.position.set(pos[0], 0, pos[2]);
            tree.rotation.y = Math.random() * Math.PI * 2;
            tree.scale.setScalar(0.8 + Math.random() * 0.6);
            this.scene.add(tree);
            this.trees.push(tree);
        });
    }
    
    createTree() {
        const group = new THREE.Group();
        
        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 3, 6);
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a3728,
            roughness: 0.9
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 1.5;
        trunk.castShadow = true;
        group.add(trunk);
        
        // Foliage (cone shape)
        const foliageGeometry = new THREE.ConeGeometry(2, 5, 6);
        this.foliageMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a472a,
            roughness: 0.8
        });
        const foliage = new THREE.Mesh(foliageGeometry, this.foliageMaterial);
        foliage.position.y = 5;
        foliage.castShadow = true;
        group.add(foliage);
        
        return group;
    }
    
    createRocks() {
        // Simple low-poly rocks
        const rockPositions = [];
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 50 + Math.random() * 50;
            rockPositions.push([
                Math.cos(angle) * dist,
                0,
                Math.sin(angle) * dist
            ]);
        }
        
        this.rockMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.9,
            metalness: 0.1
        });
        
        rockPositions.forEach(pos => {
            const rockGeometry = new THREE.DodecahedronGeometry(0.5 + Math.random() * 1.5, 0);
            const rock = new THREE.Mesh(rockGeometry, this.rockMaterial);
            rock.position.set(pos[0], 0.3, pos[2]);
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            rock.scale.y = 0.5 + Math.random() * 0.5;
            rock.castShadow = true;
            rock.receiveShadow = true;
            this.scene.add(rock);
        });
    }
    
    createGrassPatches() {
        // Small grass tufts for detail
        const grassGeometry = new THREE.ConeGeometry(0.1, 0.5, 4);
        this.grassMaterial = new THREE.MeshStandardMaterial({
            color: 0x3d7a35,
            roughness: 0.9
        });
        
        for (let i = 0; i < 100; i++) {
            const x = (Math.random() - 0.5) * 150;
            const z = (Math.random() - 0.5) * 150;
            
            // Skip if too close to track center
            const distFromCenter = Math.sqrt(x * x + z * z);
            if (distFromCenter < 50) continue;
            
            const grass = new THREE.Mesh(grassGeometry, this.grassMaterial);
            grass.position.set(x, 0.25, z);
            grass.castShadow = true;
            this.scene.add(grass);
        }
    }
    
    updateTheme(isDark) {
        this.isDark = isDark;
        
        if (isDark) {
            // Dark theme - night colors
            this.scene.background = new THREE.Color(0x1a1a2e);
            this.scene.fog = new THREE.Fog(0x1a1a2e, 50, 200);
            this.groundMaterial.color.setHex(0x1a3318);
            if (this.foliageMaterial) this.foliageMaterial.color.setHex(0x0d2818);
            if (this.grassMaterial) this.grassMaterial.color.setHex(0x1a3318);
        } else {
            // Light theme - day colors
            this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
            this.scene.fog = new THREE.Fog(0x87ceeb, 80, 250);
            this.groundMaterial.color.setHex(0x4a8c3f);
            if (this.foliageMaterial) this.foliageMaterial.color.setHex(0x2d6b2d);
            if (this.grassMaterial) this.grassMaterial.color.setHex(0x5aa550);
        }
    }
    
    update(delta) {
        // Could animate trees swaying, etc.
    }
}
