import { useEffect } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { generate } from "referral-codes";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  arrayUnion,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import {
  GoogleAuthProvider,
  signInWithCredential,
  type UserCredential,
} from "firebase/auth";
import { auth, db } from "@/Firebase";
import { router, useLocalSearchParams } from "expo-router";
import showAlert from "@/components/CustomAlert/ShowAlert";
import { useLanguage } from "@/hooks/useLanguage";
import { AuthRequest } from "expo-auth-session";

// Complete auth session for deep-linking support (Expo)
WebBrowser.maybeCompleteAuthSession();

interface UseGoogleSignInResult {
  /** Request object returned by useAuthRequest */
  request: AuthRequest | null;
  /** Call this when the user presses the Google login button */
  handleGoogleLogin: () => void;
}

/**
 * Shared Google-sign-in logic for both web & native.
 * Usage:
 * const { request, handleGoogleLogin } = useGoogleSignIn();
 * <TouchableOpacity onPress={handleGoogleLogin} disabled={!request}>...</TouchableOpacity>
 */
export const useGoogleSignIn = (): UseGoogleSignInResult => {
  const { t } = useLanguage();

  // capture URL params for referral flow
  const params = useLocalSearchParams<{
    referralCode?: string;
    group?: string;
    isAddingUser?: string;
  }>();

  const GOOGLE_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

  // Init the auth request
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_ID,
    iosClientId: GOOGLE_ID,
    androidClientId: GOOGLE_ID,
    webClientId: GOOGLE_ID,
  });

  // Helper: generate unique referral code
  const generateUniqueReferralCode = async (): Promise<string> => {
    let code = "";
    // loop until we find an unused code (collision chance is tiny for length-4 but we still check)
    while (true) {
      code = generate({ length: 4, count: 1, charset: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" })[0];
      const q = query(collection(db, "users"), where("referralCode", "==", code));
      const snap = await getDocs(q);
      if (snap.empty) break;
    }
    return code;
  };

  // Handle Google auth response
  useEffect(() => {
    (async () => {
      if (response?.type !== "success") return;

      const { idToken, accessToken } = (response.authentication || {}) as {
        idToken?: string;
        accessToken?: string;
      };
      if (!idToken && !accessToken) {
        console.warn("Google auth response missing tokens");
        return;
      }

      // Sign in to Firebase Auth
      const credential = GoogleAuthProvider.credential(idToken ?? undefined, accessToken ?? undefined);
      try {
        const userCredential: UserCredential = await signInWithCredential(auth, credential);
        const { uid, email, displayName, photoURL } = userCredential.user;

        // Ensure Firestore profile exists
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          const referralCode = await generateUniqueReferralCode();

          // Determine group: param.group or default "A"
          const userGroup = (params.group as string) || "A";

          await setDoc(userRef, {
            uid,
            email: email ?? "",
            username: displayName ?? "",
            photoURL: photoURL ?? "",
            fullName: "",
            idNumber: "",
            country: "",
            state: "",
            town: "",
            phoneNumber: "",
            livingAddress: "",
            bankName: "",
            bankAccount: "",
            digitalBank: "",
            digitalBankName: "",
            bankNumber: "",
            selectedBank: "",
            transactionPassword: "",
            balance: 0,
            RM: 100,
            token: 0,
            referralCode,
            children: [],
            group: userGroup,
            gdp: 0,
            shares: 0,
            role: "user" as const,
            timestamp: serverTimestamp() as any,
          });
        }

        // If coming from parent referral link and adding user
        if (params.isAddingUser === "true" && params.referralCode) {
          // find parent by referral code
          const parentQ = query(collection(db, "users"), where("referralCode", "==", params.referralCode));
          const parentSnap = await getDocs(parentQ);
          if (!parentSnap.empty) {
            const parentDoc = parentSnap.docs[0];
            const parentId = parentDoc.id;

            // Avoid linking user to themselves
            if (parentId !== uid) {
              const childSnap = await getDoc(userRef);
              const childData = childSnap.exists() ? (childSnap.data() as any) : {};

              // Only link if the child has no existing parent to avoid cycles/re-parenting
              if (!childData.parentId) {
                await Promise.all([
                  setDoc(doc(db, "users", parentId), { children: arrayUnion(uid) }, { merge: true }),
                  setDoc(userRef, { parentId }, { merge: true })
                ]);
              }
            }
          }
        }

        router.replace("/(tabs)");
      } catch (err: any) {
        console.error("Google sign-in error", err);
        showAlert(t.error, err instanceof Error ? err.message : "Google sign-in failed");
      }
    })();
  }, [response]);

  const handleGoogleLogin = () => {
    if (!request) return;
    // Force Google to show account chooser every time
    // @ts-ignore - prompt is valid Google OAuth param even if not in typings
    promptAsync({ prompt: "select_account" });
  };

  return { request, handleGoogleLogin };
};

export default useGoogleSignIn;
