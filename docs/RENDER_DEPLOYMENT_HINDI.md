# Mithilanchal Dhaba: Render Deployment Guide

> **सबसे ज़रूरी बात:** आपके मौजूदा GitHub project में **React + Express + tRPC + Drizzle + MySQL/TiDB + Stripe** लागू है। इसमें MongoDB और Cashfree अभी code में नहीं हैं। इसलिए केवल Render में `MONGODB_URI` या Cashfree keys भर देने से MongoDB या Cashfree काम नहीं करेगा। पहले नीचे दिए गए सही विकल्प चुनें।

इस guide का उद्देश्य है कि आप अपने project को GitHub से Render पर deploy कर सकें, सही environment variables भर सकें, Stripe को live कर सकें, और समझ सकें कि Cashfree या MongoDB कब तथा कैसे जोड़ना है। Render GitHub branch को link करके Node/Express web service deploy करता है और configured branch पर push के बाद auto-deploy कर सकता है। [1] [2]

## 1. पहले architecture समझें

| Area | Current project में क्या है | Render पर इसका अर्थ |
| --- | --- | --- |
| Frontend | React + Vite | `pnpm build` के बाद static frontend `dist/public` में बनता है और वही Express serve करता है। अलग Static Site बनाने की जरूरत नहीं है। |
| Backend | Express + tRPC | **Render Web Service** चाहिए, Static Site नहीं। |
| Database | Drizzle ORM + `mysql2` + `DATABASE_URL` | MySQL-compatible database चाहिए। MongoDB URI वर्तमान code नहीं पढ़ता। |
| Payment | Stripe Checkout + `/api/stripe/webhook` | Stripe keys और webhook config भरकर चल सकता है। |
| Authentication | Manus OAuth + `JWT_SECRET` | External Render deploy के लिए Manus-specific login dependencies को replace/disable करना पड़ेगा। केवल JWT key भरना पर्याप्त नहीं है। |
| Images / storage | Manus storage URLs (`/manus-storage/...`) और managed helpers | Render पर ये relative Manus URLs उपलब्ध नहीं होंगे; production launch से पहले assets को S3, Cloudinary या किसी public CDN पर shift करें। |
| Notifications | Manus Forge owner notification helper | Render पर `BUILT_IN_FORGE_*` credentials नहीं मिलेंगे; email/SMS/WhatsApp provider लगाना पड़ेगा। |

### Recommended decision

सबसे सुरक्षित और तेज रास्ता यह है कि **पहले Render पर current project को MySQL + Stripe के साथ चलाएँ**। उसके बाद अलग implementation phase में Cashfree *या* MongoDB migration करें। Stripe और Cashfree दोनों को एक ही order के लिए एक साथ active न रखें, जब तक आपने साफ payment-provider selection और webhook idempotency code न बनाया हो।

## 2. GitHub repository तैयार रखें

आपका source repository है:

`https://github.com/rupeshbuddhu78-dev/Mithilanchal-Dhaba-Restaurant`

Render Dashboard में GitHub connect करते समय इसी repository को select करें और branch **`main`** चुनें। Render का default auto-deploy mode linked branch पर हर push के बाद build तथा deploy कर सकता है। [2]

### GitHub में कभी commit न करने वाली चीजें

`.env`, `.env.production`, Stripe secret, Cashfree secret, MongoDB URI, JWT secret, webhook secret, password, certificate या API key GitHub में commit नहीं करनी है। Render के Environment panel में इन्हें secret values के रूप में भरना है। Render भी यही recommends करता है कि secrets source control में commit न हों। [3]

## 3. Render पर Web Service बनाना: हर click का क्रम

1. [Render Dashboard](https://dashboard.render.com/) पर account बनाइए या login कीजिए।
2. **New** पर click करके **Web Service** चुनिए। Static Site नहीं चुनना है, क्योंकि project में Express backend, tRPC APIs और payment webhooks हैं।
3. GitHub account connect कीजिए और `rupeshbuddhu78-dev/Mithilanchal-Dhaba-Restaurant` select कीजिए।
4. Branch में `main` select कीजिए।
5. Service name रखें, उदाहरण: `mithilanchal-dhaba-api`।
6. Region ऐसा चुनिए जो आपके database के सबसे पास हो। अगर customers India में हैं और आपका chosen database Singapore region देता है, तो Render का Singapore region practical रहेगा। Database और app अलग-दूर होने से latency बढ़ती है।
7. Runtime/Language में **Node** चुनिए।
8. नीचे दिए exact commands भरिए।

| Render field | Value |
| --- | --- |
| **Build Command** | `corepack enable && pnpm install --frozen-lockfile && pnpm build` |
| **Start Command** | `pnpm start` |
| **Health Check Path** | `/` |
| **Auto-Deploy** | `On Commit` (पहले deployment के बाद) |
| **Node version** | `22.13.0` या project-compatible Node 22 version |

Current `package.json` में `pnpm build` Vite frontend और Express server bundle बनाता है; `pnpm start` production में `dist/index.js` चलाता है। Render Node/Express web services के लिए deploy time पर build command और start command configure करने देता है। [1]

### Port के बारे में महत्वपूर्ण बात

Render खुद `PORT` environment variable देता है। **Render में `PORT=3000` manually मत भरिए।** आपका server पहले `process.env.PORT` पढ़ता है, फिर उसी port पर listen करता है; इसलिए Render का automatically supplied port सही काम करेगा।

## 4. Deployment से पहले current project के तीन external-hosting blockers

यह project Manus managed environment में बना था। Render पर launch करने से पहले नीचे के items को address करना अनिवार्य है:

| Blocker | क्यों | Render-ready solution |
| --- | --- | --- |
| Manus OAuth | `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `OWNER_OPEN_ID` Manus login flow से जुड़े हैं। | Auth.js, Clerk, Firebase Auth, Supabase Auth, Google OAuth, OTP login या अपनी JWT-based auth implement करें। |
| Manus storage paths | `/manus-storage/...` URLs Render domain पर assets resolve नहीं करेंगे। | Food images/logo को Cloudinary, AWS S3 + CloudFront, ImageKit, Supabase Storage या public CDN पर upload करके absolute `https://...` URLs save करें। |
| Manus Forge notifications/storage APIs | `BUILT_IN_FORGE_API_URL` और `BUILT_IN_FORGE_API_KEY` Render पर available नहीं हैं। | Staff/customer notification के लिए Resend/SendGrid, Twilio, WhatsApp BSP, Firebase Cloud Messaging या OneSignal use करें। |

> पहले public menu, Cart और COD flow deploy करना संभव है। लेकिन external production में customer login और managed file storage को Manus services से अलग करना आवश्यक है।

## 5. Render Environment variables: exactly क्या भरना है

Render service खोलिए, बाएँ side में **Environment** खोलिए, फिर **Add Environment Variable** select कीजिए। Render key/value values को runtime में `process.env.KEY_NAME` के रूप में देता है और हर value string होती है। [3]

### A. सभी production deployments के लिए core variables

| Render Key | Example / value कहाँ से आएगी | Required? | किस लिए |
| --- | --- | --- | --- |
| `NODE_ENV` | `production` | Yes | Production Vite/static serving activate करता है। |
| `DATABASE_URL` | MySQL/TiDB provider का full TLS connection URL | Yes for current app | Drizzle + `mysql2` database connection. |
| `JWT_SECRET` | मजबूत random secret, कम से कम 32 random bytes | Yes | Signed auth/session cookie secret. कभी `VITE_` prefix नहीं। |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys | Yes, यदि Stripe payment use करेंगे | Server-side Checkout Session create करने के लिए। |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → endpoint signing secret | Yes, यदि Stripe payment use करेंगे | `/api/stripe/webhook` signature verify करने के लिए। |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Optional in current code | Current implementation Checkout URL server से खोलता है; future Stripe.js use के लिए रखें। |
| `APP_BASE_URL` | `https://your-domain.com` | Recommended after small code update | Stable callback/return URLs और external auth configuration के लिए। Current Stripe checkout request origin से URL बनाता है। |

### B. Variables जो **current Render deployment में नहीं भरने चाहिए**

नीचे की keys Manus-specific हैं। इन्हें guess, copy या hardcode मत कीजिए। Render पर इनसे login/notification magically काम नहीं होंगे:

| Key | क्यों नहीं भरनी है |
| --- | --- |
| `BUILT_IN_FORGE_API_KEY` | Manus managed service credential है; Render replacement नहीं। |
| `BUILT_IN_FORGE_API_URL` | Manus private gateway URL है; external app dependency नहीं होनी चाहिए। |
| `VITE_FRONTEND_FORGE_API_KEY` | Frontend-exposed Manus key को external public deploy में नहीं देना चाहिए। |
| `VITE_FRONTEND_FORGE_API_URL` | Manus frontend gateway configuration है। |
| `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `OWNER_OPEN_ID`, `OWNER_NAME` | Current Manus OAuth/owner model से जुड़े हैं; standard external authentication switch के समय इन्हें replace/remove करना होगा। |

### C. JWT secret कैसे बनाएं और कहाँ भरें

अपने computer terminal में यह command चलाकर value बनाइए:

```bash
openssl rand -base64 48
```

उस output को Render → **Environment** → `JWT_SECRET` के value box में paste करें। यह secret केवल server side रहेगा। इसे `.env` में local development के लिए रख सकते हैं, लेकिन GitHub में commit नहीं करना है। JWT secret बदलने पर पुराने signed sessions invalid हो सकते हैं, इसलिए production में इसे बिना कारण rotate न करें।

## 6. Current database: MySQL/TiDB setup

Current code `mysql2` और Drizzle schema use करता है। इसलिए current production database **MySQL-compatible** होना चाहिए: managed MySQL, TiDB Cloud, PlanetScale-compatible MySQL workflow, या another managed MySQL provider।

1. Managed MySQL/TiDB database बनाइए।
2. Database user बनाइए और minimal required permissions दीजिए।
3. TLS enabled connection string copy कीजिए।
4. Render → Environment में `DATABASE_URL` paste कीजिए।
5. First production deploy से पहले reviewed migrations run कीजिए। Generated migration SQL को review किए बिना production database migrate न करें।

Example shape केवल समझने के लिए है; अपने provider की original URL use करें:

```text
DATABASE_URL=mysql://DB_USER:URL_ENCODED_PASSWORD@DB_HOST:3306/DB_NAME
```

यदि password में `@`, `:`, `/`, `?`, `#` जैसे special characters हों, तो provider की documented connection string या correctly URL-encoded password ही use करें।

### Database migration safe sequence

1. पहले local/staging database पर migration test करें।
2. Generated SQL (`drizzle/migrations/`) review करें।
3. Production backup लें।
4. Controlled command चलाएँ: `pnpm drizzle-kit migrate`.
5. Table existence और application health verify करें।

Render का pre-deploy command paid services पर available हो सकता है; migrations को production build में blindly generate/run न करें। Render documentation के अनुसार pre-deploy command build के बाद और service deploy होने से पहले अलग instance में चलता है। [2]

## 7. Stripe: current project में यही payment gateway implemented है

Current code का active payment route है:

```text
https://YOUR-RENDER-DOMAIN/api/stripe/webhook
```

Application server-side Stripe Checkout Session बनाता है। Card number, CVV, expiry या Stripe client secret database में store नहीं करता। Webhook event के बाद server order payment status update करता है।

### Stripe test mode setup

1. Stripe Dashboard खोलिए और test mode enable कीजिए।
2. Developers → API keys से test secret key copy करें।
3. Render Environment में `STRIPE_SECRET_KEY` add करें।
4. Developers → Webhooks → **Add endpoint** करें।
5. Endpoint URL: `https://YOUR-SERVICE.onrender.com/api/stripe/webhook`.
6. Event select करें: `checkout.session.completed`.
7. Endpoint signing secret copy करके Render में `STRIPE_WEBHOOK_SECRET` भरें।
8. Render में Save and deploy चुनें।
9. Stripe test card `4242 4242 4242 4242` से payment test करें।

Webhook endpoint को public HTTPS URL होना चाहिए और signature verify करना चाहिए। Current project में endpoint raw JSON body पर Stripe signature verify करता है, इसलिए `express.json()` से पहले registration रखा गया है।

### Stripe live mode checklist

Live mode keys भरने से पहले business verification, bank/payout details, refund policy, privacy policy, support contact तथा full end-to-end test complete करें। Render custom domain connect होने के बाद Stripe webhook को final custom domain URL पर update कर दें।

## 8. Cashfree: केवल तब जब आप Stripe हटाना/replace करना चाहते हैं

**Current app में Cashfree integration नहीं है।** इस section को checklist समझें; इसे भरने से पहले code implementation चाहिए। Cashfree Orders API backend से order create करके `payment_session_id` देता है, जिसे frontend payment journey के लिए use करता है। Cashfree API authentication `x-client-id` और `x-client-secret` headers से होती है; secret key कभी client/frontend में नहीं जानी चाहिए। [4] [5]

### Cashfree के लिए Render Environment keys

| Render Key | Value कहाँ से मिलेगा | Browser में जा सकता है? | Purpose |
| --- | --- | --- | --- |
| `CASHFREE_ENV` | `sandbox` या `production` | No | API base selection. |
| `CASHFREE_CLIENT_ID` | Cashfree Merchant Dashboard → Payment Gateway → Developers → API Keys | No | Backend API `x-client-id` header. |
| `CASHFREE_CLIENT_SECRET` | वही API Keys page | **Never** | Backend API `x-client-secret` और webhook signature verification. |
| `CASHFREE_API_VERSION` | Cashfree current API documentation में chosen supported version | No | `x-api-version` request header. |
| `CASHFREE_RETURN_URL` | `https://your-domain.com/payment/cashfree/return?order_id={order_id}` | No | Cashfree post-payment return URL. |
| `CASHFREE_NOTIFY_URL` | `https://your-domain.com/api/cashfree/webhook` | No | Cashfree webhook endpoint. |
| `APP_BASE_URL` | `https://your-domain.com` | No | Return/notify URL centrally build करने के लिए recommended. |

**`VITE_CASHFREE_CLIENT_SECRET` या `NEXT_PUBLIC_CASHFREE_CLIENT_SECRET` कभी न बनाइए।** `VITE_` prefix वाली Vite variables browser bundle में expose हो सकती हैं।

### Cashfree code implementation: exact sequence

1. Stripe package/checkout logic को हटाने से पहले payment provider abstraction बनाएँ, जैसे `createPaymentOrder`, `verifyPaymentWebhook`, और `getPaymentStatus`.
2. Server में Cashfree Node SDK install करें या server-side REST call use करें। Cashfree का Node.js server SDK available है। [6]
3. Customer checkout के बाद internal order पहले database में `pending_payment` state में बनाइए। Client amount पर भरोसा न करें; server cart items से amount recalculate करे।
4. Backend से Cashfree **Create Order** API call करें। Unique local order number को Cashfree `order_id` में भेजें। Cashfree order id unique होना चाहिए और allowed characters/alphanumeric, `_`, `-` हैं। [5]
5. Response से `payment_session_id` लें, लेकिन Cashfree secret/client secret browser को नहीं भेजें।
6. Cashfree frontend checkout SDK को only `payment_session_id` दें।
7. Return URL को final payment confirmation न मानें। `/api/cashfree/webhook` पर received, signature-verified webhook या Cashfree order-status server API से payment verify करें।
8. Webhook में `x-webhook-timestamp` और `x-webhook-signature` verify करें; invalid signature पर payment status update न करें। Cashfree webhook docs signature verification को required बताते हैं। [7]
9. Valid paid event पर transaction id, Cashfree order id, paid timestamp और internal order state update करें। Webhook retries के लिए provider event/order reference पर idempotency logic रखें।
10. Sandbox transactions और webhook logs test करने के बाद ही `CASHFREE_ENV=production` तथा live keys set करें।

### Cashfree Dashboard में webhook कहाँ भरना है

Cashfree Merchant Dashboard → **Payment Gateway** → **Developers** → **Webhooks** में अपना production URL register करें। If code `notify_url` per order भेजता है, वही final public Render/custom domain URL हो। Cashfree delivery failures को 200 response मिलने तक retry कर सकता है; इसलिए webhook handler fast, idempotent और reliably 2xx response देने वाला होना चाहिए। [7]

## 9. MongoDB: कब use करें और कब नहीं

### Current project के लिए answer

अभी `MONGODB_URI` **मत भरिए**, क्योंकि code MySQL/TiDB `DATABASE_URL` से Drizzle queries चलाता है। MongoDB URI add करने से app MySQL छोड़कर MongoDB use नहीं करने लगेगा।

### MongoDB पर पूरी migration करनी हो तो

यह separate development task है। इसमें `mysql2`/Drizzle database layer को MongoDB driver, Mongoose, Prisma Mongo provider, या another ODM से replace करना होगा। Schemas, relations, transactions, cart/order queries, seed scripts और every tRPC router rewrite तथा test करना होगा। Migration complete होने तक `DATABASE_URL` हटाना नहीं है।

### MongoDB Atlas + Render setup (future migration)

1. MongoDB Atlas में cluster बनाइए और Render app के closest AWS region select कीजिए। [8]
2. Atlas Database Access में dedicated database user और strong password बनाइए।
3. Atlas Network Access में Render service के outbound IP addresses allow-list कीजिए। [8]
4. Atlas → Connect → Drivers से Node.js connection string copy करें।
5. Render → Environment में `MONGODB_URI` add करें।
6. Optional database name के लिए `MONGODB_DB_NAME=mithilanchal_dhaba` add करें, अगर code यह read करता हो।
7. Application code में `process.env.MONGODB_URI` से connection बनाइए; URI secrets GitHub में commit न हों।

Example shape केवल placeholder है:

```text
MONGODB_URI=mongodb+srv://APP_USER:URL_ENCODED_PASSWORD@cluster.example.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=mithilanchal_dhaba
```

Atlas/Render official integration guidance में AWS cluster region close रखने और Render outbound IPs allow-list करने की बात है। [8] [9]

## 10. Current project के लिए ready-to-paste Environment checklist

नीचे text को `Render → Environment → Add from .env` में **keys के साथ**, real values replace करके paste कर सकते हैं। यह current MySQL + Stripe deployment के लिए है; MongoDB और Cashfree lines अभी include नहीं हैं।

```dotenv
NODE_ENV=production
NODE_VERSION=22.13.0
DATABASE_URL=PASTE_YOUR_MYSQL_OR_TIDB_CONNECTION_URL
JWT_SECRET=PASTE_A_NEW_RANDOM_48_BYTE_BASE64_SECRET
STRIPE_SECRET_KEY=sk_live_OR_sk_test_REPLACE_ME
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_ME
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_OR_pk_test_REPLACE_ME
APP_BASE_URL=https://YOUR-SERVICE.onrender.com
```

### Cashfree future addition template

इसे केवल Cashfree code implementation के बाद add करें:

```dotenv
CASHFREE_ENV=sandbox
CASHFREE_CLIENT_ID=REPLACE_ME
CASHFREE_CLIENT_SECRET=REPLACE_ME
CASHFREE_API_VERSION=SET_TO_THE_CURRENT_DOCUMENTED_VERSION
CASHFREE_RETURN_URL=https://YOUR-DOMAIN/payment/cashfree/return?order_id={order_id}
CASHFREE_NOTIFY_URL=https://YOUR-DOMAIN/api/cashfree/webhook
```

### MongoDB future addition template

इसे केवल MongoDB migration के बाद add करें:

```dotenv
MONGODB_URI=mongodb+srv://USER:ENCODED_PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=mithilanchal_dhaba
```

## 11. Custom domain: production launch के बाद

1. Render service खोलें → Settings → **Custom Domains**.
2. `yourdomain.com` या `www.yourdomain.com` add करें।
3. Render जो DNS records दिखाए, वही अपने domain provider (Cloudflare/GoDaddy/Namecheap) में add करें।
4. Existing `AAAA` records remove करें, क्योंकि Render custom domain setup में IPv4 routing uses करता है। [10]
5. Render में **Verify** click करें। Render HTTPS/TLS certificate create और renew करता है। [10]
6. `APP_BASE_URL` को custom domain पर change करें और deploy करें।
7. Stripe/Cashfree dashboard में webhook/return URLs को final `https://yourdomain.com/...` URLs से update करें।
8. OAuth provider में allowed callback/redirect URLs update करें।

## 12. First deployment testing checklist

| Test | Expected result |
| --- | --- |
| `https://SERVICE.onrender.com/` | Home page opens and food images load from external storage. |
| `/menu` | Categories and items database से load होते हैं। |
| Add to cart | Server-side cart mutation succeeds. |
| COD checkout | Order creates, admin dashboard में दिखता है। |
| Stripe test checkout | Stripe Checkout opens and valid test completion webhook order को paid बनाता है। |
| Stripe invalid webhook | Request rejects with HTTP 400; order paid नहीं बनता। |
| Cashfree sandbox, if implemented | Unique order, session id, callback, signature-verified webhook and final paid status work करते हैं। |
| Admin and rider routes | Only authorized roles access them. |
| Mobile | 375px width पर navigation, menu, cart, checkout test करें। |
| Restart/deploy | Database state remains; filesystem-dependent data lost न हो क्योंकि Render filesystem ephemeral है। [2] |

## 13. Common Render errors और तुरंत समाधान

| Error | Likely cause | Solution |
| --- | --- | --- |
| `Build failed` | pnpm/Node mismatch | `NODE_VERSION=22.13.0`, `corepack enable`, `pnpm install --frozen-lockfile && pnpm build` check करें। |
| Service deployed but 502 | App wrong port पर listen कर रही है | `PORT` manually set न करें; server must use `process.env.PORT`. Current server does this. |
| Database connection error | Wrong `DATABASE_URL`, firewall/TLS issue | Provider URL re-copy करें, database allow-list/TLS check करें। |
| Login failure | Manus OAuth values Render पर valid नहीं | External auth replace/configure करें। |
| Food images 404 | `/manus-storage/...` relative URLs | Images external CDN/S3/Cloudinary पर move करें। |
| Stripe webhook 400 | `STRIPE_WEBHOOK_SECRET` wrong, body parsing order wrong | Endpoint secret reset करें; raw body signature route verify करें। |
| Cashfree webhook not updating order | Signature not verified, wrong final URL, duplicated event | Signature check, `CASHFREE_NOTIFY_URL`, idempotency, logs verify करें। |
| Mongo timeout | Atlas network access not configured | Render outbound IPs Atlas allow-list में add करें। |
| Deploy works then data disappears | Local filesystem writes | Database/object storage use करें; Render service filesystem is ephemeral. [2] |

## 14. Suggested launch order

1. **Current code cleanup:** Replace Manus OAuth, Manus storage, and Forge notification dependencies.
2. **Database:** Keep MySQL/TiDB for the existing project; do not add MongoDB unless you approve a full migration.
3. **Payment:** Keep existing Stripe, or commission a dedicated Cashfree replacement phase. Do not merely add Cashfree keys.
4. **Staging:** Deploy a staging Render service with test Stripe/Cashfree mode and a separate staging database.
5. **Production:** Add custom domain, live payment keys, webhooks, database backup process, and monitoring.

## References

[1] [Render: Deploy a Node/Express app](https://render.com/docs/deploy-node-express-app)

[2] [Render: Deploying on Render](https://render.com/docs/deploys)

[3] [Render: Configure environment variables](https://render.com/docs/configure-environment-variables)

[4] [Cashfree: API authentication](https://www.cashfree.com/docs/api-reference/authentication)

[5] [Cashfree: Create Order API](https://www.cashfree.com/docs/api-reference/payments/latest/orders/create-order)

[6] [Cashfree: Payment SDK libraries](https://www.cashfree.com/docs/api-reference/payments/sdk)

[7] [Cashfree: Payment webhooks](https://www.cashfree.com/docs/payments/webhooks)

[8] [Render: Connect to MongoDB Atlas](https://render.com/docs/connect-to-mongodb-atlas)

[9] [MongoDB Atlas: Integrate with Render](https://www.mongodb.com/docs/atlas/reference/partner-integrations/render/)

[10] [Render: Custom domains](https://render.com/docs/custom-domains)
