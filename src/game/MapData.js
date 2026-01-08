/**
 * Map definitions - Famous F1-inspired track layouts (non-overlapping)
 * Scaled larger for longer races
 */

export const MAPS = {
    // Main track - Winding forest road, point to point
    'main': {
        name: 'Forest Trail',
        description: 'Winding path through the woods',
        controlPoints: [
            // Start - clearing
            { x: 0, z: 0 },
            { x: 40, z: 10 },
            // First S-curve
            { x: 80, z: 35 },
            { x: 100, z: 70 },
            { x: 85, z: 110 },
            // Sweeping left
            { x: 50, z: 140 },
            { x: 20, z: 180 },
            // Tight right hairpin
            { x: 40, z: 220 },
            { x: 80, z: 240 },
            // Long curve through forest
            { x: 130, z: 230 },
            { x: 170, z: 200 },
            { x: 190, z: 150 },
            // Chicane
            { x: 210, z: 110 },
            { x: 195, z: 75 },
            { x: 215, z: 40 },
            // Sweeping right descent
            { x: 250, z: 10 },
            { x: 290, z: -20 },
            // Final curves
            { x: 320, z: -60 },
            { x: 340, z: -110 },
            { x: 330, z: -160 },
            // Finish straight
            { x: 290, z: -190 },
            { x: 240, z: -200 },
        ],
        isLoop: false,
        color: '#8b6914'
    },
    
    // Monaco - Extended street circuit (no overlaps)
    'monaco': {
        name: 'Monaco',
        description: 'Tight street circuit with elevation',
        controlPoints: [
            { x: 0, z: 0 },
            { x: 50, z: 10 },
            { x: 90, z: 40 },
            { x: 100, z: 90 },
            { x: 70, z: 130 },
            { x: 20, z: 140 },
            { x: -30, z: 120 },
            { x: -60, z: 80 },
            { x: -80, z: 30 },
            { x: -60, z: -20 },
            { x: -20, z: -30 },
            { x: 0, z: 0 },
        ],
        isLoop: true,
        color: '#e74c3c'
    },
    
    // Monza - Long straights, wide sweeping turns
    'monza': {
        name: 'Monza',
        description: 'Temple of Speed - long straights',
        controlPoints: [
            { x: 0, z: 0 },
            { x: 120, z: 0 },
            { x: 160, z: -30 },
            { x: 170, z: -80 },
            { x: 140, z: -130 },
            { x: 80, z: -150 },
            { x: 20, z: -140 },
            { x: -30, z: -110 },
            { x: -50, z: -60 },
            { x: -40, z: -10 },
            { x: 0, z: 0 },
        ],
        isLoop: true,
        color: '#2ecc71'
    },
    
    // Silverstone - Flowing high-speed corners
    'silverstone': {
        name: 'Silverstone',
        description: 'High-speed flowing corners',
        controlPoints: [
            { x: 0, z: 0 },
            { x: 60, z: 20 },
            { x: 120, z: 60 },
            { x: 140, z: 120 },
            { x: 100, z: 160 },
            { x: 40, z: 170 },
            { x: -20, z: 150 },
            { x: -70, z: 110 },
            { x: -100, z: 50 },
            { x: -80, z: -10 },
            { x: -30, z: -20 },
            { x: 0, z: 0 },
        ],
        isLoop: true,
        color: '#3498db'
    },
    
    // Spa - Long flowing circuit
    'spa': {
        name: 'Spa',
        description: 'Legendary Eau Rouge climb',
        controlPoints: [
            { x: 0, z: 0 },
            { x: 40, z: -30 },
            { x: 100, z: -50 },
            { x: 160, z: -30 },
            { x: 200, z: 20 },
            { x: 190, z: 80 },
            { x: 140, z: 120 },
            { x: 70, z: 130 },
            { x: 10, z: 110 },
            { x: -30, z: 70 },
            { x: -40, z: 20 },
            { x: 0, z: 0 },
        ],
        isLoop: true,
        color: '#9b59b6'
    },
    
    // Suzuka - Figure 8 inspired but non-overlapping spiral
    'suzuka': {
        name: 'Suzuka',
        description: 'Technical S-curves and hairpins',
        controlPoints: [
            { x: 0, z: 0 },
            { x: 50, z: 30 },
            { x: 90, z: 80 },
            { x: 70, z: 130 },
            { x: 20, z: 150 },
            { x: -40, z: 140 },
            { x: -80, z: 100 },
            { x: -100, z: 40 },
            { x: -80, z: -20 },
            { x: -30, z: -40 },
            { x: 0, z: 0 },
        ],
        isLoop: true,
        color: '#e67e22'
    },
    
    // Nurburgring - Long technical circuit
    'nurburgring': {
        name: 'Nurburgring',
        description: 'The Green Hell - long and technical',
        controlPoints: [
            { x: 0, z: 0 },
            { x: 70, z: 20 },
            { x: 140, z: 10 },
            { x: 190, z: -30 },
            { x: 200, z: -100 },
            { x: 160, z: -160 },
            { x: 80, z: -180 },
            { x: 0, z: -170 },
            { x: -60, z: -130 },
            { x: -90, z: -70 },
            { x: -80, z: 0 },
            { x: -40, z: 30 },
            { x: 0, z: 0 },
        ],
        isLoop: true,
        color: '#27ae60'
    },
    
    // Sprint - Long point-to-point drag strip with curves
    'sprint': {
        name: 'Sprint',
        description: 'Quick point-to-point blast',
        controlPoints: [
            { x: 0, z: 0 },
            { x: 50, z: 15 },
            { x: 100, z: -10 },
            { x: 150, z: 20 },
            { x: 200, z: 0 },
            { x: 250, z: -15 },
            { x: 300, z: 10 },
        ],
        isLoop: false,
        color: '#f39c12'
    },
    
    // Laguna Seca - Famous corkscrew
    'laguna': {
        name: 'Laguna Seca',
        description: 'Famous corkscrew section',
        controlPoints: [
            { x: 0, z: 0 },
            { x: 60, z: 10 },
            { x: 110, z: 50 },
            { x: 130, z: 110 },
            { x: 90, z: 150 },
            { x: 30, z: 160 },
            { x: -30, z: 130 },
            { x: -60, z: 70 },
            { x: -50, z: 10 },
            { x: 0, z: 0 },
        ],
        isLoop: true,
        color: '#1abc9c'
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
