export const connectionGroups={wallet:'Carteira de criptomoedas',exchange:'Exchange de criptomoedas',broker:'Corretora de ações / ETF'};
export const providers=[{id:'exodus',name:'Exodus',group:'wallet'},{id:'trezor',name:'Trezor',group:'wallet'},{id:'binance',name:'Binance',group:'exchange'},{id:'kucoin',name:'KuCoin',group:'exchange'},{id:'bybit',name:'Bybit',group:'exchange'},{id:'etoro',name:'eToro',group:'broker'},{id:'trading212',name:'Trading 212',group:'broker'},{id:'custom',name:'Outra plataforma',group:null}];
export function connectionProfile(data){
 if(!Object.hasOwn(connectionGroups,data.group))throw new Error('Escolhe uma das três categorias.');
 if(!['api','mcp'].includes(data.protocol))throw new Error('Protocolo inválido.');
 const provider=providers.find(p=>p.id===data.provider);
 if(!provider||(provider.group&&provider.group!==data.group))throw new Error('A plataforma não corresponde à categoria.');
 const name=String(data.name||'').trim();if(!name||name.length>80)throw new Error('Indica um nome até 80 caracteres.');
 let endpoint='';if(data.endpoint?.trim()){
  const url=new URL(data.endpoint);
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw new Error('Usa um endereço HTTPS sem credenciais, parâmetros ou fragmentos.');
  const host=url.hostname.toLowerCase();
  if(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||host.includes(':')||/^\d+(\.\d+){3}$/.test(host)||!host.includes('.'))throw new Error('Usa o domínio público oficial da plataforma.');
  endpoint=url.href;
 }
 // This stores only metadata; secret values are never accepted by this interface.
 return {group:data.group,protocol:data.protocol,provider:provider.id,name,endpoint,permissions:'read-only',status:'adapter-required'};
}
// Server-side contract. Register audited adapters explicitly. Configured endpoints
// are metadata, never automatically fetched or treated as executable MCP tools.
export function createConnectorRegistry(){
 const adapters=new Map();
 return {
  register(id,adapter){if(adapters.has(id)||typeof adapter.readPortfolio!=='function')throw new Error('Adaptador inválido ou duplicado.');adapters.set(id,adapter);},
  async sync(profile,{resolveSecret,subject,signal}){
   if(!subject)throw new Error('Autenticação de utilizador obrigatória.');
   if(profile.permissions!=='read-only')throw new Error('Apenas leitura é permitida.');
   const adapter=adapters.get(`${profile.protocol}:${profile.provider}`);
   if(!adapter)throw new Error('Ainda não há adaptador validado para esta plataforma.');
   // The adapter must resolve credentials in a server vault scoped to subject.
   return adapter.readPortfolio({profile,subject,resolveSecret,signal});
  }
 };
}
