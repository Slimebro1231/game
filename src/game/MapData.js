/**
 * Map definitions - Famous F1 track layouts (simplified)
 * Scaled to fit game world (~200 unit max dimension)
 */

export const MAPS = {
    // Monaco GP - Tight, technical street circuit
    'monaco': {
        name: 'Monaco',
        description: 'Tight street circuit - technical corners',
        controlPoints: [
            { x: 0, z: 0 },        // Start/Finish
            { x: 30, z: 5 },       // Sainte Devote approach
            { x: 45, z: 25 },      // Sainte Devote
            { x: 50, z: 60 },      // Casino climb
            { x: 35, z: 80 },      // Casino Square
            { x: 10, z: 75 },      // Mirabeau
            { x: -5, z: 55 },      // Hairpin
            { x: 5, z: 35 },       // Portier
            { x: 25, z: 20 },      // Tunnel approach
            { x: 50, z: 15 },      // Tunnel exit
            { x: 70, z: 5 },       // Chicane
            { x: 60, z: -15 },     // Swimming pool
            { x: 35, z: -20 },     // La Rascasse
            { x: 10, z: -10 },     // Anthony Noghes
            { x: 0, z: 0 },        // Back to start
        ],
        isLoop: true,
        color: '#e74c3c' // Monaco red
    },
    
    // Monza - Temple of Speed, long straights
    'monza': {
        name: 'Monza',
        description: 'Temple of Speed - long straights',
        controlPoints: [
            { x: 0, z: 0 },        // Start
            { x: 80, z: 0 },       // Main straight
            { x: 100, z: -10 },    // Variante del Rettifilo
            { x: 95, z: -30 },     
            { x: 110, z: -50 },    // Curva Grande approach
            { x: 130, z: -80 },    // Curva Grande
            { x: 110, z: -100 },   
            { x: 80, z: -95 },     // Variante della Roggia
            { x: 60, z: -105 },    
            { x: 40, z: -90 },     // Lesmo 1
            { x: 30, z: -70 },     // Lesmo 2
            { x: 40, z: -45 },     // Serraglio
            { x: 25, z: -25 },     // Ascari chicane
            { x: 10, z: -35 },     
            { x: -10, z: -20 },    // Parabolica entry
            { x: -15, z: 0 },      // Parabolica
            { x: 0, z: 0 },        // Finish
        ],
        isLoop: true,
        color: '#2ecc71' // Monza green
    },
    
    // Silverstone - Fast flowing corners
    'silverstone': {
        name: 'Silverstone',
        description: 'High-speed flowing circuit',
        controlPoints: [
            { x: 0, z: 0 },        // Start
            { x: 40, z: 5 },       // Wellington Straight
            { x: 70, z: 20 },      // Brooklands
            { x: 85, z: 45 },      // Luffield
            { x: 70, z: 70 },      // Woodcote approach
            { x: 40, z: 80 },      // Copse
            { x: 10, z: 85 },      // Maggotts
            { x: -20, z: 70 },     // Becketts
            { x: -35, z: 45 },     // Chapel
            { x: -50, z: 20 },     // Hangar Straight
            { x: -45, z: -10 },    // Stowe
            { x: -25, z: -25 },    // Vale
            { x: 0, z: -20 },      // Club
            { x: 0, z: 0 },        // Back to start
        ],
        isLoop: true,
        color: '#3498db' // British racing blue
    },
    
    // Spa-Francorchamps - Famous for Eau Rouge
    'spa': {
        name: 'Spa',
        description: 'Legendary Eau Rouge - elevation changes',
        controlPoints: [
            { x: 0, z: 0 },        // La Source hairpin
            { x: 30, z: -20 },     // Eau Rouge entry (downhill)
            { x: 50, z: -40 },     // Eau Rouge (valley)
            { x: 80, z: -30 },     // Raidillon (uphill climb!)
            { x: 110, z: -10 },    // Kemmel straight
            { x: 140, z: 5 },      // Les Combes
            { x: 130, z: 25 },     
            { x: 100, z: 40 },     // Rivage
            { x: 70, z: 50 },      // Pouhon
            { x: 40, z: 45 },      
            { x: 20, z: 55 },      // Fagnes
            { x: -10, z: 50 },     // Stavelot
            { x: -30, z: 35 },     // Paul Frere
            { x: -40, z: 15 },     // Blanchimont
            { x: -25, z: -5 },     // Bus Stop chicane
            { x: 0, z: 0 },        // Back to La Source
        ],
        isLoop: true,
        color: '#9b59b6' // Belgian purple
    },
    
    // Suzuka - Figure 8 crossover
    'suzuka': {
        name: 'Suzuka',
        description: 'Figure-8 layout - unique crossover',
        controlPoints: [
            { x: 0, z: 0 },        // Start
            { x: 35, z: 10 },      // First curve
            { x: 60, z: 35 },      // S-curves start
            { x: 55, z: 55 },      
            { x: 70, z: 70 },      
            { x: 50, z: 85 },      // Dunlop curve
            { x: 20, z: 75 },      // Degner curves
            { x: 0, z: 55 },       
            { x: -20, z: 35 },     // Crossover point (goes under)
            { x: -45, z: 20 },     // Spoon curve
            { x: -60, z: -5 },     
            { x: -45, z: -30 },    // 130R
            { x: -15, z: -35 },    // Casio Triangle
            { x: 10, z: -20 },     
            { x: 0, z: 0 },        // Finish
        ],
        isLoop: true,
        color: '#e67e22' // Japanese orange
    },
    
    // Nurburgring Nordschleife (simplified) - The Green Hell
    'nurburgring': {
        name: 'Nurburgring',
        description: 'The Green Hell - long and technical',
        controlPoints: [
            { x: 0, z: 0 },
            { x: 40, z: 15 },
            { x: 80, z: 5 },
            { x: 110, z: -20 },
            { x: 130, z: -55 },
            { x: 115, z: -90 },
            { x: 80, z: -110 },
            { x: 40, z: -105 },
            { x: 10, z: -85 },
            { x: -20, z: -60 },
            { x: -50, z: -40 },
            { x: -70, z: -10 },
            { x: -60, z: 25 },
            { x: -30, z: 40 },
            { x: 0, z: 0 },
        ],
        isLoop: true,
        color: '#27ae60' // Green Hell
    },
    
    // Sprint track - Short point-to-point for quick runs
    'sprint': {
        name: 'Sprint',
        description: 'Quick point-to-point run',
        controlPoints: [
            { x: 0, z: 0 },
            { x: 30, z: 10 },
            { x: 60, z: -5 },
            { x: 90, z: 15 },
            { x: 120, z: 5 },
            { x: 150, z: -10 },
        ],
        isLoop: false,
        color: '#f39c12' // Gold
    }
};

export function getAvailableMaps() {
    return Object.keys(MAPS).map(id => ({
        id,
        name: MAPS[id].name,
        description: MAPS[id].description,
        isLoop: MAPS[id].isLoop,
        controlPoints: MAPS[id].controlPoints,
        color: MAPS[id].color
    }));
}
