/**
 * Firebase Cloud Functions for Chips Racing
 * Server-side anticheat validation
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

const ENCRYPT_KEY = 'ChipsRacing2024!';

// Physics constants (must match client)
const PHYSICS = {
    acceleration: 40,
    maxSpeed: 30,
    brakeForce: 50,
    friction: 0.98,
    turnSpeed: 2.5,
    frameInterval: 1/60 // 60fps simulation
};

// Track data (simplified - matches client track)
const TRACK = {
    startPos: { x: 0, z: 34 },
    finishRadius: 15,
    // Approximate track center points for path validation
    checkPoints: generateTrackPath()
};

function generateTrackPath() {
    const points = [];
    for (let i = 0; i < 80; i++) {
        const t = (i / 80) * Math.PI * 2;
        const x = Math.sin(t) * 45 + Math.sin(t * 3) * 5;
        const z = Math.cos(t) * 30 + Math.cos(t * 2) * 4;
        points.push({ x, z });
    }
    return points;
}

// Decrypt and decode events
function decodeEvents(encoded) {
    // Base64 decode
    const str = Buffer.from(encoded, 'base64').toString('binary');
    const encrypted = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        encrypted[i] = str.charCodeAt(i);
    }
    
    // XOR decrypt
    const decrypted = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
        decrypted[i] = encrypted[i] ^ ENCRYPT_KEY.charCodeAt(i % ENCRYPT_KEY.length);
    }
    
    // Parse events
    const events = [];
    let currentTime = 0;
    
    for (let i = 0; i < decrypted.length; i += 3) {
        const deltaHigh = decrypted[i];
        const deltaLow = decrypted[i + 1];
        const eventType = decrypted[i + 2];
        
        const delta = (deltaHigh << 8) | deltaLow;
        currentTime += delta;
        
        events.push([currentTime, eventType]);
    }
    
    return events;
}

// Generate checksum (must match client)
function generateChecksum(events, finalTime) {
    let hash = 0;
    
    for (const [time, eventType] of events) {
        hash = ((hash << 5) - hash + time) | 0;
        hash = ((hash << 5) - hash + eventType) | 0;
    }
    
    hash = ((hash << 5) - hash + (finalTime | 0)) | 0;
    hash = ((hash << 5) - hash + events.length) | 0;
    
    return (hash >>> 0).toString(16).padStart(8, '0');
}

// Get input state at time from events
function getInputAtTime(events, time) {
    const state = { forward: false, backward: false, left: false, right: false, handbrake: false };
    const keys = ['forward', 'backward', 'left', 'right', 'handbrake'];
    
    for (const [eventTime, eventType] of events) {
        if (eventTime > time) break;
        
        const isDown = eventType < 5;
        const keyIndex = isDown ? eventType : eventType - 5;
        const key = keys[keyIndex];
        
        if (key) state[key] = isDown;
    }
    
    return state;
}

// Simulate the run and validate
function simulateRun(events, reportedTime) {
    const errors = [];
    
    // Initial state
    let pos = { x: TRACK.startPos.x, z: TRACK.startPos.z };
    let vel = { x: 0, z: 0 };
    let rotation = Math.atan2(
        TRACK.checkPoints[1].x - TRACK.checkPoints[0].x,
        TRACK.checkPoints[1].z - TRACK.checkPoints[0].z
    );
    
    let hasLeftStart = false;
    let finished = false;
    let finishTime = 0;
    
    const dt = PHYSICS.frameInterval;
    const maxTime = reportedTime + 5000; // Allow 5s tolerance
    
    // Simulate at 60fps
    for (let time = 0; time < maxTime && !finished; time += dt * 1000) {
        const input = getInputAtTime(events, time);
        
        // Calculate forward direction
        const forward = { x: Math.sin(rotation), z: Math.cos(rotation) };
        const right = { x: Math.cos(rotation), z: -Math.sin(rotation) };
        
        // Current speed in forward direction
        const currentSpeed = vel.x * forward.x + vel.z * forward.z;
        
        // Acceleration
        if (input.forward) {
            vel.x += forward.x * PHYSICS.acceleration * dt;
            vel.z += forward.z * PHYSICS.acceleration * dt;
        }
        
        // Braking
        if (input.backward) {
            vel.x -= forward.x * PHYSICS.brakeForce * dt;
            vel.z -= forward.z * PHYSICS.brakeForce * dt;
            vel.x *= 0.92;
            vel.z *= 0.92;
        }
        
        // Steering
        const steerAmount = Math.abs(currentSpeed) > 0.5 ? 1 : Math.max(0.3, Math.abs(currentSpeed) / 0.5);
        if (input.left && Math.abs(currentSpeed) > 0.1) {
            rotation += PHYSICS.turnSpeed * dt * steerAmount;
        }
        if (input.right && Math.abs(currentSpeed) > 0.1) {
            rotation -= PHYSICS.turnSpeed * dt * steerAmount;
        }
        
        // Handbrake
        if (input.handbrake) {
            const lateralSpeed = vel.x * right.x + vel.z * right.z;
            vel.x -= right.x * lateralSpeed * 0.05;
            vel.z -= right.z * lateralSpeed * 0.05;
            vel.x *= 0.97;
            vel.z *= 0.97;
        }
        
        // Speed limit
        const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
        if (speed > PHYSICS.maxSpeed) {
            vel.x = (vel.x / speed) * PHYSICS.maxSpeed;
            vel.z = (vel.z / speed) * PHYSICS.maxSpeed;
        }
        
        // Friction
        const frictionMult = Math.pow(PHYSICS.friction, dt * 60);
        vel.x *= frictionMult;
        vel.z *= frictionMult;
        
        // Lateral friction
        if (!input.handbrake) {
            const lateralSpeed = vel.x * right.x + vel.z * right.z;
            vel.x -= right.x * lateralSpeed * 0.1;
            vel.z -= right.z * lateralSpeed * 0.1;
        }
        
        // Update position
        pos.x += vel.x * dt;
        pos.z += vel.z * dt;
        
        // Check finish line
        const distFromStart = Math.sqrt(
            Math.pow(pos.x - TRACK.startPos.x, 2) + 
            Math.pow(pos.z - TRACK.startPos.z, 2)
        );
        
        if (!hasLeftStart && distFromStart > TRACK.finishRadius * 2) {
            hasLeftStart = true;
        }
        
        if (hasLeftStart && distFromStart < TRACK.finishRadius && time > 5000) {
            finished = true;
            finishTime = time;
        }
    }
    
    // Validation checks
    if (!finished) {
        errors.push('Simulation did not complete the track');
    }
    
    // Allow 10% tolerance on time
    const timeTolerance = reportedTime * 0.1;
    if (Math.abs(finishTime - reportedTime) > timeTolerance) {
        errors.push(`Time mismatch: simulated ${finishTime}ms vs reported ${reportedTime}ms`);
    }
    
    return {
        valid: errors.length === 0,
        errors,
        simulatedTime: finishTime
    };
}

// Main validation function
export const validateAndSubmitRun = onCall(async (request) => {
    const { name, time, inputs, checksum } = request.data;
    
    // Basic validation
    if (!inputs || !checksum || !time) {
        throw new HttpsError('invalid-argument', 'Missing required fields');
    }
    
    if (typeof time !== 'number' || time < 10000) {
        throw new HttpsError('invalid-argument', 'Invalid time');
    }
    
    if (typeof name !== 'string' || name.length > 20) {
        throw new HttpsError('invalid-argument', 'Invalid name');
    }
    
    try {
        // Decode events
        const events = decodeEvents(inputs);
        
        if (events.length < 10) {
            throw new HttpsError('invalid-argument', 'Too few input events');
        }
        
        // Verify checksum
        const expectedChecksum = generateChecksum(events, time);
        if (checksum !== expectedChecksum) {
            throw new HttpsError('invalid-argument', 'Checksum mismatch - data tampered');
        }
        
        // Simulate and validate the run
        const simulation = simulateRun(events, time);
        
        if (!simulation.valid) {
            throw new HttpsError('invalid-argument', `Validation failed: ${simulation.errors.join(', ')}`);
        }
        
        // Check if qualifies for top 10
        const leaderboardRef = db.collection('leaderboard');
        const topTen = await leaderboardRef.orderBy('time', 'asc').limit(10).get();
        
        let qualifies = topTen.size < 10;
        if (!qualifies && topTen.size > 0) {
            const worstTime = topTen.docs[topTen.size - 1].data().time;
            qualifies = time < worstTime;
        }
        
        if (!qualifies) {
            return { success: false, message: 'Time does not qualify for top 10' };
        }
        
        // Add to leaderboard
        const docRef = await leaderboardRef.add({
            name: name || 'Player',
            time: time,
            inputs: inputs,
            checksum: checksum,
            timestamp: FieldValue.serverTimestamp(),
            simulatedTime: simulation.simulatedTime
        });
        
        // Get new rank
        const newTop = await leaderboardRef.orderBy('time', 'asc').limit(10).get();
        let rank = 0;
        newTop.docs.forEach((doc, index) => {
            if (doc.id === docRef.id) rank = index + 1;
        });
        
        // Clean up entries beyond top 10
        if (newTop.size > 10) {
            const toDelete = await leaderboardRef.orderBy('time', 'desc').limit(newTop.size - 10).get();
            const batch = db.batch();
            toDelete.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
        
        return { 
            success: true, 
            rank: rank,
            message: `Rank #${rank} on leaderboard!`
        };
        
    } catch (error) {
        if (error instanceof HttpsError) throw error;
        console.error('Validation error:', error);
        throw new HttpsError('internal', 'Validation failed');
    }
});

// Get leaderboard (public, no auth required)
export const getLeaderboard = onCall(async () => {
    const leaderboardRef = db.collection('leaderboard');
    const snapshot = await leaderboardRef.orderBy('time', 'asc').limit(10).get();
    
    const entries = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        entries.push({
            name: data.name,
            time: data.time,
            inputs: data.inputs, // Include for ghost replay
            timestamp: data.timestamp?.toMillis() || Date.now()
        });
    });
    
    return { entries };
});
