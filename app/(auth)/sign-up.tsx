import { Link } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

const SignUp = () => {
  return (
    <View className='flex-1 items-center justify-center bg-background'>
      <Text>{`Sign Up \nAlready have an account?`}</Text>

      <Link
        href='/sign-in'
        className='mt-4 px-4 py-2 rounded-md text-2xl text-primary outline-4 outline-primary'>
        Sign in
      </Link>
    </View>
  );
};

export default SignUp;
