import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, mocks={}) {
  const code = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  const sandbox={module,exports:module.exports,Intl,Date,Math,Number,String,Boolean,Object,Array,parseInt,isNaN,isFinite,console,require:(id)=>mocks[id]??{}};
  vm.createContext(sandbox); vm.runInContext(code,sandbox,{filename:file}); return module.exports;
}
const qibla=load('src/lib/qibla.ts');
const zakat=load('src/lib/zakat.ts');
const prayer=load('src/lib/prayerTimes.ts', {'./db':{savePrayerCache(){},loadPrayerCache(){return null}}, './useConnectivity':{isAppOnline:()=>false}, './settings':{}});
const time=load('src/lib/timeFormat.ts');
const hijri=load('src/lib/hijri.ts', {'./quran':{}, './useConnectivity':{isAppOnline:()=>false}});
const out={};
const approx=(a,b,t)=>Math.abs(a-b)<=t;
const qCases=[['Dubai',25.2048,55.2708,258.23],['London',51.5074,-0.1278,118.99],['Karachi',24.8607,67.0011,266.74],['New York',40.7128,-74.006,58.48]];
out.qibla=qCases.map(([city,lat,lon,expected])=>({city,expected,actual:qibla.qiblaBearing(lat,lon),pass:approx(qibla.qiblaBearing(lat,lon),expected,2)}));
assert(out.qibla.every(x=>x.pass));
const z=zakat.calculateZakat({currencyCode:'USD',cash:10000,goldGrams:0,silverGrams:0,investments:0,otherAssets:0,liabilities:0,goldPricePerGram:78,silverPricePerGram:.95,nisabStandard:'gold'});
out.zakat={net:z.netZakatableWealth,threshold:z.nisabThreshold,due:z.zakatDue,eligible:z.isEligibleForZakat,expectedDue:250,pass:z.netZakatableWealth===10000&&z.nisabThreshold===6630&&z.zakatDue===250}; assert(out.zakat.pass);
const zLiab=zakat.calculateZakat({...{currencyCode:'USD',cash:7000,goldGrams:0,silverGrams:0,investments:0,otherAssets:0,liabilities:1000,goldPricePerGram:78,silverPricePerGram:.95,nisabStandard:'gold'}}); out.zakat.liability={net:zLiab.netZakatableWealth,due:zLiab.zakatDue,expectedNet:6000,expectedDue:0,pass:zLiab.netZakatableWealth===6000&&zLiab.zakatDue===0}; assert(out.zakat.liability.pass);
out.time={twelveNoon:time.formatTime('12:05','12h'),midnight:time.formatTime('00:05','12h'),twentyFour:time.formatTime('12:05','24h')}; assert.deepEqual(out.time,{twelveNoon:'12:05 PM',midnight:'12:05 AM',twentyFour:'12:05'});
const pt={Fajr:'05:00',Sunrise:'06:15',Dhuhr:'12:00',Asr:'15:30',Maghrib:'18:00',Isha:'20:00'};
out.nextPrayer={beforeIsha:prayer.getNextPrayer(pt,new Date('2026-01-01T19:00:00')),afterIsha:prayer.getNextPrayer(pt,new Date('2026-01-01T21:00:00')),expectedAfter:'tomorrow Fajr'}; assert.equal(out.nextPrayer.afterIsha,null);
const dates=[]; for(let i=0;i<30;i++){const d=new Date(2024,0,1+i*37); const a=hijri.gregorianToHijri(d.getFullYear(),d.getMonth()+1,d.getDate()); const p=new Intl.DateTimeFormat('en-u-ca-islamic-umalqura',{day:'numeric',month:'numeric',year:'numeric'}).formatToParts(d); const e={day:+p.find(x=>x.type==='day').value,month:+p.find(x=>x.type==='month').value,year:+p.find(x=>x.type==='year').value}; dates.push({date:d.toISOString().slice(0,10),expected:e,actual:{day:a.day,month:a.month,year:a.year},pass:a.day===e.day&&a.month===e.month&&a.year===e.year});} out.hijri={samples:dates,pass:dates.every(x=>x.pass),undefined:dates.some(x=>Object.values(x.actual).some(v=>v===undefined))}; assert(out.hijri.pass);
console.log(JSON.stringify(out,null,2));
