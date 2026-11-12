import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { CompanyError } from './company-service';

type WixShopIdentity = { companyId: string; url: string; wixSiteId: string };

function secretKey() {
 const encoded = process.env.LEEK_WIX_CREDENTIALS_KEY ?? '';
 const key = Buffer.from(encoded, 'base64');
 if (key.length !== 32 || key.toString('base64') !== encoded) {
  throw new CompanyError(409, 'Wixi ühendus pole seadistatud. Võta ühendust LEEKi halduriga.');
 }
 return key;
}
function aad(shop: WixShopIdentity) {
 return Buffer.from(JSON.stringify([shop.companyId, shop.url, shop.wixSiteId]));
}

export function encryptWixKey(apiKey: string, shop: WixShopIdentity) {
 const nonce = randomBytes(12);
 const cipher = createCipheriv('aes-256-gcm', secretKey(), nonce);
 cipher.setAAD(aad(shop));
 const ciphertext = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
 return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString('base64url');
}

export function decryptWixKey(value: string, shop: WixShopIdentity) {
 const key = secretKey();
 try {
  const data = Buffer.from(value, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', key, data.subarray(0, 12));
  decipher.setAAD(aad(shop));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8');
 } catch {
  throw new CompanyError(409, 'Wixi ühenduse andmeid ei saanud avada. Sisesta uuesti sama saidi ID ja API võti.');
 }
}
