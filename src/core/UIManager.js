/**
 * UIManager - handles all UI updates and interactions
 */

export class UIManager {
    constructor(game) {
        this.game = game;
        
        // Cache DOM elements
        this.timerEl = document.getElementById('timer');
        this.speedEl = document.getElementById('speed');
        this.checkpointEl = document.getElementById('checkpoint');
        this.leaderboardEl = document.getElementById('leaderboard-list');
        this.finishScreen = document.getElementById('finish-screen');
        this.finalTimeEl = document.getElementById('final-time');
        this.rankMessageEl = document.getElementById('rank-message');
        this.playerNameInput = document.getElementById('player-name');
        this.submitBtn = document.getElementById('submit-score');
        this.restartBtn = document.getElementById('restart-btn');
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.restartBtn.addEventListener('click', () => {
            this.game.resetRace();
        });
        
        this.submitBtn.addEventListener('click', () => {
            this.submitScore();
        });
        
        // Submit on enter in name field
        this.playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitScore();
            }
        });
        
        // Hide finish screen initially
        this.hideFinishScreen();
    }
    
    formatTime(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = Math.floor(ms % 1000);
        
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }
    
    updateTimer(timeMs) {
        this.timerEl.textContent = this.formatTime(timeMs);
    }
    
    updateSpeed(speed) {
        const kmh = Math.round(speed * 3.6); // Convert m/s to km/h
        this.speedEl.textContent = `${kmh} km/h`;
    }
    
    updateCheckpoint(current, total) {
        this.checkpointEl.textContent = `Checkpoint: ${current}/${total}`;
    }
    
    updateLeaderboard(entries) {
        this.leaderboardEl.innerHTML = '';
        
        entries.slice(0, 10).forEach((entry, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${entry.name} - ${this.formatTime(entry.time)}`;
            if (entry.isCurrentPlayer) {
                li.style.color = '#ffff00';
            }
            this.leaderboardEl.appendChild(li);
        });
        
        if (entries.length === 0) {
            const li = document.createElement('li');
            li.textContent = '---';
            this.leaderboardEl.appendChild(li);
        }
    }
    
    showFinishScreen(timeMs, recording) {
        this.finishScreen.style.display = 'block';
        this.finalTimeEl.textContent = this.formatTime(timeMs);
        
        // Store recording for potential submission
        this.currentRecording = recording;
        this.currentTime = timeMs;
        
        // Check if qualifies for leaderboard (placeholder - always allow for now)
        const qualifies = true; // Will be determined by comparing to existing times
        
        if (qualifies) {
            this.rankMessageEl.textContent = 'New personal best! Enter your name:';
            this.playerNameInput.style.display = 'block';
            this.submitBtn.style.display = 'inline-block';
            this.playerNameInput.focus();
        } else {
            this.rankMessageEl.textContent = 'Keep practicing!';
            this.playerNameInput.style.display = 'none';
            this.submitBtn.style.display = 'none';
        }
    }
    
    hideFinishScreen() {
        this.finishScreen.style.display = 'none';
        this.playerNameInput.value = '';
    }
    
    async submitScore() {
        const name = this.playerNameInput.value.trim() || 'Anonymous';
        
        // Validate run (basic validation - can be expanded)
        const isValid = this.validateRun(this.currentRecording);
        
        if (!isValid) {
            this.rankMessageEl.textContent = 'Run validation failed!';
            return;
        }
        
        // Submit to Firebase (placeholder)
        const scoreData = {
            name: name,
            time: this.currentTime,
            timestamp: Date.now(),
            recording: this.currentRecording
        };
        
        console.log('Submitting score:', scoreData);
        
        // TODO: Actually submit to Firebase
        // await submitToFirebase(scoreData);
        
        this.rankMessageEl.textContent = 'Score submitted!';
        this.submitBtn.style.display = 'none';
        this.playerNameInput.style.display = 'none';
        
        // Update leaderboard display
        // this.game.ghostManager.loadLeaderboard();
    }
    
    validateRun(recording) {
        // Basic validation checks
        if (!recording || recording.length < 10) {
            return false;
        }
        
        // Check for reasonable time intervals
        for (let i = 1; i < recording.length; i++) {
            const timeDiff = recording[i].time - recording[i-1].time;
            if (timeDiff < 0 || timeDiff > 1000) {
                return false; // Time should always increase, not jump too much
            }
        }
        
        // Check for teleportation (impossible position changes)
        for (let i = 1; i < recording.length; i++) {
            const dist = recording[i].position.distanceTo(recording[i-1].position);
            const timeDiff = (recording[i].time - recording[i-1].time) / 1000;
            const maxSpeed = 100; // m/s - reasonable max for any vehicle
            
            if (timeDiff > 0 && dist / timeDiff > maxSpeed) {
                return false; // Moved too fast - likely cheating
            }
        }
        
        return true;
    }
}
