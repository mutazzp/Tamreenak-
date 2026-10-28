import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||4173);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
async function handleAI(req,res){
 if(req.method!=='POST'){res.writeHead(405,{'content-type':'application/json; charset=utf-8'});return res.end(JSON.stringify({error:'استخدم POST لهذا الطلب.'}));}
 if(!process.env.OPENAI_API_KEY){res.writeHead(503,{'content-type':'application/json; charset=utf-8'});return res.end(JSON.stringify({error:'مفتاح OPENAI_API_KEY غير مضبوط على الخادم.'}));}
 try{
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>25000){res.writeHead(413,{'content-type':'application/json; charset=utf-8'});return res.end(JSON.stringify({error:'حجم الطلب كبير.'}));}}
  const body=JSON.parse(raw);let messages=Array.isArray(body.messages)?body.messages.slice(-10).filter(m=>['user','assistant'].includes(m.role)&&typeof m.content==='string').map(m=>({role:m.role,content:m.content.slice(0,1800)})):[];
  if(!messages.some(m=>m.role==='user')){res.writeHead(400,{'content-type':'application/json; charset=utf-8'});return res.end(JSON.stringify({error:'اكتب سؤالك أولًا.'}));}
  const isMealEstimate=body.task==='meal-estimate';
  const coachInstructions='أنت مدرب تمرينك، مساعد عربي للتدريب العام والتغذية. لا تدّع أنك طبيب. لا تشخص انحناء العمود الفقري أو الإصابات؛ وضح أن سبب التقوس ونوعه يحددان العلاج وأن التمارين العامة لا تضمن تصحيح التشوه. لا توصف حمية شديدة أو عجز سعرات لمن دون 18 عامًا. عند ألم شديد أو خدر أو ضعف جديد أو فقد السيطرة على البول/البراز وجّه لتقييم طبي عاجل. شجع التقنية الصحيحة والتدرج والراحة.';
  const mealInstructions='أنت مقدّر غذائي تقريبي باللغة العربية. قدّر القيم لحصة الوجبة الكاملة كما وصفها المستخدم. لا تدّع دقة ملصق غذائي، واذكر أهم الكميات أو طرق التحضير التي افترضتها، ونبّه إذا لم يحدد الزيت/الصوص. لا تحول الأرقام إلى نصيحة طبية. أخرج القيم المطلوبة بالـ kcal والجرام.';
  const requestBody={model:process.env.OPENAI_MODEL||'gpt-4.1-mini',instructions:isMealEstimate?mealInstructions:coachInstructions,input:messages,max_output_tokens:isMealEstimate?500:850,store:false};
  if(isMealEstimate)requestBody.text={format:{type:'json_schema',name:'meal_estimate',strict:true,schema:{type:'object',properties:{name:{type:'string'},calories:{type:'number'},protein_g:{type:'number'},carbs_g:{type:'number'},fat_g:{type:'number'},confidence:{type:'string',enum:['low','medium','high']},assumptions:{type:'string'}},required:['name','calories','protein_g','carbs_g','fat_g','confidence','assumptions'],additionalProperties:false}}};
  const upstream=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(requestBody)});
  const data=await upstream.json().catch(()=>({}));if(!upstream.ok){res.writeHead(upstream.status,{'content-type':'application/json; charset=utf-8'});return res.end(JSON.stringify({error:data.error?.message||'فشل الاتصال بواجهة OpenAI API.'}));}
  let answer=data.output_text;if(!answer&&Array.isArray(data.output))answer=data.output.flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');res.writeHead(200,{'content-type':'application/json; charset=utf-8'});res.end(JSON.stringify({answer:answer||'وصل رد بدون نص.'}));
 }catch{res.writeHead(500,{'content-type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:'تعذر إكمال الطلب.'}));}
}
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/coach'||url.pathname==='/.netlify/functions/coach')return handleAI(req,res);
 let pathname=decodeURIComponent(url.pathname);if(pathname==='/')pathname='/index.html';
 const file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);return res.end('Forbidden');}
 try{const body=await fs.readFile(file);res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(body);}catch{try{const body=await fs.readFile(path.join(root,'index.html'));res.writeHead(404,{'content-type':'text/html; charset=utf-8'});res.end(body);}catch{res.writeHead(404);res.end('Not found');}}
}).listen(port,'0.0.0.0',()=>console.log(`تمرينك يعمل على http://localhost:${port}`));
