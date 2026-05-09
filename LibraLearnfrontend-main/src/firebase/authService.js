import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
} from 'firebase/auth';

import { auth } from './firebase';

function friendlyFirebaseError(err) {
  const code = err?.code || '';

  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid. Please check your email format.';
    case 'auth/missing-email':
      return 'Please enter your email.';
    case 'auth/user-not-found':
      return 'No account exists for this email.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'That email is already registered. Try logging in instead.';
    case 'auth/weak-password':
      return 'Your password is too weak. Use at least 6 characters.';
    default:
      return err?.message || 'Something went wrong. Please try again.';
  }
}

export async function signUpWithEmail({ email, password, displayName }) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);

  // Set display name if provided (optional but nice for your app).
  if (displayName) {
    await updateProfile(userCredential.user, { displayName });
  }

  return userCredential.user;
}

export async function signInWithEmail({ email, password }) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function requestPasswordReset({ email }) {
  // After the user resets their password, send them back to the login page.
  const actionCodeSettings = {
    url: `${window.location.origin}/login`,
  };
  await sendPasswordResetEmail(auth, email, actionCodeSettings);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signInWithFacebook() {
  const provider = new FacebookAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function logout() {
  await signOut(auth);
}

export function getFriendlyAuthError(err) {
  return friendlyFirebaseError(err);
}

