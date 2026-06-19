import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDWsdDfrUrd4g-F4AOqpt6HKlFK4HJY65o",
  authDomain: "trendline-mvp.firebaseapp.com",
  projectId: "trendline-mvp",
  storageBucket: "trendline-mvp.firebasestorage.app",
  messagingSenderId: "145984945026",
  appId: "1:145984945026:web:63fda3187d1c3c34352d9b"
};

// Initialize Firebase and Auth
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Handle form submission
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');
// Clear error message when user starts typing or focuses inputs
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

const clearError = () => {
  if (errorMessage) errorMessage.textContent = '';
};

if (emailInput) {
  emailInput.addEventListener('input', clearError);
}
if (passwordInput) {
  passwordInput.addEventListener('input', clearError);
}
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  // Clear previous error message
  errorMessage.textContent = '';
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      console.log("Logged in successfully:", userCredential.user);
      // Redirect to trendline page on successful login
      window.location.href = 'trendline.html';
    })
    .catch((error) => {
      console.error("Login failed:", error.code, error.message);
      
      // Handle specific error cases
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        errorMessage.textContent = '⚠ Incorrect password';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage.textContent = '⚠ User not found';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage.textContent = '⚠ Invalid email address';
      } else {
        errorMessage.textContent = '⚠ ' + error.message;
      }
    });
});
