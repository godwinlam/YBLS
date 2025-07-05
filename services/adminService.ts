import { collection, deleteDoc, doc, getDocs, query, setDoc, Timestamp, where } from "firebase/firestore";
import { db } from "../Firebase";

const ADMIN_LOGS_COLLECTION = 'adminLogs';
const LOG_EXPIRY_MINUTES = 5;

export const adminService = {
  // Log admin access attempts for security audit
  async logMasterAccess(targetUserId: string): Promise<void> {
    try {
      const now = new Date();
      const logRef = doc(db, ADMIN_LOGS_COLLECTION, now.toISOString());
      
      await setDoc(logRef, {
        type: "ADMIN_ACCESS",
        targetUserId,
        timestamp: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromDate(new Date(now.getTime() + LOG_EXPIRY_MINUTES * 60 * 1000)),
        adminId: "ADMIN"
      });

      // Clean up old logs
      await this.cleanupExpiredLogs();
    } catch (error) {
      console.error("Error logging admin access:", error);
      // Don't throw here, just log the error
    }
  },

  // Clean up expired logs
  async cleanupExpiredLogs(): Promise<void> {
    try {
      const now = Timestamp.now();
      const logsRef = collection(db, ADMIN_LOGS_COLLECTION);
      
      // Query for expired logs
      const q = query(logsRef, where('expiresAt', '<=', now));
      const querySnapshot = await getDocs(q);

      // Delete expired logs
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      if (deletePromises.length > 0) {
        console.log(`Cleaned up ${deletePromises.length} expired logs`);
      }
    } catch (error) {
      console.error('Error cleaning up expired logs:', error);
    }
  }
};
