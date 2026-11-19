export const seedSites = [
 {id:"DAM-001",name:"Damascus Central",region:"دمشق",technology:"5G NR",band:"n78 / 3.5 GHz",status:"online",availability:99.99,latency:18.2,throughput:842,users:12480,vendor:"Ericsson",lat:33.5138,lng:36.2765,rsrp:-82,rsrq:-9.1,sinr:24.2,cqi:13,prb:62,dl:842,ul:286,jitter:2.1,loss:.08},
 {id:"DAM-014",name:"Mazzeh Exchange",region:"دمشق",technology:"4G LTE",band:"B3 / 1800 MHz",status:"online",availability:99.97,latency:21.4,throughput:624,users:9820,vendor:"Huawei",lat:33.5021,lng:36.2428,rsrp:-91,rsrq:-10.2,sinr:19.5,cqi:11,prb:71,dl:624,ul:192,jitter:3.2,loss:.12},
 {id:"ALP-022",name:"Aleppo North",region:"حلب",technology:"5G NR",band:"n78 / 3.5 GHz",status:"degraded",availability:98.72,latency:86.5,throughput:210,users:6240,vendor:"Nokia",lat:36.2195,lng:37.1512,rsrp:-108,rsrq:-16.4,sinr:6.2,cqi:6,prb:94,dl:210,ul:76,jitter:12.4,loss:1.8},
 {id:"HMS-008",name:"Homs Industrial",region:"حمص",technology:"4G LTE",band:"B7 / 2600 MHz",status:"online",availability:99.95,latency:24.1,throughput:518,users:7140,vendor:"Ericsson",lat:34.7308,lng:36.7094,rsrp:-88,rsrq:-9.8,sinr:20.1,cqi:12,prb:58,dl:518,ul:174,jitter:2.8,loss:.11},
 {id:"LAT-003",name:"Latakia Coastal",region:"اللاذقية",technology:"4G LTE",band:"B3 / 1800 MHz",status:"offline",availability:91.24,latency:0,throughput:0,users:0,vendor:"Huawei",lat:35.5317,lng:35.7901,rsrp:-120,rsrq:-20,sinr:-3,cqi:1,prb:0,dl:0,ul:0,jitter:0,loss:100},
 {id:"TAR-011",name:"Tartus Port",region:"طرطوس",technology:"3G UMTS",band:"B1 / 2100 MHz",status:"online",availability:99.91,latency:32.8,throughput:184,users:3420,vendor:"ZTE",lat:34.889,lng:35.8866,rsrp:-96,rsrq:-12.1,sinr:14.2,cqi:9,prb:64,dl:184,ul:62,jitter:4.8,loss:.28},
 {id:"DAM-031",name:"Barzeh East",region:"دمشق",technology:"5G NR",band:"n78 / 3.5 GHz",status:"online",availability:99.98,latency:16.7,throughput:912,users:14820,vendor:"Ericsson",lat:33.5412,lng:36.3154,rsrp:-79,rsrq:-8.3,sinr:27.4,cqi:14,prb:69,dl:912,ul:312,jitter:1.8,loss:.06},
 {id:"DRA-006",name:"Daraa City",region:"درعا",technology:"2G GSM",band:"GSM 900",status:"critical",availability:94.62,latency:148.2,throughput:32,users:840,vendor:"Nokia",lat:32.6189,lng:36.1021,rsrp:-113,rsrq:-18.2,sinr:1.4,cqi:3,prb:98,dl:32,ul:12,jitter:22.5,loss:3.6},
 {id:"IDB-019",name:"Idlib West",region:"إدلب",technology:"4G LTE",band:"B20 / 800 MHz",status:"online",availability:99.93,latency:28.3,throughput:402,users:5820,vendor:"Huawei",lat:35.9306,lng:36.6339,rsrp:-93,rsrq:-11.4,sinr:16.3,cqi:10,prb:67,dl:402,ul:132,jitter:3.6,loss:.19},
 {id:"HAS-004",name:"Hasakah Center",region:"الحسكة",technology:"3G UMTS",band:"B1 / 2100 MHz",status:"degraded",availability:97.84,latency:72.6,throughput:98,users:1680,vendor:"ZTE",lat:36.5024,lng:40.7477,rsrp:-105,rsrq:-15.8,sinr:7.1,cqi:5,prb:88,dl:98,ul:34,jitter:11.2,loss:1.2},
 {id:"DAM-045",name:"Qudsaya Ridge",region:"ريف دمشق",technology:"5G NR",band:"n78 / 3.5 GHz",status:"online",availability:99.96,latency:19.1,throughput:738,users:10320,vendor:"Ericsson",lat:33.5715,lng:36.1901,rsrp:-85,rsrq:-9.4,sinr:22.1,cqi:12,prb:73,dl:738,ul:241,jitter:2.4,loss:.09},
 {id:"RAQ-002",name:"Raqqa South",region:"الرقة",technology:"4G LTE",band:"B3 / 1800 MHz",status:"online",availability:99.89,latency:34.7,throughput:266,users:3940,vendor:"Nokia",lat:35.9528,lng:39.0094,rsrp:-98,rsrq:-13.2,sinr:11.8,cqi:8,prb:79,dl:266,ul:91,jitter:5.9,loss:.42}
];

export const seedIncidents = [
 {id:"ALM-2026-0841",siteId:"LAT-003",site:"Latakia Coastal",region:"اللاذقية",type:"Link Failure",severity:"critical",status:"open",age:"18 دقيقة",assignee:"Transmission Team",cause:"Loss of optical signal (LOS)",impact:"1,240 مشتركاً متأثرون"},
 {id:"ALM-2026-0839",siteId:"DRA-006",site:"Daraa City",region:"درعا",type:"High Latency",severity:"major",status:"investigating",age:"24 دقيقة",assignee:"Core Network Team",cause:"Congestion suspected",impact:"840 مشتركاً متأثرون"},
 {id:"ALM-2026-0837",siteId:"ALP-022",site:"Aleppo North",region:"حلب",type:"Low Throughput",severity:"major",status:"investigating",age:"31 دقيقة",assignee:"RAN Optimization",cause:"Radio interference / load",impact:"6,240 مشتركاً متأثرون"},
 {id:"ALM-2026-0832",siteId:"HAS-004",site:"Hasakah Center",region:"الحسكة",type:"Hardware Warning",severity:"minor",status:"open",age:"46 دقيقة",assignee:"Field Maintenance",cause:"Cooling system performance",impact:"تأثير محدود على الخدمة"},
 {id:"ALM-2026-0828",siteId:"HMS-008",site:"Homs Industrial",region:"حمص",type:"Packet Loss",severity:"warning",status:"resolved",age:"1 ساعة",assignee:"IP Transport",cause:"Interface errors",impact:"لا يوجد تأثير حالي"},
 {id:"ALM-2026-0824",siteId:"DAM-014",site:"Mazzeh Exchange",region:"دمشق",type:"High CPU",severity:"warning",status:"resolved",age:"2 ساعة",assignee:"Core Network Team",cause:"Scheduled traffic peak",impact:"لا يوجد تأثير على الخدمة"}
];

export const traffic = {
 labels:["00:00","02:00","04:00","06:00","08:00","10:00","12:00","14:00","16:00","18:00","20:00","22:00"],
 down:[2.1,1.7,1.4,2.0,4.6,6.8,7.4,6.9,7.8,8.4,6.2,4.1],
 up:[.8,.6,.5,.7,1.9,2.7,3.1,2.8,3.4,3.7,2.6,1.6]
};