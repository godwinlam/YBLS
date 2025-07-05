import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, Dimensions, Platform } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db, storage } from '@/Firebase';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';


const { width: screenWidth } = Dimensions.get('window');
const ITEM_WIDTH = screenWidth * 0.8;
// Firestore collection: 'service-carousel'
// ITEM_WIDTH kept for potential future layout tweaks
const SPACER_ITEM_SIZE = (screenWidth - ITEM_WIDTH) / 2;

interface CarouselItem {
  id: string;
  title?: string;
  description?: string;
  image: any; // require result or remote uri
}

const ServiceCarousel = () => {
  const [carouselData, setCarouselData] = useState<CarouselItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const colRef = collection(db, 'service-carousel');
        const q = query(colRef, orderBy('order', 'asc'));
        const snapshot = await getDocs(q);
        const items: CarouselItem[] = await Promise.all(snapshot.docs.map(async doc => {
          const data = doc.data() as any;
          let imageSrc: any = data.image || data.imageUrl;
          // If Firestore stores image URL strings, use uri else assume static import path already resolved
          if (typeof imageSrc === 'string') {
            // If not a full URL, treat as storage path and resolve
            if (!imageSrc.startsWith('http')) {
              try {
                const url = await getDownloadURL(storageRef(storage, imageSrc));
                imageSrc = { uri: url };
              } catch (e) {
                console.warn('Failed to get downloadURL for', imageSrc, e);
                imageSrc = undefined;
              }
            } else {
              imageSrc = { uri: imageSrc };
            }
          }
          if (!imageSrc) {
            console.warn('No image field for doc', doc.id, data);
          }
          return {
            id: doc.id,
            title: data.title,
            description: data.description,
            image: imageSrc,
          };
        }));
        setCarouselData(items);
      } catch (err) {
        console.error('Error fetching service carousel:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);



  return (
    <View style={styles.container}>
      <Carousel
        width={screenWidth}
        height={200}
        loop
        pagingEnabled
        autoPlay={false}
        data={carouselData}
        mode='parallax'
        modeConfig={{
          parallaxScrollingScale: 0.9,
          parallaxScrollingOffset: 55,
          parallaxAdjacentItemScale: 0.75,
        }}
        renderItem={({ item }) => (
          // eslint-disable-next-line react-native/no-inline-styles
          // Optionally you can show loading placeholder while fetching
          loading ? <View style={[styles.itemContainer]} /> :
            <View style={styles.itemContainer}>
              <Image source={item.image} style={styles.image} resizeMode='cover' />
            </View>
        )}
      />
    </View>
  );



};

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
  },
  itemContainer: {
    height: 200,
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
});

export default ServiceCarousel;
