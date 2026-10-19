import { Link } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

const SignIn = () => {
  return (
    <View className='flex-1 items-center justify-center bg-background'>
      <Text>{`Sign In \nDon't have an account?`}</Text>

      <Link
        href='/sign-up'
        className='mt-4 px-4 py-2 rounded-md text-2xl text-primary outline-4 outline-primary'>
        Sign up
      </Link>

      <Link
        href='/'
        className='mt-4 px-4 py-2 rounded-md text-2xl text-primary outline-4 outline-primary'>
        go back
      </Link>
    </View>
  );
};

export default SignIn;
