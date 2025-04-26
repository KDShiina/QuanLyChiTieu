// src/firebaseConfig.js

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB66H3Lr6xCPj5_Ghl7x7A0FE6r81l7uV4",
  authDomain: "budgetingapp-79c71.firebaseapp.com",
  projectId: "budgetingapp-79c71",
  storageBucket: "budgetingapp-79c71.firebasestorage.app",
  messagingSenderId: "827124322059",
  appId: "1:827124322059:web:b4549e018bf6d96f179c0e",
  measurementId: "G-TXCJSC0GPK"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);

// Khởi tạo Firestore và Storage
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };
