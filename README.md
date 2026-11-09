# Finances Control

Assistente de finanças pessoais em português, instalável como app (PWA). Funciona offline e guarda os dados apenas no dispositivo. Política de privacidade publicada em `/privacidade.html`.

## Executar

Requer Node.js 20.19+ ou 22.12+ (validado com Node 24).

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
```

`npm run dev` e `npm run build` correm antes `scripts/copy-ocr.mjs`, que copia o motor de OCR e os idiomas (alemão e português) de `node_modules` para `public/ocr/`. Essa pasta é gerada e não vai para o Git.

Em ambientes que não permitem escrever no cache padrão, usa `npm ci --cache /tmp/fc-npm-cache`.

## O que o app faz

- **Primeiro arranque:** pergunta o nome, a moeda, o saldo atual e a data do próximo pagamento. A demonstração com dados fictícios só abre se o utilizador a escolher.
- **Datas reais:** tudo usa o relógio do dispositivo (`src/dates.js`). Se a data do pagamento já passou, o app avisa e sugere a data equivalente do mês seguinte, que o utilizador confirma.
- **Moedas** (`src/money.js`): moeda base escolhida pelo utilizador (CHF, EUR, CVE, USD, GBP, BRL, AOA) e uma moeda "estou a gastar em" para viagens. As despesas noutra moeda são convertidas pela taxa que o utilizador indica e guardam o valor original. O app não vai buscar câmbios à internet; a única taxa incluída é a paridade legal EUR/CVE (110,265). Mudar a moeda base converte todos os valores à taxa indicada e fica registado.
- **Voz** (`src/voice.js`, `src/speech.js`): ditado pela Web Speech API do navegador (pt-PT). A frase é interpretada em valor, moeda, loja e categoria. Frase completa com taxa conhecida é guardada logo, com botão Anular; caso contrário abre o formulário preenchido. No Chrome, o áudio é transcrito pelo serviço da Google.
- **Talões** (`src/ocr.js`, `src/receipt.js`): a câmara traseira fotografa o talão e o Tesseract lê-o no próprio telemóvel, sem enviar a foto. O app extrai loja, total, data e moeda (formatos suíço, português e cabo-verdiano, incluindo `1.230$00`) e pré-preenche a despesa para confirmação. Idioma do OCR: alemão quando se gasta em CHF, português nos restantes casos. O motor e o idioma (cerca de 6 MB) são descarregados só no primeiro uso.
- **Contratos e rendimentos:** formulário com agência, taxa líquida por hora, horas e data de pagamento. O rendimento previsto fica fora do disponível até ser confirmado.
- **Metas, contas a pagar, investimentos manuais, cofre cifrado opcional, exportação e eliminação de dados.**

## Limites conhecidos

- Não há backend nem sincronização: os dados vivem no `localStorage` do navegador. Limpar o navegador apaga-os; o cofre não tem recuperação de palavra-passe. Exportar com regularidade.
- A leitura de talões funciona bem com talões nítidos e esticados; talões térmicos gastos ou amarrotados falham mais. O total lido deve sempre ser confirmado.
- A interpretação da voz é por palavras-chave, não por IA. Frases fora do padrão abrem o formulário.
- Os rendimentos só aceitam a moeda base.
- Os cabeçalhos de segurança definidos em `netlify.toml` (CSP, Permissions-Policy, etc.) não estavam a ser enviados pela Netlify em 9 nov. 2026. Ver em Netlify → Deploys → "Header rules".

## Instalar no Android

Publicar o conteúdo de `dist/` num alojamento HTTPS estático. Abrir o endereço no Chrome do Android e escolher **⋮ → Instalar aplicação / Adicionar ao ecrã inicial**, ou usar o botão em Definições. Inclui ícones, manifest e service worker. Não é um APK nem uma publicação na Play Store.

Modo offline validado na compilação de produção em Chromium móvel: registo de despesa, corte de rede, recarregamento e persistência. A instalação num telefone físico ainda não foi verificada. Para testar: `npm run build` e `npm exec -- vite preview`.

A publicação pública ainda depende de um alojamento. O ZIP preparado contém apenas os ficheiros compilados, sem dados pessoais.

## Publicar pela Netlify

Ligar este repositório à Netlify e selecionar a branch `main`. A configuração `netlify.toml` define automaticamente o comando `npm run build`, a pasta `dist` e Node.js 24. Não são necessárias variáveis de ambiente para o protótipo.

O código-fonte completo está no repositório. `node_modules` e `dist` são gerados pela instalação e compilação e ficam excluídos do Git.

## Investimentos, rendimentos e ligações

Área de ações/ETF e criptomoedas com posições manuais e ganhos/perdas em CHF, separada do orçamento. Categorias personalizadas em Definições; entradas recebidas e previstas em Rendimentos. A confirmação de receção atualiza o saldo apenas uma vez.

O centro de ligações permite configurar as três categorias de plataformas por API ou MCP. Os perfis ficam **configurados, não ligados**: integrações remotas requerem adaptadores e backend ainda não implementados. Uma carteira EVM disponibilizada no navegador pode autorizar uma consulta pontual de endereço e saldo nativo; não há sincronização de exchanges/corretoras.

Cofre local opcional com palavra-passe em Definições. A proteção por AES-GCM substitui a gravação simples apenas depois de ativada. Exportações continuam legíveis e não há recuperação de palavra-passe. Documentação detalhada, compatibilidade, bloqueios de pesquisa e requisitos de segurança em [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md).
