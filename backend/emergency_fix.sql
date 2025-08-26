-- =====================================================
-- ARREGLO DE EMERGENCIA - Deshabilitar RLS completamente
-- Ejecutar este script en el SQL Editor de Supabase
-- =====================================================

-- 1. Deshabilitar RLS completamente
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. Eliminar TODAS las políticas
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Basic access policy" ON profiles;
DROP POLICY IF EXISTS "Simple access policy" ON profiles;

-- 3. Verificar que no hay políticas
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies 
WHERE tablename = 'profiles';

-- 4. Verificar que RLS está deshabilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- 5. Insertar datos de prueba
INSERT INTO profiles (user_id, email, role, nombre) 
VALUES 
    (gen_random_uuid(), 'admin@sisgemec.com', 'ADMIN', 'Administrador'),
    (gen_random_uuid(), 'user@sisgemec.com', 'USER', 'Usuario Test')
ON CONFLICT (email) DO NOTHING;

-- 6. Verificar datos
SELECT * FROM profiles;

-- 7. Confirmar que RLS está deshabilitado
SELECT 
    'Estado final:' as status,
    'RLS: ' || (SELECT CASE WHEN relrowsecurity THEN 'HABILITADO' ELSE 'DESHABILITADO' END 
                FROM pg_class WHERE relname = 'profiles') as rls_status,
    'Políticas: ' || (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles') as policies,
    'Filas: ' || (SELECT COUNT(*) FROM profiles) as rows;
