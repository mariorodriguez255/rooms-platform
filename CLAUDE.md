# CLAUDE.md — rooms-platform

Contexto y reglas del proyecto para Claude Code. Se carga en cada sesión.

- **Fuente de verdad:** `docs/briefing.md` (original en `docs/briefing.pdf`). Si algo de aquí o de una propuesta choca con el briefing, manda el briefing salvo que Mario decida cambiarlo explícitamente. **El briefing es privado y solo existe en local** (está en `.gitignore`); si no lo encuentras, pídeselo a Mario y no lo reconstruyas.
- **Estado del trabajo:** `docs/progress.md`.
- **Decisiones de arquitectura:** `docs/decisions/` (ADR).

## Producto

SaaS web B2B para **operadores que alquilan pisos por habitaciones en España** (cliente principal: 2–20 pisos, propios o subarrendados con permiso). El operador sigue publicando en idealista, Badi, Airbnb o Facebook; la plataforma gestiona todo lo que pasa después: candidatos, selección, inquilinos, contratos, fianzas y gastos.

> «Sigue publicando en idealista, Badi o Airbnb; todo lo que pasa después lo gestionas aquí.»

Diferenciales: bandeja única de leads de todos los portales, ranking de candidatos con compatibilidad de convivencia frente a los inquilinos actuales, modelo pensado por habitación (no por piso) y cumplimiento por comunidad autónoma.

No es: un portal, un gestor vacacional por noches, un «todo en uno» inmobiliario, ni un sistema de facturación o scoring de morosidad propio. Es un proyecto independiente de Kivio (no comparte marca, BD, usuarios ni repo).

**Versión 1 (MVP):** organizaciones y miembros; pisos y habitaciones; bandeja de leads por email reenviado; formulario público del candidato con consentimiento RGPD; ranking (economía, fechas, convivencia); pipeline de candidaturas; ficha de inquilino y tablero de habitaciones; paquete de anuncio por portal; suscripción con Stripe Billing por habitación.

**Fuera de alcance:** app nativa (basta web responsive/PWA), scoring de morosidad / firma / pasarela de pago propios, scraping de portales, emisión de facturas (Verifactu).

## Stack técnico

| Capa | Tecnología |
| --- | --- |
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui |
| Backend y BD | Supabase (Postgres, Auth, Storage, Edge Functions), región UE |
| Acceso a datos | Cliente de Supabase con tipos generados + validación con Zod |
| Tareas programadas | pg_cron de Supabase; Trigger.dev o Inngest si crece |
| Email saliente | Resend o Postmark |
| Email entrante | Postmark Inbound (o equivalente) → webhook |
| IA | API de Claude con salida JSON validada (extraer datos de emails, resumir candidatos) |
| PDF (V2) | Plantillas HTML → PDF (Puppeteer o Gotenberg) |
| Suscripción | Stripe Billing, cantidad = nº de habitaciones activas |
| Calidad | Vitest, Playwright, ESLint, Prettier |
| Observabilidad | Sentry + PostHog (alojado en la UE) |
| Hosting | Vercel con funciones en región UE |

### Invariantes de arquitectura

- **Multi-tenant desde el día 1:** toda tabla de negocio lleva `org_id`; RLS solo deja leer/escribir filas de organizaciones de las que el usuario es miembro.
- **La clave de servicio de Supabase solo en servidor.** El formulario público pasa por una función de servidor que valida el token de la habitación.
- **Migraciones SQL versionadas** con RLS activado en todas las tablas e índices en claves foráneas y en `org_id`.
- **Proveedores externos detrás de interfaces propias** (`EmailSender`, `InboundParser`, `SignatureProvider`, `PaymentsProvider`…).
- **Motor de puntuación puro y determinista**, con tests y desglose siempre. Solo usa variables de convivencia, fechas y economía, definidas como **lista de permitidos** (nunca lista de prohibidos), con tests. Prohibido pedir o usar nacionalidad, origen étnico, religión, sexo, orientación sexual, salud, edad (salvo mayoría de edad) o cualquier dato discriminatorio.
- **RGPD:** datos en la UE, consentimiento versionado en `consents`, documentos en bucket privado con URLs firmadas cortas y registro en `audit_log`, borrado automático de descartados a los 30 días (configurable).

## Convenciones

- TypeScript estricto. Sin `any` salvo justificación.
- Código, nombres de tablas y commits en **inglés**; interfaz de usuario en **español** (preparada para traducción futura).
- Commits pequeños con Conventional Commits (`feat:`, `fix:`, `chore:`…).
- Cada funcionalidad de negocio con tests; el motor de puntuación y los parsers con cobertura alta.
- Las decisiones de arquitectura relevantes se documentan en `docs/decisions/`.
- Validación con Zod en todos los endpoints; verificación de firma en todos los webhooks; límite de peticiones en el formulario público y en el webhook de email entrante.
- Datos de prueba siempre ficticios.

Estructura objetivo del repositorio (se irá creando hito a hito):

```text
rooms-platform/
├── CLAUDE.md
├── .githooks/       pre-commit (detector de secretos)
├── docs/            briefing.md (solo local), progress.md, decisions/
├── supabase/        migrations/, seed.sql, functions/
├── src/
│   ├── app/         (auth)/, (dashboard)/, apply/[token]/, api/
│   ├── components/  UI (shadcn/ui)
│   ├── lib/         supabase/, scoring/, inbound/, providers/, validation/
│   └── types/       tipos generados de la BD
├── tests/           unit/, e2e/
└── .env.example
```

## Reglas de trabajo (sección 14 del briefing, copiadas tal cual)

1. **Lee `docs/briefing.md` y `docs/progress.md` al empezar cada sesión.**
2. **Planifica antes de programar.** Para cada hito, presenta un plan con archivos, migraciones y tests, y espera aprobación.
3. **Un hito cada vez.** No adelantes funcionalidades de hitos o versiones posteriores.
4. **Cambios pequeños y verificables.** Ejecuta tests, linter y comprobación de tipos antes de dar algo por terminado.
5. **Nada de secretos en el código.** Usa variables de entorno y mantén `.env.example` actualizado.
6. **RLS siempre.** Toda tabla nueva lleva `org_id`, RLS y test de aislamiento.
7. **No inventes integraciones.** Si una API externa no está confirmada en la documentación oficial, dilo y propone alternativa. Consulta la documentación actual de cada librería en lugar de fiarte de la memoria.
8. **Privacidad por defecto.** Respeta la lista de variables permitidas del scoring y las reglas de borrado.
9. **Pregunta cuando falte información** en lugar de suponer.
10. **Actualiza `docs/progress.md` al terminar cada hito**, con lo hecho, lo pendiente y las decisiones tomadas.

## Repositorio público: secretos y datos privados

El repositorio es **público** desde el primer commit. Todo lo que entra en el historial de git se considera publicado para siempre.

- **Nunca** se suben: archivos `.env*` (salvo `.env.example` con valores vacíos), claves, certificados, el briefing, datos reales de personas ni emails reales de los portales.
- Lo sensible va en `private/` (ignorada por git). Los ejemplos para tests de parsers se anonimizan antes de salir de `private/`.
- Primera capa: `.gitignore`. Segunda capa: `.githooks/pre-commit`, que bloquea archivos prohibidos y patrones de claves (Stripe, Supabase, Anthropic, JWT, URLs de Postgres con contraseña…). Se activa por clon con `git config core.hooksPath .githooks`.
- Si el hook da un falso positivo, se marca esa línea con `secret-scan:allow`, nunca se desactiva el hook en bloque.
- Al añadir un proveedor nuevo, añade su variable vacía a `.env.example` y, si su clave tiene un prefijo reconocible, su patrón al hook.
- **Si una clave llega a subirse, se revoca y se rota de inmediato** en el proveedor. Borrarla del historial no basta: hay bots que rastrean GitHub en segundos.

## Cómo trabajar con Mario

- Conversación en español.
- Explica brevemente cada decisión técnica (qué, por qué y qué alternativa se descartó), sin rodeos: el objetivo es que Mario entienda lo que se hace, no solo que funcione.
- Inicio de sesión típico: «Lee CLAUDE.md y docs/progress.md. Estamos en el Hito N. Preséntame el plan detallado del hito y espera mi aprobación.»
