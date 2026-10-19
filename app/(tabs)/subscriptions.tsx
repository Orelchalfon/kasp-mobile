import { styled } from "nativewind";
import React from "react";
import { Text } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
const SafeAreaView = styled(RNSafeAreaView);
const Subscriptions = () => {
  return (
   <SafeAreaView className='flex-1 items-center justify-center bg-background gap-10'>
      <Text>Subscriptions</Text>
    </SafeAreaView>
  );
};

export default Subscriptions;
