import { Link } from "expo-router";
import { styled } from "nativewind";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
const SafeAreaView = styled(RNSafeAreaView);
export default function App() {
  return (
    <SafeAreaView className='flex-1 items-center justify-center bg-background gap-10'>
      <Link
        href='/onboarding'
        className='bg-primary px-4 py-2 rounded-md text-2xl text-white  '>
        Go to Onboarding
      </Link>
      <Link
        href='/(auth)/sign-up'
        className='bg-primary px-4 py-2 rounded-md text-2xl text-white '>
        Sign Up
      </Link>
      <Link
        href='/(auth)/sign-in'
        className='px-4 py-2 rounded-md text-2xl text-primary outline-4 outline-primary '>
        Sign In
      </Link>
      <Link
        href='/subscriptions/spotify'
        className='px-4 py-2 rounded-md text-2xl text-primary outline-4 outline-primary '>
        Spotify Subscription
      </Link>
      <Link
        href={{
          pathname: "/subscriptions/[id]",
          params: { id: "claude" },
        }}
        className='px-4 py-2 rounded-md text-2xl text-primary outline-4 outline-primary '>
        Claude Subscription
      </Link>
    </SafeAreaView>
  );
}
