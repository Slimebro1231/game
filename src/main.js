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
            themeToggle.textContent = 'LIGHT MODE';
        } else {
            root.classList.add('light-mode');
            themeToggle.textContent = 'DARK MODE';
        }
        localStorage.setItem('chips-theme', dark ? 'dark' : 'light');
        
        // Notify game to update colors
        if (window.chipsGame) {
            window.chipsGame.updateTheme(dark);
        }
    }
    
    // Initial theme
    setTheme(isDark);
    
    // Toggle on click
    themeToggle.addEventListener('click', () => {
        setTheme(!isDark);
    });
    
    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('chips-theme')) {
            setTheme(e.matches);
        }
    });
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Init theme first
    initTheme();
    
    // Init game
    const game = new Game();
    game.init();
    
    // Expose game instance for debugging and future API
    window.chipsGame = game;
    
    // Hide loading screen
    document.getElementById('loading').style.display = 'none';
});
