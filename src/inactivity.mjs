const normalized=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function monthCutoff(now) {
  const d=new Date(now),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()-1);
  const max=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,max));return d.toISOString();
}
export function inactivityReport(skills,plugins,{adoptions,calls,observations={},now=Date.now()}={}){
  const cutoff=monthCutoff(now),pluginSummaries=calls?.sources?Object.values(calls.sources):calls?[calls]:[];
  const catalog=[...new Set(pluginSummaries.flatMap(s=>(s.catalog||[]).map(c=>c.id)))];
  const targets=plugins.map(p=>({...p,aliases:new Set([p.id,p.id.split('@')[0],p.displayName].map(normalized).filter(Boolean))}));
  function pluginIds(target){return catalog.filter(id=>targets.filter(t=>t.aliases.has(normalized(id))).length===1&&target.aliases.has(normalized(id)));}
  function item(entity,key,summaries,ids,field){
    let last=null,recent=0;
    for(const summary of summaries)for(const day of summary.activity?.days||[])for(const e of day.entries||[])if(ids.includes(e.id)&&e[field]>0){
      if(!last||day.date>last)last=day.date;
      // Day-level records overlapping the cutoff are conservatively recent.
      if(day.date>=cutoff.slice(0,10))recent+=e[field];
    }
    const firstSeen=observations[key]||null;
    const old=last?last<cutoff.slice(0,10):firstSeen&&Date.parse(firstSeen)<Date.parse(cutoff);
    return {id:key,name:entity.displayName||entity.name||entity.id,path:entity.path,pluginId:entity.path?undefined:entity.id,lastRecorded:last,firstSeen,recentCount:summaries.length?recent:null,
      state:!summaries.length?'records-unavailable':recent?'recent':old?'inactive':'insufficient-history',coverageComplete:false,recordKind:field,
      attribution:entity.path?'skill-instance':ids.length?'unique-catalog-match':'no-matching-records'};
  }
  return {cutoff,threshold:'one-calendar-month',skills:skills.map(s=>item(s,'skill:'+s.id,adoptions?[adoptions]:[],[s.id],'adoptions')),
    plugins:targets.map(p=>item(p,'plugin:'+p.id,pluginSummaries,pluginIds(p),'calls'))};
}
