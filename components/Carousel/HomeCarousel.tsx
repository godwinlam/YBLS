import { StatusBar } from "expo-status-bar";
import { StyleSheet, View, ViewToken, useWindowDimensions } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import RenderItem from "@/components/Carousel/RenderItem";
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/Firebase';
import { CarouselItem } from '@/types/user';
import Pagination from "@/components/Carousel/Pagination";
import Animated, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
  runOnJS,
} from "react-native-reanimated";

export default function HomeCarousel() {
  const [displayData, setDisplayData] = useState<CarouselItem[]>([]);
  const [carouselData, setCarouselData] = useState<CarouselItem[]>([]);
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [paginationIndex, setPaginationIndex] = useState<number>(0);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(true);
  const ref = useAnimatedRef<Animated.FlatList<CarouselItem>>();
  const x = useSharedValue(0);
  const currentIndexShared = useSharedValue(0);

  // Load carousel data
  useEffect(() => {
    const loadCarouselData = async () => {
      try {
        const carouselRef = collection(db, 'carousel');
        const q = query(carouselRef, orderBy('order', 'asc'));
        const querySnapshot = await getDocs(q);
        const items: CarouselItem[] = [];
        querySnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as CarouselItem);
        });
        setCarouselData(items);
      } catch (error) {
        console.error('Error loading carousel data:', error);
      }
    };

    loadCarouselData();
  }, []);

  useEffect(() => {
    if (carouselData.length > 0) {
      setDisplayData([...carouselData, carouselData[0]]);
    } else {
      setDisplayData([]);
    }
  }, [carouselData]);

  // updateIndex function has been removed as its logic is now incorporated into onViewableItemsChangedRef.current

  // Create a stable reference for viewability config and callback
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 300,
  }).current;

  // Create a stable reference for viewability callback
  const onViewableItemsChangedRef = useRef<({ viewableItems }: { viewableItems: ViewToken[] }) => void>();
  // Define onViewableItemsChangedRef.current inside a useEffect to capture latest states
  useEffect(() => {
    onViewableItemsChangedRef.current = ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null && carouselData.length > 0) {
        const newVisibleDisplayIndex = viewableItems[0].index; // Index in displayData
        if (typeof newVisibleDisplayIndex === 'number' && !isNaN(newVisibleDisplayIndex)) {
          if (newVisibleDisplayIndex === carouselData.length) { // Landed on the duplicate first item
            runOnJS(setPaginationIndex)(0);
            runOnJS(setCurrentIndex)(0); 
            currentIndexShared.value = 0; 
            if (ref.current) {
              ref.current.scrollToIndex({ index: 0, animated: false, viewPosition: 0.5 });
            }
          } else {
            runOnJS(setPaginationIndex)(newVisibleDisplayIndex % carouselData.length);
            runOnJS(setCurrentIndex)(newVisibleDisplayIndex);
            currentIndexShared.value = newVisibleDisplayIndex;
          }
        }
      }
    };
  }, [carouselData.length, currentIndexShared, ref, setCurrentIndex, setPaginationIndex]);

  // This is the function that will be called by FlatList, it will then call the ref
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    onViewableItemsChangedRef.current?.({ viewableItems });
  }, []); // Empty dependency array as onViewableItemsChangedRef.current is stable within its own useEffect lifecycle

  // useEffect(() => {
  //   onViewableItemsChangedRef.current = ({ viewableItems }: { viewableItems: ViewToken[] }) => {
  //     if (viewableItems.length > 0 && viewableItems[0].index !== null) {
  //       const newIndex = viewableItems[0].index;
  //       if (typeof newIndex === 'number' && !isNaN(newIndex)) {
  //         updateIndex(newIndex);
  //       }
  //     }
  //   };
  // }, [carouselData.length, updateIndex]); // This block is replaced by the new useEffect for onViewableItemsChangedRef.current

  const viewabilityConfigCallbackPairs = useRef([
    {
      viewabilityConfig,
      onViewableItemsChanged: onViewableItemsChanged, // Use the useCallback wrapper
    },
  ]).current;

  // currentIndexShared has been moved higher up in the component.

  // Reset indices when data loads
  useEffect(() => {
    if (displayData.length > 0 && carouselData.length > 0) { // Check carouselData too for initial setup logic
      currentIndexShared.value = 0;
      setCurrentIndex(0);
      setPaginationIndex(0);
      if (ref.current) {
        ref.current.scrollToIndex({ index: 0, animated: false, viewPosition: 0.5 });
      }
    }
  }, [carouselData.length]);

  // Auto play effect
  useEffect(() => {
    if (!isAutoPlay || displayData.length <= 1 || carouselData.length === 0) return;

    let intervalId: NodeJS.Timeout;
    const autoPlayLogic = () => {
      // currentIndexShared.value is the current index in displayData (0 to carouselData.length-1 for actuals)
      const nextDisplayIndex = (currentIndexShared.value + 1); 
      // This will target an index from 1 up to carouselData.length (the duplicate)

      if (ref.current) {
        ref.current.scrollToIndex({
          index: nextDisplayIndex, // This index is for displayData
          animated: true,
          viewPosition: 0.5,
        });
      }
      // onViewableItemsChanged will handle state updates and the jump-back if nextDisplayIndex is the duplicate.
    };
    intervalId = setInterval(autoPlayLogic, 3000);
    return () => clearInterval(intervalId);
  }, [isAutoPlay, displayData, carouselData.length, currentIndexShared, ref]);

  // Scroll handler (no state update)
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      x.value = event.contentOffset.x;
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor={"transparent"} />
        <Animated.FlatList
          ref={ref}
          data={displayData}
          renderItem={({ item, index }) => (
            <RenderItem item={item} index={index} x={x} />
          )}
          keyExtractor={(item, index) => {
            const baseKey = `carousel-item-${item.id || `generated-${index}`}`;
            if (index === carouselData.length) { // This is the duplicated first item
              return `${baseKey}-duplicate`;
            }
            return baseKey;
          }}
          horizontal
          pagingEnabled
          bounces={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
          initialScrollIndex={0}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          initialNumToRender={3}
          maxToRenderPerBatch={5}
          windowSize={5}
          snapToAlignment="center"
          decelerationRate="fast"
          onMomentumScrollEnd={(event) => {
            // User swipe finished. onViewableItemsChanged will handle the index update.
            // Optionally, for more immediate perceived responsiveness for user swipes before onViewableItemsChanged fires:
            // const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
            // if (newIndex >= 0 && newIndex < displayData.length) {
            //   currentIndexShared.value = newIndex; 
            //   if (newIndex === carouselData.length) { runOnJS(setPaginationIndex)(0); runOnJS(setCurrentIndex)(0); } 
            //   else { runOnJS(setPaginationIndex)(newIndex % carouselData.length); runOnJS(setCurrentIndex)(newIndex); }
            // }
          }}
        />
      <Pagination paginationIndex={isNaN(paginationIndex) || paginationIndex < 0 ? 0 : paginationIndex} data={carouselData} x={x} index={currentIndex} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0c0101",
  }
});