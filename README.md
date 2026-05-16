# FIFA Viva Cup

App web mobile-first para gestionar una Viva Cup de EA Sports FC/FIFA entre amigos: torneos knockout de 16 jugadores, sorteo épico, bracket público, carga rápida de resultados, goleadores, ranking anual y perfiles por magic link.

## Stack

- React + Vite en JavaScript/JSX normal (sin TypeScript)
- Firebase Firestore y Firebase Storage opcional
- Tailwind CSS v3
- Framer Motion
- React Router
- Recharts opcional para estadísticas
- Deploy pensado para Vercel

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

La config web pública está en `src/lib/firebase.js`. Esa config puede vivir en frontend; no agregues private keys ni service accounts en `src/`.

## Variables de entorno para Vercel

Obligatoria/recomendada para el admin simple:

```bash
VITE_ADMIN_PASSCODE=un-passcode-privado
```

Opcionales si vas a usar los endpoints serverless de invites en `/api`:

```bash
FIREBASE_PROJECT_ID=fifavivacup
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@fifavivacup.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
INVITE_TOKEN_PEPPER=un-string-largo-random-y-secreto
PUBLIC_APP_URL=https://tu-dominio.vercel.app
```

## Acceso admin simple

El admin usa un passcode local para evitar login pesado durante la juntada.

- Variable opcional: `VITE_ADMIN_PASSCODE`
- Valor local por defecto: `viva2026`
- Firestore rules quedan en modo MVP abierto porque Firestore no puede validar un passcode guardado localmente. Para producción pública, reemplazar por Firebase Auth/Admin Claims.

## Magic links de jugadores

Cada jugador creado en `/admin/players` guarda un `accessToken` en `players/{playerId}`. El admin puede copiar el link:

```text
/player/:playerId?token=ACCESS_TOKEN
```

Desde ese perfil el jugador ve stats globales, puntos del año, torneos jugados, historial reciente y badges automáticos. Si regenerás el token, los links viejos dejan de funcionar.

## Datos anuales y ranking

Al cerrar partidos y torneos se guardan datos en:

- `players.statsGlobal.annualPoints.{year}` para ranking rápido.
- `seasonPointEvents` para auditar puntos por victoria, posición final, goleador y defensa.
- `tournamentResults` para ver puntos por torneo y perfil individual.

Puntaje implementado:

- Campeón: +10
- Subcampeón: +7
- Semifinalista: +5
- Cuartos: +3
- Octavos: +1
- Victoria: +2
- Goleador del torneo: +2
- Menos goles recibidos: +1

## Flujo MVP

1. Entrar a `/admin/players` y crear jugadores.
2. Copiar magic links de cada jugador si querés compartir perfil individual.
3. Entrar a `/admin` y crear el torneo de la noche.
4. Abrir `/admin/tournament/:id` y agregar exactamente 16 jugadores.
5. Ejecutar el sorteo; se crean automáticamente los 8 partidos de octavos.
6. Tocar un partido del bracket, cargar resultado y goleadores en segundos.
7. Al cerrar un partido, el ganador avanza automáticamente.
8. Al cerrar la final, se corona campeón, se actualiza el torneo y el ranking anual.
9. Compartir `/tournament/:id`, `/season/:year` o `/player/:playerId?token=xxx`.

## Deploy en Vercel

1. Importá el repo en Vercel.
2. Configurá `VITE_ADMIN_PASSCODE`.
3. Configurá las variables serverless si vas a usar `/api`.
4. Deploy normal con build command `npm run build`.
5. Publicá `firestore.rules` en Firebase.

## Notas

- El proyecto está completamente en `.js` / `.jsx`.
- No hay OCR como dependencia principal; `matches.imageUrl` queda preparado para una foto del resultado en el futuro.
- La carga oficial del resultado es manual y rápida.

## Modos de experiencia

- **Admin Mode** (`/admin`): crear torneo/jugadores, copiar magic links, regenerar tokens, agregar 16 jugadores, sortear, editar cruces y cargar resultados/goleadores en menos de 20 segundos.
- **Player Magic Link Mode** (`/player/:playerId?token=xxx`): dashboard personal premium sin login ni herramientas admin. Valida solo que el token coincida con `players.accessToken`.
- **Public Tournament Mode** (`/tournament/:id`): transmisión pública con bracket, pendientes, últimos resultados, goleadores, feed y campeón.
- **Live Night Mode** (`/screen/:id`): vista visual para TV/proyector sin edición.

## Seed demo data

En `/admin` hay un botón **Seed demo data** para desarrollo. Crea:

- 16 jugadores fake con equipos.
- Un torneo demo de la temporada actual.
- Los 16 jugadores agregados al torneo.
- Bracket sorteado.
- Algunos partidos cerrados.
- Goles cargados.
- Ranking anual parcial por victorias.

Usalo para validar el flujo principal completo antes de cargar datos reales.
