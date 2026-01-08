/**
 * Chips Racing - Main Entry Point
 * A top-down isometric racing game with ghost replays
 */

import { Game } from './core/Game.js';

// Theme management
function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const root = document.documentElement;
    
    // Check system preference or saved preference
    const savedTheme = localStorage.getItem('chips-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    let isDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    
    function setTheme(dark) {
        isDark = dark;
        if (dark) {
            root.classList.remove('light-mode');
        } else {
            root.classList.add('light-mode');
        }
        
        if (themeToggle) {
            themeToggle.textContent = dark ? 'LIGHT MODE' : 'DARK MODE';
        }
        
        localStorage.setItem('chips-theme', dark ? 'dark' : 'light');
        
        // Notify game to update colors
        if (window.chipsGame) {
            window.chipsGame.updateTheme(dark);
        }
    }
    
    // Initial theme
    setTheme(isDark);
    
    // Toggle on click (only if button exists)
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            setTheme(!isDark);
        });
    }
    
    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('chips-theme')) {
            setTheme(e.matches);
        }
    });
}

// Initialize game when DOM is ready
function initGame() {
    console.log('Initializing game...');
    
    // Init theme first
    initTheme();
    
    // Init game
    const game = new Game();
    game.init();
    
    // Expose game instance for debugging and future API
    window.chipsGame = game;
    
    // Hide loading screen
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.style.display = 'none';
        console.log('Loading screen hidden');
    }
    
    console.log('Game initialized');
}

// Check if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    // DOM already loaded, run immediately
    initGame();
}
