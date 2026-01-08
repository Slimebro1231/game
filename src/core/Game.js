/**
 * Core Game class - manages Three.js scene, physics, and game loop
 */

import * as THREE from 'three';
import { GhostManager } from '../game/GhostManager.js';
import { Track } from '../game/Track.js';
import { Vehicle } from '../game/Vehicle.js';
import { InputManager } from './InputManager.js';
import { UIManager } from './UIManager.js';
import { World } from './World.js';

export class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        this.clock = new THREE.Clock();
        this.isRunning = false;
        this.isPaused = false;
        
        // Game state
        this.raceTime = 0;
        this.raceStarted = false;
        this.raceFinished = false;
        this.currentCheckpoint = 0;
        this.checkpointTimes = [];
        
        // Recording for ghost replay
        this.recording = [];
        this.recordInterval = 50; // Record position every 50ms
        this.lastRecordTime = 0;
    }
    
    init() {
        this.setupRenderer();
        this.setupScene();
        this.setupCamera();
        this.setupLights();
        
        // Initialize managers
        this.input = new InputManager();
        this.ui = new UIManager(this);
        this.ghostManager = new GhostManager(this);
        
        // Initialize game objects
        this.world = new World(this);
        this.track = new Track(this);
        this.vehicle = new Vehicle(this);
        
        // Position camera
        this.updateCameraPosition();
        
        // Start game loop
        this.isRunning = true;
        this.animate();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onResize());
        
        // Expose API for future scripting
        this.setupAPI();
    }
    
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap for performance
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        this.container.appendChild(this.renderer.domElement);
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.scene.fog = new THREE.Fog(0x1a1a2e, 50, 200);
    }
    
    setupCamera() {
        // Isometric-style camera (orthographic for true isometric, or perspective for depth)
        const aspect = window.innerWidth / window.innerHeight;
        
        // Using perspective camera with isometric-like angle
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        
        // Isometric angle: 45 degrees rotated, looking down at ~35 degrees
        this.cameraOffset = new THREE.Vector3(30, 40, 30);
        this.cameraLookAhead = 10; // How far ahead of vehicle to look
    }
    
    setupLights() {
        // Ambient light for base illumination
        const ambient = new THREE.AmbientLight(0x404060, 0.5);
        this.scene.add(ambient);
        
        // Main directional light (sun)
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        this.sunLight.position.set(50, 100, 50);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 10;
        this.sunLight.shadow.camera.far = 200;
        this.sunLight.shadow.camera.left = -50;
        this.sunLight.shadow.camera.right = 50;
        this.sunLight.shadow.camera.top = 50;
        this.sunLight.shadow.camera.bottom = -50;
        this.sunLight.shadow.bias = -0.0001;
        this.scene.add(this.sunLight);
        
        // Accent colored lights for style
        const accentLight1 = new THREE.PointLight(0x00ff88, 0.5, 100);
        accentLight1.position.set(-20, 10, -20);
        this.scene.add(accentLight1);
        
        const accentLight2 = new THREE.PointLight(0xff0088, 0.3, 100);
        accentLight2.position.set(20, 10, 20);
        this.scene.add(accentLight2);
    }
    
    updateCameraPosition() {
        if (!this.vehicle || !this.vehicle.mesh) return;
        
        const vehiclePos = this.vehicle.mesh.position.clone();
        const vehicleDir = this.vehicle.getForwardDirection();
        
        // Look ahead point
        const lookAt = vehiclePos.clone().add(vehicleDir.multiplyScalar(this.cameraLookAhead));
        
        // Camera position (isometric offset from vehicle)
        const targetPos = vehiclePos.clone().add(this.cameraOffset);
        
        // Smooth camera follow
        this.camera.position.lerp(targetPos, 0.05);
        
        // Smooth look at
        const currentLookAt = new THREE.Vector3();
        this.camera.getWorldDirection(currentLookAt);
        this.camera.lookAt(lookAt);
    }
    
    animate() {
        if (!this.isRunning) return;
        
        requestAnimationFrame(() => this.animate());
        
        const delta = Math.min(this.clock.getDelta(), 0.1); // Cap delta to prevent physics issues
        
        if (!this.isPaused) {
            this.update(delta);
        }
        
        this.render();
    }
    
    update(delta) {
        // Update race time
        if (this.raceStarted && !this.raceFinished) {
            this.raceTime += delta * 1000;
            this.ui.updateTimer(this.raceTime);
            
            // Record position for ghost
            if (this.raceTime - this.lastRecordTime >= this.recordInterval) {
                this.recordPosition();
                this.lastRecordTime = this.raceTime;
            }
        }
        
        // Update vehicle
        if (this.vehicle) {
            this.vehicle.update(delta, this.input.getState());
            this.ui.updateSpeed(this.vehicle.getSpeed());
        }
        
        // Update camera
        this.updateCameraPosition();
        
        // Update ghosts
        this.ghostManager.update(this.raceTime);
        
        // Check for reset input
        if (this.input.getState().reset) {
            this.resetRace();
        }
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    recordPosition() {
        if (!this.vehicle || !this.vehicle.mesh) return;
        
        this.recording.push({
            time: this.raceTime,
            position: this.vehicle.mesh.position.clone(),
            rotation: this.vehicle.mesh.rotation.clone(),
            velocity: this.vehicle.velocity.clone()
        });
    }
    
    startRace() {
        this.raceStarted = true;
        this.raceTime = 0;
        this.recording = [];
        this.lastRecordTime = 0;
        this.currentCheckpoint = 0;
        this.checkpointTimes = [];
    }
    
    passCheckpoint(checkpointIndex) {
        if (checkpointIndex === this.currentCheckpoint) {
            this.checkpointTimes.push(this.raceTime);
            this.currentCheckpoint++;
            this.ui.updateCheckpoint(this.currentCheckpoint, this.track.checkpoints.length);
            
            // Check if finished
            if (this.currentCheckpoint >= this.track.checkpoints.length) {
                this.finishRace();
            }
        }
    }
    
    finishRace() {
        this.raceFinished = true;
        this.ui.showFinishScreen(this.raceTime, this.recording);
    }
    
    resetRace() {
        this.raceStarted = false;
        this.raceFinished = false;
        this.raceTime = 0;
        this.currentCheckpoint = 0;
        this.checkpointTimes = [];
        this.recording = [];
        this.lastRecordTime = 0;
        
        if (this.vehicle) {
            this.vehicle.reset();
        }
        
        this.ui.hideFinishScreen();
        this.ui.updateTimer(0);
        this.ui.updateCheckpoint(0, this.track.checkpoints.length);
        
        // Start race after a brief moment
        setTimeout(() => this.startRace(), 500);
    }
    
    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }
    
    // API for future scripting support
    setupAPI() {
        this.api = {
            // Get vehicle state
            getVehicleState: () => ({
                position: this.vehicle?.mesh?.position.clone(),
                rotation: this.vehicle?.mesh?.rotation.clone(),
                velocity: this.vehicle?.velocity.clone(),
                speed: this.vehicle?.getSpeed(),
                steering: this.vehicle?.steering
            }),
            
            // Get track info
            getTrackInfo: () => ({
                checkpoints: this.track?.checkpoints.map(cp => cp.position.clone()),
                currentCheckpoint: this.currentCheckpoint,
                totalCheckpoints: this.track?.checkpoints.length
            }),
            
            // Get race state
            getRaceState: () => ({
                time: this.raceTime,
                started: this.raceStarted,
                finished: this.raceFinished,
                checkpointTimes: [...this.checkpointTimes]
            }),
            
            // Control inputs (for AI/scripting)
            setInput: (input) => {
                if (this.input) {
                    this.input.setScriptedInput(input);
                }
            },
            
            // Events
            onCheckpoint: null,
            onFinish: null,
            onReset: null
        };
    }
    
    // Pause/resume
    pause() {
        this.isPaused = true;
    }
    
    resume() {
        this.isPaused = false;
    }
    
    // Update theme colors
    updateTheme(isDark) {
        if (this.world) {
            this.world.updateTheme(isDark);
        }
        
        // Update vehicle colors
        if (this.vehicle && this.vehicle.mesh) {
            const accentColor = isDark ? 0x00ff88 : 0xff6699;
            this.vehicle.mesh.traverse((child) => {
                if (child.isMesh && child.material.emissive) {
                    // Only update accent colored parts
                    if (child.material.color.getHex() === 0x00ff88 || child.material.color.getHex() === 0xff6699) {
                        child.material.color.setHex(accentColor);
                        child.material.emissive.setHex(accentColor);
                    }
                }
            });
        }
        
        // Update ghost colors
        if (this.ghostManager) {
            const ghostColor = isDark ? 0x8888ff : 0xffaacc;
            this.ghostManager.ghostMeshes.forEach(ghost => {
                ghost.traverse((child) => {
                    if (child.isMesh) {
                        child.material.color.setHex(ghostColor);
                        child.material.emissive.setHex(ghostColor);
                    }
                });
            });
        }
    }
    
    // Cleanup
    destroy() {
        this.isRunning = false;
        this.renderer.dispose();
        this.scene.clear();
    }
}
