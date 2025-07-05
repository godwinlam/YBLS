import { Stack } from "expo-router";
import { useLanguage } from "@/hooks/useLanguage";

export default function RelationshipLayout() {
  const { t } = useLanguage();

  return (
    <Stack>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="group-a"
        options={{
          title: t.Friends,
          headerTitleAlign: "center",
          headerTintColor: "blue",
          headerTitleStyle: {
            fontWeight: "bold",
            fontSize: 24,
          },
          headerStyle: {
            backgroundColor: "lightblue",
          },
        }}
      />
    </Stack>
  );
}
