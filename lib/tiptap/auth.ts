import { importPKCS8, SignJWT } from 'jose';

export interface TiptapPermission {
  action: 'AI:Toolkit' | 'Documents:Read' | 'Documents:Write';
  resource: string;
}

export async function createTiptapAccessToken(input: {
  userId: string;
  audiences: Array<'AI' | 'Documents'>;
  permissions: TiptapPermission[];
}): Promise<string> {
  const issuer = process.env.TIPTAP_ENVIRONMENT_ID;
  const privateKeyPem = process.env.TIPTAP_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!issuer || !privateKeyPem) {
    throw new Error('TIPTAP_NOT_CONFIGURED');
  }

  const privateKey = await importPKCS8(privateKeyPem, 'ES256');
  return new SignJWT({ permissions: input.permissions })
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuer(issuer)
    .setSubject(input.userId)
    .setAudience(input.audiences)
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(privateKey);
}
