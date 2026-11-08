# Finances Control

Protótipo web responsivo de um assistente de finanças pessoais, em português e CHF. Os dados de exemplo usam 8 de novembro de 2026 como data de referência.

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

Em ambientes que não permitem escrever no cache padrão, usa `npm ci --cache /tmp/fc-npm-cache`.

## Percursos disponíveis

- Consultar saldo conhecido, despesas, compromissos, reserva da meta e margem diária até ao pagamento. Salários previstos ficam excluídos do disponível.
- Registar e eliminar despesas; interpretar uma frase escrita e rever os campos antes de confirmar.
- Simular um talão e associá-lo a uma despesa sem duplicar o valor.
- Simular um contrato, confirmar taxa líquida e horas, e confirmar a receção do pagamento separadamente.
- Editar a meta e a reserva; marcar contas como pagas com atualização do saldo.
- Consultar explicações determinísticas do orçamento; exportar ou eliminar dados locais.

## Limites do protótipo

Não há backend, autenticação, IA generativa, OCR, reconhecimento de voz, ligação bancária, comparação de preços ou geolocalização. Fotos/documentos selecionados não são lidos, enviados ou armazenados. Os dados são guardados em `localStorage` neste navegador e não são cifrados pela aplicação. Não usar com dados sensíveis reais.

Os cálculos têm testes automatizados. Os percursos de despesa, associação de talão, contrato, persistência, consulta de orçamento e layout móvel foram também verificados em Chromium.

## Instalar no Android

Publicar o conteúdo de `dist/` num alojamento HTTPS estático. Abrir o endereço no Chrome do Android e escolher **⋮ → Instalar aplicação / Adicionar ao ecrã inicial**, ou usar o botão em Definições. Inclui ícones, manifest e service worker. Não é um APK nem uma publicação na Play Store.

Modo offline validado na compilação de produção em Chromium móvel: registo de despesa, corte de rede, recarregamento e persistência. A instalação num telefone físico ainda não foi verificada. Para testar: `npm run build` e `npm exec -- vite preview`.

A publicação pública ainda depende de um alojamento. O ZIP preparado contém apenas os ficheiros compilados, sem dados pessoais.

## Publicar pela Netlify

Ligar este repositório à Netlify e selecionar a branch `main`. A configuração `netlify.toml` define automaticamente o comando `npm run build`, a pasta `dist` e Node.js 24. Não são necessárias variáveis de ambiente para o protótipo.

O código-fonte completo está no repositório. `node_modules` e `dist` são gerados pela instalação e compilação e ficam excluídos do Git.
