-- =====================================================
-- CONFIGURACIÓN RÁPIDA SISGEMEC - SIN RLS COMPLEJO
-- Ejecutar este script en el SQL Editor de Supabase
-- =====================================================

-- 1. Deshabilitar RLS temporalmente para evitar problemas
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. Verificar que la tabla existe y tiene la estructura correcta
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 3. Insertar un perfil de administrador de prueba
INSERT INTO profiles (user_id, email, role, nombre) 
VALUES (
    gen_random_uuid(), -- ID temporal
    'admin@sisgemec.com',
    'ADMIN',
    'Administrador del Sistema'
) ON CONFLICT (email) DO NOTHING;

-- 4. Verificar que se insertó correctamente
SELECT * FROM profiles;

-- 5. Habilitar RLS con políticas simples
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 6. Crear políticas básicas sin recursión
DROP POLICY IF EXISTS "Basic access policy" ON profiles;
CREATE POLICY "Basic access policy" ON profiles
    FOR ALL USING (true);

-- 7. Verificar configuración final
SELECT 
    'profiles' as table_name,
    COUNT(*) as row_count,
    'RLS enabled: ' || (SELECT CASE WHEN relrowsecurity THEN 'YES' ELSE 'NO' END 
                        FROM pg_class WHERE relname = 'profiles') as rls_status
FROM profiles;
