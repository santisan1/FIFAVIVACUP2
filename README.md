# FIFA Viva Cup

App web mobile-first para gestionar una Viva Cup de EA Sports FC/FIFA entre amigos: torneos knockout de 16 jugadores, sorteo épico, bracket público, carga rápida de resultados, goleadores, ranking anual y perfiles por magic link.

## Stack

- React + Vite en JavaScript/JSX normal (sin TypeScript)
- Firebase Firestore y Firebase Storage opcional
- Tailwind CSS
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

## Acceso admin simple

El admin usa un passcode local para evitar login pesado durante la juntada.

- Variable opcional: `VITE_ADMIN_PASSCODE`
- Valor local por defecto: `viva2026`

## Flujo MVP

1. Entrar a `/admin/players` y crear jugadores.
2. Entrar a `/admin` y crear el torneo de la noche.
3. Abrir `/admin/tournament/:id` y agregar exactamente 16 jugadores.
4. Ejecutar el sorteo; se crean automáticamente los 8 partidos de octavos.
5. Tocar un partido del bracket, cargar resultado y goleadores en segundos.
6. Al cerrar un partido, el ganador avanza automáticamente.
7. Al cerrar la final, se corona campeón, se actualiza el torneo y el ranking anual.
8. Compartir `/tournament/:id`, `/season/:year` o `/player/:playerId?token=xxx`.

## Deploy en Vercel

1. Importá el repo en Vercel.
2. Configurá `VITE_ADMIN_PASSCODE` si querés cambiar el passcode.
3. Deploy normal con build command `npm run build`.
4. Publicá `firestore.rules` en Firebase.

## Notas

- El proyecto fue convertido completamente a `.js` / `.jsx` para máxima compatibilidad.
- No hay OCR como dependencia principal; `matches.imageUrl` queda preparado para una foto del resultado en el futuro.
- Las funciones de `/api` también están en JavaScript normal.
