/**
 * ECHO — In-App Purchase store (RevenueCat)
 *
 * Architecture:
 *  - RevenueCat manages StoreKit / Google Play Billing
 *  - Entitlement "premium" maps to subscriptionTier = 'premium' in Supabase
 *  - Products: com.echoself.app.premium.monthly ($12/mo)
 *              com.echoself.app.premium.yearly  ($99/yr)
 *  - After purchase, we call Supabase RPC to update profiles.subscription_tier
 *    so the change is reflected everywhere immediately.
 */

import { create } from 'zustand';
import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesPackage,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import { supabase } from '../services/supabase';
import { Analytics, Events } from '../lib/analytics';

// ─── RevenueCat API keys ──────────────────────────────────────────────────────
// Set these in your .env / EAS secrets
const RC_IOS_KEY     = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY     ?? '';
const RC_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

// Entitlement defined in RevenueCat dashboard
const ENTITLEMENT_PREMIUM = 'premium';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IAPPackage {
  identifier: string;   // monthly | annual
  productId: string;    // com.echoself.app.premium.*
  priceString: string;  // "$12.00"
  period: 'monthly' | 'annual';
  raw: PurchasesPackage;
}

interface IAPState {
  isConfigured: boolean;
  isPremium: boolean;
  packages: IAPPackage[];
  isLoading: boolean;
  isPurchasing: boolean;
  customerInfo: CustomerInfo | null;
  error: string | null;

  // Actions
  configure: (userId: string) => Promise<void>;
  fetchOfferings: () => Promise<void>;
  purchasePackage: (pkg: IAPPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  syncPremiumStatus: (info: CustomerInfo) => Promise<void>;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useIAPStore = create<IAPState>((set, get) => ({
  isConfigured: false,
  isPremium: false,
  packages: [],
  isLoading: false,
  isPurchasing: false,
  customerInfo: null,
  error: null,

  /**
   * Call once after the user is authenticated.
   * Sets up RevenueCat with the logged-in userId for accurate attribution.
   */
  configure: async (userId: string) => {
    if (get().isConfigured) return;
    try {
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      const apiKey = Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY;
      if (!apiKey) {
        console.warn('[IAP] RevenueCat API key not set — IAP will not work.');
        return;
      }

      Purchases.configure({ apiKey, appUserID: userId });
      set({ isConfigured: true });

      // Listen to subscription changes (e.g. subscription expires, renews)
      Purchases.addCustomerInfoUpdateListener(async (info) => {
        await get().syncPremiumStatus(info);
      });

      // Fetch initial customer info
      const info = await Purchases.getCustomerInfo();
      await get().syncPremiumStatus(info);

      // Fetch available packages
      await get().fetchOfferings();
    } catch (err) {
      console.error('[IAP] configure error:', err);
    }
  },

  /**
   * Fetch current offerings from RevenueCat.
   * Maps raw PurchasesPackage → IAPPackage for UI consumption.
   */
  fetchOfferings: async () => {
    set({ isLoading: true, error: null });
    try {
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      if (!current) {
        set({ packages: [], isLoading: false });
        return;
      }

      const mapped: IAPPackage[] = current.availablePackages
        .map((pkg): IAPPackage | null => {
          const id = pkg.product.identifier;
          const period: 'monthly' | 'annual' = id.includes('yearly') || id.includes('annual')
            ? 'annual'
            : 'monthly';
          return {
            identifier: pkg.identifier,
            productId: id,
            priceString: pkg.product.priceString,
            period,
            raw: pkg,
          };
        })
        .filter((p): p is IAPPackage => p !== null)
        // monthly first, annual second
        .sort((a, _b) => (a.period === 'monthly' ? -1 : 1));

      set({ packages: mapped, isLoading: false });
    } catch (err) {
      console.error('[IAP] fetchOfferings error:', err);
      set({ isLoading: false, error: 'Could not load pricing. Please try again.' });
    }
  },

  /**
   * Initiate a native StoreKit purchase for the given package.
   * Returns true on success, false if cancelled or failed.
   */
  purchasePackage: async (pkg: IAPPackage): Promise<boolean> => {
    set({ isPurchasing: true, error: null });
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg.raw);
      await get().syncPremiumStatus(customerInfo);
      set({ isPurchasing: false, customerInfo });
      Analytics.track(Events.SUBSCRIPTION_ACTIVATED, {
        package: pkg.identifier,
        period: pkg.period,
      });
      return true;
    } catch (err) {
      set({ isPurchasing: false });

      // User cancelled — not an error, just silent
      if ((err as { code?: string })?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        return false;
      }

      // Payment declined / network issues
      const msg =
        (err instanceof Error ? err.message : null) ??
        'Purchase failed. Please check your payment method and try again.';
      set({ error: msg });
      console.error('[IAP] purchasePackage error:', err);
      return false;
    }
  },

  /**
   * Restore previously purchased subscriptions.
   * Required by Apple: must be accessible from the paywall UI.
   */
  restorePurchases: async (): Promise<boolean> => {
    set({ isPurchasing: true, error: null });
    try {
      const info = await Purchases.restorePurchases();
      await get().syncPremiumStatus(info);
      set({ isPurchasing: false, customerInfo: info });
      const restored =
        info.entitlements.active[ENTITLEMENT_PREMIUM] !== undefined;
      return restored;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not restore purchases.';
      set({ isPurchasing: false, error: message });
      console.error('[IAP] restorePurchases error:', err);
      return false;
    }
  },

  /**
   * Sync the premium entitlement status with Supabase profiles.
   * Called after purchase, restore, and on every CustomerInfo update.
   */
  syncPremiumStatus: async (info: CustomerInfo) => {
    const isPremium = info.entitlements.active[ENTITLEMENT_PREMIUM] !== undefined;
    set({ isPremium, customerInfo: info });

    // Sync to Supabase so the backend / web app stays consistent
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('profiles')
        .update({ subscription_tier: isPremium ? 'premium' : 'free' })
        .eq('id', user.id);
    } catch (err) {
      // Non-fatal — local state is already updated
      console.warn('[IAP] syncPremiumStatus Supabase update failed:', err);
    }
  },
}));
