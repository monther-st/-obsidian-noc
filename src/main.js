import Chart from "chart.js/auto";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import { createIcons, LayoutDashboard, Map, Activity, Gauge, ChartNoAxesCombined, RadioTower, Siren, FileChartColumn, Settings2, Search, SunMoon, Download, Pause, Play, Menu, PanelRightClose, ChevronLeft, ChevronRight, X, ShieldCheck, Timer, Signal, Radio, BarChart3, PackageX, ArrowDown, ArrowUp, Users, FileSpreadsheet, FileText, CheckCircle2, AlertTriangle, Info, Copy, RefreshCw, UserCog, Eye, Wrench } from "lucide";
import { loadSites, loadIncidents, openTelemetryStream } from "./api.js";
import { traffic as trafficSeed } from "./data.js";

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const iconSet = {LayoutDashboard,Map,Activity,Gauge,ChartNoAxesCombined,RadioTower,Siren,FileChartColumn,Settings2,Search,SunMoon,Download,Pause,Play,Menu,PanelRightClose,ChevronLeft,ChevronRight,X,ShieldCheck,Timer,Signal,Radio,BarChart3,PackageX,ArrowDown,ArrowUp,Users,FileSpreadsheet,FileText,CheckCircle2,AlertTriangle,Info,Copy,RefreshCw,UserCog,Eye,Wrench};
const labels = {online:"متصل",degraded:"أداء منخفض",offline:"منقطع",critical:"حرج",open:"مفتوح",investigating:"قيد المعالجة",resolved:"تم الحل"};
const severity = {critical:"حرج",major:"مرتفع",minor:"متوسط",warning:"تحذير"};
const state = {page:"overview",period:"24h",theme:localStorage.getItem("OBSIDIAN-theme")||"dark",role:localStorage.getItem("OBSIDIAN-role")||"Operator",live:true,sites:[],incidents:[],selected:null,charts:{},maps:{},siteQuery:"",siteStatus:"all",incidentQuery:"",incidentStatus:"all",incidentSeverity:"all",sort:"id",sortDir:1,speed:"normal"};
const pageInfo = {
 overview:["مركز مراقبة الشبكة","صورة تشغيلية موحدة لشبكة النفاذ والنقل وجودة الخدمة."],
 map:["الخريطة الجغرافية للشبكة","توزيع المحطات على الخريطة مع حالة كل موقع."],
 performance:["أداء RF","مؤشرات جودة الإشارة الراديوية على مستوى المحطة."],
 qos:["جودة الخدمة QoS","تحليل التأخير والتذبذب وفقدان الحزم وتقدير تجربة المستخدم."],
 capacity:["السعة وحركة البيانات","مراقبة معدل النقل واستهلاك موارد الراديو PRB."],
 sites:["المحطات والخلايا","سجل المواقع ومؤشرات الأداء والحالة التشغيلية."],
 incidents:["إدارة الإنذارات","متابعة الحوادث التشغيلية وإدارة دورة معالجتها."],
 reports:["التقارير والتصدير","إنشاء تقارير تشغيلية قابلة للتنزيل."],
 settings:["الإعدادات والصلاحيات","إعدادات المحاكاة والأدوار ومصادر البيانات."]
};
const fmt = n => new Intl.NumberFormat("en-US").format(n);
const avg = (arr,key) => arr.filter(x=>Number.isFinite(x[key]) && x.status!=="offline").reduce((s,x)=>s+x[key],0) / Math.max(1,arr.filter(x=>Number.isFinite(x[key]) && x.status!=="offline").length);
const statusClass = s => ["online","resolved"].includes(s)?"good":["degraded","investigating","open"].includes(s)?"warn":"bad";
const quality = s => s>=20?["ممتاز","good"]:s>=12?["جيد","good"]:s>=5?["ضعيف","warn"]:["سيئ","bad"];
function icons(){createIcons({icons:iconSet,attrs:{"stroke-width":1.8}});}
function toast(msg,type="success"){const n=document.createElement("div");n.className=`toast ${type}`;n.textContent=msg;$("#toastRegion").append(n);setTimeout(()=>n.remove(),3000);}
function setTheme(theme){state.theme=theme;document.documentElement.dataset.theme=theme;localStorage.setItem("OBSIDIAN-theme",theme);Object.values(state.charts).forEach(c=>{c.options.plugins.legend.labels.color=getComputedStyle(document.documentElement).getPropertyValue("--muted");c.update();});}
function chart(id,type,data,options={}){const el=$("#"+id);if(!el)return;if(state.charts[id])state.charts[id].destroy();const text=getComputedStyle(document.documentElement).getPropertyValue("--muted").trim();state.charts[id]=new Chart(el,{type,data,options:{responsive:true,maintainAspectRatio:false,interaction:{intersect:false,mode:"index"},plugins:{legend:{labels:{color:text,usePointStyle:true,boxWidth:8,font:{family:"Inter"}}}},scales:type==="doughnut"?{}:{x:{ticks:{color:text},grid:{color:"rgba(140,160,180,.08)"}},y:{ticks:{color:text},grid:{color:"rgba(140,160,180,.08)"}}},...options}});}
function makeMap(id,compact=false){
 const node=$("#"+id);if(!node||state.maps[id])return;
 const map=L.map(node,{zoomControl:!compact,scrollWheelZoom:!compact}).setView([35.2,38.1],compact?5.4:6.2);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
 state.maps[id]=map;paintMap(id);setTimeout(()=>map.invalidateSize(),120);
}
function paintMap(id){const map=state.maps[id];if(!map)return;map.eachLayer(layer=>{if(layer instanceof L.CircleMarker)map.removeLayer(layer);});state.sites.forEach(site=>{
 const color=site.status==="online"?"#22c58b":site.status==="degraded"?"#f3ad4e":"#f05e68";
 const marker=L.circleMarker([site.lat,site.lng],{radius:8,color,fillColor:color,fillOpacity:.85,weight:2}).addTo(map);
 marker.bindTooltip(`<b>${site.name}</b><br>${site.id}<br>${labels[site.status]}`);
 marker.on("click",()=>openSite(site.id));
 });}
function periodTraffic(){
 const mode=state.period;
 if(mode==="1h") return {labels:["-60m","-50m","-40m","-30m","-20m","-10m","Now"],down:[5.2,5.6,5.1,6.4,6.9,7.3,6.8],up:[2.0,2.2,1.9,2.5,2.8,3.1,2.7]};
 if(mode==="7d") return {labels:["13 Nov","14 Nov","15 Nov","16 Nov","17 Nov","18 Nov","19 Nov"],down:[5.2,5.8,5.1,6.4,6.9,7.3,6.8],up:[2.0,2.2,1.9,2.5,2.8,3.1,2.7]};
 if(mode==="30d") return {labels:["21 Oct","25 Oct","29 Oct","02 Nov","06 Nov","10 Nov","14 Nov","19 Nov"],down:[4.4,4.8,5.1,4.9,5.7,6.2,6.8,7.1],up:[1.7,1.8,2.0,1.9,2.2,2.5,2.7,2.9]};
 return trafficSeed;
}
function renderOverview(){
 const active=state.sites.filter(s=>s.status==="online").length,open=state.incidents.filter(i=>i.status!=="resolved").length;
 $("#kpiAvailability").textContent=(avg(state.sites,"availability")||99.9).toFixed(2)+"%";
 $("#kpiSites").textContent=`${active} / ${state.sites.length}`;
 $("#kpiLatency").innerHTML=`${avg(state.sites,"latency").toFixed(1)} <small>ms</small>`;
 $("#kpiAlarms").textContent=open;$("#alarmCount").textContent=open;$("#siteCount").textContent=state.sites.length;
 const series=periodTraffic();
 chart("overviewTraffic","line",{labels:series.labels,datasets:[{label:"Downlink",data:series.down,borderColor:"#37c7d5",backgroundColor:"rgba(55,199,213,.12)",fill:true,tension:.38,pointRadius:2},{label:"Uplink",data:series.up,borderColor:"#9b8cf5",backgroundColor:"rgba(155,140,245,.08)",fill:true,tension:.38,pointRadius:2}]});
 const counts=["online","degraded","offline","critical"].map(s=>state.sites.filter(x=>x.status===s).length);
 chart("siteStatusChart","doughnut",{labels:["متصل","أداء منخفض","منقطع","حرج"],datasets:[{data:counts,backgroundColor:["#22c58b","#f3ad4e","#f05e68","#b84dff"],borderWidth:0,hoverOffset:5}]},{cutout:"72%",plugins:{legend:{display:false}}});
 $("#statusLegend").innerHTML=[["متصل",counts[0],"#22c58b"],["أداء منخفض",counts[1],"#f3ad4e"],["منقطع",counts[2],"#f05e68"],["حرج",counts[3],"#b84dff"]].map(x=>`<div><span><i style="background:${x[2]}"></i>${x[0]}</span><b>${x[1]}</b></div>`).join("");
 $("#overviewAlarms").innerHTML=state.incidents.filter(i=>i.status!=="resolved").slice(0,4).map(i=>`<button class="alarm-row" data-alarm="${i.id}"><span class="severity-dot ${i.severity}"></span><span><b>${i.type}</b><small>${i.site} · ${i.age}</small></span><em>${severity[i.severity]}</em></button>`).join("")||'<div class="empty">لا توجد إنذارات نشطة</div>';
 makeMap("overviewMap",true);paintMap("overviewMap");
}
function renderRf(){
 const valid=state.sites.filter(s=>s.status!=="offline");
 $("#rfRsrp").innerHTML=`${avg(valid,"rsrp").toFixed(1)} <small>dBm</small>`;$("#rfRsrq").innerHTML=`${avg(valid,"rsrq").toFixed(1)} <small>dB</small>`;$("#rfSinr").innerHTML=`${avg(valid,"sinr").toFixed(1)} <small>dB</small>`;$("#rfCqi").innerHTML=`${avg(valid,"cqi").toFixed(1)} <small>/ 15</small>`;
 chart("rfChart","bar",{labels:["RSRP","RSRQ","SINR","CQI"],datasets:[{label:"متوسط القياس",data:[avg(valid,"rsrp"),avg(valid,"rsrq"),avg(valid,"sinr"),avg(valid,"cqi")],backgroundColor:["#37c7d5","#9b8cf5","#22c58b","#f3ad4e"],borderRadius:7}]},{plugins:{legend:{display:false}}});
 $("#rfQualityList").innerHTML=valid.slice().sort((a,b)=>a.sinr-b.sinr).map(s=>{const [q,c]=quality(s.sinr);return `<div class="quality-row"><span><b>${s.name}</b><small>${s.id} · SINR ${s.sinr.toFixed(1)} dB</small></span><em class="${c}">${q}</em></div>`}).join("");
 $("#rfTable").innerHTML=state.sites.map(s=>{const [q,c]=quality(s.sinr);return `<tr data-site="${s.id}"><td><b>${s.name}</b><small>${s.id}</small></td><td>${s.technology}</td><td class="mono">${s.rsrp} dBm</td><td class="mono">${s.rsrq} dB</td><td class="mono">${s.sinr} dB</td><td class="mono">${s.cqi}</td><td><span class="status ${c}">${q}</span></td></tr>`}).join("");
}
function renderQos(){
 const valid=state.sites.filter(s=>s.status!=="offline"),lat=avg(valid,"latency"),jit=avg(valid,"jitter"),loss=avg(valid,"loss");
 $("#qosLatency").innerHTML=`${lat.toFixed(1)} <small>ms</small>`;$("#qosJitter").innerHTML=`${jit.toFixed(1)} <small>ms</small>`;$("#qosLoss").innerHTML=`${loss.toFixed(2)} <small>%</small>`;
 const score=Math.max(0,Math.min(100,Math.round(100-lat*.22-jit*1.1-loss*8)));$("#qoeScore").textContent=score;
 const bars=[["Latency",Math.max(0,100-lat*1.5)],["Jitter",Math.max(0,100-jit*5)],["Packet delivery",Math.max(0,100-loss*12)],["Availability",99.94]];
 $("#qoeBreakdown").innerHTML=bars.map(([n,v])=>`<div class="metric-bar"><div><span>${n}</span><b>${v.toFixed(1)}%</b></div><i><span style="width:${Math.min(100,v)}%"></span></i></div>`).join("");
 chart("qosChart","line",{labels:trafficSeed.labels,datasets:[{label:"Latency (ms)",data:trafficSeed.down.map((_,i)=>lat+(Math.sin(i)*5)),borderColor:"#37c7d5",tension:.35,yAxisID:"y"},{label:"Jitter (ms)",data:trafficSeed.down.map((_,i)=>jit+(Math.cos(i)*1.4)),borderColor:"#9b8cf5",tension:.35,yAxisID:"y"},{label:"Packet loss (%)",data:trafficSeed.down.map((_,i)=>loss+(Math.sin(i*.7)*.1)),borderColor:"#f3ad4e",tension:.35,yAxisID:"y1"}]},{scales:{y:{position:"left"},y1:{position:"right",grid:{drawOnChartArea:false}}}});
}
function renderCapacity(){
 const valid=state.sites.filter(s=>s.status!=="offline"),dl=valid.reduce((a,s)=>a+s.dl,0)/1000,ul=valid.reduce((a,s)=>a+s.ul,0)/1000,prb=avg(valid,"prb"),users=valid.reduce((a,s)=>a+s.users,0);
 $("#capDown").innerHTML=`${dl.toFixed(2)} <small>Gbps</small>`;$("#capUp").innerHTML=`${ul.toFixed(2)} <small>Gbps</small>`;$("#capPrb").innerHTML=`${prb.toFixed(1)} <small>%</small>`;$("#capUsers").textContent=fmt(users);
 const series=periodTraffic();
 chart("capacityChart","line",{labels:series.labels,datasets:[{label:"Downlink Gbps",data:series.down,borderColor:"#37c7d5",backgroundColor:"rgba(55,199,213,.1)",fill:true,tension:.35},{label:"Uplink Gbps",data:series.up,borderColor:"#9b8cf5",tension:.35}]});
 const sorted=valid.slice().sort((a,b)=>b.prb-a.prb);
 chart("prbChart","bar",{labels:sorted.map(s=>s.id),datasets:[{label:"PRB %",data:sorted.map(s=>s.prb),backgroundColor:sorted.map(s=>s.prb>=90?"#f05e68":s.prb>=75?"#f3ad4e":"#37c7d5"),borderRadius:5}]},{indexAxis:"y",plugins:{legend:{display:false}},scales:{x:{max:100}}});
 $("#capacityTable").innerHTML=sorted.slice(0,8).map(s=>`<tr data-site="${s.id}"><td><b>${s.name}</b><small>${s.id}</small></td><td>${s.technology}</td><td class="mono">${s.prb}%</td><td class="mono">${s.dl}</td><td class="mono">${s.ul}</td><td class="mono">${fmt(s.users)}</td><td><span class="status ${s.prb>=90?"bad":s.prb>=75?"warn":"good"}">${s.prb>=90?"ازدحام":s.prb>=75?"مرتفع":"طبيعي"}</span></td></tr>`).join("");
}
function renderSites(){
 const rows=state.sites.filter(s=>(state.siteStatus==="all"||s.status===state.siteStatus)&&`${s.id} ${s.name} ${s.region} ${s.technology}`.toLowerCase().includes(state.siteQuery.toLowerCase())).sort((a,b)=>String(a[state.sort]).localeCompare(String(b[state.sort]))*state.sortDir);
 $("#siteResultCount").textContent=`${rows.length} محطة`;
 $("#sitesTable").innerHTML=rows.map(s=>`<tr data-site="${s.id}"><td class="mono">${s.id}</td><td><b>${s.name}</b><small>${s.vendor}</small></td><td>${s.region}</td><td>${s.technology}</td><td class="mono">${s.availability.toFixed(2)}%</td><td class="mono">${s.latency?s.latency.toFixed(1)+" ms":"—"}</td><td class="mono">${s.prb}%</td><td><span class="status ${statusClass(s.status)}">${labels[s.status]}</span></td></tr>`).join("")||'<tr><td colspan="8" class="empty">لا توجد نتائج</td></tr>';
}
function renderIncidents(){
 const rows=state.incidents.filter(i=>(state.incidentStatus==="all"||i.status===state.incidentStatus)&&(state.incidentSeverity==="all"||i.severity===state.incidentSeverity)&&`${i.id} ${i.site} ${i.type}`.toLowerCase().includes(state.incidentQuery.toLowerCase()));
 $("#incidentResultCount").textContent=`${rows.length} إنذار`;
 $("#incidentsTable").innerHTML=rows.map(i=>`<tr data-incident="${i.id}"><td class="mono">${i.id}</td><td><b>${i.site}</b><small>${i.siteId}</small></td><td>${i.type}</td><td><span class="severity ${i.severity}">${severity[i.severity]}</span></td><td><span class="status ${statusClass(i.status)}">${labels[i.status]}</span></td><td>${i.age}</td><td>${i.assignee}</td><td><button class="row-action" data-open-incident="${i.id}">تفاصيل</button></td></tr>`).join("")||'<tr><td colspan="8" class="empty">لا توجد إنذارات مطابقة</td></tr>';
}
function renderMapPage(){makeMap("networkMap");paintMap("networkMap");$("#mapSiteCards").innerHTML=state.sites.map(s=>`<button class="site-mini" data-site="${s.id}"><span class="dot ${statusClass(s.status)}"></span><b>${s.name}</b><small>${s.id} · ${labels[s.status]}</small></button>`).join("");}
function renderAll(){renderOverview();renderRf();renderQos();renderCapacity();renderSites();renderIncidents();renderMapPage();$("#lastUpdate").textContent=new Date().toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit",second:"2-digit"});icons();}
function navigate(page){if(!pageInfo[page])return;state.page=page;$$(".view").forEach(v=>v.classList.toggle("active",v.id===`view-${page}`));$$(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.page===page));$("#pageTitle").textContent=pageInfo[page][0];$("#pageDescription").textContent=pageInfo[page][1];$("#crumbCurrent").textContent=pageInfo[page][0];if(page==="map"){renderMapPage();setTimeout(()=>state.maps.networkMap?.invalidateSize(),100);}icons();}
function openSite(id){const s=state.sites.find(x=>x.id===id);if(!s)return;state.selected={type:"site",item:s};$("#drawerTitle").textContent=s.name;$("#drawerBody").innerHTML=`<div class="drawer-id">${s.id} · ${s.vendor}</div><div class="drawer-state"><span class="status ${statusClass(s.status)}">${labels[s.status]}</span><span>${s.technology} / ${s.band}</span></div><div class="drawer-section"><h3>Radio Performance</h3>${detail("RSRP",s.rsrp+" dBm")}${detail("RSRQ",s.rsrq+" dB")}${detail("SINR",s.sinr+" dB")}${detail("CQI",s.cqi+"/15")}</div><div class="drawer-section"><h3>Service Quality</h3>${detail("Latency",s.latency+" ms")}${detail("Jitter",s.jitter+" ms")}${detail("Packet Loss",s.loss+"%")}${detail("Availability",s.availability+"%")}</div><div class="drawer-section"><h3>Capacity & Site</h3>${detail("PRB Utilization",s.prb+"%")}${detail("Downlink",s.dl+" Mbps")}${detail("Uplink",s.ul+" Mbps")}${detail("Connected Users",fmt(s.users))}${detail("Region",s.region)}${detail("Coordinates",s.lat.toFixed(4)+", "+s.lng.toFixed(4))}</div><div class="demo-disclaimer"><i data-lucide="info"></i> بيانات تجريبية مولّدة محلياً وليست قياسات من شبكة فعلية.</div>`;$("#drawerActions").innerHTML=`<button class="outline-button" id="copySite"><i data-lucide="copy"></i> نسخ Site ID</button><button class="primary-button" id="goPerformance"><i data-lucide="activity"></i> فتح مؤشرات RF</button>`;showDrawer();}
function openIncident(id){const i=state.incidents.find(x=>x.id===id);if(!i)return;state.selected={type:"incident",item:i};$("#drawerTitle").textContent="تفاصيل الإنذار";$("#drawerBody").innerHTML=`<div class="drawer-id">${i.id}</div><div class="drawer-state"><span class="severity ${i.severity}">${severity[i.severity]}</span><span class="status ${statusClass(i.status)}">${labels[i.status]}</span></div><div class="drawer-section"><h3>بيانات الحادث</h3>${detail("المحطة",i.site)}${detail("Site ID",i.siteId)}${detail("النوع",i.type)}${detail("العمر",i.age)}${detail("المسؤول",i.assignee)}</div><div class="drawer-section"><h3>التشخيص الأولي</h3>${detail("السبب المحتمل",i.cause)}${detail("الأثر",i.impact)}</div><div class="demo-disclaimer">تغيير الحالة هنا محلي وتجريبي ولا يرسل أمراً إلى نظام OSS.</div>`;$("#drawerActions").innerHTML=`<button class="outline-button" id="copySite"><i data-lucide="copy"></i> نسخ Alarm ID</button>${i.status!=="resolved"&&state.role!=="Viewer"?'<button class="primary-button" id="resolveIncident"><i data-lucide="check-circle-2"></i> تعليم كمحلول</button>':'<button class="primary-button" disabled>لا يوجد إجراء متاح</button>'}`;showDrawer();}
function detail(k,v){return `<div class="detail-line"><span>${k}</span><b>${v}</b></div>`;}
function showDrawer(){$("#drawerBackdrop").classList.add("show");$("#detailDrawer").classList.add("open");$("#detailDrawer").setAttribute("aria-hidden","false");icons();}
function closeDrawer(){$("#drawerBackdrop").classList.remove("show");$("#detailDrawer").classList.remove("open");$("#detailDrawer").setAttribute("aria-hidden","true");}
function exportCSV(rows,filename){if(!rows.length){toast("لا توجد بيانات للتصدير","error");return;}const cols=[...new Set(rows.flatMap(Object.keys))];const csv=[cols.join(","),...rows.map(r=>cols.map(k=>`"${String(r[k]??"").replaceAll('"','""')}"`).join(","))].join("\r\n");download("\uFEFF"+csv,filename,"text/csv;charset=utf-8");toast(`تم تصدير ${rows.length} سجل`);}
function download(content,name,type){const a=document.createElement("a"),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
function exportSummary(){const active=state.incidents.filter(i=>i.status!=="resolved");const text=`OBSIDIAN NOC V2 — EXECUTIVE NETWORK REPORT\nGenerated: ${new Date().toISOString()}\nMode: SIMULATED DATA\nSites: ${state.sites.length}\nOnline: ${state.sites.filter(s=>s.status==="online").length}\nOpen incidents: ${active.length}\nAverage latency: ${avg(state.sites,"latency").toFixed(2)} ms\nAverage SINR: ${avg(state.sites.filter(s=>s.status!=="offline"),"sinr").toFixed(2)} dB\nAverage PRB: ${avg(state.sites.filter(s=>s.status!=="offline"),"prb").toFixed(2)}%\n\nOPEN INCIDENTS\n${active.map(i=>`${i.id} | ${i.site} | ${i.type} | ${i.severity}`).join("\n")}\n\nNOTE: This report is generated from local demonstration data.`;download(text,"OBSIDIAN-noc-executive-report.txt","text/plain");}
function updateRole(){const role=state.role;$("#userRole").textContent=role.toUpperCase();$("#currentRole").textContent=role;$("#userName").textContent=role==="Administrator"?"Network Administrator":role==="Viewer"?"Read-only Viewer":"Network Operator";localStorage.setItem("OBSIDIAN-role",role);}
function simulateTick(){if(!state.live)return;const factor=state.speed==="low"?.15:state.speed==="high"?.9:.4;state.sites.forEach(s=>{if(s.status==="offline")return;s.latency=Math.max(8,Math.min(180,s.latency+(Math.random()-.5)*8*factor));s.sinr=Math.max(-2,Math.min(30,s.sinr+(Math.random()-.5)*2*factor));s.rsrp=Math.max(-120,Math.min(-70,s.rsrp+(Math.random()-.5)*1.5*factor));s.prb=Math.max(15,Math.min(99,s.prb+(Math.random()-.5)*5*factor));s.jitter=Math.max(.5,Math.min(30,s.jitter+(Math.random()-.5)*1.2*factor));});renderOverview();if(state.page==="performance")renderRf();if(state.page==="qos")renderQos();if(state.page==="capacity")renderCapacity();$("#lastUpdate").textContent=new Date().toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit",second:"2-digit"});}
function bind(){
 $$(".nav-link").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.page)));
 $$("[data-navigate]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.navigate)));
 $("#themeToggle").addEventListener("click",()=>setTheme(state.theme==="dark"?"light":"dark"));
 $("#collapseSidebar").addEventListener("click",()=>$("#sidebar").classList.toggle("collapsed"));

$("#mobileToggle").addEventListener("click", () => {
  const sidebar = $("#sidebar");

  sidebar.classList.remove("collapsed");
  sidebar.classList.toggle("mobile-open");
});
 $("#pauseLive").addEventListener("click",()=>{state.live=!state.live;$("#pauseLive").innerHTML=`<i data-lucide="${state.live?"pause":"play"}"></i>`;$("#connectionText").textContent=state.live?"SIMULATED LIVE":"PAUSED";icons();toast(state.live?"استؤنف التحديث التجريبي":"تم إيقاف التحديث");});
 $("#globalSearch").addEventListener("keydown",e=>{if(e.key!=="Enter")return;const q=e.target.value.toLowerCase();const s=state.sites.find(x=>`${x.id} ${x.name} ${x.region}`.toLowerCase().includes(q));const i=state.incidents.find(x=>`${x.id} ${x.site} ${x.type}`.toLowerCase().includes(q));if(s)openSite(s.id);else if(i)openIncident(i.id);else toast("لم يتم العثور على نتيجة","error");});
 $("#siteSearch").addEventListener("input",e=>{state.siteQuery=e.target.value;renderSites();});
 $("#siteStatus").addEventListener("change",e=>{state.siteStatus=e.target.value;renderSites();});
 $("#incidentSearch").addEventListener("input",e=>{state.incidentQuery=e.target.value;renderIncidents();});
 $("#incidentStatus").addEventListener("change",e=>{state.incidentStatus=e.target.value;renderIncidents();});
 $("#incidentSeverity").addEventListener("change",e=>{state.incidentSeverity=e.target.value;renderIncidents();});
 $("#sitesTable").addEventListener("click",e=>{const tr=e.target.closest("[data-site]");if(tr)openSite(tr.dataset.site);});
 $("#rfTable").addEventListener("click",e=>{const tr=e.target.closest("[data-site]");if(tr)openSite(tr.dataset.site);});
 $("#capacityTable").addEventListener("click",e=>{const tr=e.target.closest("[data-site]");if(tr)openSite(tr.dataset.site);});
 $("#mapSiteCards").addEventListener("click",e=>{const b=e.target.closest("[data-site]");if(b)openSite(b.dataset.site);});
 $("#incidentsTable").addEventListener("click",e=>{const b=e.target.closest("[data-open-incident]");if(b)openIncident(b.dataset.openIncident);});
 $("#overviewAlarms").addEventListener("click",e=>{const b=e.target.closest("[data-alarm]");if(b)openIncident(b.dataset.alarm);});
 $("#sitesTable").closest("table").querySelectorAll("th[data-sort]").forEach(th=>th.addEventListener("click",()=>{const k=th.dataset.sort;if(state.sort===k)state.sortDir*=-1;else{state.sort=k;state.sortDir=1;}renderSites();}));
 $("#drawerBackdrop").addEventListener("click",closeDrawer);$("#closeDrawer").addEventListener("click",closeDrawer);
 $("#drawerActions").addEventListener("click",e=>{if(e.target.closest("#copySite")){navigator.clipboard?.writeText(state.selected.item.id);toast("تم نسخ المعرّف");}if(e.target.closest("#goPerformance")){closeDrawer();navigate("performance");}if(e.target.closest("#resolveIncident")){state.selected.item.status="resolved";renderIncidents();renderOverview();closeDrawer();toast("تم تحديث الحالة محلياً");}});
 $("#roleSwitch").addEventListener("click",()=>{const roles=["Administrator","Operator","Viewer"];state.role=roles[(roles.indexOf(state.role)+1)%roles.length];updateRole();toast(`الدور الحالي: ${state.role}`);});
 $("#exportButton").addEventListener("click",()=>exportSummary());
 $("#exportSites").addEventListener("click",()=>exportCSV(state.sites,"network-sites.csv"));$("#reportSites").addEventListener("click",()=>exportCSV(state.sites,"network-sites.csv"));
 $("#exportIncidents").addEventListener("click",()=>exportCSV(state.incidents,"network-incidents.csv"));$("#reportAlarms").addEventListener("click",()=>exportCSV(state.incidents,"network-incidents.csv"));
 $("#reportSummary").addEventListener("click",exportSummary);$("#exportRf").addEventListener("click",()=>exportCSV(state.sites.map(s=>({id:s.id,name:s.name,technology:s.technology,rsrp:s.rsrp,rsrq:s.rsrq,sinr:s.sinr,cqi:s.cqi})),"rf-performance.csv"));
 $("#autoRefresh").addEventListener("change",e=>{state.live=e.target.checked;$("#connectionText").textContent=state.live?"SIMULATED LIVE":"PAUSED";});
 $("#simulationSpeed").addEventListener("change",e=>state.speed=e.target.value);
 $("#resetData").addEventListener("click",async()=>{state.sites=await loadSites();state.incidents=await loadIncidents();renderAll();toast("تمت استعادة بيانات العرض الافتراضية");});
 $("#timeRange").addEventListener("change",e=>{state.period=e.target.value;renderOverview();renderCapacity();toast("تم تحديث الرسوم وفق الفترة المحددة");});
 document.addEventListener("keydown",e=>{if(e.key==="Escape")closeDrawer();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("#globalSearch").focus();}});
}
async function init(){document.documentElement.dataset.theme=state.theme;state.sites=await loadSites();state.incidents=await loadIncidents();bind();updateRole();renderAll();openTelemetryStream(message=>{if(message.type==="site.update"){const s=state.sites.find(x=>x.id===message.siteId);if(s)Object.assign(s,message.metrics);renderAll();}},status=>{$("#connectionText").textContent=status==="connected"?"WEBSOCKET LIVE":status==="simulated"?"SIMULATED LIVE":"DISCONNECTED";});setInterval(simulateTick,5000);icons();}
init().catch(err=>{console.error(err);toast("تعذر تحميل بيانات التطبيق","error");});
