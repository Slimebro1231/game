/**
 * Map definitions - separated to avoid circular dependencies
 */

export const MAPS = {
    'test-short': {
        name: 'Test Track',
        controlPoints: [
            { x: 0, z: 0 },
            { x: 20, z: 5 },
            { x: 40, z: -5 },
            { x: 60, z: 0 },
            { x: 80, z: 10 },
            { x: 100, z: 0 },
        ],
        isLoop: false
    },
    'oval': {
        name: 'Oval Circuit',
        controlPoints: [
            { x: 0, z: 30 },
            { x: 30, z: 40 },
            { x: 50, z: 20 },
            { x: 40, z: -10 },
            { x: 10, z: -20 },
            { x: -30, z: -10 },
            { x: -45, z: 15 },
            { x: -30, z: 35 },
            { x: 0, z: 30 },
        ],
        isLoop: true
    },
    'random-spline': {
        name: 'Sprint',
        controlPoints: generateRandomSpline(),
        isLoop: false
    }
};

function generateRandomSpline() {
    // Fixed seed for consistent preview
    const points = [];
    let x = 0, z = 0;
    const angles = [0.1, -0.2, 0.15, -0.1, 0.25, -0.15, 0.1, 0];
    const dists = [25, 30, 28, 35, 25, 30, 28, 25];
    
    for (let i = 0; i < 8; i++) {
        points.push({ x, z });
        x += Math.cos(angles[i]) * dists[i] + dists[i] * 0.7;
        z += Math.sin(angles[i]) * dists[i];
    }
    return points;
}

export function getAvailableMaps() {
    return Object.keys(MAPS).map(id => ({
        id,
        name: MAPS[id].name,
        isLoop: MAPS[id].isLoop,
        controlPoints: MAPS[id].controlPoints
    }));
}
