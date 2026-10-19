import { Link, useLocalSearchParams } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

const SubscriptionDetails = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View className='flex-1 items-center justify-center bg-white'>
      <Text>SubscriptionDetails : {id}</Text>
      <Link href='/index'>Go Back</Link>
    </View>
  );
};

export default SubscriptionDetails;
