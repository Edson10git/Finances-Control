// Gera public/.well-known/assetlinks.json para a app Android (TWA) da Play Store.
// Sem este ficheiro no site, a app abre com a barra de endereço do Chrome à vista.
//
//   node scripts/assetlinks.mjs <package.name> <SHA256:...>
//
// A impressão digital SHA-256 é a da chave com que a Play assina a app:
// Play Console > a tua app > Teste e lançamento > Integridade da app >
// Assinatura de apps > "Certificado da chave de assinatura de apps" > SHA-256.
import fs from 'node:fs';
import path from 'node:path';

const [pkg, rawPrint] = process.argv.slice(2);
const fingerprint = String(rawPrint || '').trim().toUpperCase();

if (!pkg || !/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i.test(pkg)) {
 console.error('Indica o nome do pacote, por exemplo: node scripts/assetlinks.mjs app.financescontrol.twa SHA256...');
 process.exit(1);
}
if (!/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(fingerprint)) {
 console.error('A impressão digital tem de ser SHA-256 com 32 pares separados por ":" (ex.: AB:CD:...:EF).');
 process.exit(1);
}

const statements = [{
 relation: ['delegate_permission/common.handle_all_urls'],
 target: {namespace: 'android_app', package_name: pkg, sha256_cert_fingerprints: [fingerprint]},
}];

const dir = path.join(path.dirname(import.meta.dirname), 'public', '.well-known');
fs.mkdirSync(dir, {recursive: true});
fs.writeFileSync(path.join(dir, 'assetlinks.json'), JSON.stringify(statements, null, 2) + '\n');
console.log(`Escrito public/.well-known/assetlinks.json para ${pkg}.`);
console.log('Faz commit, espera o deploy e confirma em /.well-known/assetlinks.json no site.');
