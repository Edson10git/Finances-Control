# Publicar na Google Play (teste fechado)

Este documento é o guião do lançamento. A app é um PWA; na Play entra embrulhada
numa TWA (Trusted Web Activity), que é um Android App Bundle que abre este site
em ecrã inteiro, sem barra de endereço.

## 0. A regra que manda no calendário

Contas de programador **pessoais criadas depois de 13/11/2023** só podem pedir
acesso à produção depois de um **teste fechado com 12 testadores, opted-in de
forma contínua durante 14 dias**. O teste interno não conta. Se o número descer
abaixo de 12, o relógio pode reiniciar.
Fonte: Play Console Help, "App testing requirements for new personal developer accounts".

Consequência prática: **publicar o build no canal de teste fechado é a primeira
coisa a fazer**, não a última. O build não precisa de estar perfeito — pode ser
substituído durante os 14 dias. O que não se recupera é tempo.

## 1. Gerar o pacote Android

Caminho mais rápido, sem instalar nada:

1. Abrir <https://www.pwabuilder.com> e introduzir o endereço do site.
2. `Package for stores` → `Android` → `Google Play`.
3. Confirmar: nome `Finances Control`, package ID (ex.: `app.financescontrol.twa`),
   versão 1 (1.0.0), ícone do manifest, `Signing key: new`.
4. Descarregar o zip. Contém:
   - `app-release-bundle.aab` — é este que se envia para a Play;
   - `signing.keystore` + `signing-key-info.txt` — **guardar fora do computador**
     (sem esta chave não há atualizações da app, nunca);
   - `assetlinks.json` — já com a impressão digital correta.

Alternativa com mais controlo: `npx @bubblewrap/cli init --manifest <url>/manifest.webmanifest`
(precisa de JDK e Android SDK).

## 2. Ligar o site à app (assetlinks)

Sem este passo a app abre com a barra de endereço do Chrome visível e parece um site.

```
node scripts/assetlinks.mjs app.financescontrol.twa SHA256_DA_CHAVE
```

A impressão digital está em `signing-key-info.txt` ou, depois do primeiro envio,
em Play Console → a app → Teste e lançamento → Integridade da app → Assinatura de
apps → *Certificado da chave de assinatura de apps* → SHA-256.

**Atenção:** se usares a assinatura de apps da Play (o normal), a impressão digital
que conta é a da chave **da Play**, não a da chave local. Verificar depois do deploy
em `/.well-known/assetlinks.json`.

## 3. Ficha da loja (pt-PT)

**Nome (30):** `Finances Control`

**Descrição curta (80):**
`Diz o que gastaste e fica registado. O teu orçamento, na moeda onde estás.`

**Descrição completa:**

```
O Finances Control responde a uma só pergunta: quanto posso gastar até receber?

REGISTA A DESPESA EM SEGUNDOS
Diz "gastei 12 francos e 90 no Migros" e a app mostra o que percebeu — loja, valor
e categoria. Só guarda depois de confirmares. Também podes fotografar o talão: a
foto é lida no próprio telemóvel e não é enviada para lado nenhum.

O DINHEIRO QUE TENS MESMO
O valor em destaque já desconta as contas por pagar e a reserva da tua meta. Mostra
também quanto dá por dia até ao próximo pagamento.

A MOEDA DO PAÍS ONDE ESTÁS
Escolhes a moeda base e registas despesas noutra moeda quando viajas, com a taxa
que indicares. Franco suíço, euro, escudo cabo-verdiano, dólar, libra, real e kwanza.
A app nunca vai buscar câmbios à internet: a taxa é a tua.

PERGUNTA EM PORTUGUÊS
"Posso gastar 400 francos?" — a resposta usa os teus números: com quanto ficas e
quanto passa a ser o valor por dia.

OS DADOS SÃO TEUS
Tudo fica guardado neste telemóvel. Não há conta, não há sincronização bancária,
não há serviço de IA. Podes ativar um cofre local com palavra-passe e exportar
tudo quando quiseres.

Feito para quem trabalha fora do seu país e precisa de contas claras em duas moedas.
```

**Categoria:** Finanças · **Etiquetas:** orçamento, despesas, poupança
**Email de contacto:** edsondyfernandes01@gmail.com
**Política de privacidade:** `<endereço do site>/privacidade.html`

## 4. Elementos gráficos

| Elemento | Requisito | Estado |
| --- | --- | --- |
| Ícone | 512×512 PNG | `public/icon-512.png` |
| Gráfico de destaque | 1024×500 PNG | gerado (`feature-graphic-1024x500.png`) |
| Capturas de telemóvel | 2 a 8, mín. 320px, rácio ≤ 2:1 | tirar no telemóvel |

Capturas a tirar, por esta ordem: Visão geral, revisão do ditado, Movimentos, Metas.

## 5. Segurança dos dados (o formulário)

A app corre no dispositivo e não envia dados para servidor nenhum. O que é preciso
declarar com honestidade:

- **Áudio / gravações de voz:** *recolhido, não partilhado.* O ditado usa o
  reconhecimento de voz do navegador (no Chrome, um serviço da Google): o áudio sai
  do telemóvel para ser transcrito. Finalidade: funcionalidade da app. Opcional
  (só quando o utilizador toca no microfone). Não é guardado pela app.
- **Informação financeira:** *não recolhida.* Fica apenas no armazenamento local do
  dispositivo e nunca é transmitida. O formulário cobre dados que saem do dispositivo.
- **Fotos:** *não recolhidas.* O talão é lido no telemóvel (Tesseract local) e a
  imagem não é enviada nem guardada.
- Encriptação em trânsito: sim (HTTPS). Eliminação de dados: sim, em Definições.

**Classificação de conteúdo:** app de finanças, sem anúncios, sem conteúdo gerado
por utilizadores, sem compras na app → classificação para todos.
**Público-alvo:** 18+. **Anúncios:** não. **Compras na app:** não.

## 6. Ordem de trabalhos

1. Enviar o `.aab` para **Teste fechado** e criar a lista de testadores.
2. Pôr o `assetlinks.json` no site e confirmar que abre sem barra de endereço.
3. Recrutar **mais de 12** testadores (margem para desistências) e avisá-los de que
   têm de ficar inscritos 14 dias seguidos.
4. Durante os 14 dias: tirar capturas, preencher a ficha, segurança dos dados,
   classificação de conteúdo.
5. Ao 15.º dia, pedir acesso à produção. A revisão costuma levar até 7 dias.
