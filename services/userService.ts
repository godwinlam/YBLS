import { CreateUserData, UpdateUserData, User } from "@/types/user";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../Firebase";

const USERS_COLLECTION = "users";

export const userService = {
  // Create a new user with default values
  async createUserWithDefaults(firebaseUser: { uid: string; email: string | null }): Promise<User> {
    // const timestamp = Date.now();
    const defaultUserData: CreateUserData = {
      email: firebaseUser.email || '',
      username: firebaseUser.email?.split('@')[0] || '',
      fullName: '',
      country: null,
      state: null,
      town: null,
      phoneNumber: null,
      livingAddress: null,
      bankName: null,
      bankAccount: null,
      transactionPassword: '',
      digitalBank: null,
      digitalBankName: null,
      bankNumber: null,
      selectedBank: null,
      balance: 0,
      token: 0,
      role: 'user',
      referralCode: '',
      children: [],
      group: 'A',
      gdpStatus: 'inactive',
      photoURL: null,
      timestamp: serverTimestamp(),
      password: '', 
      gdp: 0,      
      shares: 0    
    };

    return await this.createUser(firebaseUser.uid, defaultUserData);
  },

  // Create a new user
  async createUser(userId: string, userData: CreateUserData): Promise<User> {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const timestamp = Date.now();

    const newUser: User = {
      uid: userId,
      ...userData,
      timestamp: serverTimestamp(),
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await setDoc(userRef, newUser);
    return newUser;
  },

  // Get a user by ID
  async getUserById(userId: string): Promise<User | null> {
    try {
      const userRef = doc(db, USERS_COLLECTION, userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return null;
      }

      return { ...userSnap.data(), uid: userSnap.id } as User;
    } catch (error) {
      console.error("Error fetching user:", error);
      throw new Error("Failed to fetch user");
    }
  },

  // Get all users
  async getAllUsers(): Promise<User[]> {
    try {
      const usersQuery = query(collection(db, USERS_COLLECTION));
      const querySnapshot = await getDocs(usersQuery);

      return querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        uid: doc.id,
      })) as User[];
    } catch (error) {
      console.error("Error fetching all users:", error);
      throw new Error("Failed to fetch users");
    }
  },

  // Update a user
  async updateUser(userId: string, userData: UpdateUserData): Promise<User> {
    try {
      const userRef = doc(db, USERS_COLLECTION, userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error("User not found");
      }

      const updateData = {
        ...userData,
        updatedAt: Date.now(),
      };

      await updateDoc(userRef, updateData);

      // Get the updated user data
      const updatedUserSnap = await getDoc(userRef);
      return { ...updatedUserSnap.data(), uid: updatedUserSnap.id } as User;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  },

  // Delete a user
  async deleteUser(userId: string): Promise<void> {
    try {
      const userRef = doc(db, USERS_COLLECTION, userId);
      await deleteDoc(userRef);
    } catch (error) {
      console.error("Error deleting user:", error);
      throw new Error("Failed to delete user");
    }
  },
};
