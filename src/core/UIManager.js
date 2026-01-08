/**
 * UIManager - handles UI including track selection
 */

import { getAvailableMaps } from '../game/MapData.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        
        // Cache DOM elements
        this.uiEl = document.getElementById('ui');
        this.timerEl = document.getElementById('timer');
        this.speedEl = document.getElementById('speed');
        this.leaderboardSideEl = document.getElementById('leaderboard-side');
        this.leaderboardListEl = document.getElementById('leaderboard-list');
        
        this.startScreen = document.getElementById('start-screen');
        this.finishScreen = document.getElementById('finish-screen');
        this.finalTimeEl = document.getElementById('final-time');
        this.finishLeaderboardList = document.getElementById('finish-leaderboard-list');
        
        this.trackCardsEl = document.getElementById('track-cards');
        
        // Track selection state
        this.availableMaps = getAvailableMaps();
        this.selectedMapIndex = 0;
        
        this.setupEventListeners();
        this.createTrackCards();
    }
    
    setupEventListeners() {
        // Space to start/restart (track selection disabled temporarily)
        document.addEventListener('keydown', (e) => {
            if (this.startScreen.style.display === 'flex') {
                // Track selection disabled - just space to start
                // if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
                //     this.prevTrack();
                // } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
                //     this.nextTrack();
                // }
                if (e.code === 'Space') {
                    e.preventDefault();
                    this.hideStartScreen();
                    // Use default map 'main' instead of selection
                    this.game.startRace();
                }
            } else if (this.finishScreen.style.display === 'flex') {
                if (e.code === 'Space') {
                    e.preventDefault();
                    this.hideFinishScreen();
                    this.game.resetRace();
                }
            }
        });
        
        // Click handlers for nav arrows
        document.getElementById('prev-track')?.addEventListener('click', () => this.prevTrack());
        document.getElementById('next-track')?.addEventListener('click', () => this.nextTrack());
    }
    
    createTrackCards() {
        if (!this.trackCardsEl) return;
        
        this.trackCardsEl.innerHTML = '';
        
        this.availableMaps.forEach((map, index) => {
            const card = document.createElement('div');
            card.className = 'track-card';
            card.dataset.index = index;
            
            card.innerHTML = `
                <h2>${map.name}</h2>
                <div class="track-description">${map.description || ''}</div>
                <div class="track-preview">
                    <canvas id="preview-${map.id}"></canvas>
                </div>
                <div class="track-type">${map.isLoop ? 'Circuit' : 'Sprint'}</div>
            `;
            
            this.trackCardsEl.appendChild(card);
        });
        
        this.updateTrackCards();
        
        // Draw track previews after cards are in DOM
        setTimeout(() => this.drawTrackPreviews(), 100);
    }
    
    drawTrackPreviews() {
        this.availableMaps.forEach(map => {
            const canvas = document.getElementById(`preview-${map.id}`);
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width || 360;
            canvas.height = rect.height || 150;
            
            // Get track points
            const trackData = this.getMapData(map.id);
            if (!trackData) return;
            
            // Calculate bounds
            let minX = Infinity, maxX = -Infinity;
            let minZ = Infinity, maxZ = -Infinity;
            
            trackData.forEach(p => {
                minX = Math.min(minX, p.x);
                maxX = Math.max(maxX, p.x);
                minZ = Math.min(minZ, p.z);
                maxZ = Math.max(maxZ, p.z);
            });
            
            const padding = 20;
            const scaleX = (canvas.width - padding * 2) / (maxX - minX || 1);
            const scaleZ = (canvas.height - padding * 2) / (maxZ - minZ || 1);
            const scale = Math.min(scaleX, scaleZ);
            
            const offsetX = (canvas.width - (maxX - minX) * scale) / 2;
            const offsetZ = (canvas.height - (maxZ - minZ) * scale) / 2;
            
            // Draw track with map-specific color
            const trackColor = map.color || '#00ff88';
            ctx.strokeStyle = trackColor;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowColor = trackColor;
            ctx.shadowBlur = 10;
            
            ctx.beginPath();
            trackData.forEach((p, i) => {
                const x = (p.x - minX) * scale + offsetX;
                const y = (p.z - minZ) * scale + offsetZ;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            // Draw start (green dot)
            const startX = (trackData[0].x - minX) * scale + offsetX;
            const startY = (trackData[0].z - minZ) * scale + offsetZ;
            ctx.fillStyle = '#00ff00';
            ctx.beginPath();
            ctx.arc(startX, startY, 6, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw finish (checkered)
            const endX = (trackData[trackData.length - 1].x - minX) * scale + offsetX;
            const endY = (trackData[trackData.length - 1].z - minZ) * scale + offsetZ;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(endX, endY, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(endX, endY, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    getMapData(mapId) {
        // Use map data from the map definition
        const map = this.availableMaps.find(m => m.id === mapId);
        return map?.controlPoints || [];
    }
    
    updateTrackCards() {
        const cards = this.trackCardsEl?.querySelectorAll('.track-card');
        if (!cards) return;
        
        cards.forEach((card, index) => {
            card.classList.remove('active', 'left', 'right');
            
            if (index === this.selectedMapIndex) {
                card.classList.add('active');
            } else if (index < this.selectedMapIndex) {
                card.classList.add('left');
            } else {
                card.classList.add('right');
            }
        });
    }
    
    prevTrack() {
        this.selectedMapIndex = (this.selectedMapIndex - 1 + this.availableMaps.length) % this.availableMaps.length;
        this.updateTrackCards();
    }
    
    nextTrack() {
        this.selectedMapIndex = (this.selectedMapIndex + 1) % this.availableMaps.length;
        this.updateTrackCards();
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
        const kmh = Math.round(speed * 3.6);
        this.speedEl.textContent = `${kmh} km/h`;
    }
    
    updateCheckpoint(current, total) {}
    
    showStartScreen() {
        this.startScreen.style.display = 'flex';
        this.uiEl.style.display = 'none';
        this.leaderboardSideEl.style.display = 'none';
    }
    
    hideStartScreen() {
        this.startScreen.style.display = 'none';
        this.uiEl.style.display = 'block';
        this.leaderboardSideEl.style.display = 'block';
        this.updateSideLeaderboard();
    }
    
    showFinishScreen(timeMs, recording, submitResult) {
        this.finishScreen.style.display = 'flex';
        this.finalTimeEl.textContent = this.formatTime(timeMs);
        this.updateFinishLeaderboard(timeMs, submitResult);
    }
    
    hideFinishScreen() {
        this.finishScreen.style.display = 'none';
    }
    
    updateSideLeaderboard() {
        const leaderboard = this.game.ghostManager?.getLeaderboard() || [];
        this.leaderboardListEl.innerHTML = '';
        
        if (leaderboard.length === 0) {
            const li = document.createElement('li');
            li.textContent = '---';
            this.leaderboardListEl.appendChild(li);
            return;
        }
        
        leaderboard.slice(0, 5).forEach((entry, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${this.formatTime(entry.time)}`;
            this.leaderboardListEl.appendChild(li);
        });
    }
    
    updateFinishLeaderboard(currentTime, submitResult) {
        const leaderboard = this.game.ghostManager?.getLeaderboard() || [];
        this.finishLeaderboardList.innerHTML = '';
        
        if (leaderboard.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No times recorded yet';
            this.finishLeaderboardList.appendChild(li);
            return;
        }
        
        leaderboard.slice(0, 10).forEach((entry, index) => {
            const li = document.createElement('li');
            const isCurrentRun = submitResult?.success && submitResult.rank === index + 1;
            if (isCurrentRun) li.classList.add('current-run');
            
            const rank = document.createElement('span');
            rank.textContent = `${index + 1}. ${entry.name || 'Player'}`;
            
            const time = document.createElement('span');
            time.textContent = this.formatTime(entry.time);
            
            li.appendChild(rank);
            li.appendChild(time);
            this.finishLeaderboardList.appendChild(li);
        });
        
        if (submitResult && !submitResult.success && submitResult.errors) {
            const errorLi = document.createElement('li');
            errorLi.style.color = '#ff6666';
            errorLi.style.opacity = '0.8';
            errorLi.textContent = submitResult.errors[0];
            this.finishLeaderboardList.appendChild(errorLi);
        }
    }
}
