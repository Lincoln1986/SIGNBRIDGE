-- Migración: limpieza de roles duplicados en la tabla "Role"
-- Contexto: existían 5 filas ("soporte", "Soporte", "Administrador",
-- "Cliente", "Moderador") cuando solo deben existir 3: Soporte,
-- Administrador, Cliente.
-- Se confirmó que ningún usuario tiene actualmente el rol "Moderador".

BEGIN;

-- 1) Reasignar cualquier usuario que tenga el rol "soporte" (minúscula)
--    hacia la fila correcta "Soporte" (mayúscula), por si existiera alguno.
UPDATE "User"
SET id_role = (SELECT id_role FROM "Role" WHERE role_name = 'Soporte')
WHERE id_role = (SELECT id_role FROM "Role" WHERE role_name = 'soporte');

-- 2) Eliminar la fila duplicada "soporte" (minúscula), ya sin usuarios asociados.
DELETE FROM "Role"
WHERE role_name = 'soporte'
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "User".id_role = "Role".id_role);

-- 3) Eliminar la fila "Moderador" (confirmado: sin usuarios asociados).
DELETE FROM "Role"
WHERE role_name = 'Moderador'
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "User".id_role = "Role".id_role);

-- 4) Verificación final: deben quedar exactamente 3 roles.
-- SELECT role_name FROM "Role" ORDER BY role_name;

COMMIT;
