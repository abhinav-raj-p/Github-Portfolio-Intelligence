const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

let db;

try {
    // Optionally connect to Firebase if FIREBASE_PROJECT_ID is provided
    if (process.env.FIREBASE_PROJECT_ID) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: process.env.FIREBASE_PROJECT_ID
        });
        db = admin.firestore();
        console.log('Firebase initialized');
    } else {
        console.warn('Firebase initialized in mock mode (no project ID provided)');
        // Mock DB for local testing without firebase
        db = {
            collection: () => ({
                doc: () => ({
                    set: async () => { },
                    get: async () => ({ exists: false, data: () => ({}) })
                }),
                add: async () => ({ id: 'mock-id' })
            })
        };
    }
} catch (error) {
    console.error('Firebase initialization error', error);
}

module.exports = { db };
