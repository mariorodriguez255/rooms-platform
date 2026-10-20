# Progreso del proyecto

Estado de los hitos de la sección 13 del briefing. Se actualiza al terminar cada hito (regla 10 de `CLAUDE.md`).

Leyenda: ⬜ pendiente · 🟡 en curso · ✅ hecho

| Hito | Estado | Hecho cuando |
| --- | --- | --- |
| 0 — Cimientos | ⬜ Pendiente (preparación hecha, plan sin presentar) | El proyecto arranca en local, los tests pasan y hay un despliegue de vista previa |
| 1 — Cuentas y organizaciones | ⬜ Pendiente | Dos organizaciones de prueba no pueden ver datos la una de la otra |
| 2 — Pisos y habitaciones | ⬜ Pendiente | El operador ve el estado de todas sus habitaciones en una pantalla |
| 3 — Formulario del candidato | ⬜ Pendiente | Un candidato puede postularse desde el móvil sin registrarse |
| 4 — Puntuación y pipeline | ⬜ Pendiente | El operador ve un ranking explicado y puede aceptar a un candidato |
| 5 — Bandeja de leads por email | ⬜ Pendiente | Un aviso reenviado de idealista crea un lead y envía el formulario automáticamente |
| 6 — Paquete de anuncio | ⬜ Pendiente | Publicar una habitación en tres portales lleva menos de cinco minutos |
| 7 — Facturación y lanzamiento piloto | ⬜ Pendiente | Un operador piloto puede pagar y usar la plataforma de forma autónoma |

## Registro

### 2026-10-20 — Preparación del directorio

Hecho:

- Carpeta `rooms-platform/` creada y repositorio git inicializado (rama `main`, sin commits todavía).
- Briefing original copiado en `docs/briefing.pdf` y convertido a `docs/briefing.md`.
- `CLAUDE.md` creado con resumen del producto, stack, invariantes, convenciones y reglas de trabajo.
- `docs/progress.md` (este archivo) y `docs/decisions/` creados.

Pendiente:

- Presentar el plan detallado del Hito 0 y esperar aprobación antes de escribir código.

### 2026-10-20 — Preparación para repositorio público

Decisiones:

- El repositorio será **público** en GitHub.
- El briefing (`docs/briefing.md` y `.pdf`) contiene el plan de negocio: **queda fuera del repo**, solo en local. Mario debe guardar una copia en un sitio privado.
- Los commits se firman con el nombre y el email de la cuenta de GitHub de Mario (configurado solo en este repo). El email queda visible en el historial público; decisión consciente.

Hecho:

- `.gitignore` preparado para secretos, datos privados (`private/`), Next.js, Supabase, Vercel y tests.
- Hook `.githooks/pre-commit` que bloquea archivos prohibidos y patrones de claves; probado con claves falsas en un repo temporal.
- Sección «Repositorio público» añadida a `CLAUDE.md`.

## Antes de subir a GitHub (checklist)

- [ ] Crear el repo en GitHub **vacío** (sin README, licencia ni `.gitignore`: ya los tenemos o vendrán en el Hito 0).
- [ ] En *Settings → Code security*, comprobar que estén activos **Secret scanning** y **Push protection** (GitHub bloquea en el servidor los pushes con claves conocidas). Activar también **Dependabot alerts**.
- [ ] Revisar `git log --format='%an <%ae>'` y confirmar que el autor es el correcto.
- [ ] Si en GitHub tienes activado «Block command line pushes that expose my email» (*Settings → Emails*), el push se rechazará: desactívalo o pasa a usar el email noreply.
- [ ] Elegir licencia (o ninguna: sin licencia, el código es visible pero nadie tiene permiso legal para reutilizarlo).

## Notas para el Hito 0

Entorno de desarrollo comprobado el 2026-10-20:

| Herramienta | Estado |
| --- | --- |
| git | ✅ 2.50.1 |
| Node.js | ✅ v24.22.0 |
| npm / npx | ✅ 11.19.1 |
| pnpm | ❌ no instalado (decidir gestor de paquetes en el plan) |
| Supabase CLI | ❌ no instalado |
| Docker (o alternativa compatible) | ❌ no instalado — **necesario para levantar Supabase en local** |
| GitHub CLI (`gh`) | ❌ no instalado (útil para la CI y los PR, no imprescindible) |

Otros puntos a resolver en el plan:

- La carpeta ya no está vacía (`CLAUDE.md`, `docs/`, `.git`). Comprobar si `create-next-app` acepta generar el proyecto aquí o si hay que generarlo aparte y mover los archivos.
- Hacen falta cuentas en Supabase (proyecto en región UE), Vercel y GitHub para la vista previa y la CI.
- `create-next-app` genera su propio `.gitignore`: fusionarlo con el nuestro sin perder ninguna regla de secretos.
- Añadir un script `prepare` en `package.json` que ejecute `git config core.hooksPath .githooks`, para que el hook se active solo al hacer `npm install` en cualquier clon.
- Añadir a la CI un escáner de secretos sobre todo el historial (por ejemplo gitleaks; verificar en su documentación oficial cómo se integra con GitHub Actions).
- Crear `.env.example` con todas las variables y los valores vacíos.
