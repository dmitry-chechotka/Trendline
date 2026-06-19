import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';

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

// Login form elements
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');
const createAccountButton = document.getElementById('createAccountButton');
const successMessage = document.getElementById('successMessage');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
let loginPasswordRevealTimer = null;
let loginActualPassword = '';

if (successMessage) {
  const params = new URLSearchParams(window.location.search);
  if (params.get('registered') === '1') {
    successMessage.textContent = 'Successfully created a new account!';
  }
}

const clearError = () => {
  if (errorMessage) errorMessage.textContent = '';
};

if (emailInput) {
  emailInput.addEventListener('input', clearError);
}
if (passwordInput) {
  passwordInput.addEventListener('input', (event) => {
    clearError();
    clearTimeout(loginPasswordRevealTimer);
    const input = event.currentTarget;
    const { inputType, data } = event;

    if (inputType === 'insertText' && data) {
      loginActualPassword += data;
    } else if (inputType === 'insertFromPaste' && data) {
      loginActualPassword += data;
    } else if (inputType === 'deleteContentBackward') {
      loginActualPassword = loginActualPassword.slice(0, -1);
    } else if (inputType === 'deleteContentForward') {
      loginActualPassword = loginActualPassword.slice(0, -1);
    } else if (inputType === 'insertFromDrop' && data) {
      loginActualPassword += data;
    } else {
      loginActualPassword = loginActualPassword.slice(0, input.value.length);
    }

    if (loginActualPassword.length === 0) {
      input.type = 'password';
      input.value = '';
      return;
    }

    const masked = '*'.repeat(Math.max(loginActualPassword.length - 1, 0));
    input.value = masked + loginActualPassword.slice(-1);
    input.type = 'text';

    loginPasswordRevealTimer = setTimeout(() => {
      input.type = 'password';
      input.value = '*'.repeat(loginActualPassword.length);
    }, 500);
  });
}
if (createAccountButton) {
  createAccountButton.addEventListener('click', () => {
    window.location.href = 'registration.html';
  });
}

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!errorMessage) return;

    errorMessage.textContent = '';

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    signInWithEmailAndPassword(auth, email, loginActualPassword)
      .then((userCredential) => {
        console.log('Logged in successfully:', userCredential.user);
        window.location.href = 'home.html';
      })
      .catch((error) => {
        console.error('Login failed:', error.code, error.message);

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
}

// Registration form elements
const registrationForm = document.getElementById('registrationForm');
const returnButton = document.getElementById('returnButton');
const registerUsernameInput = document.getElementById('username');
const registerEmailInput = document.getElementById('registerEmail');
const registerPasswordInput = document.getElementById('registerPassword');
const registerErrorMessage = document.getElementById('registerErrorMessage');
let passwordRevealTimer = null;
let actualPassword = '';

if (registerPasswordInput) {
  registerPasswordInput.addEventListener('input', (event) => {
    clearTimeout(passwordRevealTimer);
    const input = event.currentTarget;
    const { inputType, data } = event;

    if (inputType === 'insertText' && data) {
      actualPassword += data;
    } else if (inputType === 'insertFromPaste' && data) {
      actualPassword += data;
    } else if (inputType === 'deleteContentBackward') {
      actualPassword = actualPassword.slice(0, -1);
    } else if (inputType === 'deleteContentForward') {
      actualPassword = actualPassword.slice(0, -1);
    } else if (inputType === 'insertFromDrop' && data) {
      actualPassword += data;
    } else {
      actualPassword = actualPassword.slice(0, input.value.length);
    }

    if (actualPassword.length === 0) {
      input.type = 'password';
      input.value = '';
      return;
    }

    const masked = '*'.repeat(Math.max(actualPassword.length - 1, 0));
    input.value = masked + actualPassword.slice(-1);
    input.type = 'text';

    passwordRevealTimer = setTimeout(() => {
      input.type = 'password';
      input.value = '*'.repeat(actualPassword.length);
    }, 500);
  });
}

if (returnButton) {
  returnButton.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
}

if (registrationForm) {
  registrationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!registerErrorMessage) return;

    registerErrorMessage.textContent = '';

    const username = registerUsernameInput?.value.trim();
    const email = registerEmailInput.value.trim();
    const password = actualPassword;

    if (!username) {
      registerErrorMessage.textContent = 'Please enter a username.';
      return;
    }

    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        if (userCredential.user && username) {
          updateProfile(userCredential.user, { displayName: username }).catch((profileError) => {
            console.warn('Unable to set display name:', profileError);
          });
        }
        window.location.href = 'index.html?registered=1';
      })
      .catch((error) => {
        console.error('Registration failed:', error.code, error.message);

        if (error.code === 'auth/email-already-in-use') {
          registerErrorMessage.textContent = '⚠ That email is already in use.';
        } else if (error.code === 'auth/invalid-email') {
          registerErrorMessage.textContent = '⚠ Invalid email address.';
        } else if (error.code === 'auth/weak-password') {
          registerErrorMessage.textContent = '⚠ Password should be at least 6 characters.';
        } else {
          registerErrorMessage.textContent = '⚠ ' + error.message;
        }
      });
  });
}
