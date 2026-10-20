# Registro de decisiones (ADR)

Un ADR (*Architecture Decision Record*) es una nota corta que explica una decisión técnica relevante: qué se decidió, por qué y qué alternativas se descartaron. Sirve para que dentro de seis meses se entienda por qué el código es como es.

## Cuándo escribir uno

Cuando una decisión sea difícil de deshacer o afecte a varias partes del proyecto: elegir un proveedor, cambiar el modelo de datos, añadir una dependencia importante, apartarse del briefing…

## Formato

Un archivo por decisión, numerado: `NNNN-titulo-corto.md` (por ejemplo `0001-gestor-de-paquetes.md`).

```markdown
# NNNN — Título

- Fecha: AAAA-MM-DD
- Estado: propuesta | aceptada | sustituida por NNNN

## Contexto
Qué problema hay y qué restricciones aplican.

## Decisión
Qué se ha decidido.

## Alternativas descartadas
Qué otras opciones había y por qué no.

## Consecuencias
Qué implica (lo bueno y lo malo).
```
