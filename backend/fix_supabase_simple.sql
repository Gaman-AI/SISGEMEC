-- =====================================================
-- CORRECCIÓN SIMPLE para SISGEMEC - Sin problemas de tipos
-- Ejecutar este script en el SQL Editor de Supabase
-- =====================================================

-- 1. Deshabilitar RLS completamente para evitar recursión
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Basic access policy" ON profiles;

-- 3. Verificar estructura de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 4. Limpiar datos existentes (opcional - solo si hay problemas)
-- DELETE FROM profiles;

-- 5. Insertar un perfil de administrador de prueba
INSERT INTO profiles (user_id, email, role, nombre) 
VALUES (
    gen_random_uuid(), -- Generar un UUID válido
    'admin@sisgemec.com',
    'ADMIN',
    'Administrador del Sistema'
) ON CONFLICT (email) DO NOTHING;

-- 6. Verificar que se insertó correctamente
SELECT * FROM profiles;

-- 7. Crear una política simple sin recursión
CREATE POLICY "Simple access policy" ON profiles
    FOR ALL USING (true);

-- 8. Habilitar RLS con la política simple
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 9. Verificar configuración final
SELECT 
    'profiles' as table_name,
    COUNT(*) as row_count,
    'RLS enabled: ' || (SELECT CASE WHEN relrowsecurity THEN 'YES' ELSE 'NO' END 
                        FROM pg_class WHERE relname = 'profiles') as rls_status,
    'Policies: ' || (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles') as policy_count
FROM profiles;
