# NEXUS NOC V2 — Network Operations & Intelligence Platform

لوحة مراقبة شبكات اتصالات تجريبية عربية RTL، مبنية باستخدام Vanilla JavaScript + Vite + Chart.js + Leaflet + Lucide.

## المتطلبات
- Node.js 18+
- npm

## التشغيل
```bash
npm install
npm run dev
```
افتح الرابط الذي يعرضه Vite (غالباً http://localhost:5173).

## بناء نسخة الإنتاج
```bash
npm run build
npm run preview
```

## محتويات المشروع
- `index.html`: هيكل الواجهة وجميع صفحاتها.
- `src/main.js`: منطق التنقل والرسوم والخريطة والجداول والـ drawer والمحاكاة.
- `src/style.css`: نظام التصميم والثيمات وRTL والاستجابة.
- `src/data.js`: بيانات المواقع والإنذارات والسلاسل التجريبية.
- `src/api.js`: حدّ الفصل بين مزود البيانات التجريبي وREST/WebSocket.
- `.env.example`: مثال إعدادات التكامل.

## الوظائف
1. Overview KPIs + Charts + alarms.
2. Leaflet map with site markers and click-to-detail.
3. RF: RSRP / RSRQ / SINR / CQI.
4. QoS: Latency / Jitter / Packet Loss / Availability + estimated QoE.
5. Capacity: Downlink / Uplink / PRB / connected users.
6. Search, filtering, sorting, site and incident details.
7. CSV/TXT exports.
8. Simulated live telemetry every 5 seconds; pause/resume and simulation speed.
9. Demo RBAC role switch: Administrator / Operator / Viewer.
10. Dark / Light theme.

## تنبيه حول صحة البيانات
جميع قيم القياس في هذه النسخة تجريبية مولّدة لأغراض بناء الواجهة واختبار التفاعلات. لا تمثل قياسات RF فعلية ولا اتصالاً بمعدات مشغل اتصالات. كذلك فإن تغيير حالة الإنذار وتبديل الأدوار محلي فقط؛ لا توجد مصادقة أو صلاحيات آمنة على الخادم في هذه النسخة.

## ربط REST API
1. أنشئ نسخة من `.env.example` باسم `.env`.
2. عدّل:
```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws/telemetry
```
3. عدّل `src/api.js` إذا اختلفت مسارات API أو شكل JSON.
4. حافظ على شكل بيانات المواقع المستخدم في `src/data.js` أو عدّل مكونات العرض لتطابق مخططك.

المسارات الافتراضية:
- `GET /api/v1/sites`
- `GET /api/v1/incidents`
- `WS /ws/telemetry`

رسالة WebSocket المتوقعة:
```json
{
  "type": "site.update",
  "siteId": "DAM-001",
  "metrics": {
    "latency": 22.4,
    "sinr": 18.5,
    "prb": 73
  }
}
```

## نقاط هندسية مهمة
- WebSocket ليس خادماً جاهزاً في هذه الحزمة؛ `api.js` يحتوي Adapter ينتظر Backend حقيقياً.
- Leaflet يستخدم OpenStreetMap tiles ويتطلب اتصال إنترنت لعرض طبقات الخريطة.
- QoE هنا مؤشر تقديري مبسط للتوضيح، وليس معياراً معتمداً أو MOS محسوباً وفق ITU-T.
- RSRP/RSRQ/SINR/CQI يجب جمعها من عدادات RAN/OSS أو أجهزة قياس/مودم يدعمها، وليس استنتاجها من متصفح الويب.
- RBAC الحالي واجهة توضيحية. يجب فرض الصلاحيات في Backend والتحقق من هوية المستخدم قبل نشر النظام.
