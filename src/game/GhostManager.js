/**
 * GhostManager - Snapshot-based ghost replay
 * Uses compressed position data with interpolation for smooth playback
 */

import * as THREE from 'three';
import { ghostRecorder } from '../core/InputRecorder.js';
import { firebaseService } from '../core/FirebaseService.js';

export class GhostManager {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        
        this.ghosts = [];
        this.ghostMeshes = [];
        this.maxGhosts = 3;
        
        this.leaderboardData = [];
    }
    
    // Initialize for a specific map
    initForMap(mapId) {
        this.mapId = mapId;
        this.loadLocalLeaderboard();
        this.fetchFirebaseLeaderboard();
    }
    
    getStorageKey() {
        return `chips-racing-${this.mapId || 'default'}`;
    }
    
    loadLocalLeaderboard() {
        try {
            const saved = localStorage.getItem(this.getStorageKey());
            if (saved) {
                this.leaderboardData = JSON.parse(saved);
            } else {
                this.leaderboardData = [];
            }
            console.log(`Loaded ${this.leaderboardData.length} local entries for map: ${this.mapId}`);
        } catch (e) {
            console.error('Failed to load local ghost data:', e);
            this.leaderboardData = [];
        }
    }
    
    saveLocalLeaderboard() {
        try {
            const toSave = this.leaderboardData.slice(0, 10);
            localStorage.setItem(this.getStorageKey(), JSON.stringify(toSave));
        } catch (e) {
            console.error('Failed to save local ghost data:', e);
        }
    }
    
    async fetchFirebaseLeaderboard() {
        try {
            const firebaseEntries = await firebaseService.fetchLeaderboard(this.mapId);
            
            if (firebaseEntries.length > 0) {
                for (const entry of firebaseEntries) {
                    const existing = this.leaderboardData.find(e => 
                        e.timestamp === entry.timestamp ||
                        (e.name === entry.name && Math.abs(e.time - entry.time) < 100)
                    );
                    
                    if (!existing) {
                        this.leaderboardData.push({
                            name: entry.name,
                            time: entry.time,
                            data: entry.inputs || entry.data,
                            timestamp: entry.timestamp,
                            isRemote: true
                        });
                    }
                }
                
                this.leaderboardData.sort((a, b) => a.time - b.time);
                this.leaderboardData = this.leaderboardData.slice(0, 10);
                this.saveLocalLeaderboard();
            }
        } catch (e) {
            console.error('Failed to fetch Firebase leaderboard:', e);
        }
    }
    
    createGhostMeshes() {
        this.ghostMeshes.forEach(mesh => this.scene.remove(mesh));
        this.ghostMeshes = [];
        this.ghosts = [];
        
        const ghostsToShow = this.leaderboardData.slice(0, this.maxGhosts);
        
        ghostsToShow.forEach((ghostData, index) => {
            // Decode snapshots
            const snapshots = ghostRecorder.decode(ghostData.data);
            if (!snapshots || snapshots.length === 0) {
                console.warn('Failed to decode ghost', index, ghostData.name);
                return;
            }
            
            console.log(`Ghost ${index + 1} (${ghostData.name}): ${snapshots.length} snapshots, ~${ghostData.data?.length || 0} bytes`);
            
            const mesh = this.createGhostMesh(index);
            mesh.userData.name = ghostData.name;
            mesh.userData.time = ghostData.time;
            this.ghostMeshes.push(mesh);
            this.scene.add(mesh);
            
            this.ghosts.push({
                mesh,
                snapshots,
                finished: false
            });
        });
    }
    
    createGhostMesh(index) {
        const group = new THREE.Group();
        
        const colors = [0xffd700, 0xc0c0c0, 0xcd7f32]; // Gold, Silver, Bronze
        const color = new THREE.Color(colors[index] || 0x8888ff);
        
        const material = new THREE.MeshStandardMaterial({
            color,
            transparent: true,
            opacity: 0.4,
            emissive: color,
            emissiveIntensity: 0.2
        });
        
        const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 4), material);
        body.position.y = 0.3;
        group.add(body);
        
        const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 2), material);
        cockpit.position.set(0, 0.6, -0.3);
        group.add(cockpit);
        
        group.visible = false;
        return group;
    }
    
    startGhosts() {
        this.createGhostMeshes();
        
        this.ghosts.forEach(ghost => {
            ghost.finished = false;
            ghost.mesh.visible = true;
        });
    }
    
    update(raceTime) {
        if (!this.game.raceStarted) return;
        
        this.ghosts.forEach(ghost => {
            if (!ghost.snapshots || ghost.snapshots.length === 0 || ghost.finished) {
                ghost.mesh.visible = false;
                return;
            }
            
            // Get interpolated state at current time
            const state = ghostRecorder.getStateAtTime(ghost.snapshots, raceTime);
            
            if (state) {
                ghost.mesh.visible = true;
                ghost.mesh.position.set(state.x, 0.5, state.z);
                ghost.mesh.rotation.set(0, state.rotY, 0);
            } else {
                // Past end of recording
                ghost.finished = true;
                ghost.mesh.visible = false;
            }
        });
    }
    
    async submitRun(name, time, snapshots) {
        // Validate
        const validation = ghostRecorder.validateClient(snapshots, time);
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }
        
        // Encode with compression
        const encoded = ghostRecorder.encode(snapshots);
        const checksum = ghostRecorder.generateChecksum(snapshots, time);
        
        console.log(`Recording: ${snapshots.length} snapshots -> ${encoded.length} bytes (${(encoded.length / snapshots.length).toFixed(1)} bytes/frame)`);
        
        // Check local qualification
        const qualifiesLocally = this.leaderboardData.length < 10 || 
                                  time < this.leaderboardData[this.leaderboardData.length - 1]?.time;
        
        if (!qualifiesLocally) {
            return { success: false, errors: ['Time does not qualify for top 10'] };
        }
        
        // Add to local leaderboard
        const newEntry = {
            name: name || 'Player',
            time,
            data: encoded,
            checksum,
            timestamp: Date.now(),
            isRemote: false
        };
        
        this.leaderboardData.push(newEntry);
        this.leaderboardData.sort((a, b) => a.time - b.time);
        this.leaderboardData = this.leaderboardData.slice(0, 10);
        this.saveLocalLeaderboard();
        
        const localRank = this.leaderboardData.findIndex(e => e.timestamp === newEntry.timestamp) + 1;
        
        // Submit to Firebase
        console.log('Submitting to Firebase:', { name, time, mapId: this.mapId, dataSize: encoded.length, checksum });
        firebaseService.submitRun(name, time, encoded, checksum, this.mapId).then(result => {
            if (result.success) {
                console.log('Firebase submission successful! Rank:', result.rank);
            } else {
                console.warn('Firebase submission failed:', result.error);
            }
        }).catch(e => {
            console.error('Firebase error:', e);
        });
        
        this.createGhostMeshes();
        
        return { success: true, rank: localRank };
    }
    
    getLeaderboard() {
        return this.leaderboardData.map(entry => ({
            name: entry.name,
            time: entry.time,
            timestamp: entry.timestamp,
            isRemote: entry.isRemote
        }));
    }
    
    hideGhosts() {
        this.ghostMeshes.forEach(ghost => ghost.visible = false);
    }
    
    clearLeaderboard() {
        this.leaderboardData = [];
        this.saveLocalLeaderboard();
        this.ghostMeshes.forEach(mesh => this.scene.remove(mesh));
        this.ghostMeshes = [];
        this.ghosts = [];
    }
}
