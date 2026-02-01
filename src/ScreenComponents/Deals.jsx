import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ImageBackground,
  Platform,
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

const SPACING = 16;
const RADIUS = 18;

export default function DealsScreen({ navigation }) {
  const [audience, setAudience] = useState('students');
  const [query, setQuery] = useState('');

  const filteredCoupons = useMemo(() => {
    if (!query.trim()) return campusCoupons;
    const lowered = query.toLowerCase();
    return campusCoupons.filter(
      (c) =>
        c.label.toLowerCase().includes(lowered) ||
        c.subtitle.toLowerCase().includes(lowered) ||
        (c.category || '').toLowerCase().includes(lowered),
    );
  }, [query]);

  const listHeader = useMemo(() => {
    return (
      <View style={styles.headerWrap}>
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.pageTitle}>Coupons</Text>
            <Text style={styles.pageSubtitle}>Benefits & offers around campus</Text>
          </View>

          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.85}>
            <Feather name="bell" size={18} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search deals, stores, categories"
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn} activeOpacity={0.8}>
              <Feather name="x" size={16} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.segment}>
          {audienceTabs.map((tab) => {
            const active = audience === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.segmentPill, active && styles.segmentPillActive]}
                onPress={() => setAudience(tab.key)}
                activeOpacity={0.9}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Your Key Benefits</Text>
          <TouchableOpacity activeOpacity={0.8}>
            <Text style={styles.sectionAction}>See all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.benefitRow}>
          {keyBenefits.map((b) => (
            <TouchableOpacity key={b.id} style={styles.benefitCard} activeOpacity={0.9}>
              <View style={styles.benefitTop}>
                <View style={[styles.benefitIcon, { backgroundColor: `${b.accent}18` }]}>
                  <Feather name={b.icon} size={18} color={b.accent} />
                </View>
                <Feather name="chevron-right" size={18} color="#94A3B8" />
              </View>
              <Text style={styles.benefitTitle}>{b.title}</Text>
              <Text style={styles.benefitSubtitle}>{b.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.sectionHeaderRow, { marginTop: 2 }]}>
          <Text style={styles.sectionTitle}>Campus Coupons</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{filteredCoupons.length}</Text>
          </View>
        </View>
      </View>
    );
  }, [audience, query, filteredCoupons.length]);

  const keyExtractor = useCallback((item) => item.id, []);

  const renderCoupon = ({ item }) => {
    const { image, label, subtitle, category, distance, expires, accent } = item;
    const accentColor = accent || '#2563EB';

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.gridItem}
        onPress={() => navigation?.navigate?.('DiscountDetails', { coupon: item })}
      >
        <ImageBackground
          source={{ uri: image }}
          style={styles.couponCard}
          imageStyle={styles.couponImage}
        >
          {/* soft overlay for readability */}
          <View style={styles.darkOverlay} />
          <View style={[styles.tintOverlay, { backgroundColor: `${accentColor}28` }]} />

          <View style={styles.couponInner}>
            <View style={styles.couponTop}>
              <View style={[styles.chip, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                <Text style={styles.chipText}>{category || 'Campus Deal'}</Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillText}>{expires || 'Just added'}</Text>
              </View>
            </View>

            <View style={styles.couponBottom}>
              <Text style={styles.couponLabel} numberOfLines={1}>
                {label}
              </Text>
              <Text style={styles.couponSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Feather name="map-pin" size={12} color="#E2E8F0" />
                  <Text style={styles.metaText}>{distance || 'Nearby'}</Text>
                </View>

                <View style={styles.metaItem}>
                  <Feather name="arrow-right" size={12} color="#E2E8F0" />
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
        columnWrapperStyle={styles.row}
        ListHeaderComponent={listHeader}
        ListFooterComponent={
          <TouchableOpacity style={styles.discoverCard} activeOpacity={0.9}>
            <View style={styles.discoverIcon}>
              <Feather name="plus" size={18} color="#64748B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.discoverText}>Discover more benefits</Text>
              <Text style={styles.discoverSub}>New deals are added every week</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#94A3B8" />
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
    backgroundColor: '#F6F7FB',
  },
  container: {
    paddingHorizontal: SPACING,
    paddingBottom: 28,
  },

  headerWrap: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: Platform.select({ ios: '800', android: '800' }),
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8EDF6',
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#E8EDF6',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  clearBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  segment: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F8',
    borderRadius: 16,
    padding: 4,
    marginBottom: 14,
  },
  segmentPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentPillActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EDF6',
  },
  segmentText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '800',
  },
  segmentTextActive: {
    color: '#0F172A',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
  },
  badge: {
    minWidth: 28,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },

  benefitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  benefitCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8EDF6',
  },
  benefitTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  benefitSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  row: {
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    marginBottom: 14,
  },
  couponCard: {
    width: '100%',
    height: 208,
    borderRadius: RADIUS,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  couponImage: {
    borderRadius: RADIUS,
    resizeMode: 'cover',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.26)',
  },
  tintOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  couponInner: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },

  couponTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.22)',
  },
  pillText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '900',
  },

  couponBottom: {},
  couponLabel: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  couponSubtitle: {
    marginTop: 4,
    fontSize: 12.5,
    color: '#E2E8F0',
    fontWeight: '700',
  },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '800',
  },

  discoverCard: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8EDF6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  discoverIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoverText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  discoverSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
});
