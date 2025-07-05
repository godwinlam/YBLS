declare module 'firebase/auth' {
  export interface AuthError extends Error {
    code: string;
    message: string;
  }

  export interface UserCredential {
    user: User;
  }

  export interface User {
    uid: string;
    email: string | null;
    emailVerified: boolean;
    delete(): Promise<void>;
    [key: string]: any;
  }

  export type NextOrObserver<T> = ((value: T | null) => void) | Observer<T | null>;

  export interface Observer<T> {
    next: (value: T | null) => void;
    error?: (error: Error) => void;
    complete?: () => void;
  }

  export interface Auth {
    name: string;
    config: object;
    currentUser: User | null;
    onAuthStateChanged(nextOrObserver: NextOrObserver<User>): () => void;
  }

  export interface Persistence {
    type: 'LOCAL' | 'SESSION' | 'NONE';
    _isAvailable(): Promise<boolean>;
    _get(key: string): Promise<string | null>;
    _set(key: string, value: string): Promise<void>;
    _remove(key: string): Promise<void>;
  }

  export function getAuth(app?: any): Auth;
  export function setPersistence(auth: Auth, persistence: Persistence): Promise<void>;
  export function initializeAuth(app: any, deps: { persistence: Persistence }): Auth;
  export function getReactNativePersistence(storage: any): Persistence;
  export function deleteUser(user: User): Promise<void>;
  export function createUserWithEmailAndPassword(auth: Auth, email: string, password: string): Promise<UserCredential>;
  export function signInWithEmailAndPassword(auth: Auth, email: string, password: string): Promise<UserCredential>;
  export function signOut(auth: Auth): Promise<void>;
  export function sendPasswordResetEmail(auth: Auth, email: string): Promise<void>;
  export function onAuthStateChanged(auth: Auth, nextOrObserver: NextOrObserver<User>): () => void;
  export const browserLocalPersistence: Persistence;
  export const inMemoryPersistence: Persistence;
}
