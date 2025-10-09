-- Script de limpieza para usuarios de prueba
-- Ejecutar en Supabase SQL Editor antes de probar importación

-- Limpiar profiles de prueba
DELETE FROM public.profiles 
WHERE email IN (
    'juan@aosenuma.com',
    'maria@aosenuma.com', 
    'carlos@aosenuma.com'
);

-- Nota: Los usuarios en auth.users se eliminarán automáticamente
-- por la foreign key constraint ON DELETE CASCADE
