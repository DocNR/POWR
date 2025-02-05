// app/(tabs)/library.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { ThemedText } from '@/components/ThemedText';
import TabLayout from '@/components/TabLayout';
import { useFabPosition } from '@/hooks/useFabPosition';
import { libraryService } from '@/services/LibraryService';

// Components
import MyLibrary from '@/components/library/MyLibrary';
import Programs from '@/components/library/Programs';
import Discover from '@/components/library/Discover';
import ContentPreviewModal from '@/components/library/ContentPreviewModal';
import AddContentModal from '@/components/library/AddContentModal';
import SearchBar from '@/components/library/SearchBar';
import FilterSheet, { FilterOptions } from '@/components/library/FilterSheet';
import FloatingActionButton from '@/components/shared/FloatingActionButton';
import Pager, { PagerRef } from '@/components/pager';

// Types
import { LibraryContent } from '@/types/exercise';
import { spacing } from '@/styles/sharedStyles';

type LibrarySection = 'my-library' | 'programs' | 'discover';

interface TabItem {
  key: LibrarySection;
  label: string;
  index: number;
}

const TABS: TabItem[] = [
  { key: 'my-library', label: 'My Library', index: 0 },
  { key: 'programs', label: 'Programs', index: 1 },
  { key: 'discover', label: 'Discover', index: 2 }
];

export default function LibraryScreen() {
  const { colors } = useColorScheme();
  const fabPosition = useFabPosition();
  const searchParams = useLocalSearchParams();
  const pagerRef = useRef<PagerRef>(null);
  const [mounted, setMounted] = useState(false);

  // State
  const [content, setContent] = useState<LibraryContent[]>([]);
  const [filteredContent, setFilteredContent] = useState<LibraryContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<LibraryContent | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    contentType: [],
    source: [],
    category: [],
    equipment: []
  });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Initialize with default section from searchParams
  const currentSection = searchParams.section as LibrarySection | undefined;
  const defaultSection = TABS.find(tab => tab.key === currentSection) ?? TABS[0];
  const [activeSection, setActiveSection] = useState<number>(defaultSection.index);

  // Load library content
  const loadContent = useCallback(async () => {
    if (mounted) {
      setIsLoading(true);
      try {
        const [exercises, templates] = await Promise.all([
          libraryService.getExercises(),
          libraryService.getTemplates()
        ]);

        const exerciseContent: LibraryContent[] = exercises.map(exercise => ({
          id: exercise.id,
          title: exercise.title,
          type: 'exercise',
          description: exercise.description,
          category: exercise.category,
          equipment: exercise.equipment,
          source: 'local',
          tags: exercise.tags,
          created_at: exercise.created_at,
          availability: {
            source: ['local']
          }
        }));

        setContent([...exerciseContent, ...templates]);
      } catch (error) {
        console.error('Error loading library content:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [mounted]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  useEffect(() => {
    const filtered = content.filter(item => {
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = 
          item.title.toLowerCase().includes(searchLower) ||
          (item.description?.toLowerCase() || '').includes(searchLower) ||
          item.tags.some(tag => tag.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }

      if (filterOptions.contentType.length > 0) {
        if (!filterOptions.contentType.includes(item.type)) return false;
      }

      if (filterOptions.source.length > 0) {
        if (!filterOptions.source.includes(item.source)) return false;
      }

      if (filterOptions.category.length > 0 && item.type === 'exercise') {
        if (!filterOptions.category.includes(item.category || '')) return false;
      }

      if (filterOptions.equipment.length > 0 && item.type === 'exercise') {
        if (!filterOptions.equipment.includes(item.equipment || '')) return false;
      }

      return true;
    });

    setFilteredContent(filtered);
  }, [content, searchQuery, filterOptions]);

  useEffect(() => {
    if (currentSection) {
      const tab = TABS.find(t => t.key === currentSection);
      if (tab && tab.index !== activeSection) {
        setActiveSection(tab.index);
        pagerRef.current?.setPage(tab.index);
      }
    }
  }, [currentSection, activeSection]);

  const handlePageSelected = useCallback((e: { nativeEvent: { position: number } }) => {
    const newIndex = e.nativeEvent.position;
    setActiveSection(newIndex);
    const newSection = TABS[newIndex];
    if (newSection) {
      router.setParams({ section: newSection.key });
    }
  }, []);

  const handleContentPress = (content: LibraryContent) => {
    setSelectedContent(content);
    setShowPreview(true);
  };

  const handleFavoritePress = async (content: LibraryContent) => {
    try {
      console.log('Favorite pressed:', content.id);
      await loadContent();
    } catch (error) {
      console.error('Error handling favorite:', error);
    }
  };

  const handleAddContent = (type: 'exercise' | 'template') => {
    setShowAddContent(false);
    if (type === 'exercise') {
      router.push('/(workout)/new-exercise' as const);
    } else {
      router.push({
        pathname: '/(workout)/create-template' as const,
      });
    }
  };

  const handleDeleteContent = useCallback((deletedContent: LibraryContent) => {
    setContent(prevContent => 
      prevContent.filter(item => item.id !== deletedContent.id)
    );
  }, []);

  const handleTabPress = useCallback((index: number) => {
    pagerRef.current?.setPage(index);
    setActiveSection(index);
  }, []);

  return (
    <TabLayout>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.segmentsContainer, { borderBottomColor: colors.border }]}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.segmentButton,
                activeSection === tab.index && [
                  styles.activeSegment,
                  { borderBottomColor: colors.primary }
                ]
              ]}
              onPress={() => handleTabPress(tab.index)}
            >
              <ThemedText
                style={[
                  styles.segmentText,
                  { color: activeSection === tab.index ? colors.primary : colors.textSecondary }
                ]}
              >
                {tab.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.searchBarContainer, { backgroundColor: colors.background }]}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFilterPress={() => setShowFilters(true)}
          />
        </View>

        <Pager
          ref={pagerRef}
          style={styles.contentContainer}
          initialPage={activeSection}
          onPageSelected={handlePageSelected}
        >
          <View key="my-library" style={styles.pageContainer}>
          <MyLibrary
            savedContent={filteredContent}
            onContentPress={handleContentPress}
            onFavoritePress={handleFavoritePress}
            onDeleteContent={handleDeleteContent}
            isLoading={isLoading}
            isVisible={activeSection === 0}
          />
          </View>

          <View key="programs" style={styles.pageContainer}>
            <Programs
              content={[]}
              onContentPress={handleContentPress}
              onFavoritePress={handleFavoritePress}
              isVisible
            />
          </View>

          <View key="discover" style={styles.pageContainer}>
            <Discover
              content={[]}
              onContentPress={handleContentPress}
              onFavoritePress={handleFavoritePress}
              isVisible
            />
          </View>
        </Pager>

        {!showFilters && (
          <FloatingActionButton
            icon={Plus}
            onPress={() => setShowAddContent(true)}
            style={{ bottom: fabPosition.bottom }}
          />
        )}

        <ContentPreviewModal
          isVisible={showPreview}
          content={selectedContent}
          onClose={() => setShowPreview(false)}
          onSave={() => setShowPreview(false)}
        />

        <AddContentModal 
          isVisible={showAddContent}
          onClose={() => setShowAddContent(false)}
          onSelect={handleAddContent}
        />

        <FilterSheet
          isVisible={showFilters}
          options={filterOptions}
          onClose={() => setShowFilters(false)}
          onApply={(options) => {
            setFilterOptions(options);
            setShowFilters(false);
          }}
        />
      </View>
    </TabLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    position: 'absolute',
    top: Platform.OS === 'ios' ? 10 : 0,
    left: 0,
    right: 0,
    zIndex: 1,
    height: 40,
  },
  searchBarContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 0,
    right: 0,
    zIndex: 2,
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.small,
  },
  pageContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 110 : 90,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 5,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    height: '100%',
  },
  activeSegment: {
    borderBottomWidth: 3,
  },
  segmentText: {
    fontSize: 16,
    fontWeight: '500',
    paddingHorizontal: spacing.small,
  },
});