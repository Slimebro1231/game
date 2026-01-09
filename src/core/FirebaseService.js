/**
 * FirebaseService - Direct Firestore access with map-specific leaderboards
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, limit, where } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyB-ggssXM7z_RL5VtWrvPXPOGmhOir8deM",
    authDomain: "game-dce50.firebaseapp.com",
    projectId: "game-dce50",
    storageBucket: "game-dce50.firebasestorage.app",
    messagingSenderId: "804268338183",
    appId: "1:804268338183:web:41adca241c98446098cea2",
    measurementId: "G-2MR89YGYGB"
};

let app = null;
let db = null;

export class FirebaseService {
    constructor() {
        this.initialized = false;
        this.init();
    }
    
    init() {
        try {
            app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            this.initialized = true;
            console.log('Firebase initialized');
        } catch (e) {
            console.error('Firebase init failed:', e);
            this.initialized = false;
        }
    }
    
    async fetchLeaderboard(mapId = 'default') {
        if (!this.initialized || !db) {
            console.warn('Firebase not initialized');
            return [];
        }
        
        try {
            const leaderboardRef = collection(db, 'leaderboard');
            // Query by mapId, order by time, limit to 10
            const q = query(
                leaderboardRef, 
                where('mapID', '==', mapId),
                orderBy('time', 'asc'), 
                limit(10)
            );
            const snapshot = await getDocs(q);
            
            const entries = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                entries.push({
                    id: doc.id,
                    name: data.name,
                    time: data.time,
                    inputs: data.inputs,
                    mapId: data.mapId,
                    timestamp: data.timestamp
                });
            });
            
            console.log(`Fetched ${entries.length} entries for map: ${mapId}`);
            return entries;
        } catch (e) {
            console.error('Failed to fetch leaderboard:', e);
            return [];
        }
    }
    
    async submitRun(name, time, encodedData, checksum, mapId = 'default') {
        if (!this.initialized || !db) {
            return { success: false, error: 'Firebase not initialized' };
        }
        
        try {
            // Check if qualifies for top 10 on this map
            const currentTop = await this.fetchLeaderboard(mapId);
            
            if (currentTop.length >= 10 && time >= currentTop[currentTop.length - 1].time) {
                return { success: false, error: 'Does not qualify for top 10' };
            }
            
            // Add new entry
            const leaderboardRef = collection(db, 'leaderboard');
            const docRef = await addDoc(leaderboardRef, {
                name: name || 'Player',
                time: time,
                inputs: encodedData,
                checksum: checksum,
                mapID: mapId,
                timestamp: Date.now()
            });
            
            console.log('Run submitted to Firebase:', docRef.id, 'Map:', mapId);
            
            // Clean up if more than 10 entries for this map
            const newTop = await this.fetchLeaderboard(mapId);
            if (newTop.length > 10) {
                const sortedByTime = [...newTop].sort((a, b) => b.time - a.time);
                for (let i = 0; i < sortedByTime.length - 10; i++) {
                    try {
                        await deleteDoc(doc(db, 'leaderboard', sortedByTime[i].id));
                        console.log('Deleted old entry:', sortedByTime[i].id);
                    } catch (e) {
                        console.warn('Failed to delete old entry:', e);
                    }
                }
            }
            
            const rank = newTop.filter(e => e.time < time).length + 1;
            
            return { success: true, rank };
        } catch (e) {
            console.error('Failed to submit run:', e);
            return { success: false, error: e.message };
        }
    }
    
    // Clear all entries for a specific map (for map updates)
    async clearLeaderboard(mapId = 'default') {
        if (!this.initialized || !db) {
            return { success: false, error: 'Firebase not initialized' };
        }
        
        try {
            const leaderboardRef = collection(db, 'leaderboard');
            const q = query(leaderboardRef, where('mapID', '==', mapId));
            const snapshot = await getDocs(q);
            
            let deleted = 0;
            for (const docSnap of snapshot.docs) {
                await deleteDoc(doc(db, 'leaderboard', docSnap.id));
                deleted++;
            }
            
            console.log(`Cleared ${deleted} entries for map: ${mapId}`);
            return { success: true, deleted };
        } catch (e) {
            console.error('Failed to clear leaderboard:', e);
            return { success: false, error: e.message };
        }
    }
}

export const firebaseService = new FirebaseService();
