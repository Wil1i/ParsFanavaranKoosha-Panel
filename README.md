# بک‌اند پنل مدیریت کارخانه کمپوست

Express + Sequelize (ORM) + MySQL — پیاده‌سازی بک‌اند برای پنل کشت‌ها، فاکتور خرید/فروش، انبار و کاربران.

## راه‌اندازی

```bash
npm install
cp .env.example .env
# مقادیر .env را با اطلاعات دیتابیس MySQL خودتان پر کنید
```

یک دیتابیس خالی در MySQL بسازید (مثلاً):

```sql
CREATE DATABASE compost_panel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

اجرا:

```bash
npm run dev     # با nodemon
# یا
npm start
```

هنگام اولین اجرا، جداول به‌صورت خودکار ساخته می‌شوند (`sequelize.sync`) و اگر هیچ ادمینی وجود نداشته باشد، یک کاربر مدیر پیش‌فرض از روی مقادیر `.env` ساخته می‌شود (نام کاربری/کلمه عبور در کنسول چاپ می‌شود).

> نکته: `sync({ alter: true })` برای توسعه مناسب است. برای محیط production بهتر است از Sequelize Migrations استفاده کنید.

## مدل داده

- **User**: fullName, username, password (هش‌شده با bcrypt), role (سمت سازمانی), canAccessBatches, canAccessWarehouse, isAdmin
- **Batch** (کشت): name, startDate, readyDays, productionQty, unit, note
- **Item** (کالای انبار): name, unit, stock
- **Purchase** (فاکتور خرید): batchId, itemId, itemName, date, qty, unit, unitPrice, total, supplier, note
- **Sale** (فاکتور فروش): batchId, date, qty, unit, unitPrice, total, customer, note

ثبت هر فاکتور خرید به‌صورت خودکار (در یک تراکنش) موجودی کالای مرتبط در انبار را افزایش می‌دهد؛ ویرایش/حذف فاکتور هم اثر قبلی را برمی‌گرداند.
مقدار «باقیمانده قابل فروش» هر کشت به‌صورت آنی محاسبه می‌شود: `productionQty - مجموع qty فروش‌های همان کشت`.

## احراز هویت و دسترسی‌ها

ورود با `POST /api/auth/login` یک JWT برمی‌گرداند. این توکن باید در تمام درخواست‌های بعدی به‌صورت هدر ارسال شود:

```
Authorization: Bearer <token>
```

سطوح دسترسی:
- `isAdmin` → دسترسی کامل به همه‌چیز، از جمله بخش کاربران.
- `canAccessBatches` → مسیرهای `/api/batches`, `/api/purchases`, `/api/sales`.
- `canAccessWarehouse` → مسیرهای `/api/items`.
- بخش `/api/users` فقط برای `isAdmin` باز است.

## مسیرهای API

### Auth
| Method | مسیر | توضیح |
|---|---|---|
| POST | `/api/auth/login` | `{ username, password }` → `{ token, user }` |
| GET | `/api/auth/me` | اطلاعات کاربر لاگین‌شده |

### کاربران (فقط ادمین)
| Method | مسیر | توضیح |
|---|---|---|
| GET | `/api/users` | لیست کاربران |
| GET | `/api/users/:id` | یک کاربر |
| POST | `/api/users` | `{ fullName, username, password, role, canAccessBatches, canAccessWarehouse, isAdmin }` |
| PUT | `/api/users/:id` | ویرایش (فیلدهای اختیاری؛ برای عوض نکردن رمز، `password` را ارسال نکنید) |
| DELETE | `/api/users/:id` | حذف کاربر |

### کشت‌ها
| Method | مسیر | توضیح |
|---|---|---|
| GET | `/api/batches` | لیست کشت‌ها به‌همراه تایمر و مجموع‌ها (`remaining`, `profit`, `daysRemaining`, `isReady`, ...) |
| GET | `/api/batches/:id` | جزئیات یک کشت + فاکتورهای خرید/فروش آن |
| POST | `/api/batches` | `{ name, startDate, readyDays, productionQty, unit, note }` |
| PUT | `/api/batches/:id` | ویرایش |
| DELETE | `/api/batches/:id` | حذف کشت (فاکتورهای مرتبط هم حذف می‌شوند) |

### فاکتور خرید
| Method | مسیر | توضیح |
|---|---|---|
| GET | `/api/purchases?batchId=...` | لیست (با فیلتر اختیاری بر اساس کشت) |
| POST | `/api/purchases` | `{ batchId, date, itemName, qty, unit, unitPrice, supplier, note }` — کالا در انبار خودکار پیدا/ساخته و موجودی‌اش افزایش می‌یابد |
| PUT | `/api/purchases/:id` | ویرایش (اثر موجودی قبلی برگردانده و اثر جدید اعمال می‌شود) |
| DELETE | `/api/purchases/:id` | حذف (اثر روی موجودی برگردانده می‌شود) |

### فاکتور فروش
| Method | مسیر | توضیح |
|---|---|---|
| GET | `/api/sales?batchId=...` | لیست |
| POST | `/api/sales` | `{ batchId, date, qty, unit, unitPrice, customer, note }` — اگر `unit` ارسال نشود، واحد پیش‌فرض کشت استفاده می‌شود؛ اگر مقدار از باقیمانده بیشتر باشد، پاسخ شامل فیلد `warning` است (بلاک نمی‌شود) |
| PUT | `/api/sales/:id` | ویرایش |
| DELETE | `/api/sales/:id` | حذف |

### لاگ فعالیت‌ها (فقط ادمین)
| Method | مسیر | توضیح |
|---|---|---|
| GET | `/api/logs` | لیست فعالیت‌های ثبت‌شده، با صفحه‌بندی و فیلتر. کوئری‌پارامترها: `page`, `limit`, `userId`, `action`, `entityType`, `from` (YYYY-MM-DD), `to` (YYYY-MM-DD), `q` (جستجو در متن شرح) |

هر عملیات نوشتن (ایجاد/ویرایش/حذف کشت، فاکتور خرید، فاکتور فروش، کالای انبار، تغییر موجودی، کاربر) و همچنین ورود موفق، به‌صورت خودکار در جدول `activity_logs` ثبت می‌شود؛ حتی اگر بعداً کاربر یا رکورد مرتبط حذف شود، نام و نام‌کاربری در لاگ به‌صورت اسنپ‌شات باقی می‌ماند.

### داشبورد
| Method | مسیر | توضیح |
|---|---|---|
| GET | `/api/dashboard` | گزارش جامع؛ خروجی بر اساس دسترسی کاربر واردشده فیلتر می‌شود (بخش `batches` فقط برای دارندگان دسترسی کشت‌ها، `warehouse` فقط برای دارندگان دسترسی انبار، `users` فقط برای ادمین) |

### اتصال فروشگاه اینترنتی (وردپرس/ووکامرس) — فقط ادمین
| Method | مسیر | توضیح |
|---|---|---|
| GET | `/api/integrations/woocommerce` | دریافت تنظیمات فعلی اتصال (کلیدها به‌صورت ماسک‌شده برگردانده می‌شوند) |
| PUT | `/api/integrations/woocommerce` | `{ siteUrl, consumerKey, consumerSecret }` — ذخیره/به‌روزرسانی تنظیمات (برای عوض نکردن کلید، آن فیلد را خالی بفرستید) |
| POST | `/api/integrations/woocommerce/test` | تست اتصال به REST API ووکامرس با تنظیمات ذخیره‌شده |
| POST | `/api/integrations/woocommerce/sync` | دریافت سفارش‌های اخیر از فروشگاه و ذخیره/به‌روزرسانی آن‌ها در جدول `web_orders` |

| Method | مسیر | توضیح |
|---|---|---|
| GET | `/api/web-orders?page=&limit=&status=&q=` | لیست سفارش‌های همگام‌سازی‌شده از سایت |
| PATCH | `/api/web-orders/:id/assign-batch` | `{ batchId }` — اتصال یک سفارش وب به یک کشت مشخص (زیرساخت آماده؛ رابط کاربری آن قدم بعدی است) |

> **پیش‌نیاز**: سایت وردپرس باید ووکامرس نصب داشته باشد و روی HTTPS باشد (چون این پیاده‌سازی از Basic Auth با Consumer Key/Secret استفاده می‌کند که ووکامرس فقط روی HTTPS آن را می‌پذیرد؛ برای سایت‌های بدون HTTPS باید OAuth 1.0a پیاده‌سازی شود که در این نسخه پشتیبانی نمی‌شود). کلید و رمز را از مسیر ووکامرس → تنظیمات → پیشرفته → REST API در وردپرس بسازید.

### مشتریان
| Method | مسیر | توضیح |
|---|---|---|
| GET | `/api/customers?q=جستجو` | لیست مشتریان (نام و نام خانوادگی، شماره تماس، آدرس) |
| POST | `/api/customers` | `{ fullName, phone, address }` |
| PUT | `/api/customers/:id` | ویرایش |
| DELETE | `/api/customers/:id` | حذف (فاکتورهای فروش قبلی این مشتری حذف نمی‌شوند؛ فقط ارتباطشان با رکورد مشتری قطع می‌شود و نام مشتری به‌صورت اسنپ‌شات در خودِ فاکتور باقی می‌ماند) |

فاکتور فروش (`POST/PUT /api/sales`) می‌تواند علاوه بر `customer` (نام آزاد)، فیلد اختیاری `customerId` هم بگیرد تا فاکتور به یک رکورد مشتری مشخص متصل شود.

### انبار کالا
| Method | مسیر | توضیح |
|---|---|---|
| GET | `/api/items` | لیست کالاها |
| POST | `/api/items` | `{ name, unit, stock }` |
| PUT | `/api/items/:id` | ویرایش |
| DELETE | `/api/items/:id` | حذف |
| PATCH | `/api/items/:id/stock` | `{ delta: 1 }` یا `{ delta: -1 }` برای افزایش/کاهش دستی موجودی |

## ساختار پروژه

```
compost-backend/
├── server.js                 نقطه ورود: اتصال DB، sync، ساخت ادمین، listen
├── src/
│   ├── app.js                پیکربندی Express
│   ├── config/db.js          اتصال Sequelize
│   ├── models/                مدل‌ها و روابط
│   ├── controllers/           منطق هر بخش
│   ├── routes/                مسیرهای API
│   ├── middleware/            auth.middleware, error.middleware
│   └── utils/batchMeta.js     محاسبه تایمر/درصد آماده‌سازی کشت
```
