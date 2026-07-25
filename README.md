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
- **Sale** (فاکتور فروش): batchId, date, qty, unitPrice, total, customer, note

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
| POST | `/api/sales` | `{ batchId, date, qty, unitPrice, customer, note }` — اگر مقدار از باقیمانده بیشتر باشد، پاسخ شامل فیلد `warning` است (بلاک نمی‌شود) |
| PUT | `/api/sales/:id` | ویرایش |
| DELETE | `/api/sales/:id` | حذف |

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
