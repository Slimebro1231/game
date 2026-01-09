/**
 * GhostManager - Snapshot-based ghost replay
 * Uses compressed position data with interpolation for smooth playback
 */

import * as THREE from 'three';
import { firebaseService } from '../core/FirebaseService.js';
import { ghostRecorder } from '../core/InputRecorder.js';

export class GhostManager {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        
        this.ghosts = [];
        this.ghostMeshes = [];
        this.maxGhosts = 5; // Show top 5 ghosts
        
        // Separate personal and global leaderboards
        this.personalBests = [];  // Player's own runs (for ghosts)
        this.globalLeaderboard = []; // Everyone's runs (for display)
    }
    
    // Initialize for a specific map
    initForMap(mapId) {
        this.mapId = mapId;
        this.loadPersonalBests();
        this.fetchGlobalLeaderboard();
    }
    
    getStorageKey() {
        return `chips-racing-personal-${this.mapId || 'default'}`;
    }
    
    loadPersonalBests() {
        try {
            const saved = localStorage.getItem(this.getStorageKey());
            if (saved) {
                this.personalBests = JSON.parse(saved);
            } else {
                this.personalBests = [];
            }
            console.log(`Loaded ${this.personalBests.length} personal bests for map: ${this.mapId}`);
        } catch (e) {
            console.error('Failed to load personal bests:', e);
            this.personalBests = [];
        }
    }
    
    savePersonalBests() {
        try {
            const toSave = this.personalBests.slice(0, 10);
            localStorage.setItem(this.getStorageKey(), JSON.stringify(toSave));
        } catch (e) {
            console.error('Failed to save personal bests:', e);
        }
    }
    
    async fetchGlobalLeaderboard() {
        try {
            const firebaseEntries = await firebaseService.fetchLeaderboard(this.mapId);
            
            this.globalLeaderboard = firebaseEntries.map(entry => ({
                name: entry.name,
                time: entry.time,
                data: entry.inputs || entry.data,
                timestamp: entry.timestamp,
                id: entry.id
            }));
            
            this.globalLeaderboard.sort((a, b) => a.time - b.time);
            console.log(`Fetched ${this.globalLeaderboard.length} global entries for map: ${this.mapId}`);
            
            // Update UI if available
            if (this.game.ui) {
                this.game.ui.updateLeaderboard(this.globalLeaderboard);
            }
        } catch (e) {
            console.error('Failed to fetch global leaderboard:', e);
        }
    }
    
    createGhostMeshes() {
        this.ghostMeshes.forEach(mesh => this.scene.remove(mesh));
        this.ghostMeshes = [];
        this.ghosts = [];
        
        // Use global leaderboard for ghosts (race against top players)
        const ghostsToShow = this.globalLeaderboard.slice(0, this.maxGhosts);
        
        ghostsToShow.forEach((ghostData, index) => {
            // Decode snapshots
            const snapshots = ghostRecorder.decode(ghostData.data);
            if (!snapshots || snapshots.length === 0) {
                console.warn('Failed to decode ghost', index, ghostData.name);
                return;
            }
            
            console.log(`Global Ghost ${index + 1} (${ghostData.name}): ${snapshots.length} snapshots, time: ${(ghostData.time / 1000).toFixed(2)}s`);
            
            const mesh = this.createGhostMesh(index);
            mesh.userData.name = ghostData.name || '#' + (index + 1);
            mesh.userData.time = ghostData.time;
            this.ghostMeshes.push(mesh);
            this.scene.add(mesh);
            
            this.ghosts.push({
                mesh,
                snapshots,
                finished: false
            });
        });
        
        console.log(`Created ${this.ghosts.length} global ghost(s)`);
    }
    
    createGhostMesh(index) {
        const group = new THREE.Group();
        
        // Global leaderboard colors - gold, silver, bronze, then shades
        const colors = [0xffd700, 0xc0c0c0, 0xcd7f32, 0x88aaff, 0xaa88ff];
        const color = new THREE.Color(colors[index] || 0x8888ff);
        
        const material = new THREE.MeshStandardMaterial({
            color,
            transparent: true,
            opacity: 0.35,
            emissive: color,
            emissiveIntensity: 0.15
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
        
        const timestamp = Date.now();
        
        // Always save to personal bests (up to 10)
        const personalEntry = {
            time,
            data: encoded,
            checksum,
            timestamp
        };
        
        this.personalBests.push(personalEntry);
        this.personalBests.sort((a, b) => a.time - b.time);
        this.personalBests = this.personalBests.slice(0, 10);
        this.savePersonalBests();
        
        const personalRank = this.personalBests.findIndex(e => e.timestamp === timestamp) + 1;
        const isPersonalBest = personalRank === 1;
        
        // Submit to global Firebase leaderboard
        console.log('Submitting to Firebase:', { name, time, mapId: this.mapId, dataSize: encoded.length });
        
        let globalRank = null;
        try {
            const result = await firebaseService.submitRun(name, time, encoded, checksum, this.mapId);
            if (result.success) {
                globalRank = result.rank;
                console.log('Firebase submission successful! Global rank:', globalRank);
                // Refresh global leaderboard
                this.fetchGlobalLeaderboard();
            } else {
                console.warn('Firebase submission:', result.error);
            }
        } catch (e) {
            console.error('Firebase error:', e);
        }
        
        this.createGhostMeshes();
        
        return { 
            success: true, 
            personalRank, 
            globalRank, 
            isPersonalBest 
        };
    }
    
    // Get global leaderboard for display
    getGlobalLeaderboard() {
        return this.globalLeaderboard.map(entry => ({
            name: entry.name,
            time: entry.time,
            timestamp: entry.timestamp
        }));
    }
    
    // Get personal bests
    getPersonalBests() {
        return this.personalBests.map((entry, i) => ({
            rank: i + 1,
            time: entry.time,
            timestamp: entry.timestamp
        }));
    }
    
    hideGhosts() {
        this.ghostMeshes.forEach(ghost => ghost.visible = false);
    }
    
    clearPersonalBests() {
        this.personalBests = [];
        this.savePersonalBests();
        this.ghostMeshes.forEach(mesh => this.scene.remove(mesh));
        this.ghostMeshes = [];
        this.ghosts = [];
    }
}
