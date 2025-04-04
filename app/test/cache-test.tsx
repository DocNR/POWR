import React, { useState } from 'react';
import { View, StyleSheet, Button, Text, ScrollView } from 'react-native';
import { useProfileImage } from '@/lib/hooks/useProfileImage';
import { useBannerImage } from '@/lib/hooks/useBannerImage';
import UserAvatar from '@/components/UserAvatar';
import { Image } from 'react-native';
import { profileImageCache } from '@/lib/db/services/ProfileImageCache';
import { bannerImageCache } from '@/lib/db/services/BannerImageCache';

export default function CacheTestScreen() {
  const [pubkey, setPubkey] = useState('fa984bd7dbb282f07e16e7ae87b26a2a7b9b90b7246a44771f0cf5ae58018f52');
  const [stats, setStats] = useState<any>(null);
  
  // Using our React Query hooks
  const { data: profileImageData, isLoading: profileLoading } = useProfileImage(pubkey);
  const { data: bannerImageData, isLoading: bannerLoading } = useBannerImage(pubkey);
  
  // Convert null to undefined to maintain compatibility with components expecting string | undefined
  const profileImage = profileImageData === null ? undefined : profileImageData;
  const bannerImage = bannerImageData === null ? undefined : bannerImageData;
  
  const getStats = async () => {
    const profileStats = await profileImageCache.getCacheStats();
    const bannerStats = await bannerImageCache.getCacheStats();
    
    setStats({
      profile: profileStats,
      banner: bannerStats
    });
  };
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Image Cache Test</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Image</Text>
        {profileLoading ? (
          <Text>Loading profile image...</Text>
        ) : (
          <View style={styles.imageContainer}>
            <UserAvatar 
              size="xl"
              pubkey={pubkey}
              uri={profileImage}
            />
            <Text style={styles.imageInfo}>Source: {profileImage || 'Using fallback'}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Banner Image</Text>
        {bannerLoading ? (
          <Text>Loading banner image...</Text>
        ) : (
          <View style={styles.bannerContainer}>
            {bannerImage ? (
              <Image 
                source={{ uri: bannerImage }}
                style={styles.banner}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.banner, styles.bannerPlaceholder]}>
                <Text>No banner image</Text>
              </View>
            )}
            <Text style={styles.imageInfo}>Source: {bannerImage || 'Using fallback'}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Get Cache Stats" 
          onPress={getStats}
        />
        
        <Button 
          title="Clear Profile Cache" 
          onPress={async () => {
            await profileImageCache.clearCache();
            getStats();
          }}
        />
        
        <Button 
          title="Clear Banner Cache" 
          onPress={async () => {
            await bannerImageCache.clearCache();
            getStats();
          }}
        />
      </View>
      
      {stats && (
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Cache Statistics</Text>
          
          <Text style={styles.statsTitle}>Profile Image Cache:</Text>
          <Text>Items: {stats.profile.itemCount}</Text>
          <Text>Size: {(stats.profile.size / (1024 * 1024)).toFixed(2)} MB</Text>
          <Text>Directory: {stats.profile.directory}</Text>
          
          <Text style={[styles.statsTitle, styles.statsSpacing]}>Banner Image Cache:</Text>
          <Text>Items: {stats.banner.itemCount}</Text>
          <Text>Size: {(stats.banner.size / (1024 * 1024)).toFixed(2)} MB</Text>
          <Text>Directory: {stats.banner.directory}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  bannerContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  banner: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  bannerPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'column',
    justifyContent: 'space-around',
    marginVertical: 20,
    gap: 10,
  },
  statsContainer: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 40,
  },
  statsTitle: {
    fontWeight: 'bold',
    marginTop: 5,
  },
  statsSpacing: {
    marginTop: 15,
  },
});
