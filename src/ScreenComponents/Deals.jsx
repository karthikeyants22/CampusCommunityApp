import React, { useCallback, useMemo, useState } from 'react';
import {
  ImageBackground,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

const audienceTabs = [
  { key: 'students', label: 'For Students' },
  { key: 'staff', label: 'For Staff' },
];

const keyBenefits = [
  {
    id: 'health',
    title: 'Health & Wellness',
    subtitle: 'Well-being resources',
    icon: 'heart',
    accent: '#4F8BFF',
  },
  {
    id: 'discounts',
    title: 'Student Discounts',
    subtitle: 'Exclusive offers',
    icon: 'tag',
    accent: '#4F8BFF',
  },
];

const campusCoupons = [
  {
    id: 'cafe',
    label: '15% OFF',
    subtitle: 'The Campus Cafe',
    category: 'Food',
    distance: '0.3 mi',
    expires: 'Ends today',
    accent: '#F97316',
    image:
      'https://images.unsplash.com/photo-1504753793650-d4a2b783c15e?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'books',
    label: '20% OFF',
    subtitle: 'University Bookstore',
    category: 'Books',
    distance: 'On campus',
    expires: '3 days left',
    accent: '#F59E0B',
    image:
      'https://images.unsplash.com/photo-1457694587812-e8bf29a43845?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'subway',
    label: 'BOGO FREE',
    subtitle: 'Subway Delights',
    category: 'Food',
    distance: '0.6 mi',
    expires: 'This week',
    accent: '#22C55E',
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'tech',
    label: 'SAVE $50',
    subtitle: 'Campus Tech Store',
    category: 'Tech',
    distance: '1.1 mi',
    expires: 'New',
    accent: '#6366F1',
    image:
      'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'sports',
    label: 'FREE ENTRY',
    subtitle: 'Campus Sports Center',
    category: 'Sports',
    distance: '0.4 mi',
    expires: 'Limited',
    accent: '#EF4444',
    image:
      'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'books2',
    label: '20% OFF',
    subtitle: 'University Bookstore',
    category: 'Books',
    distance: 'On campus',
    expires: '2 days left',
    accent: '#10B981',
    image:
      'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=900&q=80',
  },
];

export default function DealsScreen({ navigation }) {
  const [audience, setAudience] = useState('students');
  const [query, setQuery] = useState('');

  const filteredCoupons = useMemo(() => {
    if (!query.trim()) {
      return campusCoupons;
    }

    const lowered = query.toLowerCase();
    return campusCoupons.filter(
      (coupon) =>
        coupon.label.toLowerCase().includes(lowered) ||
        coupon.subtitle.toLowerCase().includes(lowered),
    );
  }, [query]);

  const listHeader = useMemo(
    () => (
      <View>
        {/* <View style={styles.header}>
          <View style={styles.avatarBubble}>
            <Text style={styles.avatarInitial}>A</Text>
          </View>
          <Text style={styles.headerTitle}>Coupons &amp; Benefits</Text>
          <TouchableOpacity style={styles.bellButton} activeOpacity={0.85}>
            <Feather name="bell" size={20} color="#1E1E1E" />
          </TouchableOpacity>
        </View> */}

        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#7D8597" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search coupons & benefits"
            placeholderTextColor="#9AA2B1"
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <View style={styles.toggleGroup}>
          {audienceTabs.map((tab) => {
            const active = audience === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.togglePill, active && styles.togglePillActive]}
                onPress={() => setAudience(tab.key)}
                activeOpacity={0.9}
              >
                <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionHeading}>Your Key Benefits</Text>
        <View style={styles.benefitRow}>
          {keyBenefits.map((benefit) => (
            <View key={benefit.id} style={styles.benefitCard}>
              <View style={[styles.benefitIcon, { backgroundColor: `${benefit.accent}15` }]}>
                <Feather name={benefit.icon} size={20} color={benefit.accent} />
              </View>
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitSubtitle}>{benefit.subtitle}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionHeading, styles.sectionSpacing]}>Campus Coupons</Text>
      </View>
    ),
    [audience, query],
  );

  const keyExtractor = useCallback((item) => item.id, []);

  const renderCoupon = ({ item }) => {
    const { image, label, subtitle, category, distance, expires, accent } = item;
    const accentColor = accent || '#2563EB';

    return (
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={() => navigation?.navigate?.('DiscountDetails', { coupon: item })}
        style={{width:"70%"}}
      >
        <ImageBackground
          source={{ uri: image }}
          style={styles.couponCard}
          imageStyle={styles.couponImage}
        >
          <View style={[styles.couponOverlay, { backgroundColor: `${accentColor}50` }]} />
          <View style={styles.couponContent}>
            <View style={styles.couponTopRow}>
              <View style={[styles.couponTag, { backgroundColor: `${accentColor}26` }]}>
                <Text style={[styles.couponTagText, { color: accentColor }]}>
                  {category || 'Campus Deal'}
                </Text>
              </View>
              <Text style={styles.couponMeta}>{expires || 'Just added'}</Text>
            </View>
            <View style={styles.couponBottom}>
              <Text style={styles.couponLabel}>{label}</Text>
              <Text style={styles.couponSubtitle}>{subtitle}</Text>
              <View style={styles.couponMetaRow}>
                <View style={styles.metaItem}>
                  <Feather name="map-pin" size={12} color="#FFFFFF" />
                  <Text style={styles.metaText}>{distance || 'Nearby'}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Feather name="arrow-right" size={12} color="#FFFFFF" />
                  <Text style={styles.metaText}>Details</Text>
                </View>
              </View>
            </View>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filteredCoupons}
        renderItem={renderCoupon}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={styles.couponRow}
        ListHeaderComponent={listHeader}
        ListFooterComponent={
          <TouchableOpacity style={styles.discoverCard} activeOpacity={0.9}>
            <View style={styles.discoverIcon}>
              <Feather name="plus" size={22} color="#7D8597" />
            </View>
            <Text style={styles.discoverText}>Discover More!</Text>
          </TouchableOpacity>
        }
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E9EDF4',
  },
  container: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  avatarBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F7DAC3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2530',
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F6FB',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: '#E2E6EE',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#1F2430',
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#E8EAF2',
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
  },
  togglePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  togglePillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  toggleText: {
    fontSize: 14,
    color: '#7D8597',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#1F2430',
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2530',
    marginBottom: 12,
  },
  sectionSpacing: {
    marginTop: 8,
  },
  benefitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  benefitCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#161B26',
  },
  benefitSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#7D8597',
  },
  couponRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  couponCard: {
    width: '70%',
    height: 200,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  couponImage: {
    borderRadius: 18,
    resizeMode: 'cover',
  },
  couponOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  couponContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 14,
  },
  couponLabel: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  couponSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#F1F5F9',
    fontWeight: '600',
  },
  couponTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  couponTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  couponTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  couponMeta: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  couponBottom: {
    marginTop: 'auto',
  },
  couponMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: '600',
  },
  discoverCard: {
    marginTop: 16,
    backgroundColor: '#EEF0F6',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  discoverIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD2E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  discoverText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6E7688',
    marginLeft: 8,
  },
});
