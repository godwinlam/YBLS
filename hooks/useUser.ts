import { CreateUserData, UpdateUserData, User } from "@/types/user";
import { useCallback, useState } from "react";
import { userService } from "../services/userService";

export const useUser = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const createUser = useCallback(
    async (userId: string, userData: CreateUserData) => {
      setLoading(true);
      setError(null);
      try {
        const newUser = await userService.createUser(userId, userData);
        setUser(newUser);
        return newUser;
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchUser = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const fetchedUser = await userService.getUserById(userId);
      setUser(fetchedUser);
      return fetchedUser;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedUsers = await userService.getAllUsers();
      setUsers(fetchedUsers);
      return fetchedUsers;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback(
    async (userId: string, userData: UpdateUserData) => {
      setLoading(true);
      setError(null);
      try {
        const updatedUser = await userService.updateUser(userId, userData);
        setUser(updatedUser);
        return updatedUser;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteUser = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      await userService.deleteUser(userId);
      setUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    users,
    loading,
    error,
    createUser,
    fetchUser,
    fetchAllUsers,
    updateUser,
    deleteUser,
  };
};
