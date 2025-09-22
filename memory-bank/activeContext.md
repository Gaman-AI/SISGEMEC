# Active Context - Excel Import Refactoring

## Current Focus
Refactoring the Excel import module from a single combined importer to two independent importers: Users and Equipment.

## Current System Analysis

### Existing Components
1. **Backend Router**: `backend/app/routers/import_inventario.py`
   - Single endpoint `/import-inventario`
   - Processes both users and equipment from Excel
   - Has 422 error issues with file upload

2. **Backend Service**: `backend/app/services/excel_import.py`
   - `ExcelImportService` class handles both user and equipment processing
   - Uses Supabase Service Role client
   - Complex logic mixing user creation and equipment import

3. **Frontend Component**: `frontend/src/pages/import-inventario/ImportInventarioPage.tsx`
   - Single page for importing both users and equipment
   - Uses FormData with 'file' key
   - Has error handling for 422 responses

### Current Issues
1. **422 Unprocessable Entity**: FastAPI file upload not properly configured
2. **Mixed Responsibilities**: Single service handles both user and equipment import
3. **Complex Excel Structure**: Requires two sheets in one file
4. **Security Concerns**: Mixed authentication patterns
5. **Error Handling**: Inconsistent error responses

## Refactoring Plan

### Phase 1: Backend Services Separation
- Create `UserImportService` for user/profile creation
- Create `EquipmentImportService` for equipment import
- Fix file upload patterns to eliminate 422 errors
- Implement proper security with Service Role

### Phase 2: New API Endpoints
- `/import-usuarios` - dedicated user import endpoint
- `/import-equipos` - dedicated equipment import endpoint
- Proper error handling (400/401/403/500, no 422)
- JSON serializable responses

### Phase 3: Frontend Components
- `ImportUsuariosPage` - dedicated user import page
- `ImportEquiposPage` - dedicated equipment import page
- Proper FormData handling
- Error display improvements

### Phase 4: Testing & Validation
- Test both importers with sample Excel files
- Validate idempotency (re-import doesn't duplicate)
- Ensure no existing functionality is broken

## Next Steps
1. Create separate service classes
2. Implement new API endpoints
3. Create frontend components
4. Test and validate functionality
