import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDF6XZnMX8Ktmin-LG7Y7qKgDtRLG3VFpI",
  appId: "1:834586265562:web:998e66fc463f5ab43ca2e3",
  authDomain: "stardew-valley-planner.firebaseapp.com",
  measurementId: "G-186YYV9CWK",
  messagingSenderId: "834586265562",
  projectId: "stardew-valley-planner",
  storageBucket: "stardew-valley-planner.appspot.com",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
