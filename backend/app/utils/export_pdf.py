from typing import List, Dict, Any, Optional
from datetime import datetime
from io import BytesIO
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.colors import HexColor
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from pathlib import Path
import os

from app.utils.pdf_theme import ReportTheme, AOSENUMA_THEME


def export_rows_to_pdf(
    rows: List[Dict[str, Any]],
    title: str = "Reporte",
    orientation: str = "portrait",
    theme: Optional[ReportTheme] = None,
    summary: Optional[Dict[str, Any]] = None,
    columns: Optional[List[str]] = None,
    header_map: Optional[Dict[str, str]] = None,
    align_map: Optional[Dict[str, str]] = None,
    col_width_overrides: Optional[Dict[str, float]] = None,
    mask_email_fields: Optional[List[str]] = None,
) -> bytes:
    if rows is None:
        rows = []
    if isinstance(rows, dict) and "items" in rows:
        rows = rows["items"]

    theme = (theme or AOSENUMA_THEME).copy()
    # Logo opcional desde ENV
    if not theme.get("logo_path"):
        env_logo = os.getenv("PDF_LOGO_PATH")
        if env_logo and os.path.exists(env_logo):
            theme["logo_path"] = env_logo

    pagesize = landscape(A4) if orientation == "landscape" else A4
    margin = 18

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=pagesize,
        rightMargin=margin,
        leftMargin=margin,
        topMargin=margin + 60,
        bottomMargin=margin + 40,
    )

    font_title, font_body = _register_fonts(theme)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "RptTitle",
        parent=styles["Heading1"],
        fontSize=14,
        fontName=font_title,
        textColor=HexColor(theme.get("text", "#26272A")),
        alignment=TA_LEFT,
        spaceAfter=12,
    )

    story = []
    # Título dentro del flujo (el header también lo dibuja)
    story.append(Paragraph(title, title_style))
    story.append(Spacer(1, 6))

    if summary:
        story.extend(_render_summary(summary, theme, font_body))
        story.append(Spacer(1, 8))

    if not rows:
        story.append(Paragraph("Sin datos", styles["Normal"]))
    else:
        # Usar columns si se proporciona, sino usar las claves del primer row
        if columns:
            headers = columns
            # Limitar a 14 columnas máximo (defensivo)
            if len(headers) > 14:
                headers = headers[:14]
        else:
            headers = list(rows[0].keys())
            if len(headers) > 14:
                headers = headers[:14]
        
        table_data, col_widths = _prepare_table_data(
            rows, headers, theme, font_body, orientation,
            header_map=header_map,
            col_width_overrides=col_width_overrides,
            mask_email_fields=mask_email_fields
        )
        table = Table(table_data, colWidths=col_widths, repeatRows=1)
        table.setStyle(_create_table_style(theme, len(table_data), headers, align_map))
        story.append(table)

    doc.build(
        story,
        onFirstPage=lambda c, d: _draw_header_footer(c, d, title, theme, is_first=True),
        onLaterPages=lambda c, d: _draw_header_footer(c, d, title, theme, is_first=False),
    )
    buf.seek(0)
    return buf.getvalue()


def _register_fonts(theme: ReportTheme) -> tuple[str, str]:
    try:
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        fonts_dir = Path("assets/fonts")
        candidates = [
            fonts_dir / "Inter-Regular.ttf",
            Path("frontend/src/assets/fonts/Inter-Regular.ttf"),
        ]
        for p in candidates:
            if p.exists():
                pdfmetrics.registerFont(TTFont("Inter", str(p)))
                break
        else:
            return ("Helvetica-Bold", "Helvetica")

        # bold opcional
        bold_candidates = [
            fonts_dir / "Inter-Bold.ttf",
            Path("frontend/src/assets/fonts/Inter-Bold.ttf"),
        ]
        for p in bold_candidates:
            if p.exists():
                pdfmetrics.registerFont(TTFont("Inter-Bold", str(p)))
                return ("Inter-Bold", "Inter")
        return ("Inter", "Inter")
    except Exception:
        return ("Helvetica-Bold", "Helvetica")


def _measure_page_width(pagesize, margin: float) -> float:
    """Calcula el ancho disponible en la página"""
    return pagesize[0] - (2 * margin)


def _mask_email(email: str) -> str:
    """
    Enmascara un email dejando 1-2 chars y dominio
    Ejemplo: juan@example.com -> ju***@example.com
    """
    if not email or "@" not in email:
        return email
    parts = email.split("@")
    if len(parts) != 2:
        return email
    local, domain = parts
    if len(local) <= 2:
        masked_local = local[0] + "*"
    else:
        masked_local = local[:2] + "***"
    return f"{masked_local}@{domain}"


def _prepare_table_data(
    rows, headers, theme, font_body, orientation="portrait",
    header_map=None, col_width_overrides=None, mask_email_fields=None
):
    from reportlab.platypus import Paragraph
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
    
    cell_style = ParagraphStyle(
        "Cell",
        fontName=font_body,
        fontSize=8,
        leading=10,
        textColor=HexColor(theme.get("text", "#26272A")),
        alignment=TA_LEFT,
    )
    
    header_style = ParagraphStyle(
        "Header",
        fontName="Helvetica-Bold",
        fontSize=9,
        textColor=HexColor(theme.get("table_header_fg", "#FFFFFF")),
        alignment=TA_CENTER,
    )
    
    # Estilo especial para fechas (dos líneas: dd/MM y HH:mm)
    date_style = ParagraphStyle(
        "DateCell",
        fontName=font_body,
        fontSize=8,
        leading=10,
        alignment=TA_CENTER,
        textColor=HexColor(theme.get("text", "#26272A")),
    )
    
    # Preparar encabezados con header_map si existe
    header_row = []
    for h in headers:
        if header_map and h in header_map:
            header_text = header_map[h]
            # Permitir <br/> en header_map
            header_row.append(Paragraph(header_text, header_style))
        else:
            header_row.append(Paragraph(_format_header(h), header_style))
    table_data = [header_row]

    # WIDTH_HINT base
    WIDTH_HINT = {
        "ticket_id": 40,
        "estado": 70,
        "priority": 70,
        "fuente": 80,
        "descripcion": 260,
        "received_at": 120,
        "closed_at": 120,
        "first_response_at": 120,
        "tipo_servicio_nombre": 140,
        "equipo_label": 150,
        "ttr_hours": 60,
        "tta_hours": 60,
        "sla_cumplido": 70,
        "edad_dias": 60,
        "sla_limite_hours": 70,
    }

    # Calcular ancho disponible
    pagesize = landscape(A4) if orientation == "landscape" else A4
    margin = 18
    avail_w = _measure_page_width(pagesize, margin)
    
    # Calcular anchos de columna
    col_widths = []
    for h in headers:
        # Usar override si existe
        if col_width_overrides and h in col_width_overrides:
            w = col_width_overrides[h]
        else:
            w = WIDTH_HINT.get(h, max(46, min(300, avail_w / max(1, len(headers)))))
        # Asegurar min/max
        w = max(46, min(300, w))
        col_widths.append(w)

    # Escalar proporcionalmente si excede
    total_w = sum(col_widths)
    if total_w > avail_w:
        r = avail_w / total_w
        col_widths = [w * r for w in col_widths]

    # Campos largos que necesitan wrap
    long_fields = ("descripcion", "trabajo_realizado", "notas_internas", "equipo_label", "tipo_servicio_nombre", "solicitante_compuesto")
    
    # Columnas de fechas que necesitan formato especial (dos líneas)
    date_fields = {"received_at", "first_response_at", "closed_at"}

    # Preparar filas de datos
    for item in rows:
        row = []
        for h in headers:
            # Manejar columnas de fechas con formato especial (dos líneas)
            if h in date_fields:
                v = item.get(h)
                txt = "–"
                if v:
                    try:
                        from datetime import datetime, date
                        dt = None
                        
                        # Si ya es datetime, usarlo directamente
                        if isinstance(v, datetime):
                            dt = v
                        elif isinstance(v, date):
                            # Si es solo date (sin hora), convertir a datetime a medianoche
                            dt = datetime.combine(v, datetime.min.time())
                        elif hasattr(v, 'isoformat'):
                            # Objeto con isoformat (date o datetime)
                            iso_str = v.isoformat()
                            if 'T' in iso_str:
                                dt = datetime.fromisoformat(iso_str.replace('Z', '+00:00'))
                            else:
                                # Solo fecha, agregar hora 00:00
                                dt = datetime.fromisoformat(iso_str + 'T00:00:00')
                        elif isinstance(v, str):
                            # String ISO
                            v_clean = v.replace('Z', '+00:00')
                            if 'T' in v_clean:
                                dt = datetime.fromisoformat(v_clean)
                            else:
                                # Solo fecha, agregar hora 00:00
                                dt = datetime.fromisoformat(v_clean + 'T00:00:00')
                        
                        if dt:
                            txt = f"<b>{dt.strftime('%d/%m')}</b><br/>{dt.strftime('%H:%M')}"
                    except Exception:
                        # Si falla, mostrar "-"
                        pass
                
                row.append(Paragraph(txt, date_style))
                continue
            
            # Si el campo no existe en el item, usar "-"
            if h not in item:
                s = "-"
            else:
                v = item.get(h)
                
                # Aplicar enmascarado de email si corresponde
                if mask_email_fields and h in mask_email_fields and isinstance(v, str):
                    v = _mask_email(v)
                
                s = _fmt_value(v, h)
            
            # Para solicitante_compuesto, crear Paragraph con <br/> si ya contiene <br/>
            # Para otros campos largos, usar Paragraph
            if h == "solicitante_compuesto" and "<br/>" in s:
                row.append(Paragraph(s, cell_style))
            elif h in long_fields:
                row.append(Paragraph(s, cell_style))
            else:
                row.append(s)
        table_data.append(row)

    return table_data, col_widths


def _format_date_iso(s: str) -> str:
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %H:%M")
    except Exception:
        return s


def _fmt_value(v, header: str) -> str:
    if v is None:
        return "-"
    if isinstance(v, bool):
        return "Sí" if v else "No"
    if isinstance(v, (int, float)) and header in ("ttr_hours", "tta_hours", "sla_limite_hours"):
        return f"{float(v):.2f}"
    if isinstance(v, str):
        # Enmascarar emails si el header contiene "email" (defensivo)
        if "email" in header.lower() and "@" in v:
            v = _mask_email(v)
        
        if len(v) > 200 and header in ("descripcion", "trabajo_realizado", "notas_internas"):
            return v[:197] + "..."
        # fecha ISO
        if "T" in v and "-" in v and ":" in v:
            return _format_date_iso(v)
        return v
    # objetos tipo fecha
    if hasattr(v, "isoformat"):
        return _format_date_iso(v.isoformat())
    return str(v)


def _format_header(h: str) -> str:
    return h.replace("_", " ").title()


def _create_table_style(
    theme: ReportTheme, 
    num_rows: int, 
    headers: List[str],
    align_map: Optional[Dict[str, str]] = None
) -> TableStyle:
    header_bg = HexColor(theme.get("table_header_bg", "#164F5B"))
    header_fg = HexColor(theme.get("table_header_fg", "#FFFFFF"))
    row_bg = HexColor(theme.get("row_bg", "#FFFFFF"))
    row_alt_bg = HexColor(theme.get("row_alt_bg", "#E5EADF"))
    border = HexColor(theme.get("border", "#C7D8D0"))
    
    style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), header_bg),
        ("TEXTCOLOR", (0, 0), (-1, 0), header_fg),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
        ("TOPPADDING", (0, 0), (-1, 0), 10),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, border),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ])
    
    # Aplicar align_map si existe
    if align_map:
        for col_idx, h in enumerate(headers):
            if h in align_map:
                align_val = align_map[h].upper()
                if align_val in ("LEFT", "CENTER", "RIGHT"):
                    style.add("ALIGN", (col_idx, 1), (col_idx, -1), align_val)
    
    # Zebra striping
    for i in range(1, num_rows):
        style.add("BACKGROUND", (0, i), (-1, i), row_bg if i % 2 == 1 else row_alt_bg)
    
    return style


def _draw_header_footer(c: canvas.Canvas, doc: SimpleDocTemplate, title: str, theme: ReportTheme, is_first=False):
    primary_dark = HexColor(theme.get("primary_dark", "#164F5B"))
    text = HexColor(theme.get("text", "#26272A"))

    # header bar
    c.setFillColor(primary_dark)
    c.rect(0, doc.pagesize[1] - 60, doc.pagesize[0], 60, fill=1, stroke=0)

    # logo
    logo_path = theme.get("logo_path")
    if logo_path and os.path.exists(logo_path):
        try:
            img = Image(logo_path, width=40, height=40)
            img.drawOn(c, 18, doc.pagesize[1] - 50)
        except Exception:
            pass

    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(70, doc.pagesize[1] - 35, title)

    if is_first:
        c.setFont("Helvetica", 9)
        c.drawString(70, doc.pagesize[1] - 50, f"Generado el: {datetime.now():%d/%m/%Y %H:%M:%S}")

    # footer
    c.setFillColor(text)
    c.setFont("Helvetica", 8)
    c.drawRightString(doc.pagesize[0] - 18, 18, f"Página {c.getPageNumber()}")
    c.drawString(18, 18, "SISGEMEC · AOSENUMA")


def _render_summary(summary: Dict[str, Any], theme: ReportTheme, font_body: str):
    items = []
    style = ParagraphStyle(
        "Summary",
        fontName=font_body,
        fontSize=9,
        textColor=HexColor(theme.get("text", "#26272A")),
    )
    if "by_estado" in summary:
        txt = ", ".join([f"{x['estado']}: {x['total']}" for x in summary["by_estado"]])
        items.append(Paragraph(f"<b>Por estado:</b> {txt}", style))
    if "by_priority" in summary:
        txt = ", ".join([f"{x['priority']}: {x['total']}" for x in summary["by_priority"]])
        items.append(Paragraph(f"<b>Por prioridad:</b> {txt}", style))
    return items
