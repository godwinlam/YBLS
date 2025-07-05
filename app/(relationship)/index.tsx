// import RelationshipScreen from "@/components/User/RelationshipScreen";
import { auth, db } from "@/Firebase";
import { User } from "@/types/user";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Relationship() {
  const [user, setUser] = useState<User | null>(null);
  // const params = useLocalSearchParams();

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const unsubscribe = onSnapshot(doc(db, "users", currentUser.uid), (doc) => {
      if (doc.exists()) {
        setUser({ ...doc.data(), uid: doc.id } as User);
      }
    });

    return () => unsubscribe();
  }, []);

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // return <RelationshipScreen currentUser={user} />;
}
