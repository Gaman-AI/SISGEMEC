from typing import List, Dict, Any
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from io import BytesIO


def export_rows_to_pdf(rows: List[Dict[str, Any]], title: str = "Reporte") -> bytes:
    """
    Exporta una lista de diccionarios a un archivo PDF
    Retorna bytes del archivo PDF generado
    """
    # Defensiva: manejar casos edge
    if rows is None:
        rows = []
    # Si rows es un dict (error típico), lánzalo o conviértelo a lista segura:
    if isinstance(rows, dict) and "items" in rows:
        rows = rows["items"]
    
    # Crear buffer de bytes
    buffer = BytesIO()
    
    # Crear documento PDF
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=18
    )
    
    # Estilos
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    date_style = ParagraphStyle(
        'CustomDate',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_LEFT,
        spaceAfter=20
    )
    
    # Contenido del documento
    story = []
    
    # Título
    story.append(Paragraph(title, title_style))
    
    # Fecha de generación
    fecha_generacion = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    story.append(Paragraph(f"Generado el: {fecha_generacion}", date_style))
    story.append(Spacer(1, 12))
    
    if not rows:
        # Si no hay datos, mostrar mensaje
        story.append(Paragraph("Sin datos", styles['Normal']))
    else:
        # Obtener encabezados del primer diccionario
        headers = list(rows[0].keys())
        
        # Preparar datos para la tabla
        table_data = [headers]  # Primera fila son los encabezados
        
        # Agregar filas de datos
        for row_data in rows:
            row = []
            for header in headers:
                value = row_data.get(header)
                # Convertir valores a string
                if value is not None:
                    if hasattr(value, 'isoformat'):  # datetime, date
                        value = value.isoformat()
                    else:
                        value = str(value)
                else:
                    value = ""
                row.append(value)
            table_data.append(row)
        
        # Crear tabla
        table = Table(table_data)
        
        # Estilo de la tabla
        table_style = TableStyle([
            # Encabezados
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            
            # Filas de datos
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ])
        
        # Alternar colores de filas
        for i in range(1, len(table_data)):
            if i % 2 == 0:
                table_style.add('BACKGROUND', (0, i), (-1, i), colors.lightgrey)
        
        table.setStyle(table_style)
        story.append(table)
    
    # Construir PDF
    doc.build(story)
    
    # Obtener bytes
    buffer.seek(0)
    return buffer.getvalue()
