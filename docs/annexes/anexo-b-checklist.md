# Anexo B — Checklist LLM-Sec Review

## Propósito
Este checklist asegura que cada contribución generada o asistida por IA en el proyecto SISGEMEC pase por una **revisión mínima de seguridad** antes de integrarse al repositorio.

---

## Checklist de Seguridad (LLM-Sec)

Marcar cada ítem como ✅ (cumple) o ⚠️ (revisar):

1. **Validación de entradas**
   - [ ] Se valida todo dato recibido desde el frontend antes de procesarlo en el backend.
   - [ ] No se confía en valores enviados por el cliente sin validación (ej. `rol`, `id`).

2. **Autenticación y Autorización**
   - [ ] Todas las rutas protegidas requieren un JWT válido de Supabase.
   - [ ] Se aplica **control de roles** (admin, técnico, responsable) en backend y frontend.
   - [ ] Las reglas RLS en Supabase están configuradas correctamente.

3. **Manejo de secretos**
   - [ ] Ninguna clave o secreto está hardcodeado en el código fuente.
   - [ ] Se utilizan variables de entorno (`.env`) para todos los secretos.

4. **Protección contra inyección**
   - [ ] Todas las consultas a BD usan métodos seguros (parámetros, ORM o SDK oficial).
   - [ ] No existen concatenaciones directas en SQL.

5. **Exposición de datos**
   - [ ] El backend no expone información sensible en respuestas de error.
   - [ ] Los logs no contienen contraseñas ni tokens.

6. **Dependencias**
   - [ ] Dependencias externas han sido verificadas (`pip-audit`, `npm audit`).
   - [ ] No se usan librerías inseguras o abandonadas.

7. **Errores y excepciones**
   - [ ] El backend devuelve mensajes de error claros pero no reveladores.
   - [ ] Se manejan correctamente los estados HTTP (`401`, `403`, `500`).

---

## Ejemplo de Uso

Cada vez que se integre un PR asistido por IA:

- Revisar todo el código con este checklist.
- Completar con ✅ o ⚠️.
- Guardar registro en el **Development Log (Anexo F)**.

---

## Referencias
- [OWASP Top 10](https://owasp.org/Top10/)
- [Supabase Security Docs](https://supabase.com/docs/guides/security)
