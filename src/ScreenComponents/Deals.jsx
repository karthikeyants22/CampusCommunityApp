import React, { useCallback, useMemo, useState } from 'react';
import {
  SafeAreaView,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

const categories = [
  { key: 'all', label: 'All Deals', icon: 'grid' },
  { key: 'food', label: 'Food & Dining', icon: 'coffee' },
  { key: 'tech', label: 'Tech', icon: 'cpu' },
  { key: 'lifestyle', label: 'Lifestyle', icon: 'shopping-bag' },
  { key: 'travel', label: 'Travel', icon: 'navigation' },
];

const stats = [
  { label: 'Active Deals', value: '6', background: '#E8F1FF', textColor: '#1D4ED8' },
  { label: 'Total Savings', value: '₹12,450', background: '#E6F6F2', textColor: '#047857' },
  { label: 'Used This Month', value: '23', background: '#F5EEFF', textColor: '#6D28D9' },
];

const deals = [
  {
    id: 'mcdonalds',
    category: 'food',
    title: "McDonald's",
    badge: 'Trending',
    description: 'Student Special: 20% Off All Meals',
    details: 'Valid on all menu items with student ID',
    discount: 20,
    price: '₹240',
    savingsLabel: 'Save 20%',
    rating: '4.8',
    ratingCount: 234,
    location: 'Campus Food Court',
    validUntil: '8/31/2025',
    couponCode: 'STUDENT20',
    likes: 156,
    claimed: 1240,
    brandColor: '#E0F2FF',
  },
  {
    id: 'spotify',
    category: 'tech',
    title: 'Spotify Premium',
    badge: 'New',
    description: 'Get 3 Months Free Premium',
    details: 'Exclusive for students with valid ID',
    discount: 50,
    price: '₹59/mo',
    savingsLabel: 'Save 50%',
    rating: '4.9',
    ratingCount: 542,
    location: 'Campus Wide',
    validUntil: '9/30/2025',
    couponCode: 'CVIBEPLAY',
    likes: 203,
    claimed: 3210,
    brandColor: '#E8F5FF',
  },
  {
    id: 'nike',
    category: 'lifestyle',
    title: 'Nike Factory Store',
    badge: 'Limited',
    description: 'Flat ₹1500 Off on Sneakers',
    details: 'Applicable on purchases above ₹4999',
    discount: 30,
    price: '₹3,499',
    savingsLabel: 'Save ₹1,500',
    rating: '4.6',
    ratingCount: 189,
    location: 'City Center Mall',
    validUntil: '7/15/2025',
    couponCode: 'KICKSTART',
    likes: 98,
    claimed: 874,
    brandColor: '#F0F4FF',
  },
];

export default function DealsScreen() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredDeals = useMemo(() => {
    if (selectedCategory === 'all') {
      return deals;
    }

    return deals.filter((deal) => deal.category === selectedCategory);
  }, [selectedCategory]);

  const headerComponent = useMemo(
    () => (
      <View>
        {/* <View style={styles.header}>
          <View style={styles.brandBlock}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandInitial}>C</Text>
            </View>
            <Text style={styles.brandName}>Cvibe</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
              <Feather name="bell" size={20} color="#2D3A4A" />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
            <View style={styles.profileBubble}>
              <Text style={styles.profileInitial}>D</Text>
            </View>
          </View>
        </View> */}

        <View style={styles.heading}>
          <Text style={styles.headingTitle}>Campus Deals</Text>
          <Text style={styles.headingSubtitle}>Exclusive student discounts &amp; offers</Text>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchInput}>
            <Feather name="search" size={18} color="#98A2B3" />
            <TextInput
              style={styles.searchField}
              placeholder="Search deals, brands, or categories..."
              placeholderTextColor="#98A2B3"
            />
          </View>
          <TouchableOpacity style={styles.filterButton} activeOpacity={0.85}>
            <Feather name="sliders" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((category) => {
            const active = selectedCategory === category.key;

            return (
              <TouchableOpacity
                key={category.key}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(category.key)}
                activeOpacity={0.85}
              >
                <Feather
                  name={category.icon}
                  size={16}
                  color={active ? '#2563EB' : '#475467'}
                  style={styles.categoryIcon}
                />
                <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.statsRow}>
          {stats.map((stat, index) => (
            <View
              key={stat.label}
              style={[
                styles.statCard,
                { backgroundColor: stat.background },
                index === stats.length - 1 && styles.statCardLast,
              ]}
            >
              <Text style={[styles.statLabel, { color: stat.textColor }]}>{stat.label}</Text>
              <Text style={[styles.statValue, { color: stat.textColor }]}>{stat.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Deals</Text>
          <TouchableOpacity activeOpacity={0.8}>
            <Text style={styles.sectionAction}>View all</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [selectedCategory],
  );

  const renderDeal = useCallback(({ item }) => <DealCard deal={item} />, []);
  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filteredDeals}
        keyExtractor={keyExtractor}
        renderItem={renderDeal}
         ListHeaderComponent={headerComponent}
        ListFooterComponent={<View style={styles.listFooterSpacer} />}
        ListEmptyComponent={<EmptyDealsState />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function DealCard({ deal }) {
  return (
    <View style={styles.dealCard}>
      <View style={styles.dealHeader}>
        <View style={styles.dealBrandRow}>
          <View style={[styles.dealAvatar, { backgroundColor: deal.brandColor || '#E0E7FF' }]}>
            <Text style={styles.dealAvatarText}>{deal.title[0]}</Text>
          </View>
          <View>
            <Text style={styles.dealTitle}>{deal.title}</Text>
            <View style={styles.dealBadgeRow}>
              <Feather name="trending-up" size={12} color="#F97316" />
              <Text style={styles.dealBadgeText}>{deal.badge}</Text>
            </View>
          </View>
        </View>
        <View style={styles.dealDiscount}>
          <Text style={styles.dealDiscountValue}>{deal.discount}%</Text>
          <Text style={styles.dealDiscountLabel}>OFF</Text>
        </View>
      </View>

      <Text style={styles.dealHeadline}>{deal.description}</Text>
      <Text style={styles.dealSupporting}>{deal.details}</Text>

      <View style={styles.dealPricingRow}>
        <Text style={styles.dealPrice}>{deal.price}</Text>
        <View style={styles.dealSavingsChip}>
          <Feather name="tag" size={12} color="#047857" />
          <Text style={styles.dealSavingsText}>{deal.savingsLabel}</Text>
        </View>
      </View>

      <View style={styles.dealMetaRow}>
        <View style={styles.dealMetaItem}>
          <Feather name="star" size={14} color="#FBBF24" />
          <Text style={styles.dealMetaText}>
            {deal.rating} ({deal.ratingCount})
          </Text>
        </View>
        <View style={styles.dotSeparator} />
        <View style={styles.dealMetaItem}>
          <Feather name="map-pin" size={14} color="#2563EB" />
          <Text style={styles.dealMetaText}>{deal.location}</Text>
        </View>
        <View style={styles.dotSeparator} />
        <View style={styles.dealMetaItem}>
          <Feather name="calendar" size={14} color="#6366F1" />
          <Text style={styles.dealMetaText}>Valid until {deal.validUntil}</Text>
        </View>
      </View>

      <View style={styles.couponRow}>
        <View style={styles.couponBox}>
          <Text style={styles.couponLabel}>Coupon Code</Text>
          <Text style={styles.couponValue}>{deal.couponCode}</Text>
        </View>
        <TouchableOpacity style={styles.copyButton} activeOpacity={0.85}>
          <Feather name="copy" size={14} color="#FFFFFF" />
          <Text style={styles.copyButtonText}>Copy</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dealFooter}>
        <View style={styles.dealFooterLeft}>
          <View style={styles.footerStat}>
            <Feather name="heart" size={14} color="#EF4444" />
            <Text style={styles.footerStatText}>{deal.likes}</Text>
          </View>
          <View style={styles.footerStat}>
            <Feather name="users" size={14} color="#2563EB" />
            <Text style={styles.footerStatText}>{deal.claimed} claimed</Text>
          </View>
          <TouchableOpacity activeOpacity={0.85}>
            <Feather name="share-2" size={16} color="#475467" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.claimButton} activeOpacity={0.9}>
          <Text style={styles.claimButtonText}>Claim Deal</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EmptyDealsState() {
  return (
    <View style={styles.emptyState}>
      <Feather name="package" size={32} color="#98A2B3" />
      <Text style={styles.emptyStateTitle}>No deals found</Text>
      <Text style={styles.emptyStateSubtitle}>
        Try a different category or check back for new offers soon.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F6FB',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  listFooterSpacer: {
    height: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 20,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  brandName: {
    marginLeft: 10,
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F97316',
  },
  profileBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  heading: {
    marginBottom: 16,
  },
  headingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headingSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#667085',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },
  searchField: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1F2937',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryScroll: {
    paddingVertical: 6,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF0F6',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 12,
  },
  categoryChipActive: {
    backgroundColor: '#E0EBFF',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  categoryIcon: {
    marginRight: 6,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475467',
  },
  categoryLabelActive: {
    color: '#2563EB',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  statCardLast: {
    marginRight: 0,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#101828',
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  dealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dealBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dealAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dealAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D2939',
  },
  dealTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  dealBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3E7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  dealBadgeText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#F97316',
  },
  dealDiscount: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
  },
  dealDiscountValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#047857',
  },
  dealDiscountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  dealHeadline: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
    color: '#101828',
  },
  dealSupporting: {
    marginTop: 4,
    fontSize: 13,
    color: '#667085',
  },
  dealPricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  dealPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  dealSavingsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 12,
  },
  dealSavingsText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  dealMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  dealMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dealMetaText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#475467',
  },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D0D5DD',
    marginHorizontal: 10,
  },
  couponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  couponBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
  },
  couponLabel: {
    fontSize: 11,
    color: '#98A2B3',
    fontWeight: '500',
  },
  couponValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
    letterSpacing: 1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    marginLeft: 12,
  },
  copyButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dealFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  dealFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  footerStatText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#475467',
    fontWeight: '500',
  },
  claimButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 18,
  },
  claimButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#101828',
  },
  emptyStateSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#667085',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
