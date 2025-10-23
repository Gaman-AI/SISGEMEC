from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple
from math import ceil
from fastapi import HTTPException, status
from supabase import Client

def _http_500(msg: str, err: Exception | str) -> HTTPException:
    detail = f"{msg}: {err}"
    return HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)

def paged_ok(data: List[Dict[str, Any]], total: int, page: int, size: int) -> Dict[str, Any]:
    pages = ceil(total / size) if size > 0 else 0
    return {"data": data, "total": total, "page": page, "size": size, "pages": pages}

def exec_select_paged(
    client: Client,
    table: str,
    *,
    select_fields: str = "*",
    page: int = 1,
    size: int = 20,
    order_by: Optional[str] = None,
    desc: bool = False,
    ilike_fields: Optional[List[Tuple[str, str]]] = None,
    eq_fields: Optional[List[Tuple[str, Any]]] = None,
) -> Dict[str, Any]:
    """Select paginado compatible v2: devuelve {data,total,page,size,pages}."""
    try:
        q = client.table(table).select(select_fields, count="exact")
        if ilike_fields:
            for col, term in ilike_fields:
                if term:
                    q = q.ilike(col, f"%{term}%")
        if eq_fields:
            for col, val in eq_fields:
                if val is not None:
                    q = q.eq(col, val)
        if order_by:
            q = q.order(order_by, desc=desc)
        # rango
        page = max(1, int(page or 1))
        size = max(1, int(size or 20))
        start = (page - 1) * size
        end = start + size - 1
        q = q.range(start, end)
        res = q.execute()
        data = res.data or []
        total = int(res.count or 0)
        return paged_ok(data, total, page, size)
    except Exception as e:
        raise _http_500("Error en query paginada", e)

def exec_single(
    client: Client,
    table: str,
    *,
    select_fields: str = "*",
    match: Optional[Tuple[str, Any]] = None,
) -> Dict[str, Any]:
    """Select single compatible v2."""
    try:
        q = client.table(table).select(select_fields)
        if match:
            q = q.eq(match[0], match[1])
        res = q.single().execute()
        return res.data
    except Exception as e:
        text = str(e)
        if "PGRST116" in text or "No rows" in text:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurso no encontrado")
        raise _http_500("Error en query single", e)

def insert_returning(client: Client, table: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Insert v2 usando returning='representation'."""
    try:
        res = client.table(table).insert(payload, returning="representation").execute()
        rows = res.data or []
        return rows[0] if rows else {}
    except Exception as e:
        raise _http_500("Error en insert", e)

def update_returning(client: Client, table: str, match: Tuple[str, Any], payload: Dict[str, Any]) -> Dict[str, Any]:
    """Update v2 + returning."""
    try:
        res = client.table(table).update(payload).eq(match[0], match[1]).execute()
        rows = res.data or []
        return rows[0] if rows else {}
    except Exception as e:
        raise _http_500("Error en update", e)

def delete_match(client: Client, table: str, match: Tuple[str, Any]) -> None:
    try:
        client.table(table).delete().eq(match[0], match[1]).execute()
    except Exception as e:
        raise _http_500("Error en delete", e)
