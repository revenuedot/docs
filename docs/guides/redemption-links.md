---
title: How does a web purchase reach my app?
description: An anonymous web buyer gets a redemption link, <scheme>://redeem_web_purchase?redemption_token=…. Register the scheme, pass the link to redeemWebPurchase, and the purchase moves to the app's user. The results are success, invalidToken, purchaseBelongsToOtherUser and expired.
---

# How does a web purchase reach my app?

Through a **redemption link**. A buyer who paid on the web without an app user id gets a link to open on their phone. The link opens your app, your app passes it to the SDK's `redeemWebPurchase`, and RevenueDot moves the purchase to the app's user. The entitlement is active at once, even if the buyer paid before they installed the app.

Buyers whose app user id the page already knew (`?app_user_id=` on a [purchase link](purchase-links.md), or the iOS SDK's web checkout) need no redemption link: their purchase is on their customer already.

## The two forms of the link
| Form | Looks like | Where it is used |
|---|---|---|
| Deep link | `scanner://redeem_web_purchase?redemption_token=rdrt_q8Xc…` | Opens the app. The SDK parses it |
| https link | `https://api.revenuedot.app/pay/r/rdrt_q8Xc…` | In emails and QR codes. It opens a page with **Open the app** (the deep link) and the App Store and Google Play buttons |

The scheme is the web config's `app_scheme` (see [Sell on the web with Stripe](web-billing.md#2-add-a-web-config)). Set it to your app's own scheme, such as `scanner`. The default is `rd-` and 10 hex characters, which works too once you register it in the app.

The buyer gets the link in three places:
- On the **success page** after payment: **Open the app**. On a phone, tapping it tries the deep link first.
- **By email**, when Stripe has the buyer's email and the server can send email. The subject is "Your Scanner purchase is ready", and replies go to the web config's `support_email`.
- On your own page, as `redemption_url`, when the web config's `success_mode` is `redirect`.

A link works for `redemption_link_hours` (default 24). The token is `rdrt_` and 43 random characters; RevenueDot stores only its SHA-256 hash.

## 1. Register the URL scheme
### iOS
Add the scheme to `Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>com.example.scanner.redeem</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>scanner</string>
    </array>
  </dict>
</array>
```

### Android
Add an intent filter to the activity that opens the app:

```xml
<activity android:name=".MainActivity" android:exported="true" android:launchMode="singleTop">
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="scanner" />
  </intent-filter>
</activity>
```

## 2. Redeem the link
Configure the SDK with its proxy URL pointing at RevenueDot, as usual. If your app has accounts, call `logIn` before you redeem, so the purchase lands on the signed-in user.

### iOS (Swift)
```swift
// RevenueDot: the RevenueCat SDK parses the redemption link and calls POST /v1/subscribers/redeem_purchase.
// Docs: https://revenuedot.app/docs/guides/redemption-links
import RevenueCat
import SwiftUI

struct ContentView: View {
    var body: some View {
        HomeView()
            .onOpenURL { url in
                // Only redemption links parse; other deep links return nil.
                guard let redemption = url.asWebPurchaseRedemption else { return }
                Task {
                    switch await Purchases.shared.redeemWebPurchase(redemption) {
                    case let .success(customerInfo):
                        print("Unlocked:", customerInfo.entitlements.active.keys)
                    case let .error(error):
                        print("Try again later:", error.localizedDescription)
                    case .invalidToken:
                        print("This link is not valid.")
                    case .purchaseBelongsToOtherUser:
                        print("This purchase is already linked to another account.")
                    case let .expired(obfuscatedEmail):
                        print("This link expired. We sent a new one to \(obfuscatedEmail).")
                    }
                }
            }
    }
}
```

`Purchases.parseAsWebPurchaseRedemption(_:)` does the same as `url.asWebPurchaseRedemption`. In Objective-C or completion-handler code, call `redeemWebPurchase(webPurchaseRedemption:completion:)`. In a UIKit app, handle the URL in `scene(_:openURLContexts:)`.

### Android (Kotlin)
```kotlin
// RevenueDot: the RevenueCat SDK parses the redemption link and calls POST /v1/subscribers/redeem_purchase.
// Docs: https://revenuedot.app/docs/guides/redemption-links
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.asWebPurchaseRedemption
import com.revenuecat.purchases.interfaces.RedeemWebPurchaseListener

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        redeem(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        redeem(intent)
    }

    private fun redeem(intent: Intent) {
        // Only redemption links parse; other intents return null.
        val redemption = intent.asWebPurchaseRedemption() ?: return
        Purchases.sharedInstance.redeemWebPurchase(redemption) { result ->
            when (result) {
                is RedeemWebPurchaseListener.Result.Success -> showUnlocked(result.customerInfo)
                is RedeemWebPurchaseListener.Result.Error -> showError(result.error.message)
                RedeemWebPurchaseListener.Result.InvalidToken -> showError("This link is not valid.")
                RedeemWebPurchaseListener.Result.PurchaseBelongsToOtherUser -> showError("This purchase is already linked to another account.")
                is RedeemWebPurchaseListener.Result.Expired -> showError("This link expired. We sent a new one to ${result.obfuscatedEmail}.")
            }
        }
    }
}
```

`Purchases.parseAsWebPurchaseRedemption(url)` parses a URL string instead of an intent.

### React Native and Flutter
Both call the same endpoint. In React Native, `await Purchases.parseAsWebPurchaseRedemption(url)` returns the redemption, and `await Purchases.redeemWebPurchase(redemption)` redeems it. Flutter has the same two methods on `Purchases`.

## What each result means
The SDK calls `POST /v1/subscribers/redeem_purchase` with `{ "app_user_id", "redemption_token" }` and the app's public key.

| SDK result | Server answer | What happened |
|---|---|---|
| `success` | 200, customer info | The purchase is on the app's user. A second redeem by the same customer also succeeds, so a retry is safe |
| `invalidToken` | 400, code 7849 | The token is unknown, malformed or from another project |
| `purchaseBelongsToOtherUser` | 400, code 7852 | Another customer already redeemed it. When two app users redeem one link at the same moment, exactly one gets the purchase and the other gets 7852. The https link page says "Already unlocked" |
| `expired` | 400, code 7853 | The link is older than `redemption_link_hours`, or a newer link replaced it. RevenueDot emails a new link and answers the address in a hidden form, such as `t***@e*****e.com` |
| `error` | 401, 5xx, no network | Show an error and let the buyer try again |

```json
{"code":7853,"message":"The link has expired.","purchase_redemption_error_info":{"obfuscated_email":"t***@e*****e.com"}}
```

**About expired links.** Redeeming an expired link emails a fresh link and answers `expired`. The old link keeps answering `expired`, so the app can always tell the buyer to check their email. A new email goes out at most once an hour per purchase. If the buyer gave no email, the answer has no `purchase_redemption_error_info` and no email is sent; ask them to contact support.

## What redeeming does
The anonymous customer who paid on the web (`$RCAnonymousID:…`) is merged into the app's user, the same way `logIn` merges an anonymous customer. Purchases and attributes move over, including `$email` and the answers from a [funnel](funnels.md). If the app's user already has purchases, it keeps them and gains the web purchase. The SDK gets the updated customer info, so the entitlement is active at once.

RevenueDot then sends **`PURCHASE_REDEEMED`** to your [webhooks](webhooks.md) and integrations, once:

```json
{"api_version":"1.0","event":{"type":"PURCHASE_REDEEMED","id":"5B2E8C1D-9F3A-4E7B-A6C0-1D2E3F4A5B6C","app_id":"appstrp8k2m9q4","event_timestamp_ms":1790801342625,"store":"STRIPE","environment":"SANDBOX","redeemed_from":["$RCAnonymousID:7c1e9b2f4a6d48e3b05f9a8c2d1e3f47"],"redeemed_by":["user_1"],"redemption_outcome":"alias","redemption_platform":"ios","product_id":"price_1QxR2nKc8Hn4AbCd","entitlement_ids":["pro"],"workflow_id":"fnl_7q2k9m4x1z8c","workflow_step_id":null,"trace_id":"wco_8k2m9q4x7a1b3c5d","app_user_id":"user_1"}}
```

The fields follow RevenueCat's sample payload. `workflow_id` is the funnel id when the purchase came from a funnel, `trace_id` is the web checkout id, and `app_user_id` (a RevenueDot addition) is the user who redeemed it. Every field: [Webhook events](../../api/webhook-events.md#purchase_redeemed).

## Test it
1. Buy with a test-mode Stripe key and the card `4242 4242 4242 4242`, without `?app_user_id=`.
2. Copy the deep link from the https link page, or the email.
3. Open it on a simulator: `xcrun simctl openurl booted "scanner://redeem_web_purchase?redemption_token=rdrt_…"` on iOS, or `adb shell am start -a android.intent.action.VIEW -d "scanner://redeem_web_purchase?redemption_token=rdrt_…"` on Android.
4. The app should show the entitlement, and the customer's history in the dashboard shows the purchase and `PURCHASE_REDEEMED`.

## Related
- [Sell on the web with Stripe](web-billing.md)
- [Purchase links](purchase-links.md) and [Funnels](funnels.md)
- [iOS SDK](../sdks/ios.md), [Android SDK](../sdks/android.md)
- [SDK endpoints: redeem a web purchase](../../api/sdk-endpoints.md#redeem-a-web-purchase)
