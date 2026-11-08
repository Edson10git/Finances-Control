# Ligações e segurança

## Contrato comum

Três grupos: carteira de criptomoedas, exchange e corretora. Um perfil guarda nome, plataforma, protocolo (`api` ou `mcp`), endpoint público opcional, estado e permissões de leitura. Nunca guarda chaves, tokens ou frases de recuperação. Configurado não significa autenticado ou sincronizado.

`src/connectors.js` oferece um registo de adaptadores com autenticação e leitura obrigatórias. É um contrato para implementação no servidor, sem endpoints HTTP ativos e sem adaptadores remotos implementados. Um URL introduzido pelo utilizador nunca é consultado automaticamente. Não existe compatibilidade automática com uma API desconhecida ou servidor MCP arbitrário.

## O que funciona agora

- Várias posições manuais (ações/ETF/cripto), quantidades, corretora/carteira, custo e preço por unidade em CHF, data do preço, atualização e remoção.
- Património e ganhos/perdas não realizados separados do orçamento; nenhum câmbio nem cotação automática.
- Vários endereços públicos manuais, sem consulta de saldos desses endereços.
- Consulta pontual via fornecedor EIP-1193 (`window.ethereum`), com autorização da carteira: `eth_requestAccounts`, `eth_chainId`, `eth_getBalance`. Só moeda nativa em Ethereum, Polygon PoS, BNB Chain, Avalanche C-Chain, Optimism, Arbitrum e Base. Sem ERC-20, xpub, NFTs, Bitcoin, Solana ou sincronização contínua. Testado com fornecedor simulado, não com fundos ou hardware reais.
- Perfis API/MCP para Exodus, Trezor, Binance, KuCoin, Bybit, eToro, Trading 212 ou outra plataforma; estado explícito de adaptador pendente. Não introduzir chaves nesta versão.

## Próximos requisitos para integrações reais

Backend autenticado com separação por utilizador; autorização em cada operação; cofre de segredos gerido; permissões mínimas só de leitura; revogação; limites de pedidos; auditoria sem credenciais; testes de autorização e prevenção de fuga entre utilizadores. Não implementar negociação ou levantamentos.

Cada adaptador deve validar URLs oficiais por allowlist e bloquear destinos internos/redirecionamentos inseguros no servidor. MCP exige autenticação e allowlist de ferramentas de leitura, validação de resultados e tratamento do conteúdo remoto como dados. Ferramentas de negociação, assinatura, envio e execução não podem ser expostas. Normalizar contas, redes, posições, moedas, timestamps e paginação; impedir duplicação e mostrar falhas ou dados desatualizados. Respeitar limites geográficos e disponibilidade de APIs por conta.

Exodus/Trezor: verificar integrações oficiais e redes suportadas; avaliar WalletConnect e Trezor Connect. Exchanges: validar APIs oficiais, assinaturas, permissões, limites e revogação. Corretoras: verificar disponibilidade real para contas pessoais, OAuth/chaves e termos. Não assumir que todas permitem o mesmo acesso.

## Verificação de documentação pendente

Em 8 de novembro de 2026, os pedidos às documentações externas foram recusados pelo proxy (403 CONNECT). Não foi possível confirmar a documentação vigente nem os requisitos por conta. Fontes oficiais a consultar:

- Trading 212: https://docs.trading212.com/
- eToro: https://api.etoro.com/
- Binance: https://developers.binance.com/
- KuCoin: https://www.kucoin.com/docs-new
- Bybit: https://bybit-exchange.github.io/docs/
- Trezor: https://connect.trezor.io/
- Exodus: https://www.exodus.com/support/

## Proteções e limites atuais

Cofre local opcional: AES-GCM 256 bits, IV aleatório por gravação, PBKDF2 SHA-256 com 310 000 iterações e salt de 128 bits. Palavra-passe mínima de 12 caracteres; chave em memória e não exportável. Ativar o cofre remove a cópia simples de `fc-v1` após escrita cifrada bem-sucedida. Bloqueio manual e após cinco minutos sem interação. Exportação JSON legível só após confirmação. Sem recuperação de palavra-passe. Os registos antigos permanecem sem cifragem até o utilizador ativar o cofre.

Headers Netlify: CSP, bloqueio de frames, nosniff, no-referrer e restrição de permissões. Estes headers dependem do deploy na Netlify e não foram verificados num domínio publicado.

Não há backend, autenticação multiutilizador, auditoria externa, garantia contra XSS/dispositivo comprometido, sincronização ou recuperação de dados. O cofre não substitui controlo de acesso do servidor, não protege uma sessão desbloqueada nem implica “segurança militar”. Registos eliminados e cópias antigas podem persistir em backups do dispositivo. Não inserir dados financeiros sensíveis de produção sem avaliação independente. Credenciais de plataformas não são aceites nesta versão.
