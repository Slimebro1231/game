/**
 * Core Game class - manages Three.js scene, physics, and game loop
 */

import * as THREE from 'three';
import { GhostManager } from '../game/GhostManager.js';
import { Track } from '../game/Track.js';
import { Vehicle } from '../game/Vehicle.js';
import { InputManager } from './InputManager.js';
import { inputRecorder } from './InputRecorder.js';
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
        this.currentMapId = 'main'; // Default map - single track for now
        
        // Create vehicle first (with default position)
        this.vehicle = new Vehicle(this);
        
        // Create track (will set vehicle start position)
        this.track = new Track(this, this.currentMapId);
        
        // Ensure vehicle is at track start
        this.positionVehicleAtStart();
        
        // Initialize ghost manager with current map
        this.ghostManager.initForMap(this.currentMapId);
        
        // Position camera
        this.updateCameraPosition();
        
        // Start game loop
        this.isRunning = true;
        this.animate();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onResize());
        
        // Expose API for future scripting
        this.setupAPI();
        
        // Show start screen
        this.ui.showStartScreen();
        
        // Track lap detection
        this.hasLeftStart = false;
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
        // Natural warm beige background (will be overridden by World's sky)
        this.scene.background = new THREE.Color(0xf5e6d3);
        this.scene.fog = new THREE.Fog(0xf5e6d3, 150, 500);
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
        // Warm ambient light for natural illumination
        const ambient = new THREE.AmbientLight(0xffeedd, 0.4);
        this.scene.add(ambient);
        
        // Main directional light (warm sun)
        this.sunLight = new THREE.DirectionalLight(0xfff5e0, 1.2);
        this.sunLight.position.set(80, 120, 60);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 10;
        this.sunLight.shadow.camera.far = 300;
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
        // Get current input state
        const inputState = this.input.getState();
        
        // Update race time
        if (this.raceStarted && !this.raceFinished) {
            this.raceTime += delta * 1000;
            this.ui.updateTimer(this.raceTime);
            
            // Check for lap completion
            this.checkLapCompletion();
        }
        
        // Update vehicle (only if race started)
        if (this.vehicle && this.raceStarted) {
            this.vehicle.update(delta, inputState);
            this.ui.updateSpeed(this.vehicle.getSpeed());
            
            // Record snapshot for ghost replay (position-based, like Trackmania)
            if (!this.raceFinished) {
                inputRecorder.recordFrame(
                    this.raceTime,
                    this.vehicle.mesh.position,
                    this.vehicle.mesh.rotation,
                    this.vehicle.velocity
                );
            }
        }
        
        // Update camera
        this.updateCameraPosition();
        
        // Update world (particles, atmosphere)
        if (this.world) {
            this.world.update(delta);
        }
        
        // Update ghosts
        this.ghostManager.update(this.raceTime);
        
        // Check for reset input (only during race)
        if (this.raceStarted && !this.raceFinished && inputState.reset) {
            this.resetRace();
        }
    }
    
    checkLapCompletion() {
        if (!this.vehicle || !this.track || !this.track.finishLinePos) return;
        
        const vehiclePos = this.vehicle.mesh.position;
        const finishPos = this.track.finishLinePos;
        const startPos = this.track.startPos || this.vehicle.startPosition;
        
        // Distance from finish line (2D)
        const distToFinish = Math.sqrt(
            Math.pow(vehiclePos.x - finishPos.x, 2) + 
            Math.pow(vehiclePos.z - finishPos.z, 2)
        );
        
        // Distance from start (to ensure player has traveled)
        const distFromStart = Math.sqrt(
            Math.pow(vehiclePos.x - startPos.x, 2) + 
            Math.pow(vehiclePos.z - startPos.z, 2)
        );
        
        const finishRadius = 8;
        const minRaceTimeMs = 5000; // Minimum 5 seconds to complete
        const minDistanceFromStart = 40; // Must travel at least 40 units
        
        // For point-to-point: must be far from start AND have minimum race time
        if (!this.hasLeftStart) {
            if (distFromStart > minDistanceFromStart && this.raceTime > 2000) {
                this.hasLeftStart = true;
            }
        }
        
        // Check if reached finish line
        if (this.hasLeftStart && distToFinish < finishRadius) {
            // Minimum race time to prevent exploits
            if (this.raceTime > minRaceTimeMs) {
                this.finishRace();
            }
        }
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    startRace() {
        this.raceStarted = true;
        this.raceTime = 0;
        this.currentCheckpoint = 0;
        this.checkpointTimes = [];
        this.hasLeftStart = false;
        
        // Start input recording
        inputRecorder.startRecording();
        
        // Start ghost replays
        this.ghostManager.startGhosts();
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
        
        // Stop input recording and get frames
        const inputFrames = inputRecorder.stopRecording();
        
        // Show name input screen (submission happens after user enters name)
        this.ui.showNameInputScreen(this.raceTime, inputFrames);
        
        // Hide ghosts during finish screen
        this.ghostManager.hideGhosts();
    }
    
    resetRace() {
        this.raceStarted = false;
        this.raceFinished = false;
        this.raceTime = 0;
        this.currentCheckpoint = 0;
        this.checkpointTimes = [];
        this.hasLeftStart = false;
        
        this.positionVehicleAtStart();
        
        this.ui.hideFinishScreen();
        this.ui.updateTimer(0);
        
        // Start race immediately (called from UI after pressing space)
        this.startRace();
    }
    
    positionVehicleAtStart() {
        if (!this.vehicle || !this.track) return;
        
        const startPos = this.track.startPos;
        const startDir = this.track.startDir;
        
        if (startPos && startDir) {
            this.vehicle.startPosition.copy(startPos);
            this.vehicle.startPosition.y = 0.5;
            
            // Calculate angle from direction vector
            const angle = Math.atan2(startDir.x, startDir.z);
            this.vehicle.startRotation.set(0, angle, 0);
            this.vehicle.reset();
            
            console.log('Vehicle positioned at:', startPos.x.toFixed(1), startPos.z.toFixed(1), 
                        'facing:', (angle * 180 / Math.PI).toFixed(1), 'deg');
        }
    }
    
    switchMap(mapId) {
        if (mapId === this.currentMapId && this.track) return;
        
        console.log('Switching to map:', mapId);
        this.currentMapId = mapId;
        
        // Destroy old track properly
        if (this.track) {
            this.track.destroy();
        }
        
        // Create new track
        this.track = new Track(this, mapId);
        this.positionVehicleAtStart();
        
        // Reinitialize ghost manager for new map
        this.ghostManager.initForMap(mapId);
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
