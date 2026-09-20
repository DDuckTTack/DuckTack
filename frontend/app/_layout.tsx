import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

import ErrorBoundary from "../src/components/ErrorBoundary";

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <ErrorBoundary>
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: "#fff" },
                    }}
                >
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                </Stack>
            </ErrorBoundary>
        </SafeAreaProvider>
    );
}
