// auth.js - Authentication System (Google & Email/Password)
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyD43R9_h0qZc5TFTrBn_Zt76Il3jDKP7kw",
    authDomain: "greenomics-id.firebaseapp.com",
    projectId: "greenomics-id",
    storageBucket: "greenomics-id.firebasestorage.app",
    messagingSenderId: "5727343643",
    appId: "1:5727343643:web:0b84a6197ee989aa5dd4be"
};

// Initialize Firebase - Check if app already exists
let app;
try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
        // Use existing app
        app = existingApps[0];
        console.log('✅ Using existing Firebase app in auth.js');
    } else {
        // Initialize new app
        app = initializeApp(firebaseConfig);
        console.log('✅ Firebase app initialized in auth.js');
    }
} catch (error) {
    console.error('❌ Error initializing Firebase in auth.js:', error);
    // Fallback: try to initialize anyway
    app = initializeApp(firebaseConfig);
}

const auth = getAuth(app);
const db = getFirestore(app);

// Google Auth Provider
const provider = new GoogleAuthProvider();
provider.addScope('email');
provider.addScope('profile');

class SimpleAuth {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        
        // Listen for auth state changes
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.currentUser = await this.createOrUpdateUser(user);
                this.isAuthenticated = true;
                console.log('User logged in:', this.currentUser);
            } else {
                this.currentUser = null;
                this.isAuthenticated = false;
                console.log('User logged out');
            }
        });
    }

    // Google Sign In
    async signInWithGoogle() {
        try {
            console.log('Starting Google Sign In...');
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            console.log('Google Sign In successful:', user);
            return { success: true, user: user };
            
        } catch (error) {
            console.error('Google Sign In error:', error);
            
            // Handle specific errors
            if (error.code === 'auth/popup-blocked') {
                throw new Error('Popup diblokir oleh browser. Silakan izinkan popup untuk situs ini.');
            } else if (error.code === 'auth/popup-closed-by-user') {
                throw new Error('Login dibatalkan oleh pengguna.');
            } else if (error.code === 'auth/operation-not-allowed') {
                throw new Error('Google Sign-in tidak diaktifkan. Hubungi administrator.');
            } else if (error.code === 'auth/unauthorized-domain') {
                throw new Error('Domain tidak diizinkan. Hubungi administrator.');
            } else {
                throw new Error(`Login gagal: ${error.message}`);
            }
        }
    }

    // Sign Up with Email and Password
    async signUpWithEmail(email, password, displayName = '') {
        try {
            console.log('Starting Email Sign Up...');
            const result = await createUserWithEmailAndPassword(auth, email, password);
            const user = result.user;
            
            // Update display name if provided
            if (displayName) {
                await updateProfile(user, { displayName: displayName });
            }
            
            console.log('Email Sign Up successful:', user);
            return { success: true, user: user };
            
        } catch (error) {
            console.error('Email Sign Up error:', error);
            
            // Handle specific errors
            if (error.code === 'auth/email-already-in-use') {
                throw new Error('Email sudah terdaftar. Silakan gunakan email lain atau login.');
            } else if (error.code === 'auth/invalid-email') {
                throw new Error('Format email tidak valid.');
            } else if (error.code === 'auth/weak-password') {
                throw new Error('Password terlalu lemah. Minimal 6 karakter.');
            } else {
                throw new Error(`Registrasi gagal: ${error.message}`);
            }
        }
    }

    // Sign In with Email and Password
    async signInWithEmail(email, password) {
        try {
            console.log('Starting Email Sign In...');
            const result = await signInWithEmailAndPassword(auth, email, password);
            const user = result.user;
            
            console.log('Email Sign In successful:', user);
            return { success: true, user: user };
            
        } catch (error) {
            console.error('Email Sign In error:', error);
            
            // Handle specific errors
            if (error.code === 'auth/user-not-found') {
                throw new Error('Email tidak terdaftar. Silakan daftar terlebih dahulu.');
            } else if (error.code === 'auth/wrong-password') {
                throw new Error('Password salah. Silakan coba lagi.');
            } else if (error.code === 'auth/invalid-email') {
                throw new Error('Format email tidak valid.');
            } else if (error.code === 'auth/invalid-credential') {
                throw new Error('Email atau password salah.');
            } else if (error.code === 'auth/too-many-requests') {
                throw new Error('Terlalu banyak percobaan login. Silakan coba lagi nanti.');
            } else {
                throw new Error(`Login gagal: ${error.message}`);
            }
        }
    }

    // Send Password Reset Email
    async resetPassword(email) {
        try {
            console.log('Sending password reset email...');
            await sendPasswordResetEmail(auth, email);
            console.log('Password reset email sent successfully');
            return { success: true };
            
        } catch (error) {
            console.error('Password reset error:', error);
            
            // Handle specific errors
            if (error.code === 'auth/user-not-found') {
                throw new Error('Email tidak terdaftar.');
            } else if (error.code === 'auth/invalid-email') {
                throw new Error('Format email tidak valid.');
            } else {
                throw new Error(`Gagal mengirim email reset password: ${error.message}`);
            }
        }
    }

    // Sign Out
    async signOut() {
        try {
            await signOut(auth);
            console.log('User signed out successfully');
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            throw new Error('Gagal logout');
        }
    }

    // Create or update user in Firestore
    async createOrUpdateUser(user) {
        try {
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            
            const userData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                lastLogin: serverTimestamp(),
                role: 'user' // Default role
            };

            if (!userDoc.exists()) {
                // New user - create document
                await setDoc(userRef, {
                    ...userData,
                    createdAt: serverTimestamp(),
                    stats: {
                        forumPosts: 0,
                        quizCompleted: 0,
                        activeDays: 1
                    }
                });
                console.log('New user created:', userData);
            } else {
                // Existing user - update last login
                await setDoc(userRef, {
                    ...userData,
                    stats: userDoc.data().stats || {
                        forumPosts: 0,
                        quizCompleted: 0,
                        activeDays: 1
                    }
                }, { merge: true });
                console.log('Existing user updated:', userData);
            }

            return userData;
            
        } catch (error) {
            console.error('Error creating/updating user:', error);
            // Return basic user data even if Firestore fails
            return {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: 'user'
            };
        }
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is authenticated
    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    // Wait for auth initialization
    waitForAuth() {
        return new Promise((resolve) => {
            if (auth.currentUser !== null) {
                resolve(auth.currentUser);
            } else {
                const unsubscribe = onAuthStateChanged(auth, (user) => {
                    unsubscribe();
                    resolve(user);
                });
            }
        });
    }
}

// Create global auth instance
const authInstance = new SimpleAuth();

// Export for use in other files
export { authInstance, auth, db };
export default authInstance;
