/**
 * GhostRecorder - Compressed snapshot recording (like video codecs)
 * 
 * Uses predictive coding + delta compression:
 * - Keyframes: Full state every 1 second (like I-frames)
 * - Delta frames: Prediction residuals only (like P-frames)
 * - Run-length encoding for repeated zero-residuals (straight lines)
 * - Variable-byte encoding for small values
 * 
 * Compression ratio: ~10-20x vs raw snapshots
 * Typical 30s run: ~500-1000 bytes
 */

const ENCRYPT_KEY = 'ChipsRacing2024!';
const SNAPSHOT_INTERVAL = 50; // 20 Hz
const KEYFRAME_INTERVAL = 1000; // Keyframe every 1 second
const POSITION_PRECISION = 100; // 0.01 unit precision
const ROTATION_PRECISION = 1000; // 0.001 rad precision

export class GhostRecorder {
    constructor() {
        this.snapshots = [];
        this.isRecording = false;
        this.lastSnapshotTime = 0;
    }
    
    startRecording() {
        this.snapshots = [];
        this.isRecording = true;
        this.lastSnapshotTime = 0;
    }
    
    stopRecording() {
        this.isRecording = false;
        return this.snapshots.slice();
    }
    
    recordFrame(raceTime, position, rotation, velocity) {
        if (!this.isRecording) return;
        if (raceTime - this.lastSnapshotTime < SNAPSHOT_INTERVAL) return;
        this.lastSnapshotTime = raceTime;
        
        this.snapshots.push({
            time: Math.round(raceTime),
            x: position.x,
            z: position.z,
            rotY: rotation.y,
            vx: velocity.x,
            vz: velocity.z
        });
    }
    
    // Compress snapshots using predictive coding
    encode(snapshots) {
        if (!snapshots || snapshots.length === 0) return '';
        
        const frames = [];
        let lastKeyframe = null;
        let lastFrame = null;
        let runLength = 0;
        let pendingResiduals = [];
        
        for (let i = 0; i < snapshots.length; i++) {
            const snap = snapshots[i];
            const isKeyframe = i === 0 || (snap.time - (lastKeyframe?.time || 0)) >= KEYFRAME_INTERVAL;
            
            if (isKeyframe) {
                // Flush any pending run-length
                if (runLength > 0) {
                    frames.push({ type: 'run', count: runLength });
                    runLength = 0;
                }
                if (pendingResiduals.length > 0) {
                    frames.push({ type: 'deltas', deltas: pendingResiduals });
                    pendingResiduals = [];
                }
                
                // Write keyframe (full state)
                frames.push({
                    type: 'key',
                    time: snap.time,
                    x: snap.x,
                    z: snap.z,
                    rotY: snap.rotY,
                    vx: snap.vx,
                    vz: snap.vz
                });
                lastKeyframe = snap;
                lastFrame = snap;
            } else {
                // Delta frame: predict from last frame using velocity
                const dt = (snap.time - lastFrame.time) / 1000;
                const predictedX = lastFrame.x + lastFrame.vx * dt;
                const predictedZ = lastFrame.z + lastFrame.vz * dt;
                
                // Calculate residuals (prediction errors)
                const residualX = Math.round((snap.x - predictedX) * POSITION_PRECISION);
                const residualZ = Math.round((snap.z - predictedZ) * POSITION_PRECISION);
                const residualRot = Math.round((snap.rotY - lastFrame.rotY) * ROTATION_PRECISION);
                const residualVx = Math.round((snap.vx - lastFrame.vx) * POSITION_PRECISION);
                const residualVz = Math.round((snap.vz - lastFrame.vz) * POSITION_PRECISION);
                
                // Check if all residuals are zero (straight line motion)
                if (residualX === 0 && residualZ === 0 && 
                    Math.abs(residualRot) < 5 && residualVx === 0 && residualVz === 0) {
                    // Run-length encode zero residuals
                    if (pendingResiduals.length > 0) {
                        frames.push({ type: 'deltas', deltas: pendingResiduals });
                        pendingResiduals = [];
                    }
                    runLength++;
                } else {
                    // Flush run-length if any
                    if (runLength > 0) {
                        frames.push({ type: 'run', count: runLength });
                        runLength = 0;
                    }
                    pendingResiduals.push({ residualX, residualZ, residualRot, residualVx, residualVz });
                }
                
                lastFrame = snap;
            }
        }
        
        // Flush remaining
        if (runLength > 0) {
            frames.push({ type: 'run', count: runLength });
        }
        if (pendingResiduals.length > 0) {
            frames.push({ type: 'deltas', deltas: pendingResiduals });
        }
        
        // Serialize to bytes
        const bytes = this.serializeFrames(frames);
        const encrypted = this.encrypt(new Uint8Array(bytes));
        return btoa(String.fromCharCode(...encrypted));
    }
    
    serializeFrames(frames) {
        const bytes = [];
        
        for (const frame of frames) {
            if (frame.type === 'key') {
                bytes.push(0x01); // Keyframe marker
                this.writeVarInt(bytes, frame.time);
                this.writeSignedVarInt(bytes, Math.round(frame.x * POSITION_PRECISION));
                this.writeSignedVarInt(bytes, Math.round(frame.z * POSITION_PRECISION));
                this.writeSignedVarInt(bytes, Math.round(frame.rotY * ROTATION_PRECISION));
                this.writeSignedVarInt(bytes, Math.round(frame.vx * POSITION_PRECISION));
                this.writeSignedVarInt(bytes, Math.round(frame.vz * POSITION_PRECISION));
            } else if (frame.type === 'run') {
                bytes.push(0x02); // Run-length marker
                this.writeVarInt(bytes, frame.count);
            } else if (frame.type === 'deltas') {
                bytes.push(0x03); // Delta batch marker
                this.writeVarInt(bytes, frame.deltas.length);
                for (const d of frame.deltas) {
                    this.writeSignedVarInt(bytes, d.residualX);
                    this.writeSignedVarInt(bytes, d.residualZ);
                    this.writeSignedVarInt(bytes, d.residualRot);
                    this.writeSignedVarInt(bytes, d.residualVx);
                    this.writeSignedVarInt(bytes, d.residualVz);
                }
            }
        }
        
        return bytes;
    }
    
    // Variable-length integer encoding (like protobuf varint)
    writeVarInt(bytes, value) {
        value = Math.abs(Math.round(value));
        while (value >= 0x80) {
            bytes.push((value & 0x7F) | 0x80);
            value >>>= 7;
        }
        bytes.push(value);
    }
    
    readVarInt(bytes, offset) {
        let value = 0;
        let shift = 0;
        let byte;
        do {
            byte = bytes[offset.pos++];
            value |= (byte & 0x7F) << shift;
            shift += 7;
        } while (byte >= 0x80);
        return value;
    }
    
    // Signed varint (zigzag encoding)
    writeSignedVarInt(bytes, value) {
        // Zigzag encode: (value << 1) ^ (value >> 31)
        const zigzag = (value << 1) ^ (value >> 31);
        this.writeVarInt(bytes, zigzag);
    }
    
    readSignedVarInt(bytes, offset) {
        const zigzag = this.readVarInt(bytes, offset);
        return (zigzag >>> 1) ^ -(zigzag & 1);
    }
    
    // Decode compressed data back to snapshots
    decode(encoded) {
        if (!encoded) return [];
        
        try {
            const str = atob(encoded);
            const encrypted = new Uint8Array(str.length);
            for (let i = 0; i < str.length; i++) {
                encrypted[i] = str.charCodeAt(i);
            }
            const bytes = this.decrypt(encrypted);
            
            const snapshots = [];
            const offset = { pos: 0 };
            let lastSnap = null;
            
            while (offset.pos < bytes.length) {
                const marker = bytes[offset.pos++];
                
                if (marker === 0x01) {
                    // Keyframe
                    const time = this.readVarInt(bytes, offset);
                    const x = this.readSignedVarInt(bytes, offset) / POSITION_PRECISION;
                    const z = this.readSignedVarInt(bytes, offset) / POSITION_PRECISION;
                    const rotY = this.readSignedVarInt(bytes, offset) / ROTATION_PRECISION;
                    const vx = this.readSignedVarInt(bytes, offset) / POSITION_PRECISION;
                    const vz = this.readSignedVarInt(bytes, offset) / POSITION_PRECISION;
                    
                    lastSnap = { time, x, z, rotY, vx, vz };
                    snapshots.push(lastSnap);
                    
                } else if (marker === 0x02) {
                    // Run-length (zero residuals)
                    const count = this.readVarInt(bytes, offset);
                    for (let i = 0; i < count; i++) {
                        const dt = SNAPSHOT_INTERVAL / 1000;
                        const newSnap = {
                            time: lastSnap.time + SNAPSHOT_INTERVAL,
                            x: lastSnap.x + lastSnap.vx * dt,
                            z: lastSnap.z + lastSnap.vz * dt,
                            rotY: lastSnap.rotY,
                            vx: lastSnap.vx,
                            vz: lastSnap.vz
                        };
                        snapshots.push(newSnap);
                        lastSnap = newSnap;
                    }
                    
                } else if (marker === 0x03) {
                    // Delta batch
                    const count = this.readVarInt(bytes, offset);
                    for (let i = 0; i < count; i++) {
                        const residualX = this.readSignedVarInt(bytes, offset) / POSITION_PRECISION;
                        const residualZ = this.readSignedVarInt(bytes, offset) / POSITION_PRECISION;
                        const residualRot = this.readSignedVarInt(bytes, offset) / ROTATION_PRECISION;
                        const residualVx = this.readSignedVarInt(bytes, offset) / POSITION_PRECISION;
                        const residualVz = this.readSignedVarInt(bytes, offset) / POSITION_PRECISION;
                        
                        const dt = SNAPSHOT_INTERVAL / 1000;
                        const predictedX = lastSnap.x + lastSnap.vx * dt;
                        const predictedZ = lastSnap.z + lastSnap.vz * dt;
                        
                        const newSnap = {
                            time: lastSnap.time + SNAPSHOT_INTERVAL,
                            x: predictedX + residualX,
                            z: predictedZ + residualZ,
                            rotY: lastSnap.rotY + residualRot,
                            vx: lastSnap.vx + residualVx,
                            vz: lastSnap.vz + residualVz
                        };
                        snapshots.push(newSnap);
                        lastSnap = newSnap;
                    }
                }
            }
            
            return snapshots;
        } catch (e) {
            console.error('Failed to decode recording:', e);
            return [];
        }
    }
    
    encrypt(data) {
        const result = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            result[i] = data[i] ^ ENCRYPT_KEY.charCodeAt(i % ENCRYPT_KEY.length);
        }
        return result;
    }
    
    decrypt(data) {
        return this.encrypt(data);
    }
    
    generateChecksum(snapshots, finalTime) {
        let hash = 0;
        for (const snap of snapshots) {
            hash = ((hash << 5) - hash + Math.round(snap.x * 100)) | 0;
            hash = ((hash << 5) - hash + Math.round(snap.z * 100)) | 0;
        }
        hash = ((hash << 5) - hash + (finalTime | 0)) | 0;
        hash = ((hash << 5) - hash + snapshots.length) | 0;
        return (hash >>> 0).toString(16).padStart(8, '0');
    }
    
    validateClient(snapshots, finalTime) {
        if (!snapshots || snapshots.length < 50) {
            return { valid: false, errors: ['Recording too short'] };
        }
        if (finalTime < 10000) {
            return { valid: false, errors: ['Impossible completion time'] };
        }
        
        let lastTime = 0;
        for (const snap of snapshots) {
            if (snap.time < lastTime) {
                return { valid: false, errors: ['Snapshots out of order'] };
            }
            lastTime = snap.time;
        }
        
        for (let i = 1; i < snapshots.length; i++) {
            const dx = snapshots[i].x - snapshots[i-1].x;
            const dz = snapshots[i].z - snapshots[i-1].z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            const dt = (snapshots[i].time - snapshots[i-1].time) / 1000;
            if (dt > 0 && dist / dt > 50) {
                return { valid: false, errors: ['Teleportation detected'] };
            }
        }
        
        return { valid: true, errors: [] };
    }
    
    getStateAtTime(snapshots, time) {
        if (!snapshots || snapshots.length === 0) return null;
        if (time <= snapshots[0].time) return snapshots[0];
        if (time >= snapshots[snapshots.length - 1].time) return null;
        
        // Binary search
        let low = 0, high = snapshots.length - 1;
        while (low < high - 1) {
            const mid = Math.floor((low + high) / 2);
            if (snapshots[mid].time <= time) low = mid;
            else high = mid;
        }
        
        const prev = snapshots[low];
        const next = snapshots[high];
        const t = (time - prev.time) / (next.time - prev.time);
        
        return {
            time,
            x: prev.x + (next.x - prev.x) * t,
            z: prev.z + (next.z - prev.z) * t,
            rotY: this.lerpAngle(prev.rotY, next.rotY, t),
            speed: Math.sqrt(prev.vx*prev.vx + prev.vz*prev.vz)
        };
    }
    
    lerpAngle(a, b, t) {
        let diff = b - a;
        if (diff > Math.PI) diff -= Math.PI * 2;
        else if (diff < -Math.PI) diff += Math.PI * 2;
        return a + diff * t;
    }
}

export const ghostRecorder = new GhostRecorder();
export const inputRecorder = ghostRecorder;
