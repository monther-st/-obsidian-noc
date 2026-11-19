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
const isFiniteMetric = value => typeof value === "number" && Number.isFinite(value);
const avg = (arr,key) => { const values=arr.map(x=>x?.[key]).filter(isFiniteMetric); return values.length ? values.reduce((sum,value)=>sum+value,0)/values.length : null; };
const operationalSites = () => state.sites.filter(site=>site.status!=="offline");
const operationalAvg = key => avg(operationalSites(),key);
const displayMetric = (value,digits=1) => isFiniteMetric(value) ? value.toFixed(digits) : "N/A";
const isLteOrNr = site => /LTE|NR/i.test(site.technology||"");
const qoeComponent = (value,limit) => isFiniteMetric(value) ? Math.max(0,Math.min(100,100-(value/limit)*100)) : null;
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
 const color=site.status==="online"?"#22c58b":site.status==="degraded"?"#f3ad4e":site.status==="critical"?"#b84dff":"#f05e68";
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
 const availability=avg(state.sites,"availability"),latency=operationalAvg("latency");
 $("#kpiAvailability").textContent=displayMetric(availability,2)+"%";
 $("#kpiAvailability").title="متوسط Availability التاريخي لجميع المحطات التي تتوفر لها بيانات، وليس نسبة المحطات المتصلة حالياً";
 $("#kpiSites").textContent=`${active} / ${state.sites.length}`;
 $("#kpiSites").title="عدد المحطات ذات الحالة Online حالياً / إجمالي المحطات";
 $("#kpiLatency").innerHTML=`${displayMetric(latency,1)} <small>ms</small>`;
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
 const radioSites=operationalSites().filter(isLteOrNr);
 const rsrp=avg(radioSites,"rsrp"),rsrq=avg(radioSites,"rsrq"),sinr=avg(radioSites,"sinr"),cqi=avg(radioSites,"cqi");
 $("#rfRsrp").innerHTML=`${displayMetric(rsrp,1)} <small>dBm</small>`;$("#rfRsrq").innerHTML=`${displayMetric(rsrq,1)} <small>dB</small>`;$("#rfSinr").innerHTML=`${displayMetric(sinr,1)} <small>dB</small>`;$("#rfCqi").innerHTML=`${displayMetric(cqi,1)} <small>/ 15</small>`;
 const values=[rsrp,rsrq,sinr,cqi];
 chart("rfChart","bar",{labels:["RSRP","RSRQ","SINR","CQI"],datasets:[{label:"متوسط محطات LTE / NR",data:values,backgroundColor:["#37c7d5","#9b8cf5","#22c58b","#f3ad4e"],borderRadius:7}]},{plugins:{legend:{display:false}}});
 $("#rfQualityList").innerHTML=radioSites.slice().sort((a,b)=>(a.sinr??Infinity)-(b.sinr??Infinity)).map(s=>{const [q,c]=quality(s.sinr);return `<div class="quality-row"><span><b>${s.name}</b><small>${s.id} · SINR ${displayMetric(s.sinr,1)} dB</small></span><em class="${c}">${q}</em></div>`}).join("")||'<div class="empty">لا توجد قياسات RF متاحة لمحطات LTE / NR</div>';
 $("#rfTable").innerHTML=state.sites.map(s=>{const applicable=isLteOrNr(s)&&s.status!=="offline",[q,c]=applicable?quality(s.sinr):["غير متاح","warn"];return `<tr data-site="${s.id}"><td><b>${s.name}</b><small>${s.id}</small></td><td>${s.technology}</td><td class="mono">${applicable?displayMetric(s.rsrp,1)+" dBm":"N/A"}</td><td class="mono">${applicable?displayMetric(s.rsrq,1)+" dB":"N/A"}</td><td class="mono">${applicable?displayMetric(s.sinr,1)+" dB":"N/A"}</td><td class="mono">${applicable?displayMetric(s.cqi,0):"N/A"}</td><td><span class="status ${c}">${q}</span></td></tr>`}).join("");
}
function renderQos(){
 const valid=operationalSites(),lat=avg(valid,"latency"),jit=avg(valid,"jitter"),loss=avg(valid,"loss"),availability=avg(state.sites,"availability");
 $("#qosLatency").innerHTML=`${displayMetric(lat,1)} <small>ms</small>`;$("#qosJitter").innerHTML=`${displayMetric(jit,1)} <small>ms</small>`;$("#qosLoss").innerHTML=`${displayMetric(loss,2)} <small>%</small>`;
 // Illustrative weighted index only; it is not standardized MOS / ITU-T E-model.
 const components=[qoeComponent(lat,150),qoeComponent(jit,30),qoeComponent(loss,3),isFiniteMetric(availability)?availability:null];
 const weights=[.35,.20,.25,.20],available=components.map((v,i)=>({v,w:weights[i]})).filter(x=>isFiniteMetric(x.v));
 const score=available.length?Math.round(available.reduce((sum,x)=>sum+x.v*x.w,0)/available.reduce((sum,x)=>sum+x.w,0)):null;
 $("#qoeScore").textContent=score===null?"N/A":score;
 const bars=[["Latency",qoeComponent(lat,150)],["Jitter",qoeComponent(jit,30)],["Packet delivery",qoeComponent(loss,3)],["Site availability",availability]];
 $("#qoeBreakdown").innerHTML=bars.map(([n,v])=>`<div class="metric-bar"><div><span>${n}</span><b>${displayMetric(v,1)}${v===null?"":"%"}</b></div><i><span style="width:${isFiniteMetric(v)?Math.max(0,Math.min(100,v)):0}%"></span></i></div>`).join("");
 const note=$("#qoeScore")?.closest(".panel")?.querySelector(".qoe-method-note");
 if(!note&&$("#qoeScore")?.closest(".panel")){const n=document.createElement("p");n.className="qoe-method-note";n.textContent="مؤشر توضيحي تجريبي موزون من 100، وليس MOS معيارياً أو قياساً وفق ITU-T؛ متوسطات المحطات متساوية الوزن.";$("#qoeScore").closest(".panel").append(n);}
 chart("qosChart","line",{labels:trafficSeed.labels,datasets:[{label:"Latency (ms)",data:trafficSeed.down.map((_,i)=>lat+(Math.sin(i)*5)),borderColor:"#37c7d5",tension:.35,yAxisID:"y"},{label:"Jitter (ms)",data:trafficSeed.down.map((_,i)=>jit+(Math.cos(i)*1.4)),borderColor:"#9b8cf5",tension:.35,yAxisID:"y"},{label:"Packet loss (%)",data:trafficSeed.down.map((_,i)=>loss+(Math.sin(i*.7)*.1)),borderColor:"#f3ad4e",tension:.35,yAxisID:"y1"}]},{scales:{y:{position:"left"},y1:{position:"right",grid:{drawOnChartArea:false}}}});
}
function renderCapacity(){
 const valid=operationalSites(),prbSites=valid.filter(isLteOrNr),dl=valid.reduce((a,s)=>a+(isFiniteMetric(s.dl)?s.dl:0),0)/1000,ul=valid.reduce((a,s)=>a+(isFiniteMetric(s.ul)?s.ul:0),0)/1000,prb=avg(prbSites,"prb"),users=valid.reduce((a,s)=>a+(isFiniteMetric(s.users)?s.users:0),0);
 $("#capDown").innerHTML=`${dl.toFixed(2)} <small>Gbps</small>`;$("#capUp").innerHTML=`${ul.toFixed(2)} <small>Gbps</small>`;$("#capPrb").innerHTML=`${prb.toFixed(1)} <small>%</small>`;$("#capUsers").textContent=fmt(users);
 const series=periodTraffic();
 chart("capacityChart","line",{labels:series.labels,datasets:[{label:"Downlink Gbps",data:series.down,borderColor:"#37c7d5",backgroundColor:"rgba(55,199,213,.1)",fill:true,tension:.35},{label:"Uplink Gbps",data:series.up,borderColor:"#9b8cf5",tension:.35}]});
 const sorted=prbSites.slice().sort((a,b)=>b.prb-a.prb);
 chart("prbChart","bar",{labels:sorted.map(s=>s.id),datasets:[{label:"PRB %",data:sorted.map(s=>s.prb),backgroundColor:sorted.map(s=>s.prb>=90?"#f05e68":s.prb>=75?"#f3ad4e":"#37c7d5"),borderRadius:5}]},{indexAxis:"y",plugins:{legend:{display:false}},scales:{x:{max:100}}});
 $("#capacityTable").innerHTML=sorted.slice(0,8).map(s=>`<tr data-site="${s.id}"><td><b>${s.name}</b><small>${s.id}</small></td><td>${s.technology}</td><td class="mono">${displayMetric(s.prb,0)}%</td><td class="mono">${displayMetric(s.dl,0)}</td><td class="mono">${displayMetric(s.ul,0)}</td><td class="mono">${fmt(s.users)}</td><td><span class="status ${s.prb>=90?"bad":s.prb>=75?"warn":"good"}">${s.prb>=90?"ازدحام":s.prb>=75?"مرتفع":"طبيعي"}</span></td></tr>`).join("")||'<tr><td colspan="7" class="empty">لا توجد قياسات PRB لمحطات LTE / NR</td></tr>';
}
function renderSites(){
 const rows=state.sites.filter(s=>(state.siteStatus==="all"||s.status===state.siteStatus)&&`${s.id} ${s.name} ${s.region} ${s.technology}`.toLowerCase().includes(state.siteQuery.toLowerCase())).sort((a,b)=>{const av=a[state.sort],bv=b[state.sort];const diff=typeof av==="number"&&typeof bv==="number"?av-bv:String(av??"").localeCompare(String(bv??""),"ar");return diff*state.sortDir;});
 $("#siteResultCount").textContent=`${rows.length} محطة`;
 $("#sitesTable").innerHTML=rows.map(s=>`<tr data-site="${s.id}"><td class="mono">${s.id}</td><td><b>${s.name}</b><small>${s.vendor}</small></td><td>${s.region}</td><td>${s.technology}</td><td class="mono">${displayMetric(s.availability,2)}%</td><td class="mono">${s.status==="offline"?"N/A":displayMetric(s.latency,1)+" ms"}</td><td class="mono">${isLteOrNr(s)?displayMetric(s.prb,0)+"%":"N/A"}</td><td><span class="status ${statusClass(s.status)}">${labels[s.status]}</span></td></tr>`).join("")||'<tr><td colspan="8" class="empty">لا توجد نتائج</td></tr>';
}
function renderIncidents(){
 const rows=state.incidents.filter(i=>(state.incidentStatus==="all"||i.status===state.incidentStatus)&&(state.incidentSeverity==="all"||i.severity===state.incidentSeverity)&&`${i.id} ${i.site} ${i.type}`.toLowerCase().includes(state.incidentQuery.toLowerCase()));
 $("#incidentResultCount").textContent=`${rows.length} إنذار`;
 $("#incidentsTable").innerHTML=rows.map(i=>`<tr data-incident="${i.id}"><td class="mono">${i.id}</td><td><b>${i.site}</b><small>${i.siteId}</small></td><td>${i.type}</td><td><span class="severity ${i.severity}">${severity[i.severity]}</span></td><td><span class="status ${statusClass(i.status)}">${labels[i.status]}</span></td><td>${i.age}</td><td>${i.assignee}</td><td><button class="row-action" data-open-incident="${i.id}">تفاصيل</button></td></tr>`).join("")||'<tr><td colspan="8" class="empty">لا توجد إنذارات مطابقة</td></tr>';
}
function renderMapPage(){makeMap("networkMap");paintMap("networkMap");$("#mapSiteCards").innerHTML=state.sites.map(s=>`<button class="site-mini" data-site="${s.id}"><span class="dot ${statusClass(s.status)}"></span><b>${s.name}</b><small>${s.id} · ${labels[s.status]}</small></button>`).join("");}
function renderAll(){renderOverview();renderRf();renderQos();renderCapacity();renderSites();renderIncidents();renderMapPage();$("#lastUpdate").textContent=new Date().toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit",second:"2-digit"});icons();}
function navigate(page){if(!pageInfo[page])return;state.page=page;$$(".view").forEach(v=>v.classList.toggle("active",v.id===`view-${page}`));$$(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.page===page));$("#pageTitle").textContent=pageInfo[page][0];$("#pageDescription").textContent=pageInfo[page][1];$("#crumbCurrent").textContent=pageInfo[page][0];if(page==="map"){renderMapPage();setTimeout(()=>state.maps.networkMap?.invalidateSize(),100);}icons();}
function openSite(id){const s=state.sites.find(x=>x.id===id);if(!s)return;state.selected={type:"site",item:s};const radioApplicable=isLteOrNr(s)&&s.status!=="offline",serviceAvailable=s.status!=="offline";const metric=(value,unit="",digits=1)=>serviceAvailable&&isFiniteMetric(value)?`${value.toFixed(digits)}${unit}`:"N/A";$("#drawerTitle").textContent=s.name;$("#drawerBody").innerHTML=`<div class="drawer-id">${s.id} · ${s.vendor}</div><div class="drawer-state"><span class="status ${statusClass(s.status)}">${labels[s.status]}</span><span>${s.technology} / ${s.band}</span></div><div class="drawer-section"><h3>Radio Performance</h3>${detail("RSRP",radioApplicable?metric(s.rsrp," dBm"):"N/A")}${detail("RSRQ",radioApplicable?metric(s.rsrq," dB"):"N/A")}${detail("SINR",radioApplicable?metric(s.sinr," dB"):"N/A")}${detail("CQI",radioApplicable?metric(s.cqi,"/15",0):"N/A")}</div><div class="drawer-section"><h3>Service Quality</h3>${detail("Latency",metric(s.latency," ms"))}${detail("Jitter",metric(s.jitter," ms"))}${detail("Packet Loss",metric(s.loss,"%",2))}${detail("Availability",metric(s.availability,"%",2))}</div><div class="drawer-section"><h3>Capacity & Site</h3>${detail("PRB Utilization",radioApplicable?metric(s.prb,"%",0):"N/A")}${detail("Downlink",metric(s.dl," Mbps",0))}${detail("Uplink",metric(s.ul," Mbps",0))}${detail("Connected Users",serviceAvailable?fmt(s.users):"N/A")}${detail("Region",s.region)}${detail("Coordinates",s.lat.toFixed(4)+", "+s.lng.toFixed(4))}</div><div class="demo-disclaimer"><i data-lucide="info"></i> بيانات تجريبية مولّدة محلياً وليست قياسات من شبكة فعلية. مؤشرات RSRP / RSRQ / CQI وPRB معروضة لمحطات LTE / NR فقط.</div>`;$("#drawerActions").innerHTML=`<button class="outline-button" id="copySite"><i data-lucide="copy"></i> نسخ Site ID</button><button class="primary-button" id="goPerformance"><i data-lucide="activity"></i> فتح مؤشرات RF</button>`;showDrawer();}
function openIncident(id){const i=state.incidents.find(x=>x.id===id);if(!i)return;state.selected={type:"incident",item:i};$("#drawerTitle").textContent="تفاصيل الإنذار";$("#drawerBody").innerHTML=`<div class="drawer-id">${i.id}</div><div class="drawer-state"><span class="severity ${i.severity}">${severity[i.severity]}</span><span class="status ${statusClass(i.status)}">${labels[i.status]}</span></div><div class="drawer-section"><h3>بيانات الحادث</h3>${detail("المحطة",i.site)}${detail("Site ID",i.siteId)}${detail("النوع",i.type)}${detail("العمر",i.age)}${detail("المسؤول",i.assignee)}</div><div class="drawer-section"><h3>التشخيص الأولي</h3>${detail("السبب المحتمل",i.cause)}${detail("الأثر",i.impact)}</div><div class="demo-disclaimer">تغيير الحالة هنا محلي وتجريبي ولا يرسل أمراً إلى نظام OSS.</div>`;$("#drawerActions").innerHTML=`<button class="outline-button" id="copySite"><i data-lucide="copy"></i> نسخ Alarm ID</button>${i.status!=="resolved"&&state.role!=="Viewer"?'<button class="primary-button" id="resolveIncident"><i data-lucide="check-circle-2"></i> تعليم كمحلول</button>':'<button class="primary-button" disabled>لا يوجد إجراء متاح</button>'}`;showDrawer();}
function detail(k,v){return `<div class="detail-line"><span>${k}</span><b>${v}</b></div>`;}
function showDrawer(){$("#drawerBackdrop").classList.add("show");$("#detailDrawer").classList.add("open");$("#detailDrawer").setAttribute("aria-hidden","false");icons();}
function closeDrawer(){$("#drawerBackdrop").classList.remove("show");$("#detailDrawer").classList.remove("open");$("#detailDrawer").setAttribute("aria-hidden","true");}
function exportCSV(rows,filename){if(!rows.length){toast("لا توجد بيانات للتصدير","error");return;}const cols=[...new Set(rows.flatMap(Object.keys))];const csv=[cols.join(","),...rows.map(r=>cols.map(k=>`"${String(r[k]??"").replaceAll('"','""')}"`).join(","))].join("\r\n");download("\uFEFF"+csv,filename,"text/csv;charset=utf-8");toast(`تم تصدير ${rows.length} سجل`);}
function download(content,name,type){const a=document.createElement("a"),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportSummary(){const active=state.incidents.filter(i=>i.status!=="resolved"),availability=avg(state.sites,"availability"),latency=operationalAvg("latency"),sinr=avg(operationalSites().filter(isLteOrNr),"sinr"),prb=operationalAvg("prb");const text=`OBSIDIAN NOC V2 — EXECUTIVE NETWORK REPORT
Generated: ${new Date().toISOString()}
Mode: SIMULATED DEMONSTRATION DATA
Sites: ${state.sites.length}
Online sites: ${state.sites.filter(s=>s.status==="online").length}
Degraded sites: ${state.sites.filter(s=>s.status==="degraded").length}
Offline sites: ${state.sites.filter(s=>s.status==="offline").length}
Critical sites: ${state.sites.filter(s=>s.status==="critical").length}
Mean site availability (all sites): ${displayMetric(availability,2)}%
Mean latency (non-offline sites): ${displayMetric(latency,2)} ms
Mean SINR (LTE/NR non-offline sites): ${displayMetric(sinr,2)} dB
Mean PRB (non-offline sites): ${displayMetric(prb,2)}%
Open incidents: ${active.length}

OPEN INCIDENTS
${active.map(i=>`${i.id} | ${i.site} | ${i.type} | ${i.severity}`).join("\n")}

NOTE: All values are local simulated demonstration data, not live operator telemetry. Means are unweighted per-site averages.`;download(text,"OBSIDIAN-noc-executive-report.txt","text/plain");}
function updateRole(){const role=state.role;$("#userRole").textContent=role.toUpperCase();$("#currentRole").textContent=role;$("#userName").textContent=role==="Administrator"?"Network Administrator":role==="Viewer"?"Read-only Viewer":"Network Operator";localStorage.setItem("OBSIDIAN-role",role);}
function simulateTick(){if(!state.live)return;const factor=state.speed==="low"?.15:state.speed==="high"?.9:.4;state.sites.forEach(s=>{if(s.status==="offline")return;if(isFiniteMetric(s.latency))s.latency=Math.max(8,Math.min(180,s.latency+(Math.random()-.5)*8*factor));if(isFiniteMetric(s.sinr))s.sinr=Math.max(-2,Math.min(30,s.sinr+(Math.random()-.5)*2*factor));if(isFiniteMetric(s.rsrp))s.rsrp=Math.max(-120,Math.min(-70,s.rsrp+(Math.random()-.5)*1.5*factor));if(isFiniteMetric(s.prb))s.prb=Math.max(0,Math.min(100,s.prb+(Math.random()-.5)*5*factor));if(isFiniteMetric(s.jitter))s.jitter=Math.max(0,Math.min(30,s.jitter+(Math.random()-.5)*1.2*factor));});renderOverview();renderSites();if(state.page==="performance")renderRf();if(state.page==="qos")renderQos();if(state.page==="capacity")renderCapacity();$("#lastUpdate").textContent=new Date().toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit",second:"2-digit"});}
function bind(){
 $$(".nav-link").forEach(b=>b.addEventListener("click",()=>{navigate(b.dataset.page);if(window.matchMedia("(max-width: 850px)").matches)$("#sidebar").classList.remove("mobile-open");}));
 $$("[data-navigate]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.navigate)));
 $("#themeToggle").addEventListener("click",()=>setTheme(state.theme==="dark"?"light":"dark"));
 const sidebar = $("#sidebar");
  const toggleMobileSidebar = () => {
    sidebar.classList.remove("collapsed");
    sidebar.classList.toggle("mobile-open");
  };

  $("#collapseSidebar").addEventListener("click", () => {
    if (window.matchMedia("(max-width: 850px)").matches) {
      toggleMobileSidebar();
    } else {
      sidebar.classList.toggle("collapsed");
    }
  });

  $("#mobileToggle").addEventListener("click", toggleMobileSidebar); $("#pauseLive").addEventListener("click",()=>{state.live=!state.live;$("#pauseLive").innerHTML=`<i data-lucide="${state.live?"pause":"play"}"></i>`;$("#connectionText").textContent=state.live?"SIMULATED LIVE":"PAUSED";icons();toast(state.live?"استؤنف التحديث التجريبي":"تم إيقاف التحديث");});
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
 $("#drawerActions").addEventListener("click",e=>{if(e.target.closest("#copySite")){const id=state.selected?.item?.id;if(navigator.clipboard?.writeText){navigator.clipboard.writeText(id).then(()=>toast("تم نسخ المعرّف")).catch(()=>toast("تعذر النسخ؛ انسخ المعرّف يدوياً","error"));}else toast("المتصفح لا يدعم النسخ هنا","error");}if(e.target.closest("#goPerformance")){closeDrawer();navigate("performance");}if(e.target.closest("#resolveIncident")){state.selected.item.status="resolved";renderIncidents();renderOverview();closeDrawer();toast("تم تحديث الحالة محلياً");}});
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
async function init(){document.documentElement.dataset.theme=state.theme;state.sites=await loadSites();state.incidents=await loadIncidents();bind();updateRole();renderAll();openTelemetryStream(message=>{if(message?.type==="site.update"&&typeof message.siteId==="string"&&message.metrics&&typeof message.metrics==="object"&&!Array.isArray(message.metrics)){const s=state.sites.find(x=>x.id===message.siteId);if(s){const allowed=["latency","throughput","users","rsrp","rsrq","sinr","cqi","prb","dl","ul","jitter","loss","availability"];for(const key of allowed){const value=message.metrics[key];if(typeof value==="number"&&Number.isFinite(value))s[key]=value;}renderAll();}}},status=>{$("#connectionText").textContent=status==="connected"?"WEBSOCKET LIVE":status==="simulated"?"SIMULATED LIVE":"DISCONNECTED";});setInterval(simulateTick,5000);icons();}
init().catch(err=>{console.error(err);toast("تعذر تحميل بيانات التطبيق","error");});
