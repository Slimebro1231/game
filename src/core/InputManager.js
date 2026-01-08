/**
 * InputManager - handles keyboard/gamepad input
 */

export class InputManager {
    constructor() {
        this.state = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            handbrake: false,
            reset: false
        };
        
        // For scripted/AI input
        this.scriptedInput = null;
        this.useScriptedInput = false;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
    }
    
    onKeyDown(event) {
        this.updateKey(event.code, true);
    }
    
    onKeyUp(event) {
        this.updateKey(event.code, false);
        
        // Reset is a single press action
        if (event.code === 'KeyR') {
            this.state.reset = false;
        }
    }
    
    updateKey(code, pressed) {
        switch (code) {
            case 'KeyW':
            case 'ArrowUp':
                this.state.forward = pressed;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.state.backward = pressed;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.state.left = pressed;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.state.right = pressed;
                break;
            case 'Space':
                this.state.handbrake = pressed;
                break;
            case 'KeyR':
                if (pressed) this.state.reset = true;
                break;
        }
    }
    
    getState() {
        // Return scripted input if enabled
        if (this.useScriptedInput && this.scriptedInput) {
            return { ...this.scriptedInput, reset: this.state.reset };
        }
        return { ...this.state };
    }
    
    // For AI/scripting support
    setScriptedInput(input) {
        this.scriptedInput = {
            forward: input.forward || false,
            backward: input.backward || false,
            left: input.left || false,
            right: input.right || false,
            handbrake: input.handbrake || false,
            reset: false
        };
        this.useScriptedInput = true;
    }
    
    clearScriptedInput() {
        this.scriptedInput = null;
        this.useScriptedInput = false;
    }
}
