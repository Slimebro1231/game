/**
 * Track - Spline-based track system supporting multiple maps
 * All maps are point-to-point (lap maps just have start ≈ finish)
 */

import * as THREE from 'three';
import { MAPS, getAvailableMaps } from './MapData.js';

export class Track {
    constructor(game, mapId = 'test-short') {
        this.game = game;
        this.scene = game.scene;
        this.mapId = mapId;
        this.mapData = MAPS[mapId] || MAPS['test-short'];
        
        this.trackWidth = 10;
        this.trackPieces = []; // All track meshes for cleanup
        
        // Generate spline from control points
        this.generateSpline();
        
        // Create track visuals
        this.createTrack();
        this.createStartFinish();
    }
    
    // Add mesh and track it for cleanup
    addTrackMesh(mesh) {
        mesh.userData.isTrack = true;
        this.scene.add(mesh);
        this.trackPieces.push(mesh);
    }
    
    // Cleanup all track meshes
    destroy() {
        for (const mesh of this.trackPieces) {
            this.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => m.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
        }
        this.trackPieces = [];
    }
    
    generateSpline() {
        // Convert control points to THREE.Vector3
        const points = this.mapData.controlPoints.map(p => 
            new THREE.Vector3(p.x, 0, p.z)
        );
        
        // Create smooth spline curve
        this.spline = new THREE.CatmullRomCurve3(points, this.mapData.isLoop, 'catmullrom', 0.5);
        
        // Sample spline at regular intervals for track path
        const numSamples = Math.max(100, points.length * 20);
        this.trackPath = [];
        
        for (let i = 0; i <= numSamples; i++) {
            const t = i / numSamples;
            const point = this.spline.getPoint(t);
            this.trackPath.push(point);
        }
        
        console.log(`Track "${this.mapData.name}": ${this.trackPath.length} path points`);
    }
    
    createTrack() {
        // Natural dirt/gravel track color
        const trackMaterial = new THREE.MeshStandardMaterial({
            color: 0x6b5a48,
            roughness: 0.85,
            metalness: 0.0,
            side: THREE.DoubleSide
        });
        
        const halfWidth = this.trackWidth / 2;
        
        for (let i = 0; i < this.trackPath.length - 1; i++) {
            const current = this.trackPath[i];
            const next = this.trackPath[i + 1];
            
            const direction = new THREE.Vector3().subVectors(next, current).normalize();
            const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
            
            const p1 = current.clone().add(perpendicular.clone().multiplyScalar(halfWidth));
            const p2 = current.clone().add(perpendicular.clone().multiplyScalar(-halfWidth));
            const p3 = next.clone().add(perpendicular.clone().multiplyScalar(-halfWidth));
            const p4 = next.clone().add(perpendicular.clone().multiplyScalar(halfWidth));
            
            const geometry = new THREE.BufferGeometry();
            const vertices = new Float32Array([
                p1.x, 0.01, p1.z,
                p2.x, 0.01, p2.z,
                p3.x, 0.01, p3.z,
                p4.x, 0.01, p4.z
            ]);
            geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            geometry.setIndex([0, 1, 2, 0, 2, 3]);
            geometry.computeVertexNormals();
            
            const mesh = new THREE.Mesh(geometry, trackMaterial);
            mesh.receiveShadow = true;
            this.addTrackMesh(mesh);
        }
        
        // Add edge lines and curbs
        this.createEdgeLines();
        this.createCurbs();
    }
    
    createEdgeLines() {
        const lineMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide
        });
        
        const halfWidth = this.trackWidth / 2;
        const lineWidth = 0.3;
        
        for (const side of [1, -1]) {
            for (let i = 0; i < this.trackPath.length - 1; i++) {
                const current = this.trackPath[i];
                const next = this.trackPath[i + 1];
                
                const direction = new THREE.Vector3().subVectors(next, current).normalize();
                const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
                
                const edgeOffset = halfWidth * side;
                const innerOffset = (halfWidth - lineWidth) * side;
                
                const p1 = current.clone().add(perpendicular.clone().multiplyScalar(edgeOffset));
                const p2 = current.clone().add(perpendicular.clone().multiplyScalar(innerOffset));
                const p3 = next.clone().add(perpendicular.clone().multiplyScalar(innerOffset));
                const p4 = next.clone().add(perpendicular.clone().multiplyScalar(edgeOffset));
                
                const geometry = new THREE.BufferGeometry();
                const vertices = new Float32Array([
                    p1.x, 0.02, p1.z,
                    p2.x, 0.02, p2.z,
                    p3.x, 0.02, p3.z,
                    p4.x, 0.02, p4.z
                ]);
                geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
                geometry.setIndex([0, 1, 2, 0, 2, 3]);
                geometry.computeVertexNormals();
                
                const mesh = new THREE.Mesh(geometry, lineMaterial);
                this.addTrackMesh(mesh);
            }
        }
    }
    
    createCurbs() {
        // Create elevated semicircular curbs as continuous meshes
        const halfWidth = this.trackWidth / 2;
        const curbWidth = 1.0;
        const curbHeight = 0.25;
        const curbSegments = 6; // Segments for semicircle profile
        
        // Material with vertex colors for stripes
        const curbMaterial = new THREE.MeshStandardMaterial({ 
            vertexColors: true,
            roughness: 0.7,
            metalness: 0.1
        });
        
        // Colors for stripes
        const color1 = new THREE.Color(0x8b4513); // Brown
        const color2 = new THREE.Color(0xf5e6d3); // Cream
        
        for (const side of [1, -1]) {
            const vertices = [];
            const colors = [];
            const indices = [];
            
            const pathLen = this.trackPath.length;
            
            for (let i = 0; i < pathLen; i++) {
                const current = this.trackPath[i];
                const next = this.trackPath[(i + 1) % pathLen];
                const prev = this.trackPath[(i - 1 + pathLen) % pathLen];
                
                // Average direction for smooth transitions
                const dirNext = new THREE.Vector3().subVectors(next, current).normalize();
                const dirPrev = new THREE.Vector3().subVectors(current, prev).normalize();
                const direction = new THREE.Vector3().addVectors(dirNext, dirPrev).normalize();
                
                const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(side);
                
                // Base position at track edge
                const basePos = current.clone().add(perpendicular.clone().multiplyScalar(halfWidth));
                
                // Stripe color based on distance along track
                const stripeIndex = Math.floor(i / 3); // Change color every 3 segments
                const stripeColor = (stripeIndex % 2 === 0) ? color1 : color2;
                
                // Create semicircular profile points
                for (let j = 0; j <= curbSegments; j++) {
                    const angle = (j / curbSegments) * Math.PI; // 0 to PI for semicircle
                    const localX = Math.cos(angle) * curbWidth * 0.5; // Horizontal offset
                    const localY = Math.sin(angle) * curbHeight; // Vertical offset
                    
                    // Position in world space
                    const offset = perpendicular.clone().multiplyScalar(localX + curbWidth * 0.5);
                    const x = basePos.x + offset.x;
                    const y = localY;
                    const z = basePos.z + offset.z;
                    
                    vertices.push(x, y, z);
                    colors.push(stripeColor.r, stripeColor.g, stripeColor.b);
                }
            }
            
            // Create indices for the mesh (connect profile rings)
            const vertsPerRing = curbSegments + 1;
            for (let i = 0; i < pathLen - 1; i++) {
                for (let j = 0; j < curbSegments; j++) {
                    const a = i * vertsPerRing + j;
                    const b = i * vertsPerRing + j + 1;
                    const c = (i + 1) * vertsPerRing + j;
                    const d = (i + 1) * vertsPerRing + j + 1;
                    
                    // Two triangles per quad
                    indices.push(a, c, b);
                    indices.push(b, c, d);
                }
            }
            
            // Close the loop if it's a loop track
            if (this.mapData.isLoop) {
                const lastRing = (pathLen - 1) * vertsPerRing;
                for (let j = 0; j < curbSegments; j++) {
                    const a = lastRing + j;
                    const b = lastRing + j + 1;
                    const c = j;
                    const d = j + 1;
                    
                    indices.push(a, c, b);
                    indices.push(b, c, d);
                }
            }
            
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geometry.setIndex(indices);
            geometry.computeVertexNormals();
            
            const mesh = new THREE.Mesh(geometry, curbMaterial);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.addTrackMesh(mesh);
        }
    }
    
    createStartFinish() {
        // START: Use first track point, direction from first to second
        const startPoint = this.trackPath[0];
        const startNext = this.trackPath[1];
        const startDir = new THREE.Vector3().subVectors(startNext, startPoint).normalize();
        
        // Create START line (warm gold) slightly before first point
        const startLinePos = startPoint.clone().sub(startDir.clone().multiplyScalar(2));
        this.createLineMark(startLinePos, startDir, 0xc4a35a, 'START');
        
        // FINISH: Use last track point
        const finishPoint = this.trackPath[this.trackPath.length - 1];
        const finishPrev = this.trackPath[this.trackPath.length - 2];
        const finishDir = new THREE.Vector3().subVectors(finishPoint, finishPrev).normalize();
        
        // Create FINISH line (checkered)
        this.createCheckeredLine(finishPoint, finishDir);
        
        // Store positions for game logic - car starts AT first track point
        this.startPos = startPoint.clone();
        this.startDir = startDir.clone();
        this.finishLinePos = finishPoint.clone();
        this.finishLineDir = finishDir.clone();
        
        console.log('Track start:', this.startPos.x.toFixed(1), this.startPos.z.toFixed(1));
        console.log('Track finish:', this.finishLinePos.x.toFixed(1), this.finishLinePos.z.toFixed(1));
        console.log('Start direction:', this.startDir.x.toFixed(2), this.startDir.z.toFixed(2));
    }
    
    createLineMark(position, direction, color, label) {
        const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
        const material = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide });
        
        const lineWidth = this.trackWidth;
        const lineDepth = 0.5;
        
        const geometry = new THREE.PlaneGeometry(lineWidth, lineDepth);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.position.y = 0.03;
        mesh.rotation.x = -Math.PI / 2;
        mesh.rotation.z = Math.atan2(perpendicular.x, perpendicular.z);
        
        this.addTrackMesh(mesh);
    }
    
    createCheckeredLine(position, direction) {
        const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, side: THREE.DoubleSide });
        
        const squareSize = 1.2;
        const numSquaresWidth = Math.floor(this.trackWidth / squareSize);
        const numSquaresDepth = 3;
        
        for (let i = 0; i < numSquaresWidth; i++) {
            for (let j = 0; j < numSquaresDepth; j++) {
                const material = (i + j) % 2 === 0 ? whiteMat : blackMat;
                
                const square = new THREE.Mesh(
                    new THREE.PlaneGeometry(squareSize, squareSize),
                    material
                );
                
                const offsetPerp = perpendicular.clone().multiplyScalar((i - numSquaresWidth / 2 + 0.5) * squareSize);
                const offsetDir = direction.clone().multiplyScalar((j - numSquaresDepth / 2 + 0.5) * squareSize);
                
                square.position.copy(position).add(offsetPerp).add(offsetDir);
                square.position.y = 0.03;
                square.rotation.x = -Math.PI / 2;
                
                this.addTrackMesh(square);
            }
        }
    }
    
    // Get map ID for leaderboard separation
    getMapId() {
        return this.mapId;
    }
    
    // Static method to get available maps
    static getAvailableMaps() {
        return getAvailableMaps();
    }
}
