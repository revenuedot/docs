---
title: How do I show retention offers when customers cancel?
description: Offer a discount in the in-app Customer Center when a customer cancels or asks for a refund, and show a message, a cheaper plan or a promotional offer on Apple's own cancel screen with the Retention Messaging API.
---

# How do I show retention offers when customers cancel?

**Lifecycle > Retention** has two tabs. **Customer Center** puts an offer in front of customers who cancel or ask for a refund inside your app. **Apple Retention Messaging API** puts a message or an offer on Apple's own Confirm Cancellation screen, which customers see when they cancel from their Apple account.

## Customer Center offers
The Customer Center is the subscription screen the RevenueCat SDK shows in your app (`CustomerCenterView` on iOS, `CustomerCenter` on Android). Its configuration comes from your RevenueDot server.

1. Create a promotional offer in App Store Connect (or a developer-determined offer in Google Play Console) on each subscription you want to discount.
2. Open **Lifecycle > Retention > Customer Center** and select **New offer** under **Cancellation Retention Discount** or **Refunds Retention Discount**.
3. Name it, write the title and subtitle the customer sees, pick the store, and link each product to its offer id.

RevenueDot adds the offer to the Customer Center's cancel or refund path. The SDK shows it before the customer finishes; on iOS it asks your server to sign the promotional offer, which RevenueDot already does with the app's In-App Purchase key.

## Apple Retention Messaging API
Apple calls your server in real time when a customer is about to cancel, and shows the message you pick ([Apple's documentation](https://developer.apple.com/documentation/retentionmessaging)). **Apple grants access to this API on request**: ask for it at [Request access to the Retention Messaging API](https://developer.apple.com/contact/request/retention-messaging-api/) first.

1. Open **Lifecycle > Retention > Apple Retention Messaging API** and pick the App Store app. The app needs its In-App Purchase key (see [Connect the App Store](app-store.md)) and its Apple ID, the number in its App Store URL; enter the Apple ID on this tab if it is missing.
2. Add messages. Each has a header (up to 66 characters) and a body (up to 144). A message can also suggest another plan (switch plan) or carry a promotional offer.
3. Set a **default message** for each product and locale. Apple shows it when the real-time call fails. Defaults must be plain messages.
4. Add **real-time rules**: for a product, or any product, which message to answer with.
5. Select **Sync to Apple (sandbox)**. RevenueDot uploads the messages, sets the defaults and registers its real-time URL, `https://<your server>/v1/retention/apple/<app id>`. For production, pass Apple's performance test first, then select **Sync to Apple (production)**.

RevenueDot checks Apple's signature and app ID on every call, refuses a request signed more than 5 minutes earlier (a replay), and answers within Apple's 700 ms limit. Production requests are answered only once the app's Apple ID is set. If a promotional offer cannot be signed (for example a broken key), RevenueDot answers with no message and Apple shows your default. A promotional offer answer is signed with your In-App Purchase key. Apple approves each message before it shows it; an uploaded message cannot change, so add a new one to change the text.
