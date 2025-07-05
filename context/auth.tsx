import { auth, db } from '@/Firebase';
import { User } from '@/types/user';
import { signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isPublicRoute: boolean;
  setIsPublicRoute: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  isPublicRoute: false,
  setIsPublicRoute: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPublicRoute, setIsPublicRoute] = useState(false);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;

    console.log("Setting up auth state listener");
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed. Firebase user:", firebaseUser?.uid);
      
      // Clean up previous user subscription if it exists
      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = null;
      }

      try {
        if (firebaseUser) {
          const userDoc = doc(db, 'users', firebaseUser.uid);
          console.log("Setting up user doc listener for:", firebaseUser.uid);
          
          const unsub = onSnapshot(userDoc, async (docSnapshot) => {
            if (docSnapshot.exists()) {
              const userData = { ...docSnapshot.data(), uid: docSnapshot.id } as User;
              setUser(userData);
            } else {
              // Instead of creating a default user document, just set basic user info
              const basicUserData: Partial<User> = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                role: 'user',
              };
              setUser(basicUserData as User);
            }
            setLoading(false);
          }, (error) => {
            console.error("Error listening to user document:", error);
            setUser(null);
            setLoading(false);
          });

          unsubscribeUser = unsub;
        } else {
          setUser(null);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error in auth state change handler:", error);
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeUser) {
        unsubscribeUser();
      }
      unsubscribeAuth();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signOut, isPublicRoute, setIsPublicRoute }}>
      {children}
    </AuthContext.Provider>
  );
}
