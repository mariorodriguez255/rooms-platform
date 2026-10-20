# Plantillas de email de Supabase Auth

Plantillas en español de los emails que envía Supabase Auth.

> **Desactivadas hasta tener SMTP propio (Hito 3).** El plan Free de Supabase rechaza cambios de plantilla mientras se use su servidor de correo, y local debe comportarse igual que la nube. Mientras tanto se usan las plantillas por defecto (en inglés) y `/auth/confirm` recibe un `?code=` (ver ADR 0004). Para activarlas: descomentar los bloques `[auth.email.template.*]` de `supabase/config.toml` y hacer `supabase config push`.

## Cómo se construye el enlace

El enlace parte de `{{ .RedirectTo }}`, la URL que manda la app al pedir el email. **No** usa `{{ .SiteURL }}`, que siempre apunta a producción: así, si te registras en una vista previa de Vercel, el enlace vuelve a esa vista previa.

La app siempre manda una URL con este formato, con `?next=` incluido:

```text
https://<despliegue>/auth/confirm?next=/ruta-de-destino
```

La plantilla le añade `&token_hash=…&type=…`. `/auth/confirm` verifica el token, crea la sesión y redirige a `next`.

Supabase solo acepta `RedirectTo` si está en la lista de URLs permitidas (`additional_redirect_urls` en local; _Auth → URL Configuration_ en la nube). Si no lo está, usa la Site URL y el enlace queda roto: el fallo se nota enseguida, no pasa en silencio.
