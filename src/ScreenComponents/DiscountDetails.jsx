import React, { useMemo, useState } from 'react';
import {
  ImageBackground,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
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
  distance: '0.3 mi',
  expires: 'Ends today',
  category: 'Food',
  accent: '#F97316',
  image:
    'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80',
};

export default function DiscountDetailsScreen({ route, navigation }) {
  const coupon = useMemo(() => {
    const incoming = route?.params?.coupon;
    if (!incoming) return defaultCoupon;

    return {
      ...defaultCoupon,
      ...incoming,
      tags: incoming.tags || defaultCoupon.tags,
      terms: incoming.terms || defaultCoupon.terms,
      image: incoming.image || defaultCoupon.image,
    };
  }, [route?.params?.coupon]);

  const [revealed, setRevealed] = useState(false);

  const accent = coupon.accent || '#2563EB';

  const handleBack = () => navigation?.goBack?.();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* HERO */}
          <View style={styles.heroWrap}>
            <ImageBackground source={{ uri: coupon.image }} style={styles.hero} imageStyle={styles.heroImg}>
              <View style={styles.heroShade} />
              <View style={[styles.heroTint, { backgroundColor: `${accent}22` }]} />

              {/* Floating Actions */}
              <View style={styles.heroTopRow}>
                <TouchableOpacity style={styles.fab} onPress={handleBack} activeOpacity={0.9}>
                  <Feather name="arrow-left" size={18} color="#0F172A" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.fab} activeOpacity={0.9}>
                  <Feather name="share-2" size={18} color="#0F172A" />
                </TouchableOpacity>
              </View>

              {/* Offer badge */}
              <View style={styles.heroBottom}>
                <View style={[styles.offerPill, { borderColor: `${accent}55` }]}>
                  <Feather name="zap" size={14} color="#FFFFFF" />
                  <Text style={styles.offerPillText}>{coupon.expires || 'Limited time'}</Text>
                </View>

                <Text style={styles.heroTitle} numberOfLines={2}>
                  {coupon.title}
                </Text>

                <View style={styles.partnerRow}>
                  <View style={[styles.partnerDot, { backgroundColor: accent }]} />
                  <Text style={styles.partnerText}>{coupon.partner || 'Campus Partner'}</Text>
                </View>
              </View>
            </ImageBackground>
          </View>

          {/* BODY CARD */}
          <View style={styles.card}>
            {/* Quick info chips */}
            <View style={styles.chipRow}>
              <View style={styles.chip}>
                <Feather name="tag" size={14} color="#334155" />
                <Text style={styles.chipText}>{coupon.category || 'Deal'}</Text>
              </View>
              <View style={styles.chip}>
                <Feather name="map-pin" size={14} color="#334155" />
                <Text style={styles.chipText}>{coupon.distance || 'Nearby'}</Text>
              </View>
              <View style={styles.chip}>
                <Feather name="calendar" size={14} color="#334155" />
                <Text style={styles.chipText}>{coupon.validUntil}</Text>
              </View>
            </View>

            {/* Tags */}
            <View style={styles.tagRow}>
              {coupon.tags?.map((tag) => (
                <View key={tag} style={[styles.tagPill, { backgroundColor: `${accent}14` }]}>
                  <Text style={[styles.tagText, { color: accent }]}>{tag}</Text>
                </View>
              ))}
            </View>

            {/* Description */}
            <Text style={styles.sectionTitle}>About this deal</Text>
            <Text style={styles.description}>{coupon.description}</Text>

            {/* Terms */}
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
            <View style={styles.termList}>
              {coupon.terms?.map((term) => (
                <View key={term} style={styles.termItem}>
                  <View style={[styles.bullet, { backgroundColor: accent }]} />
                  <Text style={styles.termText}>{term}</Text>
                </View>
              ))}
            </View>

            {/* Redeem card */}
            <View style={[styles.redeemCard, { borderColor: `${accent}2A` }]}>
              <View style={styles.redeemHeader}>
                <View style={[styles.redeemIcon, { backgroundColor: `${accent}18` }]}>
                  <Feather name="smartphone" size={18} color={accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.redeemTitle}>Redeem on checkout</Text>
                  <Text style={styles.redeemSub}>
                    Tap to reveal your code and show it to the cashier.
                  </Text>
                </View>
              </View>

              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>{revealed ? 'Your code' : 'Code locked'}</Text>
                <Text style={styles.codeValue}>{revealed ? 'CAMPUS-4821' : '•••• ••••'}</Text>

                <View style={styles.codeActions}>
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { borderColor: `${accent}40` }]}
                    activeOpacity={0.9}
                    onPress={() => setRevealed((v) => !v)}
                  >
                    <Feather name={revealed ? 'eye-off' : 'eye'} size={16} color={accent} />
                    <Text style={[styles.secondaryBtnText, { color: accent }]}>
                      {revealed ? 'Hide' : 'Reveal'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.secondaryBtn, { borderColor: '#E2E8F0' }]}
                    activeOpacity={0.9}
                    disabled={!revealed}
                  >
                    <Feather name="copy" size={16} color={revealed ? '#0F172A' : '#94A3B8'} />
                    <Text style={[styles.secondaryBtnText, { color: revealed ? '#0F172A' : '#94A3B8' }]}>
                      Copy
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={{ height: 92 }} />
          </View>
        </ScrollView>

        {/* Sticky bottom CTA */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomMeta}>
            <Text style={styles.bottomMetaLabel}>Valid until</Text>
            <Text style={styles.bottomMetaValue}>{coupon.validUntil}</Text>
          </View>

          <TouchableOpacity
            style={[styles.redeemButton, { backgroundColor: Colors.themeColour || accent }]}
            activeOpacity={0.92}
            onPress={() => setRevealed(true)}
          >
            <Text style={styles.redeemButtonText}>Redeem Now</Text>
            <Feather name="arrow-right" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6F7FB' },
  root: { flex: 1 },

  scrollContent: { paddingBottom: 0 },

  heroWrap: { backgroundColor: '#F6F7FB' },
  hero: { height: 280, width: '100%' },
  heroImg: { resizeMode: 'cover' },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2,6,23,0.30)' },
  heroTint: { ...StyleSheet.absoluteFillObject },

  heroTopRow: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.9)',
  },

  heroBottom: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
  },
  offerPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15,23,42,0.28)',
    borderWidth: 1,
  },
  offerPillText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },

  heroTitle: {
    marginTop: 10,
    fontSize: 24,
    fontWeight: Platform.select({ ios: '900', android: '900' }),
    color: '#FFFFFF',
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  partnerRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  partnerDot: { width: 10, height: 10, borderRadius: 5 },
  partnerText: { color: '#E2E8F0', fontWeight: '800', fontSize: 13 },

  card: {
    marginTop: -18,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: '#EEF2F8',
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E8EDF6',
  },
  chipText: { fontSize: 12, fontWeight: '900', color: '#0F172A' },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14, gap: 8 },
  tagPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  tagText: { fontSize: 12, fontWeight: '900' },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  description: { fontSize: 13.5, lineHeight: 20, color: '#475569', fontWeight: '600' },

  divider: { height: 1, backgroundColor: '#EEF2F8', marginVertical: 16 },

  termList: { gap: 10 },
  termItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bullet: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  termText: { flex: 1, fontSize: 13, lineHeight: 19, color: '#475569', fontWeight: '600' },

  redeemCard: {
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    padding: 14,
  },
  redeemHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  redeemIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  redeemTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  redeemSub: { marginTop: 2, fontSize: 12, fontWeight: '700', color: '#64748B', lineHeight: 16 },

  codeBox: {
    backgroundColor: '#0B1220',
    borderRadius: 16,
    padding: 14,
  },
  codeLabel: { color: '#94A3B8', fontWeight: '900', fontSize: 11, textTransform: 'uppercase' },
  codeValue: { marginTop: 6, color: '#FFFFFF', fontWeight: '900', fontSize: 22, letterSpacing: 1.2 },

  codeActions: { marginTop: 12, flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryBtnText: { fontWeight: '900', fontSize: 13 },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.select({ ios: 18, android: 14 }),
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 1,
    borderTopColor: '#EEF2F8',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bottomMeta: { flex: 1 },
  bottomMetaLabel: { fontSize: 11, fontWeight: '900', color: '#64748B', textTransform: 'uppercase' },
  bottomMetaValue: { marginTop: 3, fontSize: 13, fontWeight: '900', color: '#0F172A' },

  redeemButton: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  redeemButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});
