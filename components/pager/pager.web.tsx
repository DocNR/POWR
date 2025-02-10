// components/pager/pager.web.tsx
import React from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { PagerProps, PagerRef, PageSelectedEvent } from './types';

const Pager = React.forwardRef<PagerRef, PagerProps>(
  ({ children, onPageSelected, initialPage = 0, style }, ref) => {
    const scrollRef = React.useRef<ScrollView>(null);
    const [currentPage, setCurrentPage] = React.useState(initialPage);
    const { width } = useWindowDimensions();

    React.useImperativeHandle(ref, () => ({
      setPage: (pageNumber: number) => {
        const scrollView = scrollRef.current;
        if (scrollView) {
          const width = scrollView.getInnerViewNode?.()?.getBoundingClientRect?.()?.width ?? 0;
          scrollView.scrollTo({ x: pageNumber * width, animated: true });
        }
      },
      scrollTo: (options) => {
        scrollRef.current?.scrollTo(options);
      }
    }));

    const handleScroll = (event: any) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const page = Math.round(offsetX / event.nativeEvent.layoutMeasurement.width);

      if (page !== currentPage) {
        setCurrentPage(page);
        onPageSelected?.({
          nativeEvent: { position: page }
        } as PageSelectedEvent);
      }
    };

    React.useEffect(() => {
      if (initialPage > 0) {
        scrollRef.current?.scrollTo({
          x: initialPage * width,
          animated: false
        });
      }
    }, [initialPage, width]);

    return (
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={[styles.container, style]}
      >
        {React.Children.map(children, (child) => (
          <View style={{ width }}>{child}</View>
        ))}
      </ScrollView>
    );
  }
);

export default Pager;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});