/**
 * Track - manages the race track geometry and checkpoints
 */

import * as THREE from 'three';

export class Track {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        
        // Track configuration
        this.trackWidth = 8;
        this.checkpoints = [];
        this.trackPieces = [];
        
        // Create track
        this.createTrack();
        this.createCheckpoints();
    }
    
    createTrack() {
        // Simple oval/circuit track using path
        const trackPoints = this.generateTrackPath();
        this.trackPath = trackPoints;
        
        // Create track surface
        this.createTrackSurface(trackPoints);
        
        // Create track borders/curbs
        this.createTrackBorders(trackPoints);
        
        // Create grass/off-track areas with high friction
        this.createOffTrackAreas();
    }
    
    createOffTrackAreas() {
        // Visual grass areas around track
        // The friction is handled in Vehicle.js by checking distance from track
    }
    
    generateTrackPath() {
        // Generate a circuit-style track path
        const points = [];
        const segments = 64;
        
        // Oval with some variation
        for (let i = 0; i <= segments; i++) {
            const t = (i / segments) * Math.PI * 2;
            
            // Base oval shape
            let x = Math.sin(t) * 40;
            let z = Math.cos(t) * 25;
            
            // Add some variation
            x += Math.sin(t * 3) * 5;
            z += Math.cos(t * 2) * 3;
            
            points.push(new THREE.Vector3(x, 0, z));
        }
        
        return points;
    }
    
    createTrackSurface(points) {
        // Create track as a continuous mesh - asphalt road
        const trackMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444, // Dark asphalt gray
            roughness: 0.85,
            metalness: 0.0
        });
        
        // Build continuous track geometry
        const vertices = [];
        const indices = [];
        const halfWidth = this.trackWidth / 2;
        
        for (let i = 0; i < points.length; i++) {
            const current = points[i];
            const next = points[(i + 1) % points.length];
            
            // Calculate perpendicular direction
            const direction = new THREE.Vector3().subVectors(next, current).normalize();
            const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
            
            // Add left and right vertices
            const left = current.clone().add(perpendicular.clone().multiplyScalar(halfWidth));
            const right = current.clone().add(perpendicular.clone().multiplyScalar(-halfWidth));
            
            vertices.push(left.x, 0.02, left.z);
            vertices.push(right.x, 0.02, right.z);
        }
        
        // Create indices for triangles
        for (let i = 0; i < points.length - 1; i++) {
            const idx = i * 2;
            // First triangle
            indices.push(idx, idx + 1, idx + 2);
            // Second triangle
            indices.push(idx + 1, idx + 3, idx + 2);
        }
        // Close the loop
        const lastIdx = (points.length - 1) * 2;
        indices.push(lastIdx, lastIdx + 1, 0);
        indices.push(lastIdx + 1, 1, 0);
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        const trackMesh = new THREE.Mesh(geometry, trackMaterial);
        trackMesh.receiveShadow = true;
        this.scene.add(trackMesh);
        this.trackPieces.push(trackMesh);
        
        // Add white edge lines
        this.createEdgeLines(points);
    }
    
    createEdgeLines(points) {
        const lineMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.5
        });
        
        const halfWidth = this.trackWidth / 2;
        const lineWidth = 0.15;
        
        // Create edge line geometry
        for (const side of [1, -1]) {
            const lineVertices = [];
            const lineIndices = [];
            
            for (let i = 0; i < points.length; i++) {
                const current = points[i];
                const next = points[(i + 1) % points.length];
                
                const direction = new THREE.Vector3().subVectors(next, current).normalize();
                const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
                
                const outer = current.clone().add(perpendicular.clone().multiplyScalar(side * halfWidth));
                const inner = current.clone().add(perpendicular.clone().multiplyScalar(side * (halfWidth - lineWidth)));
                
                lineVertices.push(outer.x, 0.03, outer.z);
                lineVertices.push(inner.x, 0.03, inner.z);
            }
            
            for (let i = 0; i < points.length - 1; i++) {
                const idx = i * 2;
                lineIndices.push(idx, idx + 1, idx + 2);
                lineIndices.push(idx + 1, idx + 3, idx + 2);
            }
            
            const lineGeometry = new THREE.BufferGeometry();
            lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));
            lineGeometry.setIndex(lineIndices);
            lineGeometry.computeVertexNormals();
            
            const lineMesh = new THREE.Mesh(lineGeometry, lineMaterial);
            this.scene.add(lineMesh);
        }
    }
    
    createTrackBorders(points) {
        // Simple edge markers - small rocks/stones along track edges
        const rockMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.9
        });
        
        // Place rocks every few segments
        for (let i = 0; i < points.length - 1; i += 4) {
            const current = points[i];
            const next = points[Math.min(i + 1, points.length - 1)];
            
            const direction = new THREE.Vector3().subVectors(next, current).normalize();
            const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
            
            const halfWidth = this.trackWidth / 2;
            
            // Outer edge rock
            const outerPos = current.clone().add(perpendicular.clone().multiplyScalar(halfWidth + 0.5));
            const outerRock = new THREE.Mesh(
                new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.2, 0),
                rockMaterial
            );
            outerRock.position.copy(outerPos);
            outerRock.position.y = 0.15;
            outerRock.rotation.set(Math.random(), Math.random(), Math.random());
            this.scene.add(outerRock);
            
            // Inner edge rock
            const innerPos = current.clone().add(perpendicular.clone().multiplyScalar(-halfWidth - 0.5));
            const innerRock = new THREE.Mesh(
                new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.2, 0),
                rockMaterial
            );
            innerRock.position.copy(innerPos);
            innerRock.position.y = 0.15;
            innerRock.rotation.set(Math.random(), Math.random(), Math.random());
            this.scene.add(innerRock);
        }
    }
    
    createCheckpoints() {
        // Create checkpoints around the track (invisible - just collision zones)
        const numCheckpoints = 8;
        const step = Math.floor(this.trackPath.length / numCheckpoints);
        
        for (let i = 0; i < numCheckpoints; i++) {
            const index = i * step;
            const point = this.trackPath[index];
            
            // Checkpoint data (invisible)
            const checkpoint = {
                position: point.clone(),
                radius: 8, // Larger detection radius
                index: i
            };
            this.checkpoints.push(checkpoint);
            
            // Add finish line marker for the last checkpoint
            if (i === numCheckpoints - 1) {
                this.createFinishLine(point, index);
            }
        }
        
        // Update UI
        this.game.ui.updateCheckpoint(0, this.checkpoints.length);
    }
    
    createFinishLine(position, pathIndex) {
        // Create a checkered finish line pattern on the track
        const next = this.trackPath[(pathIndex + 1) % this.trackPath.length];
        const direction = new THREE.Vector3().subVectors(next, position).normalize();
        const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
        
        const finishMaterial1 = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const finishMaterial2 = new THREE.MeshStandardMaterial({ color: 0x222222 });
        
        const squareSize = 1;
        const numSquares = Math.floor(this.trackWidth / squareSize);
        
        for (let i = 0; i < numSquares; i++) {
            for (let j = 0; j < 2; j++) {
                const material = (i + j) % 2 === 0 ? finishMaterial1 : finishMaterial2;
                const square = new THREE.Mesh(
                    new THREE.PlaneGeometry(squareSize, squareSize),
                    material
                );
                
                const offset = perpendicular.clone().multiplyScalar((i - numSquares / 2 + 0.5) * squareSize);
                const forwardOffset = direction.clone().multiplyScalar(j * squareSize - squareSize / 2);
                
                square.position.copy(position).add(offset).add(forwardOffset);
                square.position.y = 0.04;
                square.rotation.x = -Math.PI / 2;
                
                this.scene.add(square);
            }
        }
    }
}
