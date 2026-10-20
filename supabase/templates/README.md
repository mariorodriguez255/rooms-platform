# Plantillas de email de Supabase Auth

Plantillas en español de los emails que envía Supabase Auth. En local se cargan desde `supabase/config.toml`; en el proyecto en la nube se configuran igual (ver «Supabase en la nube» en el README principal).

## Cómo se construye el enlace

El enlace parte de `{{ .RedirectTo }}`, la URL que manda la app al pedir el email. **No** usa `{{ .SiteURL }}`, que siempre apunta a producción: así, si te registras en una vista previa de Vercel, el enlace vuelve a esa vista previa.

La app siempre manda una URL con este formato, con `?next=` incluido:

```text
https://<despliegue>/auth/confirm?next=/ruta-de-destino
```

La plantilla le añade `&token_hash=…&type=…`. `/auth/confirm` verifica el token, crea la sesión y redirige a `next`.

Supabase solo acepta `RedirectTo` si está en la lista de URLs permitidas (`additional_redirect_urls` en local; _Auth → URL Configuration_ en la nube). Si no lo está, usa la Site URL y el enlace queda roto: el fallo se nota enseguida, no pasa en silencio.
