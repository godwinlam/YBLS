import { db } from "@/Firebase";
import { doc, getDoc } from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth";

interface UserContextType {
  userRole: string;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType>({
  userRole: "user",
  isLoading: true,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>("user");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserRole = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role || "user");
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUserRole("user");
        }
      } else {
        setUserRole("user");
      }
      setIsLoading(false);
    };

    loadUserRole();
  }, [user]);

  return (
    <UserContext.Provider value={{ userRole, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
