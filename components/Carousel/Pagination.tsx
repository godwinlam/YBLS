import React, { useEffect } from "react";
import { View, StyleSheet, Text, useWindowDimensions } from "react-native";
import { CarouselItem } from "@/types/user";
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";

type Props = {
  paginationIndex: number;
  data: CarouselItem[];
  x: SharedValue<number>;
  index: number;
};

const Pagination: React.FC<Props> = ({ paginationIndex, data, index, x }) => {
  // Ensure paginationIndex is a valid number and within bounds
  const activeIndex =
    !isNaN(paginationIndex) && Number.isInteger(paginationIndex)
      ? Math.max(0, Math.min(paginationIndex, data.length - 1))
      : 0;

  // Debug log to track active index
  // useEffect(() => {
  //   console.log('Active index:', activeIndex, 'Pagination index:', paginationIndex);
  // }, [activeIndex, paginationIndex]);

  const { width } = useWindowDimensions();

  const animatedStyle = useAnimatedStyle( () => {
    const opacityAnim = interpolate(
      x.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [-2, 1, -2],
      Extrapolation.CLAMP
    );

    return { opacity: opacityAnim };
  });

  if (!data || data.length === 0) {
    // return <Text style={styles.noItemsText}>No items in carousel</Text>;
    return (
      <View style={{ width: width, height: 200 }}>
        <Animated.Image
          source={require("@/assets/images/Logo-YBL.png")}
          style={[styles.titleImage, animatedStyle]}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.dotsContainer}>
        {data.map((_, index) => {
          const isActive = index === activeIndex;
          return (
            <View
              key={`dot-${index}`}
              style={[styles.dot, isActive && styles.activeDot]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: -10,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingVertical: 10,
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "blue",
    marginHorizontal: 4,
  },
  activeDot: {
    width: 10,
    backgroundColor: "green",
  },
  noItemsText: {
    color: "white",
    textAlign: "center",
    padding: 10,
  },
  titleImage: {
    position: "absolute",
    height: "100%",
    width: "100%",
    resizeMode: "cover",
  },
});

export default Pagination;
