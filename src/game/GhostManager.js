/**
 * GhostManager - manages ghost replays and leaderboard
 */

import * as THREE from 'three';

export class GhostManager {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        
        this.ghosts = [];
        this.ghostMeshes = [];
        this.maxGhosts = 5; // Show top 5 ghosts
        
        // Ghost material (transparent)
        this.ghostMaterial = new THREE.MeshStandardMaterial({
            color: 0x8888ff,
            transparent: true,
            opacity: 0.3,
            emissive: 0x4444ff,
            emissiveIntensity: 0.2
        });
        
        // Load ghosts from leaderboard (placeholder)
        this.loadLeaderboard();
    }
    
    async loadLeaderboard() {
        // TODO: Load from Firebase
        // Start with empty leaderboard - no demo ghosts
        this.leaderboardData = [];
        
        // Update UI
        this.game.ui.updateLeaderboard([]);
    }
    
    generateDemoGhost() {
        // Generate a demo ghost recording that follows the track roughly
        const recording = [];
        const trackPoints = [];
        
        // Generate oval path similar to track
        for (let i = 0; i <= 200; i++) {
            const t = (i / 200) * Math.PI * 2;
            const x = Math.sin(t) * 40 + Math.sin(t * 3) * 5;
            const z = Math.cos(t) * 25 + Math.cos(t * 2) * 3;
            trackPoints.push(new THREE.Vector3(x, 0.5, z));
        }
        
        // Create recording with timing
        const totalTime = 50000; // 50 seconds
        const interval = 50; // 50ms intervals
        
        for (let time = 0; time < totalTime; time += interval) {
            const progress = time / totalTime;
            const index = Math.floor(progress * (trackPoints.length - 1));
            const position = trackPoints[index].clone();
            
            // Calculate rotation based on direction
            const nextIndex = Math.min(index + 1, trackPoints.length - 1);
            const direction = new THREE.Vector3().subVectors(trackPoints[nextIndex], position);
            const rotation = new THREE.Euler(0, Math.atan2(direction.x, direction.z), 0);
            
            recording.push({
                time: time,
                position: position,
                rotation: rotation,
                velocity: new THREE.Vector3(0, 0, 5)
            });
        }
        
        return recording;
    }
    
    createGhostMeshes() {
        // Remove existing ghosts
        this.ghostMeshes.forEach(mesh => {
            this.scene.remove(mesh);
        });
        this.ghostMeshes = [];
        
        // Create mesh for each ghost
        const ghostsToShow = this.leaderboardData.slice(0, this.maxGhosts);
        
        ghostsToShow.forEach((ghostData, index) => {
            const ghost = this.createGhostMesh(index);
            ghost.userData.recording = ghostData.recording;
            ghost.userData.name = ghostData.name;
            this.ghostMeshes.push(ghost);
            this.scene.add(ghost);
        });
    }
    
    createGhostMesh(index) {
        // Create simplified ghost car mesh
        const group = new THREE.Group();
        
        // Vary color slightly for each ghost
        const hue = 0.6 + (index * 0.05);
        const color = new THREE.Color().setHSL(hue, 0.5, 0.5);
        
        const material = new THREE.MeshStandardMaterial({
            color: color,
            transparent: true,
            opacity: 0.25,
            emissive: color,
            emissiveIntensity: 0.1
        });
        
        // Simple car shape
        const bodyGeometry = new THREE.BoxGeometry(2, 0.6, 4);
        const body = new THREE.Mesh(bodyGeometry, material);
        body.position.y = 0.3;
        group.add(body);
        
        // Cockpit
        const cockpitGeometry = new THREE.BoxGeometry(1.5, 0.4, 2);
        const cockpit = new THREE.Mesh(cockpitGeometry, material);
        cockpit.position.set(0, 0.6, -0.3);
        group.add(cockpit);
        
        // Make invisible initially
        group.visible = false;
        
        return group;
    }
    
    update(raceTime) {
        // Update each ghost position based on recording
        this.ghostMeshes.forEach(ghost => {
            if (!ghost.userData.recording) return;
            
            const recording = ghost.userData.recording;
            
            // Find the appropriate frame in recording
            const frame = this.getFrameAtTime(recording, raceTime);
            
            if (frame) {
                ghost.visible = true;
                ghost.position.copy(frame.position);
                ghost.rotation.copy(frame.rotation);
            } else {
                ghost.visible = false;
            }
        });
    }
    
    getFrameAtTime(recording, time) {
        if (!recording || recording.length === 0) return null;
        
        // Binary search for frame
        let low = 0;
        let high = recording.length - 1;
        
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (recording[mid].time < time) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        
        // Interpolate between frames for smooth motion
        if (low > 0 && low < recording.length) {
            const prev = recording[low - 1];
            const next = recording[low];
            const t = (time - prev.time) / (next.time - prev.time);
            
            return {
                position: new THREE.Vector3().lerpVectors(prev.position, next.position, t),
                rotation: new THREE.Euler(
                    prev.rotation.x + (next.rotation.x - prev.rotation.x) * t,
                    prev.rotation.y + (next.rotation.y - prev.rotation.y) * t,
                    prev.rotation.z + (next.rotation.z - prev.rotation.z) * t
                )
            };
        }
        
        return recording[low] || null;
    }
    
    addGhost(name, time, recording) {
        // Add new ghost to leaderboard
        const newEntry = { name, time, recording };
        
        this.leaderboardData.push(newEntry);
        this.leaderboardData.sort((a, b) => a.time - b.time);
        
        // Keep only top entries
        if (this.leaderboardData.length > 10) {
            this.leaderboardData = this.leaderboardData.slice(0, 10);
        }
        
        // Update UI and meshes
        this.game.ui.updateLeaderboard(this.leaderboardData.map(entry => ({
            name: entry.name,
            time: entry.time
        })));
        
        this.createGhostMeshes();
    }
}
