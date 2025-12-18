import React, { useMemo } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Colors from '../Common/Colors';

const defaultCoupon = {
  title: 'Free Large Fries with Any Burger Purchase',
  partner: 'The Burger Joint',
  tags: ['Food', 'Local Business', 'Limited Time'],
  description:
    'Enjoy a complimentary large fries when you purchase any signature burger from our menu. This offer is brought to you by our local partner, The Burger Joint, dedicated to serving the best burgers on campus.',
  terms: [
    'Offer valid for one-time use per customer.',
    'Cannot be combined with any other promotions or discounts.',
    'Valid for in-store purchases only.',
    'Must present this coupon at the time of order.',
  ],
  validUntil: 'December 31, 2024',
  image:
    'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80',
};

export default function DiscountDetailsScreen({ route, navigation }) {
  const coupon = useMemo(() => {
    const incoming = route?.params?.coupon;
    if (!incoming) {
      return defaultCoupon;
    }

    return {
      ...defaultCoupon,
      ...incoming,
      tags: incoming.tags || defaultCoupon.tags,
      terms: incoming.terms || defaultCoupon.terms,
      image: incoming.image || defaultCoupon.image,
    };
  }, [route?.params?.coupon]);

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerAction} onPress={handleBack} activeOpacity={0.85}>
            <Feather name="arrow-left" size={18} color="#111827" />
            <Text style={styles.headerActionText}>Coupon Details</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} activeOpacity={0.85}>
            <Feather name="share-2" size={18} color="#111827" />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Image source={{ uri: coupon.image }} style={styles.heroImage} />

          <Text style={styles.title}>{coupon.title}</Text>

          <View style={styles.tagRow}>
            {coupon.tags.map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.description}>{coupon.description}</Text>

          <Text style={styles.sectionTitle}>Terms &amp; Conditions</Text>
          <View style={styles.termList}>
            {coupon.terms.map((term) => (
              <View key={term} style={styles.termItem}>
                <View style={styles.bullet} />
                <Text style={styles.termText}>{term}</Text>
              </View>
            ))}
          </View>

          <View style={styles.validRow}>
            <Feather name="calendar" size={16} color="#4B5563" />
            <Text style={styles.validLabel}>Valid until</Text>
            <Text style={styles.validDate}>{coupon.validUntil}</Text>
          </View>

          <View style={styles.qrPlaceholder}>
            <Feather name="smartphone" size={42} color="#A1A8B5" />
            <Text style={styles.qrLabel}>Your code will appear here after you tap 'Redeem Now'</Text>
          </View>

          <TouchableOpacity style={styles.redeemButton} activeOpacity={0.9}>
            <Text style={styles.redeemButtonText}>Redeem Now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#DADCE0',
  },
  container: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  heroImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 28,
    marginBottom: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tagPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4B5563',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  termList: {
    marginBottom: 16,
  },
  termItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9CA3AF',
    marginTop: 7,
    marginRight: 8,
  },
  termText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#4B5563',
  },
  validRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  validLabel: {
    marginLeft: 8,
    fontSize: 13,
    color: '#4B5563',
  },
  validDate: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  qrPlaceholder: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD2E1',
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 18,
  },
  qrLabel: {
    marginTop: 10,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  redeemButton: {
    backgroundColor: Colors.themeColour || '#2563EB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  redeemButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
