# FIFA Viva Cup

Web app mobile-first para organizar una Viva Cup de EA FC/FIFA entre 16 amigos: home pública, perfil de jugador, admin práctico, sorteo de bracket, magic links por WhatsApp y base de stats/ranking.

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- Framer Motion
- Firebase Auth, Firestore y Storage opcional
- Vercel Serverless Functions en `/api`
- Firebase Admin SDK solo en backend

## Instalación

```bash
npm install
npm run dev
```

## Build y checks

```bash
npm run build
npm run lint
```

## Firebase frontend

La config web pública está en `src/lib/firebase.ts`. Esa config puede vivir en frontend; no agregues private keys ni service accounts en `src/`.

## Variables de entorno backend

Copiá `.env.example` a `.env.local` para desarrollo con Vercel o configurá estas variables en Vercel:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `INVITE_TOKEN_PEPPER`
- `PUBLIC_APP_URL` opcional

Si `FIREBASE_PRIVATE_KEY` viene con `\n`, las funciones serverless lo normalizan antes de inicializar Firebase Admin.

## Firestore rules

Publicá `firestore.rules` en Firebase. El modelo deja lectura pública de torneos/participantes/matches/goals/badges y bloquea writes sensibles salvo admin. Los invites solo son legibles/escribibles por admin porque contienen `tokenHash`.

## Crear primer admin

1. Creá un documento manual en Firestore: `users/{uid}`.
2. Usá el UID del usuario Firebase Auth que quieras hacer admin.
3. Datos mínimos:

```json
{
  "id": "UID",
  "name": "Admin",
  "nickname": "Admin",
  "phone": "",
  "role": "admin",
  "status": "active"
}
```

Para el primer acceso podés crear temporalmente un custom token desde una consola segura o cargar un invite manual desde backend. No expongas credenciales Admin SDK en frontend.

## Flujo MVP

1. Entrar a `/admin/players` e importar los 16 jugadores sample o crear jugadores manuales.
2. Entrar a `/admin/tournaments` y crear `Viva Cup I` para `2026-05-23`.
3. Abrir el torneo y agregar participantes hasta 16.
4. Ir a `/admin/tournaments/:id/invites` y generar/copiar mensajes de WhatsApp.
5. Cada jugador abre `/invite/:token`, el backend canjea el invite por Firebase Custom Token y redirige a `/me`.
6. Ir a `/admin/tournaments/:id/draw` y ejecutar sorteo de octavos.
7. Compartir `/live` o `/bracket/:tournamentId` para ver bracket público.

## Deploy en Vercel

1. Importá el repo en Vercel.
2. Configurá las variables de entorno del backend.
3. Deploy normal con build command `npm run build`.
4. Asegurate de publicar las reglas Firestore.

## Seguridad de invites

- El token real solo se devuelve al admin al generar el invite.
- En Firestore se guarda `tokenHash = SHA-256(token + pepper)`.
- `usedAt` no bloquea reingreso: se registran `openedAt` y `lastUsedAt`.
- `revoked` y `expiresAt` se validan en `/api/auth/exchange-invite`.
