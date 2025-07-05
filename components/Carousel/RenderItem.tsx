import { StyleSheet, View, useWindowDimensions } from "react-native";
import React from "react";
import { CarouselItem } from "@/types/user";
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";

type Props = {
  index: number;
  item: CarouselItem;
  x: SharedValue<number>;
};

const RenderItem = ({ item, index, x }: Props) => {
  const { width } = useWindowDimensions();

  const animatedStyle = useAnimatedStyle(() => {
    const opacityAnim = interpolate(
      x.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [-2, 1, -2],
      Extrapolation.CLAMP
    );

    return { opacity: opacityAnim };
  });

  return (
    <View style={{  width: width, height:330 }}>
      <Animated.Image
        source={{ uri: item.imageUrl }}
        style={[styles.titleImage, animatedStyle]}
      />
    </View>
  );
};

export default RenderItem;

const styles = StyleSheet.create({
  titleImage: {
    position: "absolute",
    height: "100%",
    width: "100%",
    resizeMode: "cover",
    borderRadius: 10,
  },
});
