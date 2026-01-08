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
        this.trackPieces = [];
        
        // Generate spline from control points
        this.generateSpline();
        
        // Create track visuals
        this.createTrack();
        this.createStartFinish();
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
        const trackMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.9,
            metalness: 0.1,
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
            this.scene.add(mesh);
            this.trackPieces.push(mesh);
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
                this.scene.add(mesh);
            }
        }
    }
    
    createCurbs() {
        const redMaterial = new THREE.MeshStandardMaterial({ color: 0xff3333, side: THREE.DoubleSide });
        const whiteMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        
        const halfWidth = this.trackWidth / 2;
        const curbWidth = 0.8;
        
        for (const side of [1, -1]) {
            for (let i = 0; i < this.trackPath.length - 1; i++) {
                const current = this.trackPath[i];
                const next = this.trackPath[i + 1];
                
                const direction = new THREE.Vector3().subVectors(next, current).normalize();
                const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
                
                const outerOffset = (halfWidth + curbWidth) * side;
                const innerOffset = halfWidth * side;
                
                const p1 = current.clone().add(perpendicular.clone().multiplyScalar(outerOffset));
                const p2 = current.clone().add(perpendicular.clone().multiplyScalar(innerOffset));
                const p3 = next.clone().add(perpendicular.clone().multiplyScalar(innerOffset));
                const p4 = next.clone().add(perpendicular.clone().multiplyScalar(outerOffset));
                
                const material = (i % 2 === 0) ? redMaterial : whiteMaterial;
                
                const geometry = new THREE.BufferGeometry();
                const vertices = new Float32Array([
                    p1.x, 0.015, p1.z,
                    p2.x, 0.015, p2.z,
                    p3.x, 0.015, p3.z,
                    p4.x, 0.015, p4.z
                ]);
                geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
                geometry.setIndex([0, 1, 2, 0, 2, 3]);
                geometry.computeVertexNormals();
                
                const mesh = new THREE.Mesh(geometry, material);
                this.scene.add(mesh);
            }
        }
    }
    
    createStartFinish() {
        // START: Use first track point, direction from first to second
        const startPoint = this.trackPath[0];
        const startNext = this.trackPath[1];
        const startDir = new THREE.Vector3().subVectors(startNext, startPoint).normalize();
        
        // Create START line (green) slightly before first point
        const startLinePos = startPoint.clone().sub(startDir.clone().multiplyScalar(2));
        this.createLineMark(startLinePos, startDir, 0x00ff00, 'START');
        
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
        
        this.scene.add(mesh);
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
                
                this.scene.add(square);
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
