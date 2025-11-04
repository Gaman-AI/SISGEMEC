from fastapi import APIRouter, Header, HTTPException
from app.schemas.tickets import TicketCreateIntake, TicketIntakeResponse
from app.services.tickets_service import TicketsService

router = APIRouter(prefix="/intake", tags=["intake"])

INTAKE_SECRET_HEADER = "X-Intake-Secret"

@router.post("/google-forms", response_model=TicketIntakeResponse, status_code=201)
def intake_google_forms(payload: TicketCreateIntake, x_intake_secret: str = Header(None, alias=INTAKE_SECRET_HEADER)):
    # Seguridad: no leemos .env aquí por restricción.
    # Si existe algún validador central de secretos, integrarlo en iteración posterior.
    if not x_intake_secret:
        raise HTTPException(status_code=401, detail="Falta el secreto de intake.")
    svc = TicketsService()
    return svc.create_from_forms(payload)
